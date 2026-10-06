import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { limitMember } from "@/lib/rate-limit";
import { createPost } from "@/lib/db";
import { serializeLink, tidy, hostLabel, type LinkPreview } from "@/lib/link-meta";
import { checkUrlShape } from "@/lib/safe-fetch";
import { downloadCardImage } from "@/lib/link-preview-server";
import { saveDataUrlImage } from "@/lib/save-image";

// Admin-only: publish a link post with a preview card. Nothing from the
// browser is trusted: the address is re-checked, and any picture is
// downloaded (or decoded) and stored by the server.
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const limited = limitMember(Number(admin.sub), "adminLinkPost");
  if (limited) return limited;

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  let url: URL;
  try { url = new URL(str(b.url).trim()); } catch { return NextResponse.json({ error: "Enter a full web address." }, { status: 400 }); }
  const bad = checkUrlShape(url);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const note = str(b.note).trim().slice(0, 1000);
  const title = tidy(str(b.title), 140);
  if (!title) return NextResponse.json({ error: "The card needs a title." }, { status: 400 });

  let image: string | null = null;
  const dataUrl = str(b.imageDataUrl);
  const imageUrl = str(b.imageUrl).trim();
  if (dataUrl) {
    const saved = saveDataUrlImage(dataUrl, "links");
    if (typeof saved !== "string") return NextResponse.json({ error: `Card picture: ${saved.error}` }, { status: 400 });
    image = saved;
  } else if (imageUrl) {
    const saved = await downloadCardImage(imageUrl);
    // A picture that can't be fetched shouldn't block the post; the card
    // falls back to the site's initial.
    if (typeof saved === "string") image = saved;
  }

  const preview: LinkPreview = {
    url: url.toString(),
    title,
    description: tidy(str(b.description), 300),
    image,
    site: tidy(str(b.site), 60) || hostLabel(url.toString()),
  };
  // The address stays in the post text too, so the plain link still works
  // anywhere the card can't render.
  const text = note ? `${note}\n\n${preview.url}` : preview.url;
  const post = createPost(Number(admin.sub), text, "feed", null, null, null, serializeLink(preview));
  return NextResponse.json({ ok: true, postId: post.id, imageSaved: Boolean(image) }, { status: 201 });
}
