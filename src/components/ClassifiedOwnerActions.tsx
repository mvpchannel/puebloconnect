"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: number; status: "active" | "sold"; isOwner: boolean };

// Owner: mark sold/active and delete. Admin (non-owner): delete only.
export default function ClassifiedOwnerActions({ id, status, isOwner }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/classifieds/${id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong.");
        return false;
      }
      return true;
    } catch {
      setError("Couldn't reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
      {isOwner && (
        <button className="mtr-btn signin" type="button" disabled={busy}
          onClick={async () => { if (await call("PATCH", { status: status === "sold" ? "active" : "sold" })) router.refresh(); }}>
          <span>{status === "sold" ? "Mark as available" : "Mark as sold"}</span>
        </button>
      )}
      <button className="mtr-btn signin" type="button" disabled={busy}
        onClick={async () => { if (confirm("Delete this listing?") && (await call("DELETE"))) router.push("/classifieds"); }}>
        <span>Delete</span>
      </button>
      {error && <span role="alert" style={{ color: "#c0392b", fontSize: 13 }}>{error}</span>}
    </div>
  );
}
