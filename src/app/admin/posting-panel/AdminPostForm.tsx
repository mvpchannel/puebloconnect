"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";

// Staff post box for the admin area. Uses the same /api/posts route as the
// newsfeed box, so the post appears on the newsfeed under the signed-in admin's name.
export default function AdminPostForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
    setError(null);
    try {
      setPhoto(await compressImageFile(file, 1600));
      setVideo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that photo.");
    }
  }

  function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      return setError("Video must be an MP4, WebM, or MOV file.");
    }
    if (file.size > 50 * 1024 * 1024) return setError("Video must be smaller than 50MB.");
    setError(null);
    setPhoto(null);
    setVideo(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !photo && !video) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      let res: Response;
      if (video) {
        const form = new FormData();
        form.set("body", body);
        form.set("targetType", "feed");
        form.set("video", video);
        res = await fetch("/api/posts", { method: "POST", body: form });
      } else {
        res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, targetType: "feed", imageDataUrl: photo }),
        });
      }
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't post that. Try again.");
      setText("");
      setPhoto(null);
      setVideo(null);
      setDone(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 28 }}>
      <textarea
        rows={4}
        maxLength={5000}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a post for the newsfeed"
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 10 }}
      />
      {photo && (
        <div style={{ marginBottom: 10 }}>
          <img src={photo} alt="Selected photo" style={{ maxWidth: 260, maxHeight: 180, borderRadius: 4 }} />{" "}
          <button type="button" className="btn btn-default btn-xs" onClick={() => setPhoto(null)}>Remove</button>
        </div>
      )}
      {video && (
        <p style={{ marginBottom: 10 }}>
          Video: {video.name}{" "}
          <button type="button" className="btn btn-default btn-xs" onClick={() => setVideo(null)}>Remove</button>
        </p>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label className="btn btn-default btn-sm" style={{ margin: 0 }}>
          Add photo
          <input type="file" accept="image/*" onChange={onPhoto} disabled={busy} style={{ display: "none" }} />
        </label>
        <label className="btn btn-default btn-sm" style={{ margin: 0 }}>
          Add video
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={onVideo} disabled={busy} style={{ display: "none" }} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || (!text.trim() && !photo && !video)}>
          {busy ? "Posting…" : "Post to the newsfeed"}
        </button>
        <span style={{ color: "#888", fontSize: 12 }}>One photo or one video per post.</span>
      </div>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {done && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Posted. It is now on the newsfeed.</p>}
    </form>
  );
}
