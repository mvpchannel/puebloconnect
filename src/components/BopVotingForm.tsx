"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Business = { id: number; name: string };
type TallyRow = { businessId: number; businessName: string; voteCount: number };

type BopVotingFormProps = {
  periodId: number;
  categories: { id: number; name: string }[];
  businesses: Business[];
  initialVotes: Record<number, number | null>;
  tallies: Record<number, TallyRow[]>;
  isLoggedIn: boolean;
};

// Real backend: POST /api/best-of/periods/:periodId/vote, backed by the
// bop_votes table in src/lib/db.ts. One vote per member per category,
// changeable at any time while the period stays open.
export default function BopVotingForm({
  periodId,
  categories,
  businesses,
  initialVotes,
  tallies,
  isLoggedIn,
}: BopVotingFormProps) {
  const router = useRouter();
  const [votes, setVotes] = useState<Record<number, number | null>>(initialVotes);
  const [busyCategoryId, setBusyCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(categoryId: number, businessId: number) {
    if (!isLoggedIn) {
      setError("Log in to vote.");
      return;
    }
    setBusyCategoryId(categoryId);
    setError(null);
    try {
      const res = await fetch(`/api/best-of/periods/${periodId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, businessId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't cast that vote.");
        return;
      }
      setVotes((prev) => ({ ...prev, [categoryId]: businessId }));
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyCategoryId(null);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}
      {categories.map((category) => {
        const currentVote = votes[category.id] ?? null;
        const tally = tallies[category.id] ?? [];
        const busy = busyCategoryId === category.id;
        return (
          <div className="central-meta item" key={category.id} style={{ marginBottom: 16 }}>
            <div style={{ padding: "16px 20px" }}>
              <h4 style={{ marginBottom: 8 }}>{category.name}</h4>
              <select
                value={currentVote ?? ""}
                disabled={busy}
                onChange={(e) => {
                  const businessId = Number(e.target.value);
                  if (businessId) vote(category.id, businessId);
                }}
                style={{ marginBottom: 10, width: "100%", maxWidth: 320 }}
              >
                <option value="">
                  {currentVote ? "Change your vote…" : "Vote for a business…"}
                </option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {currentVote && (
                <p style={{ fontSize: 12, color: "#2a8f2a", marginBottom: 10 }}>
                  ✓ You voted for {businesses.find((b) => b.id === currentVote)?.name ?? "—"}
                </p>
              )}
              {tally.length > 0 && (
                <div style={{ fontSize: 13, color: "#888" }}>
                  {tally.slice(0, 5).map((t, i) => (
                    <div key={t.businessId}>
                      {i + 1}. {t.businessName} — {t.voteCount} vote{t.voteCount === 1 ? "" : "s"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
