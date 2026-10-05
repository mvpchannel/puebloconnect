"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: number; name: string; category: string; tourUrl: string | null };

export default function TourAdminPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.tourUrl ?? ""])));
  const [error, setError] = useState<string | null>(null);

  async function save(id: number) {
    setError(null);
    const res = await fetch(`/api/admin/tours/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: drafts[id] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That didn't work.");
      return;
    }
    router.refresh();
  }

  async function remove(id: number) {
    setError(null);
    const res = await fetch(`/api/admin/tours/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDrafts((d) => ({ ...d, [id]: "" }));
      router.refresh();
    } else setError("That didn't work.");
  }

  return (
    <>
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      {rows.length === 0 ? (
        <p style={{ color: "#888" }}>No businesses yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Business</th><th>Tour link</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  {r.category && <div style={{ fontSize: 12, color: "#888" }}>{r.category}</div>}
                </td>
                <td style={{ minWidth: 280 }}>
                  <input
                    className="form-control"
                    placeholder="https://my.matterport.com/show/?m=…"
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    aria-label={`Tour link for ${r.name}`}
                  />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => save(r.id)} disabled={!(drafts[r.id] ?? "").trim()}>Save</button>{" "}
                  {r.tourUrl && <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
