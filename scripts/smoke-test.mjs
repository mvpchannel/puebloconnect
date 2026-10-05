// Quick "does every page render?" check against a running Pueblo Connect.
// Usage: node scripts/smoke-test.mjs [baseUrl]   (default http://localhost:3000)
// Prints one line per check and exits non-zero if anything fails. Needs no
// login: member pages must redirect to /login, admin APIs must refuse.

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const PUBLIC_PAGES = [
  "/", "/login", "/about", "/terms", "/privacy", "/contact", "/live", "/media", "/spotlight",
  "/businesses", "/events", "/groups", "/deals", "/classifieds", "/best-of", "/street-team",
  "/we-asked", "/tours", "/happening", "/own-your-block", "/360-advertising", "/advertise",
  "/sitemap-page", "/forgot-password", "/tonight", "/reports", "/booth",
];
const MEMBER_PAGES = [
  "/newsfeed", "/profile", "/membership", "/explore-3d", "/notifications", "/messages", "/friends",
  "/nearby", "/passport", "/pass", "/treasures", "/rewards", "/account-settings",
];
const ADMIN_PAGES = ["/admin", "/admin/qr-links", "/admin/storefronts", "/admin/drops", "/admin/tours"];
const FILES = [
  "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/images/logo.png", "/icons/icon-192.png",
  "/images/og-image.png", "/images/placeholders/business-logo.png", "/images/placeholders/stream.png",
  "/images/brand/the-daily-pueblo.jpg",
];
const ADMIN_APIS = ["/api/admin/qr-links", "/api/admin/storefronts", "/api/admin/drops"];

const results = [];
function record(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

async function get(path) {
  return fetch(BASE + path, { redirect: "manual" });
}

const BAD_HTML = /Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found/i;

for (const p of PUBLIC_PAGES) {
  try {
    const res = await get(p);
    const body = res.status === 200 ? await res.text() : "";
    if (res.status !== 200) record(false, `page ${p}`, `HTTP ${res.status}`);
    else if (BAD_HTML.test(body)) record(false, `page ${p}`, "error text in page");
    else record(true, `page ${p}`);
  } catch (e) {
    record(false, `page ${p}`, String(e.message || e));
  }
}
for (const p of MEMBER_PAGES.concat(ADMIN_PAGES)) {
  try {
    const res = await get(p);
    const loc = res.headers.get("location") || "";
    record(res.status >= 300 && res.status < 400 && loc.includes("/login"), `login required ${p}`, `HTTP ${res.status}${loc ? " → " + loc : ""}`);
  } catch (e) {
    record(false, `login required ${p}`, String(e.message || e));
  }
}
for (const p of FILES) {
  try {
    const res = await get(p);
    record(res.status === 200, `file ${p}`, res.status === 200 ? "" : `HTTP ${res.status}`);
  } catch (e) {
    record(false, `file ${p}`, String(e.message || e));
  }
}
for (const p of ADMIN_APIS) {
  try {
    const res = await get(p);
    record(res.status === 401 || res.status === 403, `admin API refuses anonymous ${p}`, `HTTP ${res.status}`);
  } catch (e) {
    record(false, `admin API ${p}`, String(e.message || e));
  }
}
try {
  const s = await (await get("/api/auth/session")).json();
  record(s && s.user === null, "session API says signed out");
  const l = await get("/api/streams?status=live");
  const j = await l.json();
  record(l.status === 200 && Array.isArray(j.streams), "streams API returns a list");
  const redir = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "nobody", password: "wrong" }) });
  record(redir.status === 401, "bad login is refused", `HTTP ${redir.status}`);
} catch (e) {
  record(false, "API checks", String(e.message || e));
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ""}`);
process.exit(failed ? 1 : 0);
