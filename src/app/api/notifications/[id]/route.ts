import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { deleteNotification } from "@/lib/db";

// DELETE /api/notifications/:id — dismiss one notification (the "X" in
// the list). Scoped to the requesting user's own notifications —
// deleteNotification's WHERE clause checks user_id, so this can't be used
// to delete someone else's.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const notificationId = Number(params.id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return NextResponse.json({ error: "Invalid notification id." }, { status: 400 });
  }

  const deleted = deleteNotification(notificationId, session.sub);
  if (!deleted) return NextResponse.json({ error: "Notification not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
