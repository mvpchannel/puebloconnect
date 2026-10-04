import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { endStream } from "@/lib/db";

// POST /api/streams/:id/end — host ends a live stream. The stream row
// doesn't move or get deleted — status just flips to 'ended' and the
// same embed_url becomes the VOD (see endStream in db.ts).
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

  try {
    const stream = endStream(streamId, session.sub);
    return NextResponse.json({ status: stream.status, endedAt: stream.ended_at });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't end that stream." },
      { status: 400 }
    );
  }
}
