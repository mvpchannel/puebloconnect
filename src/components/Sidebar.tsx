import Link from "next/link";
import { NAV_PRIMARY } from "@/lib/nav-config";

/**
 * Shared "Shortcuts" sidebar widget. Built from the same navigation list as the
 * top menu (src/lib/nav-config.ts), grouped under short headings so the list
 * is easy to scan instead of one long column.
 */
export default function Sidebar() {
  const direct = NAV_PRIMARY.filter((g) => g.href && !g.items);
  const groups = NAV_PRIMARY.filter((g) => g.items && g.label !== "More");
  const heading: React.CSSProperties = {
    padding: "14px 0 4px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".07em",
    textTransform: "uppercase",
    color: "#8a94a0",
  };
  return (
    <aside className="sidebar static">
      <div className="widget stick-widget">
        <h4 className="widget-title">Shortcuts</h4>
        <ul className="naves">
          {direct.map((g) => (
            <li key={g.href}>
              <i className={g.icon} />
              <Link href={g.href!} title="">{g.label}</Link>
            </li>
          ))}
          {groups.map((g) => (
            <li key={g.label} style={{ padding: 0 }}>
              <div style={heading}>{g.label}</div>
              <ul className="naves" style={{ margin: 0, padding: 0 }}>
                {g.items!.map((i) => (
                  <li key={i.href}>
                    <i className={i.icon} />
                    <Link href={i.href} title="">{i.label}</Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
