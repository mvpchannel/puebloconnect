import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { claimStreamFlashDrop } from "@/lib/db";

// POST /api/streams/:id/flash-drops/:dropId/claim — claim the active
// flash drop (grants a Passport stamp or claims a Deal — see
// claimStreamFlashDrop in db.ts). Idempotent; fails once the drop's
// window has passed.
export async function POST(
  req: NextRequest,
  { params }: { params: { dropId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Log in to claim this." }, { status: 401 });

  const dropId = Number(params.dropId);
  if (!Number.isInteger(dropId) || dropId <= 0) {
    return NextResponse.json({ error: "Invalid drop id." }, { status: 400 });
  }

  const result = claimStreamFlashDrop(dropId, session.sub);
  if (!result.claimed) {
    const message = result.reason === "expired" ? "This flash drop has ended." : "Flash drop not found.";
    return NextResponse.json({ error: message }, { status: result.reason === "expired" ? 409 : 404 });
  }

  return NextResponse.json({ claimed: true });
}
