import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createBusiness, listBusinesses, BusinessWithMeta } from "@/lib/db";

const MAX_NAME_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SHORT_FIELD_LENGTH = 200;

function shapeBusiness(b: BusinessWithMeta) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    category: b.category,
    description: b.description,
    address: b.address,
    phone: b.phone,
    website: b.website,
    hoursText: b.hours_text,
    logoPath: b.logo_path,
    coverPhotoPath: b.cover_photo_path,
    ownerId: b.owner_id,
    ownerUsername: b.owner_username,
    followerCount: b.follower_count,
    postCount: b.post_count,
    reviewCount: b.review_count,
    averageRating: b.average_rating,
    createdAt: b.created_at,
  };
}

// GET /api/businesses — browse all business channels, newest first.
export async function GET() {
  const businesses = listBusinesses();
  return NextResponse.json({ businesses: businesses.map(shapeBusiness) });
}

// POST /api/businesses — create a business channel. Requires login; the
// creator becomes its owner automatically (see createBusiness in db.ts).
// Anyone can create one for now — there's no paid-membership gate here
// yet, matching how Groups works; business_memberships (Stripe plan tier)
// is a separate, independent concept that nothing here checks.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, category, description, address, phone, website, hoursText } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Business name must be ${MAX_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (typeof category !== "string" || category.trim().length === 0) {
    return NextResponse.json({ error: "A category is required." }, { status: 400 });
  }
  if (category.trim().length > MAX_CATEGORY_LENGTH) {
    return NextResponse.json(
      { error: `Category must be ${MAX_CATEGORY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  function optionalString(value: unknown, maxLength: number, label: string):
    | { ok: true; value: string | null }
    | { ok: false; error: string } {
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "string") return { ok: false, error: `Invalid ${label}.` };
    if (value.length > maxLength) {
      return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
    }
    return { ok: true, value: value.trim() || null };
  }

  const descriptionResult = optionalString(description, MAX_DESCRIPTION_LENGTH, "Description");
  if (!descriptionResult.ok) return NextResponse.json({ error: descriptionResult.error }, { status: 400 });

  const addressResult = optionalString(address, MAX_SHORT_FIELD_LENGTH, "Address");
  if (!addressResult.ok) return NextResponse.json({ error: addressResult.error }, { status: 400 });

  const phoneResult = optionalString(phone, MAX_SHORT_FIELD_LENGTH, "Phone");
  if (!phoneResult.ok) return NextResponse.json({ error: phoneResult.error }, { status: 400 });

  const websiteResult = optionalString(website, MAX_SHORT_FIELD_LENGTH, "Website");
  if (!websiteResult.ok) return NextResponse.json({ error: websiteResult.error }, { status: 400 });

  const hoursResult = optionalString(hoursText, MAX_SHORT_FIELD_LENGTH, "Hours");
  if (!hoursResult.ok) return NextResponse.json({ error: hoursResult.error }, { status: 400 });

  const business = createBusiness(
    session.sub,
    name.trim(),
    category.trim(),
    descriptionResult.value,
    addressResult.value,
    phoneResult.value,
    websiteResult.value,
    hoursResult.value
  );
  return NextResponse.json({ business: shapeBusiness(business) }, { status: 201 });
}
