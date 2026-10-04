"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  firstName: string;
  lastName: string;
  city: string;
  profilePhotoPath: string | null;
};

const MAX_PHOTO_DIMENSION = 480;
const PHOTO_JPEG_QUALITY = 0.82;

// Same client-side resize approach as ReportSubmitForm's compressImageFile
// — this app stores avatars as real files under public/uploads/avatars
// (see the register route), so a shrunk-down image keeps uploads small
// without needing a separate image-processing service.
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

// Real backend: POST /api/account/profile (src/app/api/account/profile/
// route.ts → updateUserProfile in db.ts). Replaces the dead "edit
// profile" link in Header.tsx.
export default function EditProfileForm({ firstName, lastName, city, profilePhotoPath }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [cityValue, setCityValue] = useState(city);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profilePhotoPath);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    setError(null);
    setProcessingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      setNewPhotoDataUrl(dataUrl);
      setPhotoPreview(dataUrl);
      setPhotoRemoved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that photo.");
    } finally {
      setProcessingPhoto(false);
    }
  }

  function removePhoto() {
    setNewPhotoDataUrl(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!first.trim() || !last.trim()) {
      setError("First and last name are required.");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        firstName: first.trim(),
        lastName: last.trim(),
        city: cityValue.trim(),
      };
      if (newPhotoDataUrl) body.profilePhotoDataUrl = newPhotoDataUrl;
      if (photoRemoved) body.removePhoto = true;

      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save your profile.");
        return;
      }
      setNewPhotoDataUrl(null);
      setPhotoRemoved(false);
      setNotice("Profile updated.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && <div className="alert alert-success" style={{ marginBottom: 16 }}>{notice}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <img
          src={photoPreview || "/images/defaults/default-avatar-male.jpg"}
          alt=""
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoSelected}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="mtr-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingPhoto}
          >
            {processingPhoto ? "Processing…" : "Change photo"}
          </button>
          {photoPreview && (
            <button type="button" onClick={removePhoto} style={{ fontSize: 12, color: "#888", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>First name</label>
        <input className="form-control" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} />
      </div>
      <div className="form-group">
        <label>Last name</label>
        <input className="form-control" value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} />
      </div>
      <div className="form-group">
        <label>City</label>
        <input className="form-control" value={cityValue} onChange={(e) => setCityValue(e.target.value)} maxLength={120} />
      </div>

      <button type="submit" className="mtr-btn signup" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
