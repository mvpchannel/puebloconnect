import type { Metadata } from "next";
import Link from "next/link";
import { listPageViewsSince } from "@/lib/db";
import TrafficChart from "./TrafficChart";
import {
  bucketize, dayKeyOf, sqliteToDate, locationLabel, SOURCE_LABELS, type SourceKey, type Geo,
} from "@/lib/traffic";

export const metadata: Metadata = {
  title: "Traffic",
};

// Real tool: how many people open the site, where they come from and where in the world they
// are. Counted by a small script in each page (not for the admin area, bots, or visitors who
// send "Do Not Track"). Locations only appear when the host passes them along (see the note below).
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90, 180];

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

export default function TrafficPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const rawDays = Number(typeof searchParams.days === "string" ? searchParams.days : 90);
  const days = RANGES.includes(rawDays) ? rawDays : 90;
  const mode = searchParams.view === "weekly" ? "weekly" : "daily";

  const all = listPageViewsSince(days);
  const firstDay = dayKeyOf(new Date(Date.now() - (days - 1) * 86400000));
  const rows = all.filter((r) => dayKeyOf(sqliteToDate(r.created_at)) >= firstDay);
  const buckets = bucketize(rows, mode, days);

  const totalViews = rows.length;
  const visitors = new Set(rows.map((r) => r.visitor_hash)).size;

  // Sources
  const sourceCounts = new Map<SourceKey, number>();
  for (const r of rows) sourceCounts.set(r.source as SourceKey, (sourceCounts.get(r.source as SourceKey) ?? 0) + 1);
  const sources = (Object.keys(SOURCE_LABELS) as SourceKey[])
    .map((k) => ({ key: k, label: SOURCE_LABELS[k], n: sourceCounts.get(k) ?? 0 }))
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n);

  // Locations
  const locCounts = new Map<string, number>();
  let located = 0;
  for (const r of rows) {
    const geo: Geo = { country: r.country, region: r.region, city: r.city };
    if (geo.country) located++;
    const label = locationLabel({ ...geo, city: null });
    locCounts.set(label, (locCounts.get(label) ?? 0) + 1);
  }
  const locations = [...locCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Pages
  const pageCounts = new Map<string, number>();
  for (const r of rows) pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
  const pages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const href = (d: number, v: string) => `/admin/traffic?days=${d}&view=${v}`;
  const pill = (active: boolean) => ({ padding: "3px 10px", borderRadius: 14, border: "1px solid #ccc", background: active ? "#1f6feb" : "#fff", color: active ? "#fff" : "#333", textDecoration: "none", fontSize: 13 } as const);
  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16, marginBottom: 20 } as const;

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 6 }}>Traffic</h2>
        <p style={{ color: "#555", marginBottom: 16 }}>
          Page views (every page opened) compared with unique visitors (different people). Bots and the admin area are not counted.
        </p>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            ["Page views", totalViews],
            ["Unique visitors", visitors],
            ["Pages per visitor", visitors ? (totalViews / visitors).toFixed(1) : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ ...card, marginBottom: 0, minWidth: 160 }}>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>last {days} days</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <h4 style={{ margin: 0 }}>Traffic over time</h4>
              <span style={{ color: "#6b7280", fontSize: 12 }}>Page views (opens) vs unique visitors</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Link href={href(days, "daily")} style={pill(mode === "daily")}>Daily</Link>
              <Link href={href(days, "weekly")} style={pill(mode === "weekly")}>Weekly</Link>
              <span style={{ width: 10 }} />
              {RANGES.map((d) => (
                <Link key={d} href={href(d, mode)} style={pill(d === days)}>{d} days</Link>
              ))}
            </div>
          </div>
          <TrafficChart data={buckets} />
          <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#444", marginTop: 6 }}>
            <span><span style={{ display: "inline-block", width: 18, borderTop: "3px solid #1f6feb", verticalAlign: "middle", marginRight: 6 }} />Page views</span>
            <span><span style={{ display: "inline-block", width: 18, borderTop: "3px dashed #d97706", verticalAlign: "middle", marginRight: 6 }} />Unique visitors</span>
            {mode === "weekly" && <span style={{ color: "#888" }}>Weeks start on Monday.</span>}
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div style={card}>
              <h4 style={{ margin: 0 }}>Traffic sources</h4>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>How people are finding the site</p>
              {sources.length === 0 ? (
                <p style={{ color: "#888" }}>No visits recorded yet.</p>
              ) : (
                sources.map((s) => (
                  <div key={s.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span>{s.label}</span>
                      <span>{s.n} <span style={{ color: "#6b7280" }}>({pct(s.n, totalViews)}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: "#eef2f7", borderRadius: 3 }}>
                      <div style={{ height: 6, width: `${pct(s.n, totalViews)}%`, background: "#1f6feb", borderRadius: 3 }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="col-md-6">
            <div style={card}>
              <h4 style={{ margin: 0 }}>Visitor locations</h4>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>Where page loads came from (bots excluded)</p>
              {locations.length === 0 ? (
                <p style={{ color: "#888" }}>No visits recorded yet.</p>
              ) : (
                <>
                  {locations.slice(0, 10).map(([label, n]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span>{label}</span>
                      <span>{n} <span style={{ color: "#6b7280" }}>({pct(n, totalViews)}%)</span></span>
                    </div>
                  ))}
                  {locations.length > 10 && <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>and {locations.length - 10} more locations</p>}
                </>
              )}
              {totalViews > 0 && located === 0 && (
                <p style={{ color: "#b45309", fontSize: 12, marginTop: 10 }}>
                  No locations yet: this host doesn&rsquo;t pass visitor locations along. See the note below.
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={card}>
          <h4 style={{ margin: 0 }}>Most visited pages</h4>
          <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>Last {days} days</p>
          {pages.length === 0 ? (
            <p style={{ color: "#888" }}>No visits recorded yet.</p>
          ) : (
            pages.map(([path, n]) => (
              <div key={path} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                <span style={{ overflowWrap: "anywhere" }}>{path}</span>
                <span>{n}</span>
              </div>
            ))
          )}
        </div>

        <p style={{ color: "#888", fontSize: 12, maxWidth: 760 }}>
          How this works: each page sends a small note when it opens. The site keeps the page, a one-way code made from the
          visitor&rsquo;s address and browser (the address itself is never stored), and where the visit came from. It does
          not use cookies and skips visitors who send &ldquo;Do Not Track&rdquo;. &ldquo;Unique visitors&rdquo; is
          approximate: one person on two devices counts twice, and people sharing a network and browser type can count as one.
          Locations need a host that supplies them (for example Cloudflare&rsquo;s visitor-location setting); without one they show as
          &ldquo;Unknown location&rdquo;. Data older than about 13 months is deleted automatically. Your Privacy page should say that
          the site counts visits this way.
        </p>
      </div>
    </div>
  );
}
