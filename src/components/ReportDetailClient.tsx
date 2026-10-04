"use client";

import { useState } from "react";

type ReportCategory = "street_light" | "dumped_item" | "park_maintenance" | "traffic_hazard" | "other";
type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved" | "closed";

type Report = {
  id: number;
  reporterName: string;
  category: ReportCategory;
  description: string;
  photoUrl: string | null;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
  followerCount: number;
  followedByViewer: boolean;
};

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  street_light: "Street light outage",
  dumped_item: "Dumped item / illegal dumping",
  park_maintenance: "Park maintenance",
  traffic_hazard: "Traffic hazard",
  other: "Other",
};

const STATUS_FLOW: ReportStatus[] = ["submitted", "acknowledged", "in_progress", "resolved", "closed"];
const STATUS_LABELS: Record<ReportStatus, { text: string; color: string }> = {
  submitted: { text: "Submitted", color: "#999" },
  acknowledged: { text: "Acknowledged", color: "#1877d1" },
  in_progress: { text: "In Progress", color: "#f5a623" },
  resolved: { text: "Resolved", color: "#2a8f2a" },
  closed: { text: "Closed", color: "#999" },
};

// Real backend: GET/POST /api/reports/:id, .../follow, .../status.
// Status advances are admin-only (this app's roles are a flat
// member/admin — there's no separate "Community Moderator" tier),
// surfaced inline here the same way Pueblo Live's Host Tools panel
// works, rather than a separate /admin/reports page.
export default function ReportDetailClient({ initialReport, isAdmin, isLoggedIn }: { initialReport: Report; isAdmin: boolean; isLoggedIn: boolean }) {
  const [report, setReport] = useState(initialReport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function toggleFollow() {
    if (!isLoggedIn) {
      setError("Log in to track this report.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/follow`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReport((prev) => ({
          ...prev,
          followedByViewer: data.following,
          followerCount: prev.followerCount + (data.following ? 1 : -1),
        }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function advanceStatus(newStatus: ReportStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't update that report.");
        return;
      }
      setReport((prev) => ({ ...prev, status: data.report.status, resolutionNote: data.report.resolutionNote }));
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  const nextStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(report.status) + 1);

  return (
    <div className="central-meta item">
      <div style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 4px" }}>{CATEGORY_LABELS[report.category]}</h3>
        <span
          style={{
            fontSize: 12,
            fontWeight: "bold",
            color: STATUS_LABELS[report.status].color,
            border: `1px solid ${STATUS_LABELS[report.status].color}`,
            borderRadius: 3,
            padding: "2px 8px",
          }}
        >
          {STATUS_LABELS[report.status].text}
        </span>

        <p style={{ margin: "16px 0" }}>{report.description}</p>

        {report.photoUrl && (
          <img src={report.photoUrl} alt="" style={{ maxWidth: "100%", borderRadius: 6, marginBottom: 16 }} />
        )}

        <p style={{ color: "#888", fontSize: 13 }}>
          {report.locationText && <>📍 {report.locationText}<br /></>}
          Reported by {report.reporterName} on {new Date(report.createdAt).toLocaleDateString()}
        </p>

        {report.resolutionNote && (
          <div style={{ background: "#f5f8fb", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
            <strong>Update:</strong> {report.resolutionNote}
          </div>
        )}

        {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button className={report.followedByViewer ? "mtr-btn signup" : "mtr-btn signin"} type="button" onClick={toggleFollow} disabled={busy}>
            <span>
              <i className="fa fa-bell" style={{ marginRight: 6 }} />
              {report.followedByViewer ? "Tracking ✓" : "Track this report"}
            </span>
          </button>
          <span style={{ color: "#999", fontSize: 13 }}>{report.followerCount} tracking</span>
        </div>

        {isAdmin && nextStatuses.length > 0 && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
            <h5 style={{ marginBottom: 8 }}>Admin: update status</h5>
            <p style={{ color: "#888", fontSize: 12.5, marginBottom: 8 }}>
              Everyone tracking this report gets an email the moment you advance it.
            </p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note to include in the notification"
              maxLength={500}
              className="form-control"
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {nextStatuses.map((s) => (
                <button key={s} type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => advanceStatus(s)}>
                  Mark {STATUS_LABELS[s].text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
