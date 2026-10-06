"use client";

import { useState } from "react";

const LABELS: Record<string, string> = { new: "New", read: "Read", replied: "Replied", closed: "Closed" };

export default function StatusControl({ id, initial }: { id: number; initial: string }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: string) {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) setStatus(next);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <select value={status} disabled={busy} onChange={(e) => change(e.target.value)} aria-label="Message status">
        {Object.entries(LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {error && <div style={{ color: "#e02020", fontSize: 12 }}>Couldn&rsquo;t save. Try again.</div>}
    </div>
  );
}
