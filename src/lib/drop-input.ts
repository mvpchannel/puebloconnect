import { DROP_SPOTS } from "@/lib/pueblo3d/places";
import type { PuebloDropInput } from "@/lib/db";

// Validates the admin "new treasure drop" form. The hiding spot must be one of
// the curated spots so a drop can never be placed inside a building.
export function parseDropBody(body: Record<string, unknown>): { input: PuebloDropInput } | { error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const prizeText = typeof body.prizeText === "string" ? body.prizeText.trim() : "";
  if (!title || title.length > 80) return { error: "Enter a title (80 characters max)." };
  if (!prizeText || prizeText.length > 300) return { error: "Describe the prize (300 characters max)." };
  const kind = body.kind === "golden_ticket" ? "golden_ticket" : body.kind === "prize" ? "prize" : null;
  if (!kind) return { error: "Choose a type." };
  const spot = DROP_SPOTS.find((s) => s.id === body.spotId);
  if (!spot) return { error: "Choose a hiding spot." };
  const points = body.points === undefined || body.points === "" ? 0 : Number(body.points);
  if (!Number.isInteger(points) || points < 0 || points > 50) return { error: "Points must be a whole number from 0 to 50." };
  const maxClaims = body.maxClaims === undefined || body.maxClaims === null || body.maxClaims === "" ? null : Number(body.maxClaims);
  if (maxClaims !== null && (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 100000)) {
    return { error: "Maximum claims must be a whole number of 1 or more, or blank for unlimited." };
  }
  const expiresInDays =
    body.expiresInDays === undefined || body.expiresInDays === null || body.expiresInDays === "" ? null : Number(body.expiresInDays);
  if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365)) {
    return { error: "Expiry must be 1 to 365 days, or blank for none." };
  }
  return { input: { title, prizeText, kind, x: spot.x, z: spot.z, points, maxClaims, expiresInDays } };
}
