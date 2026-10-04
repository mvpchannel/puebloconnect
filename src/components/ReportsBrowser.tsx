"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReportCategory = "street_light" | "dumped_item" | "park_maintenance" | "traffic_hazard" | "other";
type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved" | "closed";

type Report = {
  id: number;
  reporterName: string;
  category: ReportCategory;
  description: string;
  photoUrl: string | null;
  locationText: string | null;
  status: ReportStatus;
  createdAt: string;
  followerCount: number;
  distanceMiles?: number;
};

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  street_light: "Street light outage",
  dumped_item: "Dumped item",
  park_maintenance: "Park maintenance",
  traffic_hazard: "Traffic hazard",
  other: "Other",
};

const CATEGORY_ICONS: Record<ReportCategory, string> = {
  street_light: "fa-lightbulb-o",
  dumped_item: "fa-trash",
  park_maintenance: "fa-tree",
  traffic_hazard: "fa-exclamation-triangle",
  other: "fa-flag",
};

const STATUS_LABELS: Record<ReportStatus, { text: string; color: string }> = {
  submitted: { text: "Submitted", color: "#999" },
  acknowledged: { text: "Acknowledged", color: "#1877d1" },
  in_progress: { text: "In Progress", color: "#f5a623" },
  resolved: { text: "Resolved", color: "#2a8f2a" },
  closed: { text: "Closed", color: "#999" },
};

export default function ReportsBrowser({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"all" | "nearby">("all");
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "all") return;
    let cancelled = false;
    setLoading(true);
    const qs = category ? `?category=${category}` : "";
    fetch(`/api/reports${qs}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setReports(data.reports || []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, mode]);

  async function searchNearby() {
    setMode("nearby");
    setNearbyError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reports/nearby?radiusMiles=5");
      const data = await res.json();
      if (!res.ok) {
        setNearbyError(data.error || "Couldn't search nearby.");
        setMode("all");
        return;
      }
      setReports(data.reports || []);
    } catch {
      setNearbyError("Couldn't reach the server.");
      setMode("all");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="central-meta item" style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className={mode === "all" ? "mtr-btn signup" : "mtr-btn signin"}
            onClick={() => setMode("all")}
          >
            <span>All Issues</span>
          </button>
          {isLoggedIn && (
            <button type="button" className={mode === "nearby" ? "mtr-btn signup" : "mtr-btn signin"} onClick={searchNearby}>
              <span>
                <i className="fa fa-map-marker" style={{ marginRight: 6 }} />
                Near Me
              </span>
            </button>
          )}
          {mode === "all" && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory | "")}
              className="form-control"
              style={{ maxWidth: 220, marginLeft: "auto" }}
            >
              <option value="">All categories</option>
              {(Object.keys(CATEGORY_LABELS) as ReportCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </div>
        {nearbyError && <p role="alert" style={{ color: "#c0392b", marginTop: 10 }}>{nearbyError}</p>}
        {mode === "nearby" && !nearbyError && (
          <p style={{ color: "#888", marginTop: 10, marginBottom: 0, fontSize: 13 }}>
            Open issues within 5 miles of your saved location.
          </p>
        )}
      </div>

      {loading && (
        <div className="central-meta item">
          <div style={{ padding: 24, textAlign: "center", color: "#888" }}>Loading…</div>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="central-meta item">
          <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
            {mode === "nearby" ? "No open issues within 5 miles of you." : "No reports yet."}
          </div>
        </div>
      )}

      {!loading &&
        reports.map((r) => (
          <div className="central-meta item" key={r.id}>
            <Link
              href={`/reports/${r.id}`}
              style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", color: "inherit" }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#f1f1f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#555",
                  fontSize: 16,
                }}
              >
                <i className={`fa ${CATEGORY_ICONS[r.category]}`} />
              </div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: "0 0 4px" }}>
                  {CATEGORY_LABELS[r.category]}
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 11,
                      fontWeight: "bold",
                      color: STATUS_LABELS[r.status].color,
                      border: `1px solid ${STATUS_LABELS[r.status].color}`,
                      borderRadius: 3,
                      padding: "1px 7px",
                      verticalAlign: "middle",
                    }}
                  >
                    {STATUS_LABELS[r.status].text}
                  </span>
                </h5>
                <p style={{ margin: "0 0 4px", color: "#333" }}>{r.description}</p>
                <span style={{ color: "#999", fontSize: 12.5 }}>
                  {r.locationText ? `${r.locationText} · ` : ""}
                  {typeof r.distanceMiles === "number" ? `${r.distanceMiles} mi away · ` : ""}
                  Reported by {r.reporterName}
                  {r.followerCount > 1 ? ` · ${r.followerCount} tracking` : ""}
                </span>
              </div>
            </Link>
          </div>
        ))}
    </div>
  );
}
