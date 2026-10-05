import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getPublishedSpotlightBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getPublishedSpotlightBySlug(params.slug);
  return s
    ? { title: `${s.title} — Business Spotlight`, description: s.summary }
    : { title: "Business Spotlight" };
}

export default function SpotlightPage({ params }: Props) {
  const s = getPublishedSpotlightBySlug(params.slug);
  if (!s) notFound();

  // Plain text only: paragraphs split on blank lines, rendered as text
  // nodes (never as HTML).
  const paragraphs = s.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

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
                <p><Link href="/spotlight" title="">&larr; All spotlights</Link></p>
                <div className="central-meta item">
                  {s.hero_image_path && (
                    <img src={s.hero_image_path} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ padding: "22px 26px" }}>
                    {s.sponsored ? (
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#7b8794", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Sponsored feature
                      </p>
                    ) : null}
                    <h2 style={{ margin: "4px 0 8px" }}>{s.title}</h2>
                    <p style={{ color: "#777", fontSize: 16 }}>{s.summary}</p>
                    {s.owner_name && <p style={{ color: "#999", fontSize: 13 }}>Owner: {s.owner_name}</p>}
                    <hr />
                    {paragraphs.map((p, i) => (
                      <p key={i} style={{ color: "#333", lineHeight: 1.7, whiteSpace: "pre-line" }}>{p}</p>
                    ))}
                    {s.business_slug && (
                      <p style={{ marginTop: 20 }}>
                        <Link className="mtr-btn signup" href={`/businesses/${s.business_slug}`} title="">
                          <span>Visit {s.business_name} on Pueblo Connect</span>
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
