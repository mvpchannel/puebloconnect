"use client";

import { useState } from "react";
import { SOCIAL_NETWORKS } from "@/lib/social-links";

export default function SocialLinksForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/site-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: values }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't save. Try again.");
      setSaved(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {SOCIAL_NETWORKS.map((n) => (
        <div key={n.key} style={{ marginBottom: 14 }}>
          <label htmlFor={n.key} style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
            <i className={`fa ${n.icon}`} /> {n.label}
          </label>
          <input
            id={n.key}
            type="text"
            inputMode="url"
            value={values[n.key] ?? ""}
            disabled={busy}
            onChange={(e) => { setValues({ ...values, [n.key]: e.target.value }); setSaved(false); }}
            placeholder={n.example}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>
      ))}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save links"}</button>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {saved && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Saved. The footer now shows these links.</p>}
    </form>
  );
}
