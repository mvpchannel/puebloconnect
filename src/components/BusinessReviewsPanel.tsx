"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export type BusinessReview = {
  id: number;
  userId: number;
  rating: number;
  body: string | null;
  createdAt: string;
  name: string;
  profilePhotoPath: string | null;
};

type BusinessReviewsPanelProps = {
  slug: string;
  isLoggedIn: boolean;
  reviews: BusinessReview[];
  averageRating: number | null;
  reviewCount: number;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f5a623", letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#ddd" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

// Real backend: GET/POST /api/businesses/:slug/reviews, backed by the
// business_reviews table in src/lib/db.ts. One review per member — posting
// again updates the member's existing rating instead of adding a second.
export default function BusinessReviewsPanel({
  slug,
  isLoggedIn,
  reviews,
  averageRating,
  reviewCount,
}: BusinessReviewsPanelProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that review.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="widget stick-widget" style={{ marginTop: 20 }}>
      <h4 className="widget-title">
        Reviews{" "}
        {reviewCount > 0 && (
          <span style={{ fontSize: 13, color: "#888", fontWeight: "normal" }}>
            ({averageRating?.toFixed(1)} avg · {reviewCount})
          </span>
        )}
      </h4>
      <div style={{ padding: "0 16px 16px" }}>
        {isLoggedIn ? (
          <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
            {error && (
              <p role="alert" style={{ color: "#e02020", marginBottom: 8 }}>
                {error}
              </p>
            )}
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ marginBottom: 8, display: "block" }}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience (optional)"
              style={{ width: "100%", marginBottom: 8 }}
            />
            <button className="mtr-btn signup" type="submit" disabled={busy}>
              <span>{busy ? "Posting…" : "Post review"}</span>
            </button>
          </form>
        ) : (
          <p style={{ color: "#888", marginBottom: 16 }}>Log in to leave a review.</p>
        )}

        {reviews.length === 0 && <p style={{ color: "#888" }}>No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
            <div>
              <strong>{r.name}</strong> <Stars rating={r.rating} />
            </div>
            {r.body && <p style={{ color: "#666", margin: "4px 0 0" }}>{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
