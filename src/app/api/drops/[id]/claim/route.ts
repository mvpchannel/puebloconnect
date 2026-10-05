import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { claimPuebloDrop } from "@/lib/db";

const REASON_TEXT: Record<string, string> = {
  not_found: "That treasure isn't there anymore.",
  inactive: "That treasure isn't available right now.",
  expired: "That treasure has expired.",
  gone: "Someone else got the last one.",
  already: "You've already found this treasure. Check My Treasures.",
};

// POST /api/drops/:id/claim — a logged-in member picks up a treasure drop.
// One claim per member per drop; admins can also cap total claims and set an expiry.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Log in to claim treasures." }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid treasure." }, { status: 400 });
  const result = claimPuebloDrop(id, session.sub);
  if (!result.claimed) {
    return NextResponse.json({ claimed: false, reason: result.reason, error: REASON_TEXT[result.reason] }, { status: 409 });
  }
  return NextResponse.json({
    claimed: true,
    prize: result.drop.prize_text,
    golden: result.drop.kind === "golden_ticket",
    code: result.code,
    points: result.drop.points,
  });
}
