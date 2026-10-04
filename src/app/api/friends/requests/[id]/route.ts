import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { respondToFriendRequest, getUserById, enqueueEmail, createNotification } from "@/lib/db";
import { processEmailQueue } from "@/lib/email";

// POST /api/friends/requests/:id — accept or decline a friend request.
// Body: { accept: boolean }. Only the recipient may respond (enforced in
// respondToFriendRequest). Queues an acceptance notification to the
// original sender when accept=true.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const requestId = Number(params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { accept } = (body ?? {}) as Record<string, unknown>;
  if (typeof accept !== "boolean") {
    return NextResponse.json({ error: "accept must be true or false." }, { status: 400 });
  }

  let request;
  try {
    request = respondToFriendRequest(requestId, session.sub, accept);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't respond to that request." },
      { status: 400 }
    );
  }

  if (accept) {
    // request.other_user_id is the original sender here — the viewer
    // passed into getFriendRequestById was session.sub (the recipient),
    // and respondToFriendRequest already verified session.sub IS the
    // recipient, so "other" can only mean the sender.
    const originalSender = getUserById(request.other_user_id);
    const responder = getUserById(session.sub);
    if (originalSender && responder) {
      const responderName =
        [responder.first_name, responder.last_name].filter(Boolean).join(" ") || responder.username;
      enqueueEmail(originalSender.email, "friend_accepted", { fromName: responderName });
      void processEmailQueue();
      createNotification(originalSender.id, session.sub, "friend_accepted", "user", session.sub);
    }
  }

  return NextResponse.json({
    request: {
      id: request.id,
      status: request.status,
      createdAt: request.created_at,
      otherUserId: request.other_user_id,
      otherUsername: request.other_username,
      otherName:
        [request.other_first_name, request.other_last_name].filter(Boolean).join(" ") ||
        request.other_username,
      otherProfilePhotoPath: request.other_profile_photo_path,
    },
  });
}
