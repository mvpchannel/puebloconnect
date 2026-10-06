import type { Bucket } from "@/lib/traffic";

const W = 900;
const H = 280;
const M = { top: 16, right: 16, bottom: 34, left: 44 };

// A rounded-up top value that splits into four whole-number steps (4, 8, 12, 20, 40, 80, 120, 200 ...).
function niceMax(v: number): number {
  for (let k = 1; ; k *= 10) {
    for (const m of [4, 8, 12, 20]) if (m * k >= v) return m * k;
  }
}

// Two lines on one chart, drawn as plain SVG so it works without any script.
export default function TrafficChart({ data }: { data: Bucket[] }) {
  const max = niceMax(Math.max(1, ...data.map((d) => d.views)));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => M.top + ih - (v / max) * ih;
  const line = (pick: (d: Bucket) => number) => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const labelEvery = Math.max(1, Math.ceil(data.length / 12));
  const totalViews = data.reduce((n, d) => n + d.views, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Page views and unique visitors over time. ${totalViews} page views in this period.`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{t}</text>
        </g>
      ))}
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.key} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7280">{d.label}</text>
        ) : null
      )}
      <path d={line((d) => d.views)} fill="none" stroke="#1f6feb" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={line((d) => d.visitors)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="6 4" />
      {data.length <= 40 &&
        data.map((d, i) => (
          <g key={`p${d.key}`}>
            <circle cx={x(i)} cy={y(d.views)} r="3" fill="#1f6feb"><title>{`${d.label}: ${d.views} page views, ${d.visitors} unique visitors`}</title></circle>
            <circle cx={x(i)} cy={y(d.visitors)} r="3" fill="#d97706"><title>{`${d.label}: ${d.visitors} unique visitors`}</title></circle>
          </g>
        ))}
    </svg>
  );
}
