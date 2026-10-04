"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StreamStatus = "scheduled" | "live" | "ended";

type Comment = {
  id: number;
  authorId: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  body: string;
};

type Report = {
  id: number;
  commentId: number;
  commentBody: string;
  commentAuthorId: number;
  commentAuthorUsername: string;
  reporterUsername: string;
  reason: string;
};

type StreamWatchClientProps = {
  streamId: number;
  embedSrc: string;
  status: StreamStatus;
  isHost: boolean;
  isLoggedIn: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialLiveViewerCount: number | null;
  initialTotalViewCount: number | null;
};

const HEARTBEAT_INTERVAL_MS = 30_000;

// Real backend: src/app/api/streams/[id]/* — likes, comments/chat,
// viewer presence (join/heartbeat/leave), host start/end controls, and a
// moderation queue (report/resolve/ban), all backed by src/lib/db.ts.
// The <iframe> is the only part of this component that isn't this app's
// own code — it plays the host's own YouTube/Facebook/Vimeo Live
// broadcast (bring-your-own-stream), never video served by Pueblo
// Connect itself.
export default function StreamWatchClient({
  streamId,
  embedSrc,
  status,
  isHost,
  isLoggedIn,
  initialLikeCount,
  initialLiked,
  initialLiveViewerCount,
  initialTotalViewCount,
}: StreamWatchClientProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liveViewerCount, setLiveViewerCount] = useState(initialLiveViewerCount);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showModeration, setShowModeration] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);

  const viewerSessionId = useRef<number | null>(null);

  // Viewer presence: join once on mount, heartbeat every 30s while the
  // page stays open, leave on unmount (best-effort — see the leave
  // route's comment on why heartbeats, not this, are what keeps the
  // count accurate).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/streams/${streamId}/viewers`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) viewerSessionId.current = data.viewerSessionId ?? null;
      });

    const interval = setInterval(() => {
      if (viewerSessionId.current === null) return;
      fetch(`/api/streams/${streamId}/viewers/${viewerSessionId.current}/heartbeat`, {
        method: "POST",
      })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && typeof data.liveViewerCount === "number") {
            setLiveViewerCount(data.liveViewerCount);
          }
        })
        .catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (viewerSessionId.current !== null) {
        fetch(`/api/streams/${streamId}/viewers/${viewerSessionId.current}/leave`, {
          method: "POST",
        }).catch(() => {});
      }
    };
  }, [streamId]);

  // Chat: load once, then poll — there's no websocket here, so a short
  // poll is the honest, simple way to show other people's messages
  // without the viewer refreshing the page themselves.
  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`/api/streams/${streamId}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setComments(data.comments || []);
        })
        .catch(() => {});
    }
    load();
    const interval = status === "live" ? setInterval(load, 5000) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [streamId, status]);

  async function toggleLike() {
    if (!isLoggedIn) {
      setError("Log in to like this stream.");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/streams/${streamId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(wasLiked);
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
        setError(data.error || "Couldn't update that like.");
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      setError("Couldn't reach the server.");
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to chat.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that.");
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setCommentText("");
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function goLive() {
    setError(null);
    const res = await fetch(`/api/streams/${streamId}/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't go live.");
      return;
    }
    router.refresh();
  }

  async function endStream() {
    setError(null);
    const res = await fetch(`/api/streams/${streamId}/end`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't end the stream.");
      return;
    }
    router.refresh();
  }

  async function loadModeration() {
    setShowModeration(true);
    const res = await fetch(`/api/streams/${streamId}/moderation`);
    const data = await res.json();
    setReports(data.reports || []);
  }

  async function resolveReport(reportId: number, resolution: "dismissed" | "comment_deleted" | "user_banned") {
    await fetch(`/api/streams/${streamId}/moderation/${reportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    loadModeration();
  }

  async function reportComment(commentId: number) {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason || !reason.trim()) return;
    await fetch(`/api/streams/${streamId}/comments/${commentId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
  }

  return (
    <div>
      <div className="central-meta item">
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
          <iframe
            src={embedSrc}
            title="Live stream"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            {status === "live" && liveViewerCount !== null && (
              <span style={{ color: "#555" }}>{liveViewerCount} watching now</span>
            )}
            {status === "ended" && initialTotalViewCount !== null && (
              <span style={{ color: "#555" }}>{initialTotalViewCount} views</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isHost && status === "scheduled" && (
              <button className="mtr-btn signup" type="button" onClick={goLive}>
                <span>Go Live</span>
              </button>
            )}
            {isHost && status === "live" && (
              <button className="mtr-btn signin" type="button" onClick={endStream}>
                <span>End Stream</span>
              </button>
            )}
            {isHost && (
              <button className="mtr-btn signin" type="button" onClick={loadModeration}>
                <span>Moderation</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleLike}
              style={{ cursor: "pointer", background: "none", border: "none" }}
            >
              <i className={liked ? "fa fa-heart" : "ti-heart"} /> {likeCount}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" style={{ color: "#c0392b", padding: "0 20px 12px" }}>{error}</p>
        )}
      </div>

      {showModeration && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Open reports</h4>
            {reports.length === 0 && <p style={{ color: "#888" }}>Nothing to review.</p>}
            {reports.map((r) => (
              <div key={r.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                <p style={{ margin: 0 }}>
                  <strong>{r.commentAuthorUsername}:</strong> {r.commentBody}
                </p>
                <p style={{ margin: "4px 0", color: "#999", fontSize: 13 }}>
                  Reported by {r.reporterUsername}: {r.reason}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="mtr-btn signin" type="button" onClick={() => resolveReport(r.id, "dismissed")}>
                    <span>Dismiss</span>
                  </button>
                  <button className="mtr-btn signin" type="button" onClick={() => resolveReport(r.id, "comment_deleted")}>
                    <span>Delete comment</span>
                  </button>
                  <button className="mtr-btn signup" type="button" onClick={() => resolveReport(r.id, "user_banned")}>
                    <span>Ban user</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="central-meta item">
        <div style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Chat</h4>
          <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
            {comments.length === 0 && <p style={{ color: "#888" }}>No messages yet.</p>}
            {comments.map((c) => (
              <div key={c.id} style={{ padding: "4px 0", display: "flex", justifyContent: "space-between" }}>
                <span>
                  <strong>{c.authorName}:</strong> {c.body}
                </span>
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => reportComment(c.id)}
                    style={{ background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer" }}
                  >
                    report
                  </button>
                )}
              </div>
            ))}
          </div>
          <form method="post" onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLoggedIn ? "Say something…" : "Log in to chat"}
              disabled={!isLoggedIn}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4 }}
            />
            <button className="mtr-btn signup" type="submit" disabled={!isLoggedIn || !commentText.trim()}>
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
