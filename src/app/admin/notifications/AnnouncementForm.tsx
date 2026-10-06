"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX = 300;

export default function AnnouncementForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    if (!window.confirm("Send this to every active member now? You can take it back afterwards, but anyone who already saw it will have seen it.")) return;
    setBusy(true);
    setError(null);
    setSentTo(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't send. Try again.");
      setText("");
      setSentTo(data.sentTo);
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
        rows={3}
        maxLength={MAX}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a short announcement for every member"
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? "Sending…" : "Send to all members"}
        </button>
        <span style={{ color: "#888", fontSize: 12 }}>{text.length}/{MAX}</span>
      </div>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {sentTo !== null && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Sent to {sentTo} member{sentTo === 1 ? "" : "s"}.</p>}
    </form>
  );
}
