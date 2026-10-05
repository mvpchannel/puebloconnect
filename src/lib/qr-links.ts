import { SITE_URL } from "@/lib/site-url";

// Where a QR link may point: an internal path on this site only, so a link can
// never be turned into an open redirect to another website.
export function parseQrTarget(raw: unknown): { path: string } | { error: string } {
  if (typeof raw !== "string") return { error: "Enter the page this QR code should open." };
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return { error: "The page must be a path on this site, like /deals or /events/summer-fair." };
  }
  if (path.length > 200) return { error: "That path is too long." };
  if (/[\s\u0000-\u001f\u007f\\]/.test(path)) return { error: "The path can't contain spaces or special characters." };
  if (path === "/q" || path.startsWith("/q/")) return { error: "A QR link can't point at another QR link." };
  return { path };
}

export function qrLinkUrl(code: string): string {
  return `${SITE_URL}/q/${code}`;
}
