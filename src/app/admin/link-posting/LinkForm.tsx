"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import PhotoCropper from "@/components/admin/PhotoCropper";

function cleanUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const CARD_ASPECTS = [{ key: "card", label: "Card shape", ratio: 1.91 }];
const input = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 12 } as const;
const label = { fontWeight: 600, display: "block", marginBottom: 4 } as const;

export default function LinkForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Card fields appear after "Build the card" (or the manual fallback).
  const [stage, setStage] = useState<"enter" | "edit">("enter");
  const [finalUrl, setFinalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [site, setSite] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [useUpload, setUseUpload] = useState(false);
  const [getUpload, setGetUpload] = useState<(() => string) | null>(null);
  const [fetchNote, setFetchNote] = useState<string | null>(null);

  const cleaned = cleanUrl(url);

  function startManual(msg: string | null) {
    setFinalUrl(cleaned!);
    setSite(new URL(cleaned!).hostname.replace(/^www\./, ""));
    setStage("edit");
    setFetchNote(msg);
  }

  async function build() {
    if (!cleaned) return setError("Enter a full web address, like https://example.com/story.");
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/admin/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        startManual(`${data.error || "Couldn't read that page."} Fill the card in by hand below.`);
        return;
      }
      const p = data.preview;
      setFinalUrl(p.url);
      setTitle(p.title || "");
      setDescription(p.description || "");
      setSite(p.site || "");
      setImageUrl(p.image || null);
      setFetchNote(p.image ? null : "That page has no picture. You can upload one below.");
      setStage("edit");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    if (!title.trim()) return setError("The card needs a title.");
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { url: finalUrl, note, title, description, site };
      if (useUpload && getUpload) payload.imageDataUrl = getUpload();
      else if (imageUrl && !useUpload) payload.imageUrl = imageUrl;
      const res = await fetch("/api/admin/link-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || "Couldn't post that. Try again.");
      setUrl(""); setNote(""); setTitle(""); setDescription(""); setSite(""); setImageUrl(null);
      setUseUpload(false); setGetUpload(null); setStage("enter"); setFetchNote(null);
      setDone(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage("enter"); setError(null); setFetchNote(null);
  }

  if (stage === "enter") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); build(); }}>
        <label htmlFor="link-url" style={label}>Web address</label>
        <input
          id="link-url" type="text" inputMode="url" value={url} disabled={busy}
          onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/story" style={{ ...input, marginBottom: 4 }}
        />
        <p style={{ color: url && !cleaned ? "#e02020" : "#888", fontSize: 12, marginBottom: 14 }}>
          {url && !cleaned ? "That doesn't look like a web address." : "Only http and https addresses are accepted."}
        </p>
        <button type="submit" className="btn btn-primary" disabled={busy || !cleaned}>
          {busy ? "Reading the page…" : "Build the card"}
        </button>
        {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
        {done && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Posted. The link card is now on the newsfeed.</p>}
      </form>
    );
  }

  const shown = useUpload ? null : imageUrl;
  return (
    <div>
      {fetchNote && <p role="status" style={{ background: "#fff7db", padding: 10, borderRadius: 4, marginBottom: 14 }}>{fetchNote}</p>}
      <p style={{ ...label, marginBottom: 8 }}>This is how it will look</p>
      <div style={{ maxWidth: 520, marginBottom: 18 }}>
        <LinkPreviewCard link={{ url: finalUrl, title: title || "Your title", description, image: shown, site }} />
      </div>

      <label htmlFor="card-title" style={label}>Title</label>
      <input id="card-title" type="text" maxLength={140} value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} style={input} />
      <label htmlFor="card-desc" style={label}>Description (optional)</label>
      <textarea id="card-desc" rows={3} maxLength={300} value={description} disabled={busy} onChange={(e) => setDescription(e.target.value)} style={input} />
      <label htmlFor="card-site" style={label}>Site name</label>
      <input id="card-site" type="text" maxLength={60} value={site} disabled={busy} onChange={(e) => setSite(e.target.value)} style={input} />

      <p style={label}>Card picture</p>
      <label style={{ display: "block", marginBottom: 8 }}>
        <input type="checkbox" checked={useUpload} disabled={busy} onChange={(e) => setUseUpload(e.target.checked)} /> Use my own picture instead
        {imageUrl ? " of the page's picture" : ""}
      </label>
      {useUpload && (
        <div style={{ marginBottom: 14 }}>
          <PhotoCropper aspects={CARD_ASPECTS} initialAspect="card" onChange={setGetUpload} />
        </div>
      )}

      <label htmlFor="link-note" style={label}>Say something about it (optional)</label>
      <textarea
        id="link-note" rows={3} maxLength={1000} value={note} disabled={busy}
        onChange={(e) => setNote(e.target.value)} placeholder="Why should the pueblo read this?" style={input}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={busy || !title.trim() || (useUpload && !getUpload)} onClick={post}>
          {busy ? "Posting…" : "Post the card to the newsfeed"}
        </button>
        <button type="button" className="btn btn-default" disabled={busy} onClick={reset}>Start over</button>
      </div>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
