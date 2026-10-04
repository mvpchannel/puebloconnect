"use client";

import { useState } from "react";

type Props = {
  targetUserId: number;
  initialIsFriend: boolean;
  // undefined = no pending request either way; otherwise who sent it.
  initialPendingDirection: "incoming" | "outgoing" | undefined;
  initialPendingRequestId: number | null;
};

// Shown on another member's /profile/[userId] page — the viewer's own
// profile shows the "Customize my page" header button instead (see
// Header.tsx), not these. Real backend: POST /api/friends/requests (same
// route Header.tsx's search dropdown uses) and POST
// /api/friends/requests/:id to accept an incoming request from here.
export default function ProfileActions({
  targetUserId,
  initialIsFriend,
  initialPendingDirection,
  initialPendingRequestId,
}: Props) {
  const [isFriend, setIsFriend] = useState(initialIsFriend);
  const [pendingDirection, setPendingDirection] = useState(initialPendingDirection);
  const [pendingRequestId, setPendingRequestId] = useState(initialPendingRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send that request.");
        return;
      }
      setPendingDirection("outgoing");
      setPendingRequestId(data.request?.id ?? null);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptRequest() {
    if (!pendingRequestId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/friends/requests/${pendingRequestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't accept that request.");
        return;
      }
      setIsFriend(true);
      setPendingDirection(undefined);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {error && <span style={{ color: "#e02020", fontSize: 12 }}>{error}</span>}
      <a className="mtr-btn signin" href={`/messages?to=${targetUserId}`}>
        <span>Message</span>
      </a>
      {isFriend ? (
        <button className="mtr-btn" type="button" disabled>
          <span>Friends</span>
        </button>
      ) : pendingDirection === "outgoing" ? (
        <button className="mtr-btn" type="button" disabled>
          <span>Request sent</span>
        </button>
      ) : pendingDirection === "incoming" ? (
        <button className="mtr-btn signup" type="button" onClick={acceptRequest} disabled={busy}>
          <span>{busy ? "Accepting…" : "Accept friend request"}</span>
        </button>
      ) : (
        <button className="mtr-btn signup" type="button" onClick={sendRequest} disabled={busy}>
          <span>{busy ? "Sending…" : "Add Friend"}</span>
        </button>
      )}
    </div>
  );
}
