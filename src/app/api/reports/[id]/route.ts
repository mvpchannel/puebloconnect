import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getNeighborhoodReportById, isFollowingReport } from "@/lib/db";
import { shapeReport } from "../route";

// GET /api/reports/:id — a single report, with the viewer's own
// tracking state. Public.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }
  const report = getNeighborhoodReportById(id);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const session = requireUser(req);
  return NextResponse.json({
    report: {
      ...shapeReport(report),
      followedByViewer: session ? isFollowingReport(id, session.sub) : false,
    },
  });
}
