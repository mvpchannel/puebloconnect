import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { grantPassportStamp, PassportCategory } from "@/lib/db";

const MAX_LABEL_LENGTH = 150;
// Only categories a plain "I visited this page" beacon is allowed to
// grant. 'event' stamps come from the check-in route instead (see
// src/app/api/events/[slug]/checkin/route.ts) — checking into an event
// is a deliberate action, not just loading a page.
const VISIT_CATEGORIES: PassportCategory[] = ["business", "pueblo_live", "explore_3d"];

// POST /api/passport/visit — called by PassportVisitBeacon when a
// logged-in member loads a business channel, a live stream, or Explore
// in 3D. Idempotent (grantPassportStamp), so firing on every page load
// is harmless — it only ever adds one stamp per distinct thing visited.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { category, refId, label } = (body ?? {}) as Record<string, unknown>;

  if (typeof category !== "string" || !VISIT_CATEGORIES.includes(category as PassportCategory)) {
    return NextResponse.json({ error: "Invalid visit category." }, { status: 400 });
  }
  if (refId !== null && refId !== undefined && typeof refId !== "number") {
    return NextResponse.json({ error: "Invalid refId." }, { status: 400 });
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "A label is required." }, { status: 400 });
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json({ error: "Label too long." }, { status: 400 });
  }

  const stamp = grantPassportStamp(
    session.sub,
    category as PassportCategory,
    (refId as number | null | undefined) ?? null,
    label.trim()
  );

  return NextResponse.json({ stamp: { id: stamp.id, category: stamp.category, label: stamp.label } });
}
