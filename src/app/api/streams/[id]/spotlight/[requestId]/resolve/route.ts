import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, listSpotlightRequests, resolveSpotlightRequest } from "@/lib/db";

// POST /api/streams/:id/spotlight/:requestId/resolve — mark a request
// spotlighted or dismissed. Host or admin only.
// Body: { status: "spotlighted" | "dismissed" }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const requestId = Number(params.requestId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can resolve spotlight requests." }, { status: 403 });
  }

  const belongsToStream = listSpotlightRequests(streamId).some((r) => r.id === requestId);
  if (!belongsToStream) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { status } = (payload ?? {}) as Record<string, unknown>;
  if (status !== "spotlighted" && status !== "dismissed") {
    return NextResponse.json({ error: "status must be spotlighted or dismissed." }, { status: 400 });
  }

  const ok = resolveSpotlightRequest(requestId, status);
  if (!ok) return NextResponse.json({ error: "That request was already resolved." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
