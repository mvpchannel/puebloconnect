"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type BopAdminPanelProps = {
  categories: { id: number; name: string }[];
  periods: {
    id: number;
    label: string;
    isOpen: boolean;
    closedAt: string | null;
  }[];
};

// Admin management for Best of the Pueblo: create categories, open/close
// voting periods. Real backend: /api/best-of/categories,
// /api/best-of/periods(/:id/close).
export default function BopAdminPanel({ categories, periods }: BopAdminPanelProps) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodEndsAt, setPeriodEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastWinners, setLastWinners] = useState<
    { categoryName: string; businessName: string; voteCount: number }[] | null
  >(null);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/best-of/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create that category.");
        return;
      }
      setCategoryName("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function addPeriod(e: FormEvent) {
    e.preventDefault();
    if (!periodLabel.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/best-of/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: periodLabel.trim(),
          endsAt: periodEndsAt ? new Date(periodEndsAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't open that voting period.");
        return;
      }
      setPeriodLabel("");
      setPeriodEndsAt("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function closePeriod(periodId: number) {
    setBusy(true);
    setError(null);
    setLastWinners(null);
    try {
      const res = await fetch(`/api/best-of/periods/${periodId}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't close that period.");
        return;
      }
      setLastWinners(data.winners);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}

      {lastWinners && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <strong>Winners announced:</strong>
          <ul style={{ marginTop: 6, marginBottom: 0 }}>
            {lastWinners.length === 0 && <li>No category received any votes.</li>}
            {lastWinners.map((w) => (
              <li key={w.categoryName}>
                {w.categoryName}: {w.businessName} ({w.voteCount} votes)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <div className="col-md-6">
          <h5 style={{ marginBottom: 8 }}>Categories</h5>
          <ul style={{ marginBottom: 12 }}>
            {categories.length === 0 && <li style={{ color: "#888" }}>No categories yet.</li>}
            {categories.map((c) => <li key={c.id}>{c.name}</li>)}
          </ul>
          <form onSubmit={addCategory}>
            <input
              type="text"
              placeholder="e.g. Best Tacos"
              maxLength={50}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="form-control"
              style={{ marginBottom: 6, maxWidth: 300 }}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !categoryName.trim()}>
              Add category
            </button>
          </form>
        </div>

        <div className="col-md-6">
          <h5 style={{ marginBottom: 8 }}>Voting periods</h5>
          <ul style={{ marginBottom: 12 }}>
            {periods.length === 0 && <li style={{ color: "#888" }}>No periods yet.</li>}
            {periods.map((p) => (
              <li key={p.id} style={{ marginBottom: 6 }}>
                {p.label} — {p.isOpen ? "open" : p.closedAt ? "closed" : "not started"}
                {p.isOpen && (
                  <>
                    {" "}
                    <button
                      className="btn btn-sm btn-danger"
                      type="button"
                      disabled={busy}
                      onClick={() => closePeriod(p.id)}
                      style={{ marginLeft: 8, padding: "1px 8px" }}
                    >
                      Close &amp; announce winners
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addPeriod}>
            <input
              type="text"
              placeholder="e.g. October 2026"
              maxLength={50}
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="form-control"
              style={{ marginBottom: 6, maxWidth: 300 }}
            />
            <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
              Ends (optional — leave blank and close manually)
            </label>
            <input
              type="datetime-local"
              value={periodEndsAt}
              onChange={(e) => setPeriodEndsAt(e.target.value)}
              className="form-control"
              style={{ marginBottom: 6, maxWidth: 300 }}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !periodLabel.trim()}>
              Open voting period
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
