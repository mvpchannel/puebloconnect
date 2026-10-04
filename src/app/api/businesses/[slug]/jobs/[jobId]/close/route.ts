import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, isBusinessOwner, closeBusinessJob } from "@/lib/db";

// POST /api/businesses/:slug/jobs/:jobId/close — mark a job opening
// filled/closed. Owner only.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; jobId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can close its jobs." }, { status: 403 });
  }

  const jobId = Number(params.jobId);
  if (!Number.isInteger(jobId)) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  closeBusinessJob(business.id, jobId);
  return NextResponse.json({ ok: true });
}
