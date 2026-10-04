"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Real backend: POST /api/groups (src/app/api/groups/route.ts), backed by
// the groups/group_members tables in src/lib/db.ts. Creating a group makes
// the creator its owner automatically.
export default function GroupCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, tags }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create that group — try again.");
        return;
      }
      router.push(`/groups/${data.group.slug}`);
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
          <span>Create a group</span>
        </button>
      </div>
    );
  }

  return (
    <div className="central-meta item">
      <div style={{ padding: "20px" }}>
        <h4 style={{ marginBottom: 16 }}>Create a group</h4>
        <form method="post" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <div className="form-group">
            <input
              type="text"
              id="group-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="control-label" htmlFor="group-name">Group name</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <textarea
              id="group-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="group-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. food, local-business, weekly-meetup"
            />
            <label className="control-label" htmlFor="group-tags">Tags (comma-separated, optional)</label>
            <i className="mtrl-select" />
          </div>
          <div className="submit-btns">
            <button className="mtr-btn signup" type="submit" disabled={busy || !name.trim()}>
              <span>{busy ? "Creating…" : "Create group"}</span>
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
