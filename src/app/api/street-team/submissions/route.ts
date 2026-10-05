import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { safeHttpUrl } from "@/lib/safe-url";
import { createStreetTeamSubmission, StreetTeamMediaType } from "@/lib/db";

const MAX_CAPTION_LENGTH = 500;
const MAX_LOCATION_LENGTH = 100;
const MAX_URL_LENGTH = 1000;
const VALID_MEDIA_TYPES: StreetTeamMediaType[] = ["photo", "video"];

// POST /api/street-team/submissions — a member submits a photo/video link
// (with caption + location) to the Street Team queue. Always lands as
// 'pending' — see createStreetTeamSubmission's own comment; there is no
// path from here straight to 'approved'.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { mediaType, mediaUrl, caption, locationText } = (body ?? {}) as Record<string, unknown>;

  if (typeof mediaType !== "string" || !VALID_MEDIA_TYPES.includes(mediaType as StreetTeamMediaType)) {
    return NextResponse.json({ error: "mediaType must be 'photo' or 'video'." }, { status: 400 });
  }
  if (typeof mediaUrl !== "string" || mediaUrl.trim().length === 0) {
    return NextResponse.json({ error: "A media link is required." }, { status: 400 });
  }
  if (mediaUrl.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "That link is too long." }, { status: 400 });
  }
  if (!safeHttpUrl(mediaUrl)) {
    return NextResponse.json({ error: "Enter a full web link starting with https://." }, { status: 400 });
  }
  if (caption !== undefined && caption !== null) {
    if (typeof caption !== "string") {
      return NextResponse.json({ error: "Invalid caption." }, { status: 400 });
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      return NextResponse.json(
        { error: `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
  }
  if (locationText !== undefined && locationText !== null) {
    if (typeof locationText !== "string") {
      return NextResponse.json({ error: "Invalid location." }, { status: 400 });
    }
    if (locationText.length > MAX_LOCATION_LENGTH) {
      return NextResponse.json(
        { error: `Location must be ${MAX_LOCATION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
  }

  const submission = createStreetTeamSubmission(
    session.sub,
    mediaType as StreetTeamMediaType,
    mediaUrl.trim(),
    (caption as string | null | undefined)?.trim() || null,
    (locationText as string | null | undefined)?.trim() || null
  );

  return NextResponse.json(
    {
      submission: {
        id: submission.id,
        mediaType: submission.media_type,
        mediaUrl: submission.media_url,
        caption: submission.caption,
        locationText: submission.location_text,
        status: submission.status,
        createdAt: submission.created_at,
      },
    },
    { status: 201 }
  );
}
