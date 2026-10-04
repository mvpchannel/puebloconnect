import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { getBusinessBySlug, isBusinessOwner, updateBusinessProfile, BusinessWithMeta } from "@/lib/db";

const MAX_SHORT_FIELD_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 2000;

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

// GET /api/businesses/:slug — a single business channel's profile.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json({ business: shapeBusiness(business) });
}

// PATCH /api/businesses/:slug — update profile fields. The channel's
// owner can edit it; an admin can too (belt-and-suspenders moderation,
// same reasoning as requireAdmin elsewhere), but no one else.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const isOwner = isBusinessOwner(business.id, session.sub);
  const isAdmin = Boolean(requireAdmin(req));
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Only this channel's owner can edit it." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { category, description, address, phone, website, hoursText } =
    (body ?? {}) as Record<string, unknown>;

  function optionalString(value: unknown, maxLength: number, label: string):
    | { ok: true; value: string | null }
    | { ok: false; error: string } {
    if (value === undefined) return { ok: true, value: undefined as unknown as string | null };
    if (value !== null && typeof value !== "string") return { ok: false, error: `Invalid ${label}.` };
    if (typeof value === "string" && value.length > maxLength) {
      return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
    }
    return { ok: true, value: typeof value === "string" ? value.trim() || null : null };
  }

  const fields: Record<string, string | null> = {};

  if (category !== undefined) {
    if (typeof category !== "string" || category.trim().length === 0) {
      return NextResponse.json({ error: "Category can't be empty." }, { status: 400 });
    }
    if (category.length > MAX_CATEGORY_LENGTH) {
      return NextResponse.json(
        { error: `Category must be ${MAX_CATEGORY_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    fields.category = category.trim();
  }

  const descriptionResult = optionalString(description, MAX_DESCRIPTION_LENGTH, "Description");
  if (!descriptionResult.ok) return NextResponse.json({ error: descriptionResult.error }, { status: 400 });
  if (description !== undefined) fields.description = descriptionResult.value;

  const addressResult = optionalString(address, MAX_SHORT_FIELD_LENGTH, "Address");
  if (!addressResult.ok) return NextResponse.json({ error: addressResult.error }, { status: 400 });
  if (address !== undefined) fields.address = addressResult.value;

  const phoneResult = optionalString(phone, MAX_SHORT_FIELD_LENGTH, "Phone");
  if (!phoneResult.ok) return NextResponse.json({ error: phoneResult.error }, { status: 400 });
  if (phone !== undefined) fields.phone = phoneResult.value;

  const websiteResult = optionalString(website, MAX_SHORT_FIELD_LENGTH, "Website");
  if (!websiteResult.ok) return NextResponse.json({ error: websiteResult.error }, { status: 400 });
  if (website !== undefined) fields.website = websiteResult.value;

  const hoursResult = optionalString(hoursText, MAX_SHORT_FIELD_LENGTH, "Hours");
  if (!hoursResult.ok) return NextResponse.json({ error: hoursResult.error }, { status: 400 });
  if (hoursText !== undefined) fields.hours_text = hoursResult.value;

  updateBusinessProfile(business.id, fields);
  return NextResponse.json({ business: shapeBusiness(getBusinessBySlug(params.slug)!) });
}
