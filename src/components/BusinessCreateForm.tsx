"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Real backend: POST /api/businesses (src/app/api/businesses/route.ts),
// backed by the businesses table in src/lib/db.ts. Creating a channel
// makes the creator its owner automatically.
export default function BusinessCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [hoursText, setHoursText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          description: description.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          hoursText: hoursText.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create that channel — try again.");
        return;
      }
      router.push(`/businesses/${data.business.slug}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="central-meta item" style={{ textAlign: "center", padding: "20px" }}>
        <button className="mtr-btn signup" type="button" onClick={() => setOpen(true)}>
          <span>Create a business channel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="central-meta item">
      <div style={{ padding: "20px" }}>
        <h4 style={{ marginBottom: 16 }}>Create a business channel</h4>
        <form method="post" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <div className="form-group">
            <input
              type="text"
              id="business-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="control-label" htmlFor="business-name">Business name</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="business-category"
              required
              maxLength={50}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Restaurant, Auto Shop, Nonprofit"
            />
            <label className="control-label" htmlFor="business-category">Category</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <textarea
              id="business-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should members know about this business?"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="business-address"
              maxLength={200}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <label className="control-label" htmlFor="business-address">Address (optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="business-phone"
              maxLength={200}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <label className="control-label" htmlFor="business-phone">Phone (optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="business-website"
              maxLength={200}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
            <label className="control-label" htmlFor="business-website">Website (optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="business-hours"
              maxLength={200}
              value={hoursText}
              onChange={(e) => setHoursText(e.target.value)}
              placeholder="e.g. Mon-Sat 9am-7pm, Sun closed"
            />
            <label className="control-label" htmlFor="business-hours">Hours (optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="submit-btns">
            <button
              className="mtr-btn signup"
              type="submit"
              disabled={busy || !name.trim() || !category.trim()}
            >
              <span>{busy ? "Creating…" : "Create channel"}</span>
            </button>
            <button className="mtr-btn signin" type="button" onClick={() => setOpen(false)}>
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
