"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type EventCreateFormProps = {
  // Businesses the current user owns, so they can optionally host this
  // event under one of their channels. Empty for a member with no
  // business channel — the event is just created standalone.
  ownedBusinesses: { id: number; name: string }[];
};

// Real backend: POST /api/events (src/app/api/events/route.ts), backed
// by the events table in src/lib/db.ts.
export default function EventCreateForm({ ownedBusinesses }: EventCreateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [businessId, setBusinessId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          locationText: locationText.trim() || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          businessId: businessId ? Number(businessId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create that event — try again.");
        return;
      }
      router.push(`/events/${data.event.slug}`);
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
          <span>Create an event</span>
        </button>
      </div>
    );
  }

  return (
    <div className="central-meta item">
      <div style={{ padding: "20px" }}>
        <h4 style={{ marginBottom: 16 }}>Create an event</h4>
        <form method="post" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <div className="form-group">
            <input
              type="text"
              id="event-title"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="control-label" htmlFor="event-title">Event title</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <textarea
              id="event-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this event about?"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="event-location"
              maxLength={200}
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Highland Cafe, 123 Main St"
            />
            <label className="control-label" htmlFor="event-location">Location (optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <label htmlFor="event-starts" style={{ display: "block", marginBottom: 4 }}>Starts</label>
            <input
              type="datetime-local"
              id="event-starts"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="event-ends" style={{ display: "block", marginBottom: 4 }}>Ends (optional)</label>
            <input
              type="datetime-local"
              id="event-ends"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          {ownedBusinesses.length > 0 && (
            <div className="form-group">
              <label htmlFor="event-business" style={{ display: "block", marginBottom: 4 }}>
                Host under a business channel (optional)
              </label>
              <select
                id="event-business"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              >
                <option value="">None — just my own event</option>
                {ownedBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="submit-btns">
            <button className="mtr-btn signup" type="submit" disabled={busy || !title.trim() || !startsAt}>
              <span>{busy ? "Creating…" : "Create event"}</span>
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
