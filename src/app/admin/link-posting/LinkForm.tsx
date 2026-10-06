"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Staff "share a link" box. Posts to the newsfeed through the same /api/posts route
// as every other post: the optional note, then the address on its own line. The
// newsfeed turns the address into a clickable link.
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

export default function LinkForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cleaned = cleanUrl(url);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    if (!cleaned) return setError("Enter a full web address, like https://example.com/story.");
    setBusy(true);
    setError(null);
    try {
      const body = note.trim() ? `${note.trim()}\n\n${cleaned}` : cleaned;
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, targetType: "feed" }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't post that. Try again.");
      setUrl("");
      setNote("");
      setDone(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="link-url" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Web address</label>
      <input
        id="link-url"
        type="text"
        inputMode="url"
        value={url}
        disabled={busy}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/story"
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 4 }}
      />
      <p style={{ color: url && !cleaned ? "#e02020" : "#888", fontSize: 12, marginBottom: 14 }}>
        {url && !cleaned ? "That doesn't look like a web address." : cleaned ? `Will link to: ${cleaned}` : "Only http and https addresses are accepted."}
      </p>
      <label htmlFor="link-note" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Say something about it (optional)</label>
      <textarea
        id="link-note"
        rows={3}
        maxLength={1000}
        value={note}
        disabled={busy}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why should the pueblo read this?"
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 12 }}
      />
      <button type="submit" className="btn btn-primary" disabled={busy || !cleaned}>
        {busy ? "Posting…" : "Post the link to the newsfeed"}
      </button>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {done && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Posted. The link is now on the newsfeed.</p>}
    </form>
  );
}
