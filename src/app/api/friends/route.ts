import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listFriends } from "@/lib/db";

function shapeFriend(f: {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  friends_since: string;
}) {
  return {
    userId: f.user_id,
    username: f.username,
    name: [f.first_name, f.last_name].filter(Boolean).join(" ") || f.username,
    profilePhotoPath: f.profile_photo_path,
    friendsSince: f.friends_since,
  };
}

// GET /api/friends — the requesting user's accepted friends list.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const friends = listFriends(session.sub);
  return NextResponse.json({ friends: friends.map(shapeFriend) });
}
