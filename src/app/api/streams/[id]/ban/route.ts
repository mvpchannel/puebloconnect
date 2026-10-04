import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, banStreamViewer, getUserById } from "@/lib/db";

// POST /api/streams/:id/ban — ban a viewer from commenting on this
// stream's chat (not a site-wide ban). Host or admin only. Body: { userId }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });

  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can ban a viewer." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { userId } = (body ?? {}) as Record<string, unknown>;
  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
  }
  if (!getUserById(userId)) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (userId === stream.host_id) {
    return NextResponse.json({ error: "The host can't ban themselves." }, { status: 400 });
  }

  banStreamViewer(streamId, userId, session.sub);
  return NextResponse.json({ banned: true });
}
