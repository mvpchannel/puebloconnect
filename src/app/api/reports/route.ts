import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  createNeighborhoodReport,
  listNeighborhoodReports,
  ReportCategory,
  ReportStatus,
  NeighborhoodReport,
} from "@/lib/db";

const VALID_CATEGORIES: ReportCategory[] = ["street_light", "dumped_item", "park_maintenance", "traffic_hazard", "other"];
const VALID_STATUSES: ReportStatus[] = ["submitted", "acknowledged", "in_progress", "resolved", "closed"];
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_LOCATION_TEXT_LENGTH = 200;
const MAX_PHOTO_URL_LENGTH = 2000;

export function shapeReport(r: NeighborhoodReport) {
  return {
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: [r.reporter_first_name, r.reporter_last_name].filter(Boolean).join(" ") || r.reporter_username,
    category: r.category,
    description: r.description,
    photoUrl: r.photo_url,
    locationText: r.location_text,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
    resolutionNote: r.resolution_note,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    followerCount: r.follower_count,
  };
}

// GET /api/reports?status=&category=&mine=1 — browse reports, newest
// first. Public, like the rest of the site's browse pages.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const categoryParam = searchParams.get("category");
  const mine = searchParams.get("mine") === "1";

  if (statusParam && !VALID_STATUSES.includes(statusParam as ReportStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as ReportCategory)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (mine && !session) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const reports = listNeighborhoodReports({
    status: (statusParam as ReportStatus) || undefined,
    category: (categoryParam as ReportCategory) || undefined,
    reporterId: mine ? session!.sub : undefined,
  });
  return NextResponse.json({ reports: reports.map(shapeReport) });
}

// POST /api/reports — submit a 1-tap neighborhood issue report.
// Requires login. Location is optional (locationText and/or
// latitude+longitude) — a report with coordinates becomes searchable
// via /api/reports/nearby.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { category, description, photoUrl, locationText, latitude, longitude } = (payload ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as ReportCategory)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "A description is required." }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` }, { status: 400 });
  }

  let resolvedPhotoUrl: string | null = null;
  if (photoUrl !== undefined && photoUrl !== null && photoUrl !== "") {
    if (typeof photoUrl !== "string" || photoUrl.length > MAX_PHOTO_URL_LENGTH) {
      return NextResponse.json({ error: "Invalid photo URL." }, { status: 400 });
    }
    resolvedPhotoUrl = photoUrl.trim();
  }

  let resolvedLocationText: string | null = null;
  if (locationText !== undefined && locationText !== null && locationText !== "") {
    if (typeof locationText !== "string" || locationText.length > MAX_LOCATION_TEXT_LENGTH) {
      return NextResponse.json({ error: "Invalid location." }, { status: 400 });
    }
    resolvedLocationText = locationText.trim();
  }

  let resolvedLat: number | null = null;
  let resolvedLng: number | null = null;
  if (latitude !== undefined && latitude !== null) {
    resolvedLat = Number(latitude);
    resolvedLng = Number(longitude);
    if (!Number.isFinite(resolvedLat) || !Number.isFinite(resolvedLng) || Math.abs(resolvedLat) > 90 || Math.abs(resolvedLng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
    }
  }

  const report = createNeighborhoodReport(session.sub, {
    category: category as ReportCategory,
    description: description.trim(),
    photoUrl: resolvedPhotoUrl,
    locationText: resolvedLocationText,
    latitude: resolvedLat,
    longitude: resolvedLng,
  });

  return NextResponse.json({ report: shapeReport(report) }, { status: 201 });
}
