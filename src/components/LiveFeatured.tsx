"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LiveToggleButton from "./LiveToggleButton";

export type FeaturedStream = {
  id: number;
  title: string;
  description: string | null;
  hostName: string;
  hostId: number;
  hostProfilePhotoPath: string | null;
  embedSrc: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  watching: number;
  canFollow: boolean; // false when the viewer is the host
  following: boolean;
};

type ChatMessage = {
  id: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  authorBadges: string[];
  body: string;
  createdAt: string;
};

const AVATAR = "/images/defaults/default-avatar-male.jpg";
const NAVY = "#0b2a5b";

function clock(iso: string) {
  // SQLite datetime('now') is UTC without a zone marker.
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Featured stream on /live: the player, an action row and a real chat
// panel (GET/POST /api/streams/:id/comments). Previewing here doesn't
// register a viewer session — watch-to-earn Rewards and the full
// moderation/polls/Q&A tools live on the stream's own page.
export default function LiveFeatured({ stream, isLoggedIn }: { stream: FeaturedStream; isLoggedIn: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState(stream.likeCount);
  const [liked, setLiked] = useState(stream.liked);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/streams/${stream.id}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((data.comments as ChatMessage[]).slice(-60));
    } catch {
      /* keep what we have */
    }
  }, [stream.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/streams/${stream.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send that.");
        return;
      }
      setText("");
      stick.current = true;
      await load();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    try {
      const res = await fetch(`/api/streams/${stream.id}/like`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setLiked(Boolean(data.liked));
      setLikes(Number(data.likeCount));
    } catch {
      /* ignore */
    }
  }

  async function share() {
    const url = `${window.location.origin}/live/${stream.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: stream.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#f1f5fb",
    border: 0,
    borderRadius: 12,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#27364d",
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div className="pc-live-grid">
      {/* ---- Player + details ---- */}
      <div style={{ minWidth: 0 }}>
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000", borderRadius: 18, overflow: "hidden" }}>
          <iframe
            src={stream.embedSrc}
            title={stream.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 8, pointerEvents: "none" }}>
            <span style={{ background: "#e8261e", color: "#fff", fontWeight: 800, fontSize: 15, padding: "6px 14px", borderRadius: 8, letterSpacing: 0.5 }}>
              ● LIVE
            </span>
            <span style={{ background: "rgba(10,20,40,0.78)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "6px 12px", borderRadius: 8 }}>
              <i className="fa fa-eye" style={{ marginRight: 6 }} />
              {stream.watching}
            </span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, padding: 18, marginTop: 14, boxShadow: "0 1px 6px rgba(11,42,91,0.08)" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <img
              src={stream.hostProfilePhotoPath || AVATAR}
              alt=""
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: "0 0 2px", color: NAVY, fontSize: 21, fontWeight: 800 }}>{stream.title}</h3>
              <div style={{ color: "#4b5b73", fontSize: 14 }}>
                <Link href={`/profile/${stream.hostId}`} title="" style={{ color: "#4b5b73", fontWeight: 600 }}>
                  {stream.hostName}
                </Link>
              </div>
              {stream.description && (
                <p style={{ margin: "8px 0 0", color: "#4b5b73", fontSize: 14, lineHeight: 1.5 }}>{stream.description}</p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
              <Link
                href={`/live/${stream.id}`}
                title=""
                style={{ background: "#1673f0", color: "#fff", fontWeight: 700, borderRadius: 10, padding: "10px 22px", textDecoration: "none", whiteSpace: "nowrap", textAlign: "center" }}
              >
                Open stream
              </Link>
              {stream.canFollow && (
                <LiveToggleButton
                  endpoint={`/api/users/${stream.hostId}/follow`}
                  initialOn={stream.following}
                  isLoggedIn={isLoggedIn}
                  labelOff="Follow"
                  labelOn="Following"
                  variant="outline"
                />
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" style={{ ...pill, color: liked ? "#1673f0" : "#27364d" }} onClick={toggleLike}>
              <i className={`fa ${liked ? "fa-thumbs-up" : "fa-thumbs-o-up"}`} /> Like <span style={{ color: "#6b7a90" }}>{likes}</span>
            </button>
            <Link href={`/live/${stream.id}`} title="" style={pill}>
              <i className="fa fa-comment-o" /> Comment <span style={{ color: "#6b7a90" }}>{stream.commentCount}</span>
            </Link>
            <button type="button" style={pill} onClick={share}>
              <i className="fa fa-share" /> {copied ? "Link copied" : "Share"}
            </button>
          </div>
          <p style={{ margin: "12px 0 0", color: "#8a97aa", fontSize: 12 }}>
            Watch on the stream page to earn Pueblo Rewards and join polls, Q&amp;A and flash drops.
          </p>
        </div>
      </div>

      {/* ---- Live chat ---- */}
      <aside style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 6px rgba(11,42,91,0.08)", display: "flex", flexDirection: "column", minHeight: 420, maxHeight: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #eef2f8" }}>
          <h4 style={{ margin: 0, color: NAVY, fontWeight: 800 }}>Live Chat</h4>
          <span style={{ color: "#4b5b73", fontSize: 13, fontWeight: 600 }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#22b14c", marginRight: 6 }} />
            {stream.watching} watching
          </span>
        </div>
        <div
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
          style={{ flex: 1, overflowY: "auto", padding: "8px 18px" }}
        >
          {messages.length === 0 && (
            <p style={{ color: "#8a97aa", fontSize: 14, textAlign: "center", marginTop: 40 }}>
              No messages yet — say hello!
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 10, padding: "9px 0" }}>
              <img
                src={m.authorProfilePhotoPath || AVATAR}
                alt=""
                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4, color: "#27364d", wordBreak: "break-word" }}>
                <strong style={{ color: NAVY }}>{m.authorName}</strong>{" "}
                {m.authorBadges.slice(0, 2).map((b) => (
                  <span key={b} style={{ background: "#e8f1fe", color: "#1673f0", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, marginRight: 4 }}>
                    {b}
                  </span>
                ))}
                {m.body}
              </div>
              <span style={{ color: "#9aa6b8", fontSize: 11, whiteSpace: "nowrap" }}>{clock(m.createdAt)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: "1px solid #eef2f8" }}>
          {error && (
            <p role="alert" style={{ color: "#e02020", fontSize: 12, margin: "0 0 8px" }}>
              {error}
            </p>
          )}
          {isLoggedIn ? (
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="Write a comment…"
                style={{ flex: 1, border: 0, background: "#f1f5fb", borderRadius: 999, padding: "11px 18px", fontSize: 14, minWidth: 0 }}
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                aria-label="Send"
                style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "#eaf2ff", color: "#1673f0", cursor: "pointer" }}
              >
                <i className="fa fa-paper-plane" />
              </button>
            </form>
          ) : (
            <p style={{ margin: 0, textAlign: "center", color: "#6b7a90", fontSize: 14 }}>
              <Link href="/login" title="">Log in</Link> to join the chat.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
