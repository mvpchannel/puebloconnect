"use client";

import { useState } from "react";

// Real backend: GET/POST /api/account/notification-preferences — this
// route already existed (see its header comment: "no dedicated settings
// PAGE wired to this yet"), written ahead of this page specifically so
// this feature wouldn't have to invent its own API when it arrived.
// Security/account email (verification, password reset, password-changed)
// is never gated by this — only marketing email is.
export default function NotificationPreferencesForm({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !optIn;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/account/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingEmailsOptIn: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save that.");
        return;
      }
      setOptIn(next);
      setNotice(next ? "You're subscribed to Pueblo Connect news and offers." : "Unsubscribed.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && <div className="alert alert-success" style={{ marginBottom: 16 }}>{notice}</div>}

      <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
        Account email — verification, password resets, and security notices — always sends and
        can&apos;t be turned off here.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={optIn} onChange={toggle} disabled={busy} />
        <span>Send me Pueblo Connect news, events, and offers by email</span>
      </label>
    </div>
  );
}
