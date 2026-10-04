import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getStreamById,
  createStreamFlashDrop,
  getActiveStreamFlashDrop,
  getStreamFlashDropClaimCount,
  hasClaimedStreamFlashDrop,
  getDealById,
  StreamFlashDropType,
} from "@/lib/db";

const MAX_LABEL_LENGTH = 150;
const MIN_DURATION_SECONDS = 15;
const MAX_DURATION_SECONDS = 30 * 60;
const VALID_TYPES: StreamFlashDropType[] = ["passport_stamp", "deal"];

// GET /api/streams/:id/flash-drops — the one flash drop currently on
// screen, if any, with its claim count and whether the viewer has
// already claimed it.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const drop = getActiveStreamFlashDrop(streamId);
  if (!drop) return NextResponse.json({ drop: null });

  const session = requireUser(req);
  return NextResponse.json({
    drop: {
      id: drop.id,
      type: drop.type,
      dealId: drop.deal_id,
      label: drop.label,
      expiresAt: drop.expires_at,
      claimCount: getStreamFlashDropClaimCount(drop.id),
      claimedByViewer: session ? hasClaimedStreamFlashDrop(drop.id, session.sub) : false,
    },
  });
}

// POST /api/streams/:id/flash-drops — trigger a time-limited on-screen
// drop. Host or admin only. Body: { type, label, durationSeconds, dealId? }.
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
    return NextResponse.json({ error: "Only the host or an admin can trigger a flash drop." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { type, label, durationSeconds, dealId } = (payload ?? {}) as Record<string, unknown>;

  if (typeof type !== "string" || !VALID_TYPES.includes(type as StreamFlashDropType)) {
    return NextResponse.json({ error: "type must be 'passport_stamp' or 'deal'." }, { status: 400 });
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "A label is required." }, { status: 400 });
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json({ error: `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (
    typeof durationSeconds !== "number" ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < MIN_DURATION_SECONDS ||
    durationSeconds > MAX_DURATION_SECONDS
  ) {
    return NextResponse.json(
      { error: `durationSeconds must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS}.` },
      { status: 400 }
    );
  }

  let resolvedDealId: number | null = null;
  if (type === "deal") {
    if (typeof dealId !== "number" || !Number.isInteger(dealId)) {
      return NextResponse.json({ error: "dealId is required for a deal-type drop." }, { status: 400 });
    }
    if (!getDealById(dealId)) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    resolvedDealId = dealId;
  }

  const drop = createStreamFlashDrop(
    streamId,
    session.sub,
    type as StreamFlashDropType,
    resolvedDealId,
    label.trim(),
    durationSeconds
  );
  return NextResponse.json(
    { drop: { id: drop.id, type: drop.type, label: drop.label, expiresAt: drop.expires_at } },
    { status: 201 }
  );
}
