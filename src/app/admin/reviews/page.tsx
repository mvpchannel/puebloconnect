import type { Metadata } from "next";
import Link from "next/link";
import { listAllBusinessReviews } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import DeleteReviewButton from "./DeleteReviewButton";

export const metadata: Metadata = {
  title: "Reviews",
};

// Real data: every review members have left for a business, newest first.
// Staff can filter by star rating and delete a review that breaks the rules.
export const dynamic = "force-dynamic";

export default function ReviewsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const raw = typeof searchParams.rating === "string" ? Number(searchParams.rating) : NaN;
  const rating = Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null;
  const reviews = listAllBusinessReviews(200, rating);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Reviews</h2>
        <p style={{ color: "#555", marginBottom: 14 }}>
          Reviews members have left for local businesses, newest first. Delete one if it breaks the community
          rules. A deleted review can&rsquo;t be brought back, and the member keeps any points they earned.
        </p>
        <p style={{ marginBottom: 16 }}>
          Show:{" "}
          <Link href="/admin/reviews" style={{ fontWeight: rating ? 400 : 700 }}>All</Link>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>
              {" · "}
              <Link href={`/admin/reviews?rating=${n}`} style={{ fontWeight: rating === n ? 700 : 400 }}>
                {n} star{n === 1 ? "" : "s"}
              </Link>
            </span>
          ))}
        </p>
        {reviews.length === 0 ? (
          <p style={{ color: "#888" }}>{rating ? "No reviews with that rating." : "No reviews yet."}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Posted</th>
                <th>Business</th>
                <th>Member</th>
                <th>Rating</th>
                <th>Review</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatRelativeTime(r.created_at)}</td>
                  <td>
                    <Link href={`/businesses/${r.business_slug}`}>{r.business_name}</Link>
                  </td>
                  <td>
                    {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.username}
                    <div style={{ color: "#888", fontSize: 12 }}>@{r.username}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{r.body || <span style={{ color: "#888" }}>(rating only)</span>}</td>
                  <td><DeleteReviewButton id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
