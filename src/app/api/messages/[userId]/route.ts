import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  listMessagesBetween,
  markMessagesRead,
  sendMessage,
  getUserById,
  enqueueEmail,
  createNotification,
} from "@/lib/db";
import { processEmailQueue } from "@/lib/email";

const MAX_MESSAGE_LENGTH = 5000;

function shapeMessage(m: {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
}) {
  return {
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
  };
}

// GET /api/messages/:userId — the thread between the requesting user and
// :userId, oldest first. Marks any unread messages FROM :userId as read
// (the requesting user is, by opening this thread, reading them now).
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const otherUserId = Number(params.userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }
  if (!getUserById(otherUserId)) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  markMessagesRead(session.sub, otherUserId);
  const messages = listMessagesBetween(session.sub, otherUserId);
  return NextResponse.json({ messages: messages.map(shapeMessage) });
}

// POST /api/messages/:userId — send a message to :userId. Queues a
// notification email to the recipient rather than sending inline.
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const otherUserId = Number(params.userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }
  const recipient = getUserById(otherUserId);
  if (!recipient) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { body: text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let message;
  try {
    message = sendMessage(session.sub, otherUserId, text.trim());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't send that message." },
      { status: 400 }
    );
  }

  const sender = getUserById(session.sub);
  const senderName = sender
    ? [sender.first_name, sender.last_name].filter(Boolean).join(" ") || sender.username
    : "Someone";
  enqueueEmail(recipient.email, "new_message", { fromName: senderName });
  void processEmailQueue();
  createNotification(otherUserId, session.sub, "new_message", "user", session.sub);

  return NextResponse.json({ message: shapeMessage(message) }, { status: 201 });
}
