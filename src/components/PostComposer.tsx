"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PostComposerProps = {
  isLoggedIn: boolean;
  // Defaults to the general newsfeed. A group page passes
  // targetType="group" + its own id to post to that group's wall instead
  // — same posts table, same API route, just a different target.
  targetType?: "feed" | "group" | "business" | "event";
  targetId?: number | null;
};

// Real backend: POST /api/posts (src/app/api/posts/route.ts), backed by
// the posts table in src/lib/db.ts. File attachment icons are still
// decorative — no upload endpoint exists yet for post photos/video.
export default function PostComposer({
  isLoggedIn,
  targetType = "feed",
  targetId = null,
}: PostComposerProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to post to the newsfeed.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed, targetType, targetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that — try again.");
        return;
      }
      setText("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="central-meta new-pst">
      <div className="new-postbox">
        <figure>
          <img src="/images/resources/admin2.jpg" alt="" />
        </figure>
        <div className="newpst-input">
          <form method="post" onSubmit={handleSubmit}>
            <textarea
              rows={2}
              placeholder={isLoggedIn ? "Write something" : "Log in to post"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
            />
            {error && (
              <div style={{ color: "#c0392b", fontSize: "13px", margin: "4px 0" }}>{error}</div>
            )}
            <div className="attachments">
              <ul>
                <li>
                  <i className="fa fa-image" />
                  <label className="fileContainer">
                    <input type="file" accept="image/*" disabled />
                  </label>
                </li>
                <li>
                  <i className="fa fa-video-camera" />
                  <label className="fileContainer">
                    <input type="file" accept="video/*" disabled />
                  </label>
                </li>
                <li>
                  <button type="submit" disabled={submitting || !text.trim()}>
                    {submitting ? "Posting…" : "Post"}
                  </button>
                </li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
