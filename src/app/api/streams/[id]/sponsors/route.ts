import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getBusinessById, addStreamSponsor, listStreamSponsors } from "@/lib/db";

function shapeSponsor(s: {
  id: number;
  business_id: number;
  business_name: string;
  business_slug: string;
  business_category: string;
  business_logo_path: string | null;
}) {
  return {
    id: s.id,
    businessId: s.business_id,
    businessName: s.business_name,
    businessSlug: s.business_slug,
    businessCategory: s.business_category,
    businessLogoPath: s.business_logo_path,
  };
}

// GET /api/streams/:id/sponsors — featured local sponsors for this
// stream. Public, like the rest of the stream page.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, null)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }
  return NextResponse.json({ sponsors: listStreamSponsors(streamId).map(shapeSponsor) });
}

// POST /api/streams/:id/sponsors — tag an existing Business as a
// sponsor/partner of this stream. Host or admin only. Body: { businessId }.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: "Only the host or an admin can add a sponsor." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { businessId } = (payload ?? {}) as Record<string, unknown>;
  const parsedBusinessId = Number(businessId);
  if (!Number.isInteger(parsedBusinessId) || parsedBusinessId <= 0) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }
  if (!getBusinessById(parsedBusinessId)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const sponsor = addStreamSponsor(streamId, parsedBusinessId, session.sub);
  return NextResponse.json({ sponsor: shapeSponsor(sponsor) }, { status: 201 });
}
