import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getBusinessTourBySlug } from "@/lib/db";
import { TOUR_PROVIDER_LABEL } from "@/lib/tour-url";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const t = getBusinessTourBySlug(params.slug);
  return { title: t ? `${t.name} — Virtual Tour` : "Virtual Tour" };
}

// Public. The embedded player is the provider's own (Matterport, YouTube or
// Vimeo); the address was rebuilt from a validated ID when it was saved.
export default function TourPage({ params }: { params: { slug: string } }) {
  const tour = getBusinessTourBySlug(params.slug);
  if (!tour) notFound();
  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container" style={{ maxWidth: 960 }}>
            <p style={{ marginBottom: 6 }}><Link href="/tours" title="">&larr; All virtual tours</Link></p>
            <h3 style={{ marginBottom: 4 }}>{tour.name}</h3>
            <p style={{ color: "#888" }}>
              Virtual tour · via {TOUR_PROVIDER_LABEL[tour.tour_provider]} ·{" "}
              <Link href={`/businesses/${tour.slug}`} title="">Visit the business page</Link>
            </p>
            <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", borderRadius: 6, overflow: "hidden" }}>
              <iframe
                src={tour.tour_embed}
                title={`${tour.name} virtual tour`}
                allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
