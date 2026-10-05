import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { limitMember } from "@/lib/rate-limit";
import { getStreamById, setStreamReminder, removeStreamReminder } from "@/lib/db";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/streams/:id/reminder — "Remind me": notify me when this
// scheduled stream goes live. (The in-app notification is sent at the
// moment the host starts the stream — there is no clock-based reminder.)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "like");
  if (limited) return limited as NextResponse;

  const streamId = parseId(params.id);
  if (!streamId) return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  if (stream.status !== "scheduled") {
    return NextResponse.json({ error: "Reminders are only for upcoming streams." }, { status: 400 });
  }
  if (stream.host_id === session.sub) {
    return NextResponse.json({ error: "You're the host — you'll start this one yourself." }, { status: 400 });
  }
  setStreamReminder(streamId, session.sub);
  return NextResponse.json({ reminding: true });
}

// DELETE /api/streams/:id/reminder — cancel the reminder.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const streamId = parseId(params.id);
  if (!streamId) return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  removeStreamReminder(streamId, session.sub);
  return NextResponse.json({ reminding: false });
}
