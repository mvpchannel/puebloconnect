"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoCropper, { type CropAspect } from "@/components/admin/PhotoCropper";

const SQUARE: CropAspect[] = [{ key: "square", label: "Square 1:1", ratio: 1 }];

type Initial = { firstName: string; lastName: string; city: string; bio: string; photo: string | null };

// Staff edit their own profile with the same route members use (POST /api/account/profile).
export default function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [city, setCity] = useState(initial.city);
  const [bio, setBio] = useState(initial.bio);
  const [make, setMake] = useState<(() => string) | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setError("First and last name are required.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = { firstName, lastName, city, bio };
      if (make) payload.profilePhotoDataUrl = make();
      else if (removePhoto) payload.removePhoto = true;
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Couldn't save. Try again.");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 14 } as const;
  const label = { fontWeight: 600, display: "block", marginBottom: 4 } as const;

  return (
    <form onSubmit={submit}>
      <label htmlFor="ep-first" style={label}>First name</label>
      <input id="ep-first" style={field} value={firstName} maxLength={60} onChange={(e) => setFirstName(e.target.value)} disabled={busy} />
      <label htmlFor="ep-last" style={label}>Last name</label>
      <input id="ep-last" style={field} value={lastName} maxLength={60} onChange={(e) => setLastName(e.target.value)} disabled={busy} />
      <label htmlFor="ep-city" style={label}>City</label>
      <input id="ep-city" style={field} value={city} maxLength={120} onChange={(e) => setCity(e.target.value)} disabled={busy} />
      <label htmlFor="ep-bio" style={label}>About you</label>
      <textarea id="ep-bio" rows={4} style={field} value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} disabled={busy} />

      <div style={label}>Profile photo</div>
      {initial.photo && !removePhoto && !make && (
        <p style={{ marginBottom: 8 }}>
          <img src={initial.photo} alt="Current profile photo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", verticalAlign: "middle" }} />{" "}
          <button type="button" className="btn btn-default btn-xs" onClick={() => setRemovePhoto(true)}>Remove photo</button>
        </p>
      )}
      {removePhoto && !make && <p style={{ color: "#b45309" }}>The photo will be removed when you save.</p>}
      <div style={{ marginBottom: 16 }}>
        <PhotoCropper aspects={SQUARE} initialAspect="square" onChange={(fn) => setMake(() => fn)} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      {error && <p role="alert" style={{ color: "#e02020", marginTop: 10 }}>{error}</p>}
      {saved && <p role="status" style={{ color: "#1f7a3a", marginTop: 10 }}>Saved.</p>}
    </form>
  );
}
