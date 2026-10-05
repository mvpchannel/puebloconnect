import { saveDataUrlImage } from "@/lib/save-image";
import type { SpotlightInput } from "@/lib/db";

// Validates the admin spotlight form body (shared by create + update).
export function parseSpotlightBody(
  body: Record<string, unknown>
): { input: SpotlightInput } | { error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";

  if (!title || title.length > 140) return { error: "Title is required (140 characters max)." };
  if (!summary || summary.length > 300) return { error: "Summary is required (300 characters max)." };
  if (!text || text.length > 20000) return { error: "The story is required (20,000 characters max)." };
  if (ownerName.length > 100) return { error: "Owner name is too long." };

  let businessId: number | null = null;
  if (body.businessId !== undefined && body.businessId !== null && body.businessId !== "") {
    const n = Number(body.businessId);
    if (!Number.isInteger(n) || n <= 0) return { error: "Invalid business." };
    businessId = n;
  }

  let heroImagePath: string | null | undefined = undefined;
  if (body.removeHeroImage === true) {
    heroImagePath = null;
  } else if (typeof body.heroImageDataUrl === "string" && body.heroImageDataUrl.length > 0) {
    const saved = saveDataUrlImage(body.heroImageDataUrl, "spotlight");
    if (typeof saved !== "string") return { error: `Photo: ${saved.error}` };
    heroImagePath = saved;
  }

  return {
    input: {
      businessId,
      title,
      summary,
      ownerName: ownerName || null,
      body: text,
      heroImagePath,
      sponsored: body.sponsored === true,
      publish: body.publish === true,
    },
  };
}
