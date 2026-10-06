import Link from "next/link";

type Props = {
  title: string;
  /** One sentence on what this tool is for. */
  purpose: string;
  /** Plain statement of whether it exists. */
  status: string;
  /** What already works today, and where. */
  today: string[];
  links: { href: string; label: string }[];
};

/**
 * An honest page for an admin tool that is not built yet. It says what the tool
 * is meant for, that it does not exist yet, and where the same job can be done
 * today. Replaces the old vendor-template demo screens, which showed made-up
 * names and numbers.
 */
export default function AdminInfoPage({ title, purpose, status, today, links }: Props) {
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>{title}</h2>
        <p style={{ color: "#555", marginBottom: 14 }}>{purpose}</p>
        <p style={{ marginBottom: 20 }}>
          <span
            style={{
              display: "inline-block",
              background: "#fff3cd",
              color: "#664d03",
              borderRadius: 3,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {status}
          </span>
        </p>
        <h4 style={{ marginBottom: 8 }}>What works today</h4>
        <ul style={{ margin: "0 0 20px 18px", color: "#444", lineHeight: 1.7 }}>
          {today.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn btn-primary" style={{ marginRight: 8 }}>
              {l.label}
            </Link>
          ))}
        </p>
      </div>
    </div>
  );
}
