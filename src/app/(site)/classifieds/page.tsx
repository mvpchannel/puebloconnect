import type { Metadata } from "next";
import { PLACEHOLDER } from "@/lib/placeholders";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ClassifiedCreateForm from "@/components/ClassifiedCreateForm";
import { getCurrentUser } from "@/lib/require-user";
import { listClassifieds } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import { CLASSIFIED_CATEGORIES, classifiedCategoryLabel, isClassifiedCategory } from "@/lib/classified-categories";

export const metadata: Metadata = {
  title: "Pueblo Classifieds",
  description: "Community listings: items for sale, services, wanted, free stuff and announcements.",
};

export const dynamic = "force-dynamic";

// Public board; posting requires login. Real backend: src/app/api/classifieds,
// classifieds table in src/lib/db.ts. Listings expire after 30 days.
export default async function ClassifiedsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const session = await getCurrentUser();
  const category = isClassifiedCategory(searchParams.category) ? searchParams.category : null;
  const q = (searchParams.q ?? "").slice(0, 100);
  const items = listClassifieds({ category, q });

  const pill = (active: boolean): React.CSSProperties => ({
    display: "inline-block", padding: "5px 12px", borderRadius: 16, fontSize: 13, marginRight: 6, marginBottom: 6,
    background: active ? "#088dcd" : "#eef1f4", color: active ? "#fff" : "#444",
  });
  const qs = (c: string | null) => {
    const p = new URLSearchParams();
    if (c) p.set("category", c);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/classifieds${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                <h3 style={{ marginBottom: 4 }}>Pueblo Classifieds</h3>
                <p style={{ color: "#888", marginBottom: 14 }}>Neighbors buying, selling, offering and announcing — free to post.</p>

                {session ? (
                  <ClassifiedCreateForm />
                ) : (
                  <div className="central-meta item" style={{ padding: 20, textAlign: "center" }}>
                    <Link href="/login" title="">Log in</Link> to post a listing.
                  </div>
                )}

                <form method="get" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {category && <input type="hidden" name="category" value={category} />}
                  <input name="q" defaultValue={q} placeholder="Search listings" style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4 }} />
                  <button className="mtr-btn signup" type="submit"><span>Search</span></button>
                </form>
                <div style={{ marginBottom: 12 }}>
                  <Link href={qs(null)} style={pill(!category)}>All</Link>
                  {CLASSIFIED_CATEGORIES.map((c) => (
                    <Link key={c.value} href={qs(c.value)} style={pill(category === c.value)}>{c.label}</Link>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
                      {q || category ? "No listings match that." : "No listings yet — be the first to post one."}
                    </div>
                  </div>
                )}

                {items.map((c) => (
                  <div className="central-meta item" key={c.id}>
                    <Link href={`/classifieds/${c.id}`} title="" style={{ display: "flex", gap: 14, padding: "14px 16px", color: "inherit" }}>
                      <img src={c.image_path || PLACEHOLDER.classified} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6, flex: "0 0 96px" }} />
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ marginBottom: 2 }}>
                          {c.title}
                          {c.status === "sold" && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: "#fff", background: "#7b8794", borderRadius: 10, padding: "2px 8px", verticalAlign: "middle" }}>SOLD</span>
                          )}
                        </h4>
                        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#888" }}>
                          {classifiedCategoryLabel(c.category)}
                          {c.price_text && <> · <strong style={{ color: "#333" }}>{c.price_text}</strong></>}
                          {" · "}{formatRelativeTime(c.created_at)}
                        </p>
                        <p style={{ margin: 0, color: "#555", fontSize: 14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.body}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
