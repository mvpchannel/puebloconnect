"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ReportCategory = "street_light" | "dumped_item" | "park_maintenance" | "traffic_hazard" | "other";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  street_light: "Street light outage",
  dumped_item: "Dumped item / illegal dumping",
  park_maintenance: "Park maintenance",
  traffic_hazard: "Traffic hazard",
  other: "Other",
};

const MAX_PHOTO_DIMENSION = 1280;
const PHOTO_JPEG_QUALITY = 0.72;

// Resize/compress a captured or uploaded photo client-side before it
// ever reaches the server — this app has no object storage (see the
// photo_url column comment in db.ts), so a photo is stored as a
// data: URL straight in the database. An uncompressed phone photo can
// run 5-10MB; this keeps a typical shot to a few hundred KB so the
// report stays fast to submit and light to load back.
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Real backend: POST /api/reports (createNeighborhoodReport in
// src/lib/db.ts). "Take Photo" opens the device camera directly on a
// phone (capture="environment") or a file picker on desktop — the
// image is compressed and attached as a real data: URL, not a fake
// upload. "Use my location" captures real browser coordinates for
// this one report only — it doesn't touch the member's saved profile
// location.
export default function ReportSubmitForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<ReportCategory>("street_light");
  const [description, setDescription] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoLink, setPhotoLink] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    setError(null);
    setProcessingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      setPhotoDataUrl(dataUrl);
      setPhotoLink("");
      setShowLinkInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that photo.");
    } finally {
      setProcessingPhoto(false);
    }
  }

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
    const photoUrl = photoDataUrl || photoLink.trim();
    // A photo speaks for itself — if one's attached and the member
    // didn't type anything, don't make a 1-tap report demand an essay.
    const resolvedDescription = description.trim() || (photoUrl ? `${CATEGORY_LABELS[category]} — reported with a photo.` : "");
    if (!resolvedDescription) {
      setError("Describe the issue, or attach a photo.");
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
          description: resolvedDescription,
          photoUrl: photoUrl || null,
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
      setPhotoDataUrl("");
      setPhotoLink("");
      setShowLinkInput(false);
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
        <h4 style={{ marginBottom: 2 }}>See Something? Say Something.</h4>
        <p style={{ color: "#888", marginBottom: 12, fontSize: 13 }}>Snap a photo and we'll get it on the radar.</p>
        {!isLoggedIn && (
          <p style={{ color: "#888" }}>
            <a href="/login">Log in</a> to submit a report.
          </p>
        )}
        {error && <p role="alert" style={{ color: "#c0392b", marginBottom: 10 }}>{error}</p>}
        {notice && <p style={{ color: "#2a8f2a", marginBottom: 10 }}>{notice}</p>}
        <form onSubmit={submit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoSelected}
            style={{ display: "none" }}
            disabled={!isLoggedIn}
          />

          {photoDataUrl ? (
            <div style={{ position: "relative", marginBottom: 10, display: "inline-block" }}>
              <img src={photoDataUrl} alt="" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block" }} />
              <button
                type="button"
                onClick={() => setPhotoDataUrl("")}
                title="Remove photo"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                }}
              >
                <i className="fa fa-times" />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <button
                type="button"
                className="mtr-btn signup"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isLoggedIn || processingPhoto}
              >
                <span>
                  <i className="fa fa-camera" style={{ marginRight: 6 }} />
                  {processingPhoto ? "Processing…" : "Take Photo"}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-default"
                onClick={() => setShowLinkInput((v) => !v)}
                disabled={!isLoggedIn}
              >
                Or paste a photo link
              </button>
            </div>
          )}

          {showLinkInput && !photoDataUrl && (
            <input
              type="url"
              value={photoLink}
              onChange={(e) => setPhotoLink(e.target.value)}
              placeholder="Link to a photo"
              maxLength={2000}
              className="form-control"
              style={{ marginBottom: 10 }}
              disabled={!isLoggedIn}
            />
          )}

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
            placeholder={photoDataUrl || photoLink ? "Add a note (optional — the photo says a lot)" : "What's going on? Be as specific as you can."}
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
          <button className="mtr-btn signup" type="submit" disabled={!isLoggedIn || busy || processingPhoto}>
            <span>{busy ? "Submitting…" : "Submit Report"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
