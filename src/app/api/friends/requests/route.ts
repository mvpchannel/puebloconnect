import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  sendFriendRequest,
  getUserById,
  enqueueEmail,
} from "@/lib/db";
import { processEmailQueue } from "@/lib/email";

function shapeRequest(r: {
  id: number;
  status: string;
  created_at: string;
  other_user_id: number;
  other_username: string;
  other_first_name: string | null;
  other_last_name: string | null;
  other_profile_photo_path: string | null;
}) {
  return {
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    otherUserId: r.other_user_id,
    otherUsername: r.other_username,
    otherName:
      [r.other_first_name, r.other_last_name].filter(Boolean).join(" ") || r.other_username,
    otherProfilePhotoPath: r.other_profile_photo_path,
  };
}

// GET /api/friends/requests — this user's pending incoming and outgoing
// friend requests.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  return NextResponse.json({
    incoming: listIncomingFriendRequests(session.sub).map(shapeRequest),
    outgoing: listOutgoingFriendRequests(session.sub).map(shapeRequest),
  });
}

// POST /api/friends/requests — send a friend request. Body: { recipientId }.
// Queues a notification email to the recipient rather than sending inline.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { recipientId } = (body ?? {}) as Record<string, unknown>;
  if (typeof recipientId !== "number" || !Number.isInteger(recipientId) || recipientId <= 0) {
    return NextResponse.json({ error: "Invalid recipientId." }, { status: 400 });
  }

  const recipient = getUserById(recipientId);
  if (!recipient) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let request;
  try {
    request = sendFriendRequest(session.sub, recipientId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't send that friend request." },
      { status: 400 }
    );
  }

  const sender = getUserById(session.sub);
  const senderName = sender
    ? [sender.first_name, sender.last_name].filter(Boolean).join(" ") || sender.username
    : "Someone";
  enqueueEmail(recipient.email, "friend_request", { fromName: senderName });
  void processEmailQueue();

  return NextResponse.json({ request: shapeRequest(request) }, { status: 201 });
}
