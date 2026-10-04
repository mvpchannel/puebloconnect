import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, resolveCommentReport } from "@/lib/db";

const VALID_RESOLUTIONS = ["dismissed", "comment_deleted", "user_banned"] as const;

// POST /api/streams/:id/moderation/:reportId — resolve an open report.
// Body: { resolution: "dismissed" | "comment_deleted" | "user_banned" }.
// Host or admin only.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const reportId = Number(params.reportId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });

  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can resolve this." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { resolution } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof resolution !== "string" ||
    !VALID_RESOLUTIONS.includes(resolution as (typeof VALID_RESOLUTIONS)[number])
  ) {
    return NextResponse.json(
      { error: `resolution must be one of: ${VALID_RESOLUTIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    resolveCommentReport(reportId, session.sub, resolution as (typeof VALID_RESOLUTIONS)[number]);
    return NextResponse.json({ resolved: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't resolve that report." },
      { status: 400 }
    );
  }
}
