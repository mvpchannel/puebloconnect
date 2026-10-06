"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Linkified from "@/components/Linkified";
import PhotoCropper from "@/components/admin/PhotoCropper";

type Author = { name: string; photo: string };

// Write a post, see roughly how it will look on the newsfeed, then publish it from here.
// The preview is a simplified card: the real newsfeed styling can differ slightly.
export default function PreviewForm({ author }: { author: Author }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [make, setMake] = useState<(() => string) | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Encoding the picture on every drag step would be slow, so the preview is refreshed once the person pauses.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onCrop(fn: (() => string) | null) {
    setMake(() => fn);
    if (timer.current) clearTimeout(timer.current);
    if (!fn) return setPreview(null);
    timer.current = setTimeout(() => setPreview(fn()), 150);
  }

  const empty = !text.trim() && !preview;

  async function publish() {
    if (empty) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim(), targetType: "feed", imageDataUrl: make ? make() : null }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't post that. Try again.");
      setText("");
      setDone(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 340px", minWidth: 280 }}>
        <label htmlFor="pp-text" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Post text</label>
        <textarea
          id="pp-text"
          rows={6}
          maxLength={5000}
          value={text}
          disabled={busy}
          onChange={(e) => { setText(e.target.value); setDone(false); }}
          placeholder="Write the post"
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 14 }}
        />
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Photo (optional)</div>
        <PhotoCropper onChange={onCrop} />
      </div>

      <div style={{ flex: "1 1 340px", minWidth: 280 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview</div>
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <img src={author.photo} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <div style={{ fontWeight: 600 }}>{author.name}</div>
              <div style={{ color: "#999", fontSize: 12 }}>just now</div>
            </div>
          </div>
          {empty ? (
            <p style={{ color: "#aaa", margin: 0 }}>Your post will appear here as you type.</p>
          ) : (
            <>
              {text.trim() && (
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "0 0 8px" }}>
                  <Linkified text={text.trim()} />
                </p>
              )}
              {preview && <img src={preview} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 6 }} />}
            </>
          )}
        </div>
        <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy || empty} onClick={publish}>
          {busy ? "Posting…" : "Looks good, post it"}
        </button>
        {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
        {done && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Posted. It is now on the newsfeed.</p>}
      </div>
    </div>
  );
}
