"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoCropper from "@/components/admin/PhotoCropper";

export default function PhotoPostForm() {
  const router = useRouter();
  const [make, setMake] = useState<(() => string) | null>(null);
  const [caption, setCaption] = useState("");
  const [where, setWhere] = useState<"feed" | "story">("feed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!make) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const imageDataUrl = make();
      const res =
        where === "feed"
          ? await fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: caption.trim(), targetType: "feed", imageDataUrl }),
            })
          : await fetch("/api/stories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ caption: caption.trim(), imageDataUrl }),
            });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't post that. Try again.");
      setCaption("");
      setDone(where === "feed" ? "Posted. The photo is now on the newsfeed." : "Posted. The story stays up for 24 hours.");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PhotoCropper onChange={(fn) => setMake(() => fn)} />
      <div style={{ margin: "16px 0 6px", fontWeight: 600 }}>Where should it go?</div>
      <label style={{ marginRight: 18, fontWeight: 400 }}>
        <input type="radio" name="where" checked={where === "feed"} onChange={() => setWhere("feed")} /> Newsfeed post
      </label>
      <label style={{ fontWeight: 400 }}>
        <input type="radio" name="where" checked={where === "story"} onChange={() => setWhere("story")} /> 24-hour story
      </label>
      <textarea
        rows={2}
        maxLength={where === "story" ? 200 : 5000}
        value={caption}
        disabled={busy}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={where === "story" ? "Caption (optional, up to 200 characters)" : "Caption (optional)"}
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, margin: "10px 0 12px" }}
      />
      <button type="submit" className="btn btn-primary" disabled={busy || !make}>
        {busy ? "Posting…" : where === "feed" ? "Post the photo" : "Post the story"}
      </button>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {done && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>{done}</p>}
    </form>
  );
}
