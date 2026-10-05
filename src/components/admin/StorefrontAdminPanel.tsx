"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: number; name: string; category: string; lot: number | null; color: string };

export default function StorefrontAdminPanel({ rows, totalLots }: { rows: Row[]; totalLots: number }) {
  const router = useRouter();
  const [colors, setColors] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.color])));
  const [error, setError] = useState<string | null>(null);
  const used = rows.filter((r) => r.lot !== null).length;

  async function save(id: number, enabled: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/storefronts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, color: colors[id] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That didn't work.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <p style={{ color: "#555" }}>
        Lots in use: <strong>{used}</strong> of {totalLots}
      </p>
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      {rows.length === 0 ? (
        <p style={{ color: "#888" }}>No businesses yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Business</th><th>Storefront</th><th>Color</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  {r.category && <div style={{ fontSize: 12, color: "#888" }}>{r.category}</div>}
                </td>
                <td>{r.lot !== null ? `Lot ${r.lot + 1}` : "None"}</td>
                <td>
                  <input
                    type="color"
                    value={colors[r.id]}
                    onChange={(e) => setColors((c) => ({ ...c, [r.id]: e.target.value }))}
                    aria-label={`Building color for ${r.name}`}
                  />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.lot === null ? (
                    <button className="btn btn-primary btn-sm" onClick={() => save(r.id, true)}>Add to 3D Pueblo</button>
                  ) : (
                    <>
                      <button className="btn btn-default btn-sm" onClick={() => save(r.id, true)}>Save color</button>{" "}
                      <button className="btn btn-danger btn-sm" onClick={() => save(r.id, false)}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
