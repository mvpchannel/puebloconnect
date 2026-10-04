import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { searchUsers } from "@/lib/db";

// GET /api/users/search?q=... — find a member by username/name, to add as
// a friend or start a message with. Requires login (not a public
// directory); excludes the requesting user from their own results.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = searchUsers(q, session.sub, 10);
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
      profilePhotoPath: u.profile_photo_path,
    })),
  });
}
