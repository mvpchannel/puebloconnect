import type { Metadata } from "next";
import Link from "next/link";
import { listBusinessLocations } from "@/lib/db";

export const metadata: Metadata = {
  title: "Locations",
};

// Real tool: every business with its address, phone, hours and 3D storefront lot.
// Each address links to a map search. Businesses are edited by their owners on their own
// pages; there is no map pin editor, because businesses store an address, not map coordinates.
export const dynamic = "force-dynamic";

export default function LocationsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const missing = searchParams.filter === "missing";
  const all = listBusinessLocations(false);
  const rows = missing ? listBusinessLocations(true) : all;
  const missingCount = all.filter((b) => !b.address || !b.address.trim()).length;

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Locations</h2>
        <p style={{ color: "#555", marginBottom: 14 }}>
          Every business in the directory and where it is. Click an address to see it on a map. A business owner
          changes their own address on their business page.
        </p>
        <p style={{ marginBottom: 16 }}>
          Show:{" "}
          <Link href="/admin/locations" style={{ fontWeight: missing ? 400 : 700 }}>All ({all.length})</Link>
          {" · "}
          <Link href="/admin/locations?filter=missing" style={{ fontWeight: missing ? 700 : 400 }}>
            No address ({missingCount})
          </Link>
        </p>
        {rows.length === 0 ? (
          <p style={{ color: "#888" }}>{missing ? "Every business has an address." : "No businesses yet."}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Category</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Hours</th>
                <th>3D lot</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/businesses/${b.slug}`}>{b.name}</Link></td>
                  <td>{b.category || "—"}</td>
                  <td>
                    {b.address && b.address.trim() ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {b.address}
                      </a>
                    ) : (
                      <span style={{ color: "#b45309" }}>No address</span>
                    )}
                  </td>
                  <td>{b.phone || "—"}</td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 220 }}>{b.hours_text || "—"}</td>
                  <td>{b.storefront_lot ?? "—"}</td>
                  <td>@{b.owner_username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ color: "#888", fontSize: 12 }}>
          3D lots are assigned on the <Link href="/admin/storefronts">3D storefronts</Link> page.
        </p>
      </div>
    </div>
  );
}
