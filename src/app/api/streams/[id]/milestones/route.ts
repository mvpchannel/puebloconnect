import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, createStreamMilestone, listStreamMilestones, getDealById } from "@/lib/db";

const MAX_DESCRIPTION_LENGTH = 200;

// GET /api/streams/:id/milestones — every milestone for this stream,
// in goal order, each flagged reached or not. No login required.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const milestones = listStreamMilestones(streamId);
  return NextResponse.json({
    milestones: milestones.map((m) => {
      const deal = m.deal_id ? getDealById(m.deal_id) : undefined;
      return {
        id: m.id,
        goalValue: m.goal_value,
        rewardDescription: m.reward_description,
        reached: m.reached_at !== null,
        reachedAt: m.reached_at,
        deal: deal ? { id: deal.id, title: deal.title, businessSlug: deal.business_slug } : null,
      };
    }),
  });
}

// POST /api/streams/:id/milestones — set a viewer-count goal ("If we
// reach 100 viewers..."), optionally revealing a real Deal when it's
// hit. Host or admin only. Body: { goalValue, rewardDescription, dealId? }.
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
    return NextResponse.json({ error: "Only the host or an admin can set a milestone." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { goalValue, rewardDescription, dealId } = (payload ?? {}) as Record<string, unknown>;

  if (typeof goalValue !== "number" || !Number.isInteger(goalValue) || goalValue <= 0) {
    return NextResponse.json({ error: "goalValue must be a positive whole number." }, { status: 400 });
  }
  if (typeof rewardDescription !== "string" || rewardDescription.trim().length === 0) {
    return NextResponse.json({ error: "A reward description is required." }, { status: 400 });
  }
  if (rewardDescription.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Reward descriptions must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }
  let resolvedDealId: number | null = null;
  if (dealId !== undefined && dealId !== null) {
    if (typeof dealId !== "number" || !Number.isInteger(dealId)) {
      return NextResponse.json({ error: "Invalid dealId." }, { status: 400 });
    }
    if (!getDealById(dealId)) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    resolvedDealId = dealId;
  }

  const milestone = createStreamMilestone(
    streamId,
    session.sub,
    goalValue,
    rewardDescription.trim(),
    resolvedDealId
  );
  return NextResponse.json(
    { milestone: { id: milestone.id, goalValue: milestone.goal_value, rewardDescription: milestone.reward_description } },
    { status: 201 }
  );
}
