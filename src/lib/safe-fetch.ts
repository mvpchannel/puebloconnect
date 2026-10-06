import http from "node:http";
import https from "node:https";
import net from "node:net";
import dns from "node:dns";

// Fetching a web address a staff member typed is a classic server-side
// request forgery risk: the address could point at this server's own
// network. Every hop here refuses private, loopback and link-local targets,
// checked on the address actually connected to (so DNS tricks don't help).

export function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    if (mapped) return isPrivateIp(mapped[1]);
    const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(l);
    if (hexMapped) {
      const hi = parseInt(hexMapped[1], 16), lo = parseInt(hexMapped[2], 16);
      return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return /^(fc|fd|fe[89ab])/.test(l) || l.startsWith("ff") || l.startsWith("64:ff9b");
  }
  return true; // not an IP at all: refuse
}

export function checkUrlShape(u: URL): string | null {
  if (u.protocol !== "http:" && u.protocol !== "https:") return "Only http and https addresses are allowed.";
  if (u.username || u.password) return "Addresses with a login in them aren't allowed.";
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  if (port !== "80" && port !== "443") return "That address uses an unusual port.";
  if (!u.hostname.includes(".") && net.isIP(u.hostname) === 0) return "That doesn't look like a public web address.";
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, "")) && isPrivateIp(u.hostname.replace(/^\[|\]$/g, ""))) {
    return "That address points to a private network.";
  }
  return null;
}

const guardedLookup: net.LookupFunction = (hostname, options, cb) => {
  dns.lookup(hostname, { ...(options as dns.LookupOptions), all: true }, (err, addrs) => {
    if (err) return (cb as any)(err);
    const list = addrs as dns.LookupAddress[];
    const ok = list.filter((a) => !isPrivateIp(a.address));
    if (ok.length === 0 || ok.length !== list.length) {
      return (cb as any)(new Error("blocked-address"));
    }
    if ((options as dns.LookupOptions).all) return (cb as any)(null, ok);
    (cb as any)(null, ok[0].address, ok[0].family);
  });
};

export type SafeResponse = { finalUrl: string; contentType: string; body: Buffer };

export async function safeFetch(
  startUrl: string,
  opts: { maxBytes: number; accept: string; timeoutMs?: number; maxRedirects?: number; wantType: RegExp }
): Promise<SafeResponse | { error: string }> {
  let current = startUrl;
  const maxRedirects = opts.maxRedirects ?? 4;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return { error: "That isn't a valid web address." }; }
    const bad = checkUrlShape(u);
    if (bad) return { error: bad };
    const r = await oneRequest(u, opts);
    if ("error" in r) return r;
    if (r.status >= 300 && r.status < 400 && r.location) {
      try { current = new URL(r.location, u).toString(); } catch { return { error: "The site sent a bad redirect." }; }
      continue;
    }
    if (r.status < 200 || r.status >= 300) return { error: `The site answered with an error (${r.status}).` };
    if (!opts.wantType.test(r.contentType)) return { error: "That address isn't the kind of page we expected." };
    return { finalUrl: u.toString(), contentType: r.contentType, body: r.body };
  }
  return { error: "Too many redirects." };
}

function oneRequest(
  u: URL,
  opts: { maxBytes: number; accept: string; timeoutMs?: number }
): Promise<{ status: number; location?: string; contentType: string; body: Buffer } | { error: string }> {
  return new Promise((resolve) => {
    const lib = u.protocol === "https:" ? https : http;
    let settled = false;
    const done = (v: Parameters<typeof resolve>[0]) => { if (!settled) { settled = true; resolve(v); } };
    const req = lib.request(
      u,
      {
        method: "GET",
        lookup: guardedLookup,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PuebloConnectLinkPreview/1.0)",
          Accept: opts.accept,
          "Accept-Encoding": "identity",
          "Accept-Language": "en-US,en;q=0.8",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const contentType = String(res.headers["content-type"] || "");
        if (status >= 300 && status < 400) {
          res.resume();
          return done({ status, location: String(res.headers.location || ""), contentType, body: Buffer.alloc(0) });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            // Pages can be huge; the metadata we want is near the top, so keep
            // what we have for HTML. Images over the cap are rejected by caller.
            chunks.push(c.subarray(0, c.length - (size - opts.maxBytes)));
            req.destroy();
            done({ status, contentType, body: Buffer.concat(chunks), ...( /^image\//i.test(contentType) ? { error: "too-big" } : {}) } as any);
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => done({ status, contentType, body: Buffer.concat(chunks) }));
        res.on("error", () => done({ error: "The connection dropped." }));
      }
    );
    req.setTimeout(opts.timeoutMs ?? 6000, () => { req.destroy(); done({ error: "The site took too long to answer." }); });
    req.on("error", (e) =>
      done({ error: /blocked-address/.test(String(e)) ? "That address points to a private network." : "Couldn't reach that site." })
    );
    req.end();
  });
}
