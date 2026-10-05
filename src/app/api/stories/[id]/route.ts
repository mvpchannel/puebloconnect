import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStoryById, softDeleteStory } from "@/lib/db";

// DELETE /api/stories/:id — a member can remove their own story early; an
// admin can remove any story (moderation).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }
  const story = getStoryById(id);
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  if (story.author_id !== session.sub && session.role !== "admin") {
    return NextResponse.json({ error: "You can't delete someone else's story." }, { status: 403 });
  }
  softDeleteStory(id);
  return NextResponse.json({ ok: true });
}
