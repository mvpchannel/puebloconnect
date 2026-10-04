import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getNeighborhoodReportById, toggleReportFollow } from "@/lib/db";

// POST /api/reports/:id/follow — toggle tracking a report. Requires
// login. This is what "real-time local push notifications" becomes
// honestly in this app: a follower, plus a real email the moment
// status changes (see .../status/route.ts) — there's no mobile push
// infrastructure here.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }
  if (!getNeighborhoodReportById(id)) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const following = toggleReportFollow(id, session.sub);
  return NextResponse.json({ following });
}
