"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Claim = { id: number; code: string; member: string; claimedAt: string; redeemed: boolean };
type Drop = {
  id: number;
  title: string;
  prizeText: string;
  kind: "prize" | "golden_ticket";
  spot: string;
  points: number;
  maxClaims: number | null;
  expiresAt: string | null;
  active: boolean;
  claims: Claim[];
};

export default function DropsAdminPanel({ drops, spots }: { drops: Drop[]; spots: { id: string; label: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prizeText, setPrizeText] = useState("");
  const [kind, setKind] = useState<"prize" | "golden_ticket">("prize");
  const [spotId, setSpotId] = useState(spots[0]?.id ?? "");
  const [points, setPoints] = useState("0");
  const [maxClaims, setMaxClaims] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "That didn't work.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("That didn't work.");
      return false;
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await call("/api/admin/drops", "POST", { title, prizeText, kind, spotId, points, maxClaims, expiresInDays })) {
      setTitle("");
      setPrizeText("");
      setMaxClaims("");
      setExpiresInDays("");
    }
    setBusy(false);
  }

  return (
    <>
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      <form onSubmit={create} style={{ marginBottom: 28, maxWidth: 620 }}>
        <div className="form-group">
          <label>Title</label>
          <input className="form-control" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Golden Pueblo Ticket" />
        </div>
        <div className="form-group">
          <label>Prize (what the member gets, and where to redeem it)</label>
          <textarea className="form-control" required rows={2} maxLength={300} value={prizeText} onChange={(e) => setPrizeText(e.target.value)} placeholder="A free coffee at Joe's Café. Show your code at the counter." />
        </div>
        <div className="form-group">
          <label>Type</label>{" "}
          <select className="form-control" value={kind} onChange={(e) => setKind(e.target.value as "prize" | "golden_ticket")}>
            <option value="prize">Prize (teal gem)</option>
            <option value="golden_ticket">Golden Pueblo Ticket (gold gem)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Hiding spot</label>
          <select className="form-control" value={spotId} onChange={(e) => setSpotId(e.target.value)}>
            {spots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label>Points (0–50)</label>
            <input className="form-control" type="number" min={0} max={50} value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div>
            <label>Max claims (blank = unlimited)</label>
            <input className="form-control" type="number" min={1} value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)} />
          </div>
          <div>
            <label>Expires in days (blank = never)</label>
            <input className="form-control" type="number" min={1} max={365} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>Hide treasure</button>
      </form>

      {drops.length === 0 && <p style={{ color: "#888" }}>No treasures yet.</p>}
      {drops.map((d) => (
        <div key={d.id} style={{ border: "1px solid #e3e3e3", borderRadius: 6, padding: 16, marginBottom: 18, opacity: d.active ? 1 : 0.65 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{d.title}</strong> {d.kind === "golden_ticket" && <span style={{ color: "#d98c00" }}>· Golden Ticket</span>}
              <div>{d.prizeText}</div>
              <div style={{ fontSize: 12, color: "#888" }}>
                {d.spot} · {d.points} pts · {d.claims.length}{d.maxClaims !== null ? ` of ${d.maxClaims}` : ""} claimed
                {d.expiresAt && ` · expires ${d.expiresAt} UTC`}
                {!d.active && " · paused"}
              </div>
            </div>
            <div style={{ whiteSpace: "nowrap" }}>
              <button className="btn btn-default btn-sm" onClick={() => call(`/api/admin/drops/${d.id}`, "PUT", { active: !d.active })}>
                {d.active ? "Pause" : "Resume"}
              </button>{" "}
              <button
                className="btn btn-danger btn-sm"
                onClick={() => confirm("Delete this treasure? It disappears from the 3D Pueblo.") && call(`/api/admin/drops/${d.id}`, "DELETE")}
              >
                Delete
              </button>
            </div>
          </div>
          {d.claims.map((c) => (
            <div key={c.id} style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <code style={{ fontSize: 15 }}>{c.code}</code> · {c.member}
                <div style={{ fontSize: 12, color: "#888" }}>found {c.claimedAt} UTC{c.redeemed && " · redeemed"}</div>
              </div>
              <button className="btn btn-default btn-sm" onClick={() => call(`/api/admin/drops/claims/${c.id}`, "PUT", { redeemed: !c.redeemed })}>
                {c.redeemed ? "Undo redeemed" : "Mark redeemed"}
              </button>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
