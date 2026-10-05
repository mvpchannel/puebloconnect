import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { limitMember } from "@/lib/rate-limit";
import { getUserById, followUser, unfollowUser, countUserFollowers } from "@/lib/db";

function parseTarget(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/users/:userId/follow — follow a member (e.g. a Pueblo Live host).
// You'll get a notification whenever they go live.
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "like");
  if (limited) return limited as NextResponse;

  const targetId = parseTarget(params.userId);
  if (!targetId) return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  if (targetId === session.sub) return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  const target = getUserById(targetId);
  if (!target || target.account_status !== "active") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  followUser(session.sub, targetId);
  return NextResponse.json({ following: true, followerCount: countUserFollowers(targetId) });
}

// DELETE /api/users/:userId/follow — unfollow.
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const targetId = parseTarget(params.userId);
  if (!targetId) return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  unfollowUser(session.sub, targetId);
  return NextResponse.json({ following: false, followerCount: countUserFollowers(targetId) });
}
