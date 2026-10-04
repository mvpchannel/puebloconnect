import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getTotalPointsForUser,
  listPointEventsForUser,
  getRewardsLevelsForUser,
  getCurrentRewardsLevel,
  listRewardsLeaderboard,
  REWARDS_ACTION_LABELS,
} from "@/lib/db";

// GET /api/rewards — the logged-in member's point total, level, recent
// point history, and the site-wide leaderboard.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const totalPoints = getTotalPointsForUser(session.sub);
  const levels = getRewardsLevelsForUser(session.sub);
  const currentLevel = getCurrentRewardsLevel(session.sub);
  const history = listPointEventsForUser(session.sub, 50);
  const leaderboard = listRewardsLeaderboard(10);

  return NextResponse.json({
    totalPoints,
    levels,
    currentLevel,
    history: history.map((h) => ({
      id: h.id,
      action: h.action,
      label: REWARDS_ACTION_LABELS[h.action] ?? h.action,
      points: h.points,
      createdAt: h.created_at,
    })),
    leaderboard: leaderboard.map((row) => ({
      userId: row.user_id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.username,
      totalPoints: row.total_points,
    })),
  });
}
