import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createBopCategory, listBopCategories, BopCategory } from "@/lib/db";

const MAX_NAME_LENGTH = 50;

function shapeCategory(c: BopCategory) {
  return { id: c.id, name: c.name, slug: c.slug, createdAt: c.created_at };
}

// GET /api/best-of/categories — every Best of the Pueblo category.
export async function GET() {
  const categories = listBopCategories();
  return NextResponse.json({ categories: categories.map(shapeCategory) });
}

// POST /api/best-of/categories — create a category (e.g. "Best Tacos").
// Admin only — categories are curated, not member-submitted.
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { name } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Category name must be ${MAX_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const category = createBopCategory(name.trim());
  return NextResponse.json({ category: shapeCategory(category) }, { status: 201 });
}
