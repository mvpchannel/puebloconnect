import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, deleteStreamClip } from "@/lib/db";

// DELETE /api/streams/:id/clips/:clipId — remove a highlight clip.
// Host or admin only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const clipId = Number(params.clipId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(clipId) || clipId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can remove a clip." }, { status: 403 });
  }

  const ok = deleteStreamClip(streamId, clipId);
  if (!ok) return NextResponse.json({ error: "Clip not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
