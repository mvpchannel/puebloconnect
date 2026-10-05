import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { startStream } from "@/lib/db";
import { processEmailQueue } from "@/lib/email";

// POST /api/streams/:id/start — host goes live on a scheduled stream.
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
    const stream = startStream(streamId, session.sub);
    void processEmailQueue();
    return NextResponse.json({ status: stream.status, startedAt: stream.started_at });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't start that stream." },
      { status: 400 }
    );
  }
}
