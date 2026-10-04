import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, unbanStreamViewer } from "@/lib/db";

// DELETE /api/streams/:id/ban/:userId — lift a chat ban. Host or admin only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const targetUserId = Number(params.userId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });

  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can lift a ban." }, { status: 403 });
  }

  unbanStreamViewer(streamId, targetUserId);
  return NextResponse.json({ unbanned: true });
}
