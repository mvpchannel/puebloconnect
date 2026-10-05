import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SponsorInquiryForm from "@/components/SponsorInquiryForm";

export const metadata: Metadata = {
  title: "Own Your Block",
  description:
    "A premium sponsorship: a business becomes a prominent sponsor of a neighborhood, category or Pueblo Connect area.",
};

// Public, sales-led page. There is deliberately no price or checkout here:
// Own Your Block is arranged directly. The form posts to /api/contact.
export default function OwnYourBlockPage() {
  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container" style={{ maxWidth: 760 }}>
            <h2 style={{ marginBottom: 6 }}>Own Your Block</h2>
            <p style={{ color: "#666", fontSize: 17 }}>
              A premium sponsorship for businesses that want to be the name people associate with their part of the Pueblo.
            </p>

            <div className="central-meta item" style={{ padding: 24, marginTop: 16 }}>
              <h4>What it is</h4>
              <p>
                With Own Your Block, a business becomes a prominent sponsor of a neighborhood, a category or an area of
                Pueblo Connect. It is a step above a regular ad: one business, one block.
              </p>
              <h4 style={{ marginTop: 16 }}>How it works</h4>
              <ol style={{ paddingLeft: 20 }}>
                <li>Tell us the neighborhood, category or area you&rsquo;re interested in.</li>
                <li>We check whether it&rsquo;s available and talk through what sponsorship would look like.</li>
                <li>If it&rsquo;s a fit, we agree on terms with you directly.</li>
              </ol>
              <p style={{ color: "#888", fontSize: 14, marginBottom: 0 }}>
                Pricing, availability and exactly what a sponsor receives are settled in that conversation. Nothing is
                charged or reserved by sending this form. For smaller options, see{" "}
                <Link href="/advertise">Advertising</Link> or the <Link href="/spotlight">Business Spotlight</Link>.
              </p>
            </div>

            <div className="central-meta item" style={{ padding: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Ask about sponsoring a block</h4>
              <SponsorInquiryForm
                program="Own Your Block"
                interestLabel="Neighborhood, category or area"
                interestPlaceholder="Neighborhood, category or area you're interested in"
              />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
