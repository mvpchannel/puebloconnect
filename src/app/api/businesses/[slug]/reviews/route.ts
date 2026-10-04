import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getBusinessBySlug,
  upsertBusinessReview,
  listBusinessReviews,
  BusinessReviewWithUser,
} from "@/lib/db";

const MAX_BODY_LENGTH = 2000;

function shapeReview(r: BusinessReviewWithUser) {
  return {
    id: r.id,
    businessId: r.business_id,
    userId: r.user_id,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    username: r.username,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
    profilePhotoPath: r.profile_photo_path,
  };
}

// GET /api/businesses/:slug/reviews — newest first.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const reviews = listBusinessReviews(business.id);
  return NextResponse.json({ reviews: reviews.map(shapeReview) });
}

// POST /api/businesses/:slug/reviews — leave (or update) a rating/review.
// One review per member per business — posting again replaces the
// previous one (see upsertBusinessReview in db.ts) rather than stacking.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { rating, body: reviewBody } = (body ?? {}) as Record<string, unknown>;

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }

  let resolvedBody: string | null = null;
  if (reviewBody !== undefined && reviewBody !== null) {
    if (typeof reviewBody !== "string") {
      return NextResponse.json({ error: "Invalid review text." }, { status: 400 });
    }
    if (reviewBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Review must be ${MAX_BODY_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedBody = reviewBody.trim() || null;
  }

  const review = upsertBusinessReview(business.id, session.sub, rating, resolvedBody);
  return NextResponse.json({ review: shapeReview(review) }, { status: 201 });
}
