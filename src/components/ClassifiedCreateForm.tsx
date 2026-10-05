"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSIFIED_CATEGORIES } from "@/lib/classified-categories";
import { compressImageFile } from "@/lib/compress-image";

// Real backend: POST /api/classifieds (src/app/api/classifieds/route.ts).
export default function ClassifiedCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("for-sale");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priceText, setPriceText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
    try {
      setPhoto(await compressImageFile(file, 1200));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that photo.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/classifieds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, priceText, imageDataUrl: photo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't post that listing.");
        return;
      }
      router.push(`/classifieds/${data.classified.id}`);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, marginBottom: 10 };

  if (!open) {
    return (
      <div className="central-meta item" style={{ padding: 16, marginBottom: 16 }}>
        <button className="mtr-btn signup" type="button" onClick={() => setOpen(true)}>
          <span>+ Post a listing</span>
        </button>
      </div>
    );
  }

  return (
    <div className="central-meta item" style={{ padding: 20, marginBottom: 16 }}>
      <h4 style={{ marginBottom: 12 }}>Post a listing</h4>
      <form onSubmit={submit}>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={field} aria-label="Category">
          {CLASSIFIED_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input style={field} placeholder="Title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} required />
        <input style={field} placeholder="Price (optional, e.g. $50 or Free)" value={priceText} maxLength={30} onChange={(e) => setPriceText(e.target.value)} />
        <textarea style={{ ...field, minHeight: 110 }} placeholder="Describe it — condition, location, how to reach you" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} required />
        {photo ? (
          <div style={{ marginBottom: 10 }}>
            <img src={photo} alt="Selected" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 6, display: "block", marginBottom: 6 }} />
            <button type="button" onClick={() => setPhoto(null)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", padding: 0 }}>Remove photo</button>
          </div>
        ) : (
          <label style={{ display: "block", marginBottom: 10, cursor: "pointer", color: "#088dcd" }}>
            <i className="fa fa-image" /> Add a photo (optional)
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPhoto} />
          </label>
        )}
        {error && <p role="alert" style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        <p style={{ fontSize: 12, color: "#999" }}>Free to post. Listings stay up for 30 days; up to 5 per day.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="mtr-btn signup" type="submit" disabled={busy || !title.trim() || !body.trim()}>
            <span>{busy ? "Posting…" : "Post listing"}</span>
          </button>
          <button className="mtr-btn signin" type="button" onClick={() => setOpen(false)} disabled={busy}>
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
}
