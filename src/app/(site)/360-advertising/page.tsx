import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SponsorInquiryForm from "@/components/SponsorInquiryForm";

export const metadata: Metadata = {
  title: "Pueblo 360° Advertising",
  description:
    "One campaign across The Daily Pueblo, Pueblo Connect, Deals, Pass, Live, Events and the 3D Pueblo.",
};

// Public, sales-led page. No prices or checkout: packages are arranged
// directly. The form posts to /api/contact via SponsorInquiryForm.
const CHANNELS = [
  "The Daily Pueblo",
  "Pueblo Connect",
  "Deals",
  "Pueblo Pass",
  "Pueblo Live",
  "Events",
  "The 3D Pueblo",
];

export default function Pueblo360AdvertisingPage() {
  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container" style={{ maxWidth: 760 }}>
            <h2 style={{ marginBottom: 6 }}>Pueblo 360° Advertising</h2>
            <p style={{ color: "#666", fontSize: 17 }}>
              One campaign that reaches the community wherever it is.
            </p>

            <div className="central-meta item" style={{ padding: 24, marginTop: 16 }}>
              <h4>What it is</h4>
              <p>A single campaign planned across the Pueblo&rsquo;s channels, instead of buying each one separately:</p>
              <ul style={{ paddingLeft: 20 }}>
                {CHANNELS.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p style={{ color: "#888", fontSize: 14 }}>
                Not every channel is fully built yet. The{" "}
                <Link href="/about">About page</Link> shows which are live, in prototype or coming soon, and we&rsquo;ll
                tell you plainly what&rsquo;s available today when we talk.
              </p>
              <h4 style={{ marginTop: 16 }}>How it works</h4>
              <ol style={{ paddingLeft: 20 }}>
                <li>Tell us about your business and what you want to promote.</li>
                <li>We propose a mix of channels that fits your goal and timing.</li>
                <li>If it&rsquo;s a fit, we agree on terms with you directly.</li>
              </ol>
              <p style={{ color: "#888", fontSize: 14, marginBottom: 0 }}>
                Packages and pricing are arranged in that conversation. Nothing is charged or reserved by sending this
                form. Prefer to start smaller? See <Link href="/advertise">Advertising</Link>.
              </p>
            </div>

            <div className="central-meta item" style={{ padding: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Ask about a 360° campaign</h4>
              <SponsorInquiryForm
                program="Pueblo 360° Advertising"
                interestLabel="What you want to promote"
                interestPlaceholder="What do you want to promote, and when?"
              />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
