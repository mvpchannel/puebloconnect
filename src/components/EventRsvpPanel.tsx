"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventRsvpPanelProps = {
  slug: string;
  isLoggedIn: boolean;
  initialStatus: "going" | "interested" | null;
  initialCheckedIn: boolean;
};

// Real backend: POST /api/events/:slug/rsvp and /checkin, backed by the
// event_rsvps / event_checkins tables in src/lib/db.ts. RSVP and check-in
// are deliberately independent — see checkInToEvent's comment in db.ts.
export default function EventRsvpPanel({
  slug,
  isLoggedIn,
  initialStatus,
  initialCheckedIn,
}: EventRsvpPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRsvp(next: "going" | "interested" | "none") {
    if (!isLoggedIn) {
      setError("Log in to RSVP.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't update your RSVP.");
        return;
      }
      setStatus(data.status);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    if (!isLoggedIn) {
      setError("Log in to check in.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/checkin`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't check in.");
        return;
      }
      setCheckedIn(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", margin: "0 0 8px" }}>
          {error}
        </p>
      )}
      <div style={{ marginBottom: 8 }}>
        <button
          className={status === "going" ? "mtr-btn signup" : "mtr-btn signin"}
          type="button"
          disabled={busy}
          onClick={() => setRsvp(status === "going" ? "none" : "going")}
          style={{ marginRight: 6 }}
        >
          <span>{status === "going" ? "✓ Going" : "I'm going"}</span>
        </button>
        <button
          className={status === "interested" ? "mtr-btn signup" : "mtr-btn signin"}
          type="button"
          disabled={busy}
          onClick={() => setRsvp(status === "interested" ? "none" : "interested")}
        >
          <span>{status === "interested" ? "✓ Interested" : "Interested"}</span>
        </button>
      </div>
      <button className="mtr-btn signin" type="button" disabled={busy || checkedIn} onClick={handleCheckIn}>
        <span>{checkedIn ? "✓ Checked in" : "Check in"}</span>
      </button>
    </div>
  );
}
