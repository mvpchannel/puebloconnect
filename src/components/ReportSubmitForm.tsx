"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReportCategory = "street_light" | "dumped_item" | "park_maintenance" | "traffic_hazard" | "other";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  street_light: "Street light outage",
  dumped_item: "Dumped item / illegal dumping",
  park_maintenance: "Park maintenance",
  traffic_hazard: "Traffic hazard",
  other: "Other",
};

// Real backend: POST /api/reports (createNeighborhoodReport in
// src/lib/db.ts). No upload pipeline anywhere in this app — photoUrl is
// a plain link the member pastes in, same honest limitation as every
// other media field (see StreetTeamSubmitForm). "Use my location"
// captures real browser coordinates for this one report only — it
// doesn't touch the member's saved profile location.
export default function ReportSubmitForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [category, setCategory] = useState<ReportCategory>("street_light");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [locationText, setLocationText] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function useMyLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support sharing location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — you can still describe it below.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to submit a report.");
      return;
    }
    if (!description.trim()) {
      setError("Describe the issue.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          locationText: locationText.trim() || null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't submit that report.");
        return;
      }
      setDescription("");
      setPhotoUrl("");
      setLocationText("");
      setCoords(null);
      setNotice("Report submitted — you're tracking it.");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="central-meta item">
      <div style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Report an Issue</h4>
        {!isLoggedIn && (
          <p style={{ color: "#888" }}>
            <a href="/login">Log in</a> to submit a report.
          </p>
        )}
        {error && <p role="alert" style={{ color: "#c0392b", marginBottom: 10 }}>{error}</p>}
        {notice && <p style={{ color: "#2a8f2a", marginBottom: 10 }}>{notice}</p>}
        <form onSubmit={submit}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="form-control"
            style={{ marginBottom: 8 }}
            disabled={!isLoggedIn}
          >
            {(Object.keys(CATEGORY_LABELS) as ReportCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's going on? Be as specific as you can."
            maxLength={1000}
            rows={3}
            className="form-control"
            style={{ marginBottom: 8 }}
            disabled={!isLoggedIn}
          />
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Nearest address or intersection (optional)"
            maxLength={200}
            className="form-control"
            style={{ marginBottom: 8 }}
            disabled={!isLoggedIn}
          />
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Link to a photo (optional)"
            maxLength={2000}
            className="form-control"
            style={{ marginBottom: 8 }}
            disabled={!isLoggedIn}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={useMyLocation}
              disabled={!isLoggedIn || locating}
            >
              <i className="fa fa-map-marker" style={{ marginRight: 6 }} />
              {locating ? "Locating…" : "Use my location"}
            </button>
            {coords && <span style={{ color: "#2a8f2a", fontSize: 13 }}>Location attached ✓</span>}
          </div>
          <button className="mtr-btn signup" type="submit" disabled={!isLoggedIn || busy || !description.trim()}>
            <span>{busy ? "Submitting…" : "Submit Report"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
