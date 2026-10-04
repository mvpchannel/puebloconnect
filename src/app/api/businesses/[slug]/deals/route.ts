import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getBusinessBySlug,
  isBusinessOwner,
  createDeal,
  listAllDealsForBusiness,
  DealWithMeta,
} from "@/lib/db";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_DISCOUNT_TEXT_LENGTH = 50;
const MAX_FLASH_DURATION_HOURS = 24;

function shapeDeal(d: DealWithMeta) {
  return {
    id: d.id,
    businessId: d.business_id,
    businessName: d.business_name,
    businessSlug: d.business_slug,
    title: d.title,
    description: d.description,
    discountText: d.discount_text,
    type: d.type,
    startsAt: d.starts_at,
    expiresAt: d.expires_at,
    featured: Boolean(d.featured),
    claimCount: d.claim_count,
    isActive: Boolean(d.is_active),
    createdAt: d.created_at,
    deactivatedAt: d.deactivated_at,
  };
}

// GET /api/businesses/:slug/deals — every deal (active and past) for
// this channel, newest first. The channel's own page only shows active
// ones; the owner's management panel wants the full history too.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const deals = listAllDealsForBusiness(business.id);
  return NextResponse.json({ deals: deals.map(shapeDeal) });
}

// POST /api/businesses/:slug/deals — create a deal. Owner only. A flash
// deal must have an expiresAt within the next 24 hours (the whole point
// is urgency — "25% off for the next 2 hours"); a standard deal's
// expiresAt is optional.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can post deals." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { title, description, discountText, type, expiresAt, featured } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Deal title is required." }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (typeof discountText !== "string" || discountText.trim().length === 0) {
    return NextResponse.json({ error: "A short discount label is required (e.g. '25% off')." }, { status: 400 });
  }
  if (discountText.length > MAX_DISCOUNT_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Discount label must be ${MAX_DISCOUNT_TEXT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (type !== "standard" && type !== "flash") {
    return NextResponse.json({ error: "Type must be 'standard' or 'flash'." }, { status: 400 });
  }

  let resolvedDescription: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description." }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedDescription = description.trim() || null;
  }

  let resolvedExpiresAt: string | null = null;
  if (expiresAt !== undefined && expiresAt !== null) {
    if (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) {
      return NextResponse.json({ error: "Invalid expiration date/time." }, { status: 400 });
    }
    resolvedExpiresAt = expiresAt;
  }

  if (type === "flash") {
    if (!resolvedExpiresAt) {
      return NextResponse.json({ error: "A flash deal needs an expiration time." }, { status: 400 });
    }
    const hoursUntilExpiry = (Date.parse(resolvedExpiresAt) - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilExpiry <= 0) {
      return NextResponse.json({ error: "A flash deal's expiration must be in the future." }, { status: 400 });
    }
    if (hoursUntilExpiry > MAX_FLASH_DURATION_HOURS) {
      return NextResponse.json(
        { error: `A flash deal can run for at most ${MAX_FLASH_DURATION_HOURS} hours — use a standard deal for anything longer.` },
        { status: 400 }
      );
    }
  }

  const deal = createDeal(
    business.id,
    title.trim(),
    resolvedDescription,
    discountText.trim(),
    type,
    resolvedExpiresAt,
    Boolean(featured)
  );
  return NextResponse.json({ deal: shapeDeal(deal) }, { status: 201 });
}
