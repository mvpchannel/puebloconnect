import type { Metadata } from "next";
import Link from "next/link";
import { listEventsBetween } from "@/lib/db";
import { monthGrid, puebloDayKey, parseMonth, shiftMonth, monthKey } from "@/lib/calendar-grid";

export const metadata: Metadata = {
  title: "Calendar",
};

// Real tool: a month view of every community event, in Pueblo (Los Angeles) time. Each event
// links to its own page, where the organiser edits it. Staff can't change events from here yet.
export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TZ = "America/Los_Angeles";

export default function CalendarPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const nowKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date());
  const [ny, nm] = nowKey.split("-").map(Number);
  const raw = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const { year, month } = parseMonth(raw, { year: ny, month: nm });
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const weeks = monthGrid(year, month);
  // Widen the UTC window by a day each side; events are then placed by their Pueblo-time day.
  const from = new Date(Date.UTC(year, month - 1, 1) - 86400000).toISOString();
  const to = new Date(Date.UTC(year, month, 1) + 86400000).toISOString();
  const byDay = new Map<string, ReturnType<typeof listEventsBetween>>();
  for (const e of listEventsBetween(from, to)) {
    const key = puebloDayKey(e.starts_at);
    if (!key) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  const monthTotal = weeks.flat().filter((d) => d.inMonth).reduce((n, d) => n + (byDay.get(d.key)?.length ?? 0), 0);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Calendar</h2>
        <p style={{ color: "#555", marginBottom: 14 }}>
          Every community event, by day, in Pueblo (Los Angeles) time. Click an event to open its page. Events are
          created and edited by their organisers on the <Link href="/events">Events page</Link>.
        </p>
        <p style={{ marginBottom: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/admin/calendar?month=${monthKey(prev.year, prev.month)}`}>&larr; {MONTHS[prev.month - 1]}</Link>
          <strong style={{ fontSize: 18 }}>{MONTHS[month - 1]} {year}</strong>
          <Link href={`/admin/calendar?month=${monthKey(next.year, next.month)}`}>{MONTHS[next.month - 1]} &rarr;</Link>
          <Link href="/admin/calendar" style={{ marginLeft: "auto" }}>Today</Link>
          <span style={{ color: "#888" }}>{monthTotal} event{monthTotal === 1 ? "" : "s"} this month</span>
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ tableLayout: "fixed", minWidth: 760 }}>
            <thead>
              <tr>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <th key={d} style={{ textAlign: "center" }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, i) => (
                <tr key={i}>
                  {week.map((d) => {
                    const events = byDay.get(d.key) ?? [];
                    return (
                      <td
                        key={d.key}
                        style={{
                          verticalAlign: "top",
                          height: 96,
                          padding: 6,
                          background: d.key === todayKey ? "#fff8e1" : d.inMonth ? undefined : "#f7f7f7",
                          color: d.inMonth ? undefined : "#aaa",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: d.key === todayKey ? 700 : 400 }}>{d.day}</div>
                        {events.map((e) => (
                          <div key={e.id} style={{ fontSize: 12, lineHeight: 1.3, marginTop: 3, overflowWrap: "anywhere" }}>
                            <span style={{ color: "#888" }}>{timeLabel(e.starts_at)}</span>{" "}
                            <Link href={`/events/${e.slug}`}>{e.title}</Link>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
