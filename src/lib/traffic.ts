// Pure helpers for the site traffic report: telling bots apart, working out where a
// visit came from, reading the visitor's rough location from proxy headers, and
// grouping visits into days or weeks. No database or network access here.

import { createHash } from "node:crypto";

const TZ = "America/Los_Angeles";

// ---- bots ---------------------------------------------------------------
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|uptime|lighthouse|headless|python-requests|curl\/|wget|httpclient|okhttp|go-http|java\/|axios|node-fetch|scrapy|pingdom|statuscake/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send one
  return BOT_RE.test(userAgent);
}

// ---- where a visit came from -------------------------------------------
export type SourceKey = "direct" | "search" | "social" | "other" | "internal";

export const SOURCE_LABELS: Record<SourceKey, string> = {
  direct: "Direct / bookmarked",
  search: "Search engines",
  social: "Social media",
  other: "Other websites",
  internal: "Continued browsing",
};

const SEARCH_HOSTS = ["google.", "bing.com", "duckduckgo.com", "yahoo.", "ecosia.org", "baidu.com", "yandex.", "search.brave.com", "startpage.com"];
const SOCIAL_HOSTS = [
  "facebook.com", "fb.com", "l.facebook.com", "instagram.com", "t.co", "twitter.com", "x.com", "youtube.com", "youtu.be",
  "tiktok.com", "reddit.com", "linkedin.com", "lnkd.in", "pinterest.", "threads.net", "snapchat.com", "whatsapp.com", "nextdoor.com", "bsky.app",
];

function hostMatches(host: string, list: string[]): boolean {
  return list.some((h) => (h.endsWith(".") ? host.includes(h) : host === h || host.endsWith(`.${h}`)));
}

// `referrer` is document.referrer as sent by the browser; `siteHost` is this site's own host name.
export function classifySource(referrer: string | null | undefined, siteHost: string): SourceKey {
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "direct";
  }
  const mine = siteHost.toLowerCase().replace(/^www\./, "").split(":")[0];
  if (host === mine) return "internal";
  if (hostMatches(host, SEARCH_HOSTS)) return "search";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";
  return "other";
}

// ---- who (without keeping anything that identifies them) ---------------
// A one-way fingerprint of IP + browser, keyed with a server secret. The IP itself is never stored.
export function visitorHash(ip: string, userAgent: string, secret: string): string {
  return createHash("sha256").update(`${secret}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

// ---- where in the world (only when a proxy such as Cloudflare or Vercel supplies it) -------
export type Geo = { country: string | null; region: string | null; city: string | null };

export function geoFromHeaders(get: (name: string) => string | null): Geo {
  const clean = (v: string | null) => {
    if (!v) return null;
    let s = v;
    try { s = decodeURIComponent(v); } catch { /* keep raw */ }
    s = s.trim().slice(0, 80);
    return s && s !== "XX" && s !== "T1" ? s : null;
  };
  const country = clean(get("cf-ipcountry") ?? get("x-vercel-ip-country"));
  return {
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null,
    region: clean(get("cf-region") ?? get("x-vercel-ip-country-region")),
    city: clean(get("cf-ipcity") ?? get("x-vercel-ip-city")),
  };
}

export function flagEmoji(cc: string): string {
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryName(cc: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

export function locationLabel(g: Geo): string {
  if (!g.country) return "Unknown location";
  const place = [g.city, g.region].filter(Boolean).join(", ");
  const name = countryName(g.country);
  return `${flagEmoji(g.country)} ${place ? `${place}, ` : ""}${name}`.trim();
}

// ---- grouping ----------------------------------------------------------
export type ViewRow = { created_at: string; visitor_hash: string };
export type Bucket = { key: string; label: string; views: number; visitors: number };

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const pad = (n: number) => String(n).padStart(2, "0");

export function sqliteToDate(s: string): Date {
  return new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
}

export function dayKeyOf(d: Date): string {
  return dayFmt.format(d);
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

// Monday of the week a day key falls in.
function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const labelOf = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8, 10))}`;

// One bucket per day (or per Monday-start week) from `days` days ago up to today, empty ones included.
export function bucketize(rows: ViewRow[], mode: "daily" | "weekly", days: number, now: Date = new Date()): Bucket[] {
  const today = dayKeyOf(now);
  const first = addDays(today, -(days - 1));
  const keys: string[] = [];
  for (let k = mode === "weekly" ? weekStart(first) : first; k <= today; k = addDays(k, mode === "weekly" ? 7 : 1)) keys.push(k);
  const views = new Map<string, number>(keys.map((k) => [k, 0]));
  const people = new Map<string, Set<string>>(keys.map((k) => [k, new Set()]));
  for (const r of rows) {
    const day = dayKeyOf(sqliteToDate(r.created_at));
    if (day < first || day > today) continue;
    const key = mode === "weekly" ? weekStart(day) : day;
    if (!views.has(key)) continue;
    views.set(key, views.get(key)! + 1);
    people.get(key)!.add(r.visitor_hash);
  }
  return keys.map((k) => ({ key: k, label: labelOf(k), views: views.get(k)!, visitors: people.get(k)!.size }));
}
