"use client";

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
  createdAt: string;
};

type Badge = { key: string; label: string };

type StreetTeamSubmitFormProps = {
  isLoggedIn: boolean;
  initialSubmissions: Submission[];
  initialBadges: Badge[];
};

const STATUS_LABELS: Record<Submission["status"], { text: string; color: string }> = {
  pending: { text: "Pending review", color: "#b8860b" },
  approved: { text: "Approved — live in the gallery", color: "#2a8f2a" },
  rejected: { text: "Not approved", color: "#e02020" },
};

// Real backend: POST /api/street-team/submissions (createStreetTeamSubmission
// in src/lib/db.ts). No upload pipeline anywhere in this app, same honest
// limitation as every other media field — mediaUrl is a plain link the
// member pastes in (a photo/video they've already hosted somewhere).
export default function StreetTeamSubmitForm({
  isLoggedIn,
  initialSubmissions,
  initialBadges,
}: StreetTeamSubmitFormProps) {
  const router = useRouter();
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [locationText, setLocationText] = useState("");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [badges, setBadges] = useState(initialBadges);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshMine() {
    try {
      const res = await fetch("/api/street-team/submissions/mine");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
        setBadges(data.badges);
      }
    } catch {
      /* best-effort refresh */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to submit to the Street Team.");
      return;
    }
    if (!mediaUrl.trim()) {
      setError("Paste a link to your photo or video first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/street-team/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          mediaUrl: mediaUrl.trim(),
          caption: caption.trim() || null,
          locationText: locationText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't submit that.");
        return;
      }
      setMediaUrl("");
      setCaption("");
      setLocationText("");
      setNotice("Submitted! An admin will review it before it shows up in the gallery.");
      await refreshMine();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {badges.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {badges.map((b) => (
            <span
              key={b.key}
              style={{
                display: "inline-block",
                background: "#2a8f2a",
                color: "#fff",
                borderRadius: 4,
                padding: "3px 10px",
                marginRight: 8,
                fontSize: 12,
              }}
            >
              🎖 {b.label}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="central-meta item" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Submit a photo or video</h4>
        {error && <p role="alert" style={{ color: "#e02020", marginBottom: 10 }}>{error}</p>}
        {notice && <p style={{ color: "#2a8f2a", marginBottom: 10 }}>{notice}</p>}

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Type</label>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as "photo" | "video")}
            disabled={!isLoggedIn || busy}
          >
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Link to your {mediaType}</label>
          <input
            type="text"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
            disabled={!isLoggedIn || busy}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Caption (optional)</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={!isLoggedIn || busy}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Where was this? (optional)</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            disabled={!isLoggedIn || busy}
            style={{ width: "100%" }}
          />
        </div>

        {isLoggedIn ? (
          <button type="submit" className="lbutton" disabled={busy}>
            {busy ? "Submitting…" : "Submit to Street Team"}
          </button>
        ) : (
          <p style={{ fontSize: 13, color: "#888" }}>Log in to submit.</p>
        )}
      </form>

      {isLoggedIn && submissions.length > 0 && (
        <div className="central-meta item" style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Your submissions</h4>
          {submissions.map((s) => {
            const statusInfo = STATUS_LABELS[s.status];
            return (
              <div key={s.id} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
                <div style={{ fontSize: 13 }}>
                  {s.mediaType === "photo" ? "📷" : "🎥"} {s.caption || s.mediaUrl}
                </div>
                {s.locationText && (
                  <div style={{ fontSize: 12, color: "#999" }}>📍 {s.locationText}</div>
                )}
                <div style={{ fontSize: 12, color: statusInfo.color, marginTop: 4 }}>
                  {statusInfo.text}
                  {s.status === "rejected" && s.reviewNote && ` — ${s.reviewNote}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
