import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createPuebloQuestion } from "@/lib/db";
import { parseQuestionBody } from "@/lib/we-asked";

// POST /api/admin/we-asked — post a new question (admin only).
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseQuestionBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const q = createPuebloQuestion(parsed.input);
  return NextResponse.json({ question: { id: q.id, slug: q.slug } }, { status: 201 });
}
