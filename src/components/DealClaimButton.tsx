"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DealClaimButtonProps = {
  businessSlug: string;
  dealId: number;
  isLoggedIn: boolean;
  initialClaimed: boolean;
};

// Real backend: POST /api/businesses/:slug/deals/:dealId/claim, backed
// by the deal_claims table in src/lib/db.ts — a real, trackable claim,
// not a reusable code.
export default function DealClaimButton({
  businessSlug,
  dealId,
  isLoggedIn,
  initialClaimed,
}: DealClaimButtonProps) {
  const router = useRouter();
  const [claimed, setClaimed] = useState(initialClaimed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    if (!isLoggedIn) {
      setError("Log in to claim this deal.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessSlug}/deals/${dealId}/claim`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't claim that deal.");
        return;
      }
      setClaimed(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p role="alert" style={{ color: "#e02020", margin: "0 0 4px", fontSize: 12 }}>{error}</p>}
      <button
        className="mtr-btn signup"
        type="button"
        disabled={busy || claimed}
        onClick={handleClaim}
        style={{ padding: "4px 12px", fontSize: 12 }}
      >
        <span>{claimed ? "✓ Claimed" : "Claim deal"}</span>
      </button>
    </div>
  );
}
