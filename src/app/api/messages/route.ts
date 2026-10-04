import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listConversations } from "@/lib/db";

// GET /api/messages — the requesting user's inbox: one row per person
// they've exchanged messages with, newest conversation first.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const conversations = listConversations(session.sub);
  return NextResponse.json({
    conversations: conversations.map((c) => ({
      otherUserId: c.other_user_id,
      otherUsername: c.other_username,
      otherName:
        [c.other_first_name, c.other_last_name].filter(Boolean).join(" ") || c.other_username,
      otherProfilePhotoPath: c.other_profile_photo_path,
      lastBody: c.last_body,
      lastCreatedAt: c.last_created_at,
      unreadCount: c.unread_count,
    })),
  });
}
