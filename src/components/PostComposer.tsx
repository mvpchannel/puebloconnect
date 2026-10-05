"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";

type PostComposerProps = {
  isLoggedIn: boolean;
  // Defaults to the general newsfeed. A group page passes
  // targetType="group" + its own id to post to that group's wall instead
  // — same posts table, same API route, just a different target.
  targetType?: "feed" | "group" | "business" | "event";
  targetId?: number | null;
  // The posting member's own avatar (see src/lib/viewer.ts).
  avatarSrc?: string;
};

// Real backend: POST /api/posts (src/app/api/posts/route.ts), backed by
// the posts table in src/lib/db.ts. Photos are real (resized in the
// browser, saved under public/uploads/posts); videos (MP4/WebM/MOV, 50MB)
// are uploaded as multipart form data. One attachment per post.
export default function PostComposer({
  isLoggedIn,
  targetType = "feed",
  targetId = null,
  avatarSrc = "/images/defaults/default-avatar-male.jpg",
}: PostComposerProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Local preview URL for the chosen video; released when it changes/unmounts.
  useEffect(() => {
    if (!video) {
      setVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  function onVideoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setError("Video must be an MP4, WebM, or MOV file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Video must be smaller than 50MB.");
      return;
    }
    setError(null);
    setPhoto(null); // one attachment per post
    setVideo(file);
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    setError(null);
    try {
      setPhoto(await compressImageFile(file, 1600));
      setVideo(null); // one attachment per post
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that photo.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to post to the newsfeed.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed && !photo && !video) return;

    setSubmitting(true);
    setError(null);
    try {
      let res: Response;
      if (video) {
        // Videos go up as multipart form data (too big to embed in JSON).
        const form = new FormData();
        form.set("body", trimmed);
        form.set("targetType", targetType);
        if (targetId !== null) form.set("targetId", String(targetId));
        form.set("video", video);
        res = await fetch("/api/posts", { method: "POST", body: form });
      } else {
        res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed, targetType, targetId, imageDataUrl: photo }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that — try again.");
        return;
      }
      setText("");
      setPhoto(null);
      setVideo(null);
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
          <img src={avatarSrc} alt="" />
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
            {photo && (
              <div style={{ position: "relative", margin: "8px 0" }}>
                <img src={photo} alt="Selected photo" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 6 }} />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label="Remove photo"
                  style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer" }}
                >
                  <i className="fa fa-times" />
                </button>
              </div>
            )}
            {videoPreview && (
              <div style={{ position: "relative", margin: "8px 0" }}>
                <video src={videoPreview} controls playsInline style={{ width: "100%", maxHeight: 320, background: "#000", borderRadius: 6 }} />
                <button
                  type="button"
                  onClick={() => setVideo(null)}
                  aria-label="Remove video"
                  style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer" }}
                >
                  <i className="fa fa-times" />
                </button>
              </div>
            )}
            <div className="attachments">
              <ul>
                <li>
                  <i className="fa fa-image" />
                  <label className="fileContainer">
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={submitting} onChange={onPhotoSelected} />
                  </label>
                </li>
                <li>
                  <i className="fa fa-video-camera" />
                  <label className="fileContainer">
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={submitting} onChange={onVideoSelected} />
                  </label>
                </li>
                <li>
                  <button type="submit" disabled={submitting || (!text.trim() && !photo && !video)}>
                    {submitting ? (video ? "Uploading…" : "Posting…") : "Post"}
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
