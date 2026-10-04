import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getStreetTeamSubmissionById, reviewStreetTeamSubmission } from "@/lib/db";

const MAX_NOTE_LENGTH = 300;

// POST /api/admin/street-team/submissions/:id/review — approve or reject
// a pending submission. A submission already decided is left alone —
// see reviewStreetTeamSubmission's own "only from 'pending'" comment.
export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const submissionId = Number(params.submissionId);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "Invalid submission id." }, { status: 400 });
  }

  const submission = getStreetTeamSubmissionById(submissionId);
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { decision, note } = (body ?? {}) as Record<string, unknown>;

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'." }, { status: 400 });
  }
  if (note !== undefined && note !== null) {
    if (typeof note !== "string") {
      return NextResponse.json({ error: "Invalid note." }, { status: 400 });
    }
    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
  }

  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "This submission has already been reviewed." },
      { status: 409 }
    );
  }

  reviewStreetTeamSubmission(submissionId, admin.sub, decision, (note as string | null | undefined)?.trim() || null);

  const updated = getStreetTeamSubmissionById(submissionId)!;
  return NextResponse.json({
    submission: {
      id: updated.id,
      status: updated.status,
      reviewNote: updated.review_note,
      reviewedAt: updated.reviewed_at,
    },
  });
}
