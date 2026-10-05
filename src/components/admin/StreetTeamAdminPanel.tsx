"use client";
import { renderableUrl } from "@/lib/safe-url";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Submission = {
  id: number;
  mediaType: "photo" | "video";
  mediaUrl: string;
  caption: string | null;
  locationText: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  submitter: { id: number; username: string; name: string };
};

type StreetTeamAdminPanelProps = {
  initialPending: Submission[];
};

// Admin review queue for Pueblo Street Team submissions. Real backend:
// GET /api/admin/street-team/submissions, POST .../:id/review. Approving
// or rejecting removes the item from this pending list immediately.
export default function StreetTeamAdminPanel({ initialPending }: StreetTeamAdminPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function review(id: number, decision: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/street-team/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: noteDrafts[id]?.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't record that decision.");
        return;
      }
      setPending((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}

      {pending.length === 0 && (
        <p style={{ color: "#888" }}>Nothing waiting for review.</p>
      )}

      {pending.map((s) => (
        <div
          key={s.id}
          style={{ marginBottom: 16, padding: 16, border: "1px solid #eee", borderRadius: 4 }}
        >
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            {s.mediaType === "photo" ? "📷" : "🎥"}{" "}
            <a href={renderableUrl(s.mediaUrl) ?? "#"} target="_blank" rel="noopener noreferrer nofollow">
              {s.mediaUrl}
            </a>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            Submitted by {s.submitter.name} ({s.submitter.username})
            {s.locationText && ` · 📍 ${s.locationText}`}
          </div>
          {s.caption && <div style={{ marginBottom: 8 }}>{s.caption}</div>}
          <input
            type="text"
            placeholder="Optional note (e.g. reason for rejecting)"
            maxLength={300}
            value={noteDrafts[s.id] ?? ""}
            onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
            className="form-control"
            style={{ marginBottom: 8, maxWidth: 400 }}
            disabled={busyId === s.id}
          />
          <button
            className="btn btn-sm btn-success"
            type="button"
            disabled={busyId === s.id}
            onClick={() => review(s.id, "approved")}
            style={{ marginRight: 8 }}
          >
            Approve
          </button>
          <button
            className="btn btn-sm btn-danger"
            type="button"
            disabled={busyId === s.id}
            onClick={() => review(s.id, "rejected")}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}
