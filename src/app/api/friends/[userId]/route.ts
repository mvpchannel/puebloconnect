import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { removeFriend, areFriends } from "@/lib/db";

// DELETE /api/friends/:userId — unfriend someone. Requires login.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const otherUserId = Number(params.userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (!areFriends(session.sub, otherUserId)) {
    return NextResponse.json({ error: "You're not friends with that user." }, { status: 400 });
  }

  removeFriend(session.sub, otherUserId);
  return NextResponse.json({ removed: true });
}
