import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listNotifications, countUnreadNotifications, markAllNotificationsRead, Notification } from "@/lib/db";

export function shapeNotification(n: Notification) {
  return {
    id: n.id,
    kind: n.kind,
    refType: n.ref_type,
    refId: n.ref_id,
    read: n.read_at !== null,
    createdAt: n.created_at,
    actor: n.actor_id
      ? {
          id: n.actor_id,
          username: n.actor_username,
          name: [n.actor_first_name, n.actor_last_name].filter(Boolean).join(" ") || n.actor_username,
          profilePhotoPath: n.actor_profile_photo_path,
        }
      : null,
  };
}

// GET /api/notifications — the requesting member's real notification feed
// (friend requests, accepted requests, new messages, likes/comments on
// their own posts), newest first. Populated by createNotification() calls
// alongside the real events that trigger them — see src/lib/db.ts.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const notifications = listNotifications(session.sub, 30);
  return NextResponse.json({
    notifications: notifications.map(shapeNotification),
    unreadCount: countUnreadNotifications(session.sub),
  });
}

// POST /api/notifications — mark every notification as read (opening the
// bell dropdown calls this, same "mark all read on open" pattern as most
// notification UIs).
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  markAllNotificationsRead(session.sub);
  return NextResponse.json({ ok: true });
}
