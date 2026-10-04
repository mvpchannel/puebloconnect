import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getBusinessBySlug,
  isBusinessOwner,
  addBusinessMenuItem,
  listBusinessMenuItems,
  BusinessMenuItem,
} from "@/lib/db";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

function shapeItem(i: BusinessMenuItem) {
  return {
    id: i.id,
    businessId: i.business_id,
    section: i.section,
    name: i.name,
    description: i.description,
    priceCents: i.price_cents,
    sortOrder: i.sort_order,
    createdAt: i.created_at,
  };
}

// GET /api/businesses/:slug/menu — menu + service items, in order.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const items = listBusinessMenuItems(business.id);
  return NextResponse.json({ items: items.map(shapeItem) });
}

// POST /api/businesses/:slug/menu — add a menu or service item. Owner only.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can edit its menu." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { section, name, description, priceCents } = (body ?? {}) as Record<string, unknown>;

  if (section !== "menu" && section !== "service") {
    return NextResponse.json({ error: "Section must be 'menu' or 'service'." }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Item name is required." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Item name must be ${MAX_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
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

  let resolvedPriceCents: number | null = null;
  if (priceCents !== undefined && priceCents !== null) {
    if (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: "Price must be a non-negative whole number of cents." }, { status: 400 });
    }
    resolvedPriceCents = priceCents;
  }

  const item = addBusinessMenuItem(
    business.id,
    section,
    name.trim(),
    resolvedDescription,
    resolvedPriceCents
  );
  return NextResponse.json({ item: shapeItem(item) }, { status: 201 });
}
