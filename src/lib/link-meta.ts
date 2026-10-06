// Pure helpers for link preview cards: pull a title, description, picture and
// site name out of a page's HTML, and read/write the JSON stored on a post.

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image: string | null; // a local /uploads/... path once saved
  site: string;
};

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", bull: "•",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
      try { return String.fromCodePoint(code); } catch { return ""; }
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export function tidy(s: string | null | undefined, max: number): string {
  if (!s) return "";
  const t = decodeEntities(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Resolve a possibly-relative address against the page; only http(s) survives.
export function resolveUrl(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(decodeEntities(raw.trim()), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export type RawMeta = { title: string; description: string; image: string | null; site: string };

export function parseMeta(html: string, pageUrl: string): RawMeta {
  const head = html.slice(0, 400_000);
  const meta: Record<string, string> = {};
  let canonical: string | undefined;
  const tagRe = /<(meta|link)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(head))) {
    const a = attrs(m[0]);
    if (m[1].toLowerCase() === "meta") {
      const key = (a.property || a.name || "").toLowerCase();
      if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content;
    } else if ((a.rel || "").toLowerCase() === "canonical" && a.href) {
      canonical = a.href;
    }
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const title = tidy(meta["og:title"] || meta["twitter:title"] || titleTag, 140);
  const description = tidy(meta["og:description"] || meta["twitter:description"] || meta["description"], 300);
  const image = resolveUrl(meta["og:image:secure_url"] || meta["og:image"] || meta["twitter:image"] || meta["twitter:image:src"], pageUrl);
  const site = tidy(meta["og:site_name"], 60) || hostLabel(canonical ? resolveUrl(canonical, pageUrl) || pageUrl : pageUrl);
  return { title, description, image, site };
}

export function serializeLink(p: LinkPreview): string {
  return JSON.stringify({
    url: p.url,
    title: p.title,
    description: p.description,
    image: p.image,
    site: p.site,
  });
}

// Defensive read of the stored JSON: anything malformed or with a non-http(s)
// address yields null, so a bad row can never break the feed.
export function parseLinkPreview(json: string | null | undefined): LinkPreview | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url : "";
    if (!/^https?:\/\//i.test(url)) return null;
    const image = typeof o.image === "string" && /^\/uploads\/links\/[\w.-]+$/.test(o.image) ? o.image : null;
    return {
      url,
      title: tidy(typeof o.title === "string" ? o.title : "", 140),
      description: tidy(typeof o.description === "string" ? o.description : "", 300),
      image,
      site: tidy(typeof o.site === "string" ? o.site : "", 60) || hostLabel(url),
    };
  } catch {
    return null;
  }
}
