"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";
import { formatRelativeTime } from "@/lib/time";
import type { StoryGroup } from "@/lib/stories";

type Props = {
  groups: StoryGroup[];
  isLoggedIn: boolean;
  currentUserId: number | null;
  isAdmin: boolean;
  viewerAvatar: string;
};

const STORY_MS = 5000;
const DEFAULT_AVATAR = "/images/defaults/default-avatar-male.jpg";

// The row of story tiles above the newsfeed + the full-screen viewer.
// Real backend: POST /api/stories, DELETE /api/stories/:id; stories vanish
// 24 hours after posting (see listActiveStories in src/lib/db.ts).
export default function StoriesRow({ groups, isLoggedIn, currentUserId, isAdmin, viewerAvatar }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);
  // A chosen photo waiting for an optional caption before it is posted.
  const [draft, setDraft] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDraft(await compressImageFile(file, 1080));
      setCaption("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  }

  async function shareDraft() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: draft, caption }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't add your story.");
        return;
      }
      setDraft(null);
      setCaption("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const next = useCallback(() => {
    setOpen((cur) => {
      if (!cur) return cur;
      const g = groups[cur.g];
      if (g && cur.s + 1 < g.stories.length) return { g: cur.g, s: cur.s + 1 };
      if (cur.g + 1 < groups.length) return { g: cur.g + 1, s: 0 };
      return null; // ran out of stories
    });
  }, [groups]);

  const prev = useCallback(() => {
    setOpen((cur) => {
      if (!cur) return cur;
      if (cur.s > 0) return { g: cur.g, s: cur.s - 1 };
      if (cur.g > 0) return { g: cur.g - 1, s: groups[cur.g - 1].stories.length - 1 };
      return cur;
    });
  }, [groups]);

  // Auto-advance, and keyboard control, while the viewer is open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(next, STORY_MS);
    return () => clearTimeout(t);
  }, [open, next]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev]);

  async function removeCurrent() {
    if (!open) return;
    const story = groups[open.g]?.stories[open.s];
    if (!story || !confirm("Delete this story?")) return;
    const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
    if (res.ok) {
      setOpen(null);
      router.refresh();
    } else {
      setError("Couldn't delete that story.");
    }
  }

  const tile: React.CSSProperties = {
    position: "relative",
    flex: "0 0 112px",
    height: 190,
    borderRadius: 10,
    overflow: "hidden",
    background: "#e9ecef",
    cursor: "pointer",
    border: "none",
    padding: 0,
  };

  const cur = open ? groups[open.g] : null;
  const story = cur && open ? cur.stories[open.s] : null;

  return (
    <>
      <div className="central-meta" style={{ padding: 12, marginBottom: 20 }}>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {isLoggedIn && (
            <button
              type="button"
              style={{ ...tile, background: "#fff", border: "1px solid #e1e8ed" }}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Create story"
            >
              <img src={viewerAvatar} alt="" style={{ width: "100%", height: 130, objectFit: "cover" }} />
              <span
                style={{
                  position: "absolute", top: 112, left: "50%", transform: "translateX(-50%)",
                  width: 36, height: 36, borderRadius: "50%", background: "#088dcd", color: "#fff",
                  border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}
              >
                <i className="fa fa-plus" />
              </span>
              <span style={{ position: "absolute", bottom: 10, left: 0, right: 0, fontSize: 13, fontWeight: 600, color: "#222" }}>
                {busy && !draft ? "Loading…" : "Create story"}
              </span>
            </button>
          )}
          {groups.map((g, gi) => (
            <button key={g.authorId} type="button" style={tile} onClick={() => setOpen({ g: gi, s: 0 })}>
              <img
                src={g.stories[g.stories.length - 1].imagePath}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span
                style={{
                  position: "absolute", top: 8, left: 8, width: 38, height: 38, borderRadius: "50%",
                  border: "3px solid #088dcd", overflow: "hidden", background: "#fff",
                }}
              >
                <img src={g.authorPhoto || DEFAULT_AVATAR} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </span>
              <span
                style={{
                  position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 8px 8px", color: "#fff",
                  fontSize: 12, fontWeight: 600, textAlign: "left",
                  background: "linear-gradient(transparent, rgba(0,0,0,.65))",
                }}
              >
                {g.authorName}
              </span>
            </button>
          ))}
          {!isLoggedIn && groups.length === 0 && (
            <p style={{ color: "#888", margin: "8px" }}>No stories right now.</p>
          )}
        </div>
        {isLoggedIn && groups.length === 0 && (
          <p style={{ color: "#888", fontSize: 13, margin: "8px 4px 0" }}>
            No stories yet — add a photo and it stays up for 24 hours.
          </p>
        )}
        {error && <p role="alert" style={{ color: "#c0392b", fontSize: 13, margin: "8px 4px 0" }}>{error}</p>}
      </div>

      {draft && (
        <div
          role="dialog"
          aria-label="New story"
          style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ width: "min(420px, 100%)", background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ position: "relative", background: "#000" }}>
              <img src={draft} alt="Story preview" style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }} />
              {caption && (
                <p style={{ position: "absolute", left: 0, right: 0, bottom: 0, margin: 0, padding: "30px 14px 12px", color: "#fff", textAlign: "center", background: "linear-gradient(transparent, rgba(0,0,0,.7))" }}>
                  {caption}
                </p>
              )}
            </div>
            <div style={{ padding: 14 }}>
              <input
                type="text"
                value={caption}
                maxLength={200}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                aria-label="Story caption"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, marginBottom: 6 }}
              />
              <div style={{ fontSize: 12, color: "#999", textAlign: "right", marginBottom: 8 }}>{caption.length}/200 · stays up for 24 hours</div>
              {error && <p role="alert" style={{ color: "#c0392b", fontSize: 13, margin: "0 0 8px" }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="mtr-btn signin" onClick={() => { setDraft(null); setError(null); }} disabled={busy}>
                  <span>Cancel</span>
                </button>
                <button type="button" className="mtr-btn signup" onClick={shareDraft} disabled={busy}>
                  <span>{busy ? "Posting…" : "Share story"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && cur && story && (
        <div
          role="dialog"
          aria-label={`${cur.authorName}'s story`}
          style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ position: "relative", height: "min(92vh, 780px)", aspectRatio: "9 / 16", maxWidth: "100vw", background: "#000" }}>
            <img src={story.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 4 }}>
              {cur.stories.map((st, i) => (
                <div key={st.id} style={{ flex: 1, height: 3, background: "rgba(255,255,255,.35)", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    key={i === open.s ? `${st.id}-${open.g}-${open.s}` : st.id}
                    style={{
                      height: "100%", background: "#fff",
                      width: i < open.s ? "100%" : "0%",
                      animation: i === open.s ? `storyFill ${STORY_MS}ms linear forwards` : undefined,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", top: 20, left: 12, right: 12, display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <img src={cur.authorPhoto || DEFAULT_AVATAR} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
              <strong style={{ fontSize: 14 }}>{cur.authorName}</strong>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{formatRelativeTime(story.createdAt)}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                {(cur.authorId === currentUserId || isAdmin) && (
                  <button type="button" onClick={removeCurrent} aria-label="Delete story" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>
                    <i className="fa fa-trash-o" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(null)} aria-label="Close" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>
                  ×
                </button>
              </span>
            </div>
            {story.caption && (
              <p style={{ position: "absolute", left: 0, right: 0, bottom: 0, margin: 0, padding: "40px 16px 20px", color: "#fff", textAlign: "center", background: "linear-gradient(transparent, rgba(0,0,0,.7))" }}>
                {story.caption}
              </p>
            )}
            <button type="button" onClick={prev} aria-label="Previous story" style={{ position: "absolute", left: 0, top: 70, bottom: 70, width: "30%", background: "none", border: "none", cursor: "pointer" }} />
            <button type="button" onClick={next} aria-label="Next story" style={{ position: "absolute", right: 0, top: 70, bottom: 70, width: "70%", background: "none", border: "none", cursor: "pointer" }} />
          </div>
          <style>{`@keyframes storyFill { from { width: 0% } to { width: 100% } }`}</style>
        </div>
      )}
    </>
  );
}
