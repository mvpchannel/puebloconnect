// Shared validators for user-supplied links and redirect targets. Pure
// string/URL logic (no imports) so it runs on the server, in the edge
// runtime and in plain-node tests alike.

const MAX_URL_LENGTH = 2048;

// Accepts only http(s) URLs with a host and no embedded credentials.
// Returns the normalised URL string, or null when it isn't acceptable.
// `allowBare` lets members type "mybusiness.com" — https:// is added.
// Anything with another scheme (javascript:, data:, vbscript:, file:…)
// is rejected, never "fixed up".
export function safeHttpUrl(value: unknown, opts: { allowBare?: boolean } = {}): string | null {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  // Control characters / whitespace inside a URL are how scheme filters get bypassed.
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return null;

  if (opts.allowBare && !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith("//")) {
    // "host.tld/path" — but not "javascript:..." (caught by the scheme test above).
    raw = `https://${raw}`;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

// For rendering stored values: returns the URL only if it still passes
// safeHttpUrl (protects against rows saved before validation existed).
export function renderableUrl(value: string | null | undefined): string | null {
  return value ? safeHttpUrl(value, { allowBare: false }) : null;
}

// Post-login redirect targets must be same-site paths. "//evil.com",
// "/\evil.com", "https://…" and "javascript:" all fall back.
export function safeInternalPath(value: string | null | undefined, fallback = "/newsfeed"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  return value;
}

// Streams are bring-your-own-broadcast; only the three supported
// platforms' hosts may be embedded in an <iframe>.
const STREAM_HOSTS: Record<"youtube" | "facebook" | "vimeo", string[]> = {
  youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  facebook: ["facebook.com", "fb.watch"],
  vimeo: ["vimeo.com"],
};

function hostMatches(hostname: string, domains: string[]): boolean {
  const h = hostname.toLowerCase();
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

export function isAllowedStreamUrl(platform: string, url: string): boolean {
  if (platform !== "youtube" && platform !== "facebook" && platform !== "vimeo") return false;
  const safe = safeHttpUrl(url);
  if (!safe || !safe.startsWith("https:")) return false;
  return hostMatches(new URL(safe).hostname, STREAM_HOSTS[platform]);
}

export function isAnyStreamHost(url: string): boolean {
  const safe = safeHttpUrl(url);
  if (!safe || !safe.startsWith("https:")) return false;
  const host = new URL(safe).hostname;
  return Object.values(STREAM_HOSTS).some((d) => hostMatches(host, d));
}
