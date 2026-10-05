"use client";

import { useState } from "react";

// POST /api/account/delete — permanent. Asks for the password and a typed
// DELETE, then sends the member to the home page (their session is gone).
export default function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't delete your account.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <p style={{ color: "#666", fontSize: 14 }}>
          Permanently delete your account and personal data. This can&apos;t be undone.
        </p>
        <button type="button" className="mtr-btn signin" onClick={() => setOpen(true)}>
          <span style={{ color: "#e02020" }}>Delete my account…</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p style={{ color: "#444", fontSize: 14 }}>
        This permanently removes your profile, posts, comments, messages, friends, likes, RSVPs, rewards and
        uploaded photos, and signs you out everywhere. It can&apos;t be undone. Events and groups you created
        stay up, credited to &ldquo;Deleted member&rdquo;.
      </p>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}
      <div className="form-group">
        <input
          type="password"
          id="delete-password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="control-label" htmlFor="delete-password">Your password</label>
        <i className="mtrl-select" />
      </div>
      <div className="form-group">
        <input
          type="text"
          id="delete-confirm"
          required
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <label className="control-label" htmlFor="delete-confirm">Type DELETE to confirm</label>
        <i className="mtrl-select" />
      </div>
      <div className="submit-btns">
        <button
          className="mtr-btn signup"
          type="submit"
          disabled={busy || !password || confirm !== "DELETE"}
          style={{ background: "#e02020" }}
        >
          <span>{busy ? "Deleting…" : "Delete my account forever"}</span>
        </button>
        <button className="mtr-btn signin" type="button" onClick={() => setOpen(false)}>
          <span>Cancel</span>
        </button>
      </div>
    </form>
  );
}
