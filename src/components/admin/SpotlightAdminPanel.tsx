"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";

export type SpotlightItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  ownerName: string;
  body: string;
  businessId: number | null;
  businessName: string | null;
  heroImagePath: string | null;
  sponsored: boolean;
  published: boolean;
};

type Props = {
  spotlights: SpotlightItem[];
  businesses: { id: number; name: string }[];
};

const EMPTY = { title: "", summary: "", ownerName: "", body: "", businessId: "", sponsored: false, publish: false };

// Admin editor for Business Spotlight. Real backend:
// /api/admin/spotlights (create) and /api/admin/spotlights/:id (edit/delete).
export default function SpotlightAdminPanel({ spotlights, businesses }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [heroDataUrl, setHeroDataUrl] = useState<string | null>(null);
  const [removeHero, setRemoveHero] = useState(false);
  const [currentHero, setCurrentHero] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(s: SpotlightItem) {
    setEditingId(s.id);
    setForm({
      title: s.title, summary: s.summary, ownerName: s.ownerName, body: s.body,
      businessId: s.businessId ? String(s.businessId) : "", sponsored: s.sponsored, publish: s.published,
    });
    setCurrentHero(s.heroImagePath);
    setHeroDataUrl(null);
    setRemoveHero(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setHeroDataUrl(null);
    setRemoveHero(false);
    setCurrentHero(null);
  }

  async function onHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setHeroDataUrl(await compressImageFile(file, 1600));
      setRemoveHero(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  }

  async function save(e: FormEvent, publishOverride?: boolean) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        businessId: form.businessId || null,
        publish: publishOverride ?? form.publish,
        heroImageDataUrl: heroDataUrl,
        removeHeroImage: removeHero,
      };
      const res = await fetch(editingId ? `/api/admin/spotlights/${editingId}` : "/api/admin/spotlights", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save that spotlight.");
        return;
      }
      reset();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this spotlight?")) return;
    const res = await fetch(`/api/admin/spotlights/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) reset();
      router.refresh();
    } else {
      setError("Couldn't delete that spotlight.");
    }
  }

  const shownHero = heroDataUrl ?? (removeHero ? null : currentHero);

  return (
    <div>
      {error && <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>{error}</p>}

      <form onSubmit={(e) => save(e)} style={{ marginBottom: 28, maxWidth: 760 }}>
        <h5 style={{ marginBottom: 10 }}>{editingId ? "Edit spotlight" : "New spotlight"}</h5>
        <input className="form-control" style={{ marginBottom: 8 }} placeholder="Headline" maxLength={140} value={form.title} onChange={(e) => set("title", e.target.value)} required />
        <input className="form-control" style={{ marginBottom: 8 }} placeholder="One-line summary (shown on the Spotlight page)" maxLength={300} value={form.summary} onChange={(e) => set("summary", e.target.value)} required />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input className="form-control" placeholder="Owner name (optional)" maxLength={100} value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
          <select className="form-control" value={form.businessId} onChange={(e) => set("businessId", e.target.value)}>
            <option value="">Link to a Pueblo Connect business (optional)</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <textarea className="form-control" style={{ marginBottom: 8, minHeight: 240 }} placeholder={"The story — history, products, what the business means to the community. Separate paragraphs with a blank line."} value={form.body} onChange={(e) => set("body", e.target.value)} required />
        <div style={{ marginBottom: 8 }}>
          {shownHero && <img src={shownHero} alt="" style={{ maxWidth: 260, maxHeight: 150, display: "block", marginBottom: 6, borderRadius: 4 }} />}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onHero} />
          {(shownHero || currentHero) && (
            <button type="button" className="btn btn-sm btn-default" style={{ marginLeft: 8 }} onClick={() => { setHeroDataUrl(null); setRemoveHero(true); }}>Remove photo</button>
          )}
        </div>
        <label style={{ display: "block", marginBottom: 4 }}>
          <input type="checkbox" checked={form.sponsored} onChange={(e) => set("sponsored", e.target.checked)} /> Sponsored feature (shows a &ldquo;Sponsored&rdquo; label to readers)
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn btn-default btn-sm" type="button" disabled={busy} onClick={(e) => save(e as unknown as FormEvent, false)}>Save as draft</button>
          <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={(e) => save(e as unknown as FormEvent, true)}>{editingId ? "Save & publish" : "Publish"}</button>
          {editingId && <button className="btn btn-link btn-sm" type="button" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <h5 style={{ marginBottom: 8 }}>All spotlights</h5>
      <ul>
        {spotlights.length === 0 && <li style={{ color: "#888" }}>None yet.</li>}
        {spotlights.map((s) => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <strong>{s.title}</strong> — {s.published ? "published" : "draft"}{s.sponsored ? " · sponsored" : ""}
            {s.businessName ? ` · ${s.businessName}` : ""}
            {s.published && <> · <a href={`/spotlight/${s.slug}`} target="_blank" rel="noreferrer">view</a></>}
            <button className="btn btn-sm btn-default" type="button" style={{ marginLeft: 8, padding: "1px 8px" }} onClick={() => startEdit(s)}>Edit</button>
            <button className="btn btn-sm btn-danger" type="button" style={{ marginLeft: 6, padding: "1px 8px" }} onClick={() => remove(s.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
