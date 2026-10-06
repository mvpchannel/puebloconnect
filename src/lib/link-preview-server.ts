import { safeFetch } from "./safe-fetch";
import { parseMeta, hostLabel, tidy, type RawMeta } from "./link-meta";
import { saveImageBuffer } from "./save-image";

export type FetchedMeta = RawMeta & { url: string };

// Reads a page's title/description/picture. Returns an error string the
// admin form can show (sites like Eventbrite often refuse automated reads).
export async function fetchLinkMeta(url: string): Promise<FetchedMeta | { error: string }> {
  const r = await safeFetch(url, {
    maxBytes: 600_000,
    accept: "text/html,application/xhtml+xml",
    wantType: /text\/html|application\/xhtml/i,
  });
  if ("error" in r) return r;
  const html = r.body.toString("utf8");
  const meta = parseMeta(html, r.finalUrl);
  if (!meta.title && !meta.description && !meta.image) {
    return { error: "That page didn't share a title or picture. You can fill the card in by hand." };
  }
  return { ...meta, url: r.finalUrl, site: meta.site || hostLabel(r.finalUrl) };
}

// Downloads a picture through the same guard and stores our own copy.
export async function downloadCardImage(imageUrl: string): Promise<string | { error: string }> {
  const r = await safeFetch(imageUrl, {
    maxBytes: 3 * 1024 * 1024,
    accept: "image/png,image/jpeg,image/webp",
    wantType: /^image\//i,
    timeoutMs: 8000,
  });
  if ("error" in r) return { error: r.error === "too-big" ? "The picture is too large." : r.error };
  return saveImageBuffer(r.body, "links");
}

export { tidy };
