import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getBusinessBySlug,
  isBusinessOwner,
  createBusinessJob,
  listBusinessJobs,
  BusinessJob,
} from "@/lib/db";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

function shapeJob(j: BusinessJob) {
  return {
    id: j.id,
    businessId: j.business_id,
    title: j.title,
    description: j.description,
    createdAt: j.created_at,
    closedAt: j.closed_at,
  };
}

// GET /api/businesses/:slug/jobs — open jobs only, newest first.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const jobs = listBusinessJobs(business.id);
  return NextResponse.json({ jobs: jobs.map(shapeJob) });
}

// POST /api/businesses/:slug/jobs — post a job opening. Owner only.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can post jobs." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { title, description } = (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Job title is required." }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Job title must be ${MAX_TITLE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let resolvedDescription: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description." }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedDescription = description.trim() || null;
  }

  const job = createBusinessJob(business.id, title.trim(), resolvedDescription);
  return NextResponse.json({ job: shapeJob(job) }, { status: 201 });
}
