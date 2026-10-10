import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { limitMember } from "@/lib/rate-limit";
import {
  getNeighborhoodReportById,
  updateNeighborhoodReportStatus,
  listReportFollowerEmails,
  ReportStatus,
  enqueueEmail,
} from "@/lib/db";
import { processEmailQueue } from "@/lib/email";
import { shapeReport } from "@/lib/report-shape";

const VALID_STATUSES: ReportStatus[] = ["submitted", "acknowledged", "in_progress", "resolved", "closed"];
const MAX_NOTE_LENGTH = 500;

// POST /api/reports/:id/status — move a report forward through its
// lifecycle and notify everyone tracking it. Admin only — this app's
// roles are a flat member/admin (no separate "Community Moderator"
// tier exists yet), so review work here is an admin responsibility
// for now. Body: { status, note? }.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "report");
  if (limited) return limited as NextResponse;
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can update a report's status." }, { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }
  const existing = getNeighborhoodReportById(id);
  if (!existing) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { status, note } = (payload ?? {}) as Record<string, unknown>;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json({ error: "A valid status is required." }, { status: 400 });
  }
  let resolvedNote: string | null = null;
  if (note !== undefined && note !== null && note !== "") {
    if (typeof note !== "string" || note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: `Notes must be ${MAX_NOTE_LENGTH} characters or fewer.` }, { status: 400 });
    }
    resolvedNote = note.trim();
  }

  const updated = updateNeighborhoodReportStatus(id, status as ReportStatus, session.sub, resolvedNote);
  if (!updated) {
    return NextResponse.json({ error: `Can't move a report from "${existing.status}" to "${status}".` }, { status: 409 });
  }

  const followerEmails = listReportFollowerEmails(id);
  for (const email of followerEmails) {
    enqueueEmail(email, "report_status_update", {
      reportId: id,
      reportDescription: updated.description,
      newStatus: updated.status,
      note: resolvedNote ?? "",
    });
  }
  if (followerEmails.length > 0) void processEmailQueue();

  return NextResponse.json({ report: shapeReport(updated) });
}
