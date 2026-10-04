import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Advertise With Us",
  description:
    "Pueblo Connect digital advertising rates: directory listings, sponsored posts, featured placements, and monthly business membership packages.",
};

// Public page — no login required. Prospective advertisers (who may not
// be Pueblo Connect members yet) need to be able to see this.
//
// STATUS: this page is informational/rate-card content, same spirit as a
// printed rate sheet. Only the three Business Membership plans
// (Basic/Plus/Premier) have a real, working checkout — see /membership
// and src/components/membership/MembershipPlans.tsx. The one-time and
// per-week ad products in the table below (Sponsored Post, Deal of the
// Week, Homepage Banner, etc.) don't have their own checkout flow yet;
// reaching the advertising contact below is the real, working path to
// buy one today. Building a PayPal flow for each of those individually
// is real, separate work (each is its own price/duration/placement, not
// a recurring plan) — noted in FUNCTIONALITY_STATUS.md.
export default function AdvertisePage() {
  return (
    <>
      <link rel="stylesheet" href="/css/advertise.css" />
      <Header />
      <div className="advertise-wrap">
        <div className="advertise-hero">
          <div className="tagline">Connect Local. Shop Local. Grow Together.</div>
          <h1>Pueblo Connect — Digital Advertising Rates</h1>
          <p>
            A neighborhood marketing network connecting local businesses with
            the readers and communities of The Daily Pueblo. Print creates
            awareness — Pueblo Connect keeps your business visible between
            editions, every day of the month.
          </p>
        </div>

        <div className="advertise-section">
          <h2>Advertising Options</h2>
          <table className="rate-table">
            <thead>
              <tr>
                <th>Advertising</th>
                <th>Price</th>
                <th>What the Business Gets</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Business Directory Listing</td>
                <td className="price free">FREE</td>
                <td>Business name, category and basic information</td>
              </tr>
              <tr>
                <td>Enhanced Business Profile</td>
                <td className="price">$29/month</td>
                <td>Photos, contact info, website/social links and expanded description</td>
              </tr>
              <tr>
                <td>Featured Business</td>
                <td className="price">$59/month</td>
                <td>Enhanced profile + priority directory placement</td>
              </tr>
              <tr>
                <td>Sponsored Post</td>
                <td className="price">$50</td>
                <td>Promotional post placed in the community feed</td>
              </tr>
              <tr>
                <td>Deal of the Week</td>
                <td className="price">$75/week</td>
                <td>Featured coupon or special in Pueblo Deals</td>
              </tr>
              <tr>
                <td>Featured Event</td>
                <td className="price">$50/week</td>
                <td>Priority event promotion</td>
              </tr>
              <tr>
                <td>Homepage Banner</td>
                <td className="price">$150/week</td>
                <td>Premium banner advertising on the homepage</td>
              </tr>
              <tr>
                <td>Homepage Featured Business</td>
                <td className="price">$125/week</td>
                <td>Business spotlight on the homepage</td>
              </tr>
              <tr>
                <td>Pueblo Live Sponsor</td>
                <td className="price">$150/event</td>
                <td>Sponsor placement around a Pueblo Live broadcast</td>
              </tr>
              <tr>
                <td>Newsletter Sponsor</td>
                <td className="price">$150/issue</td>
                <td>Business placement in Pueblo Connect email newsletter</td>
              </tr>
              <tr>
                <td>Category Sponsor</td>
                <td className="price">$250/month</td>
                <td>Exclusive/featured sponsorship of a category such as Restaurants, Auto or Real Estate</td>
              </tr>
              <tr>
                <td>Neighborhood Sponsor</td>
                <td className="price">$350/month</td>
                <td>Prominent presence within one neighborhood section</td>
              </tr>
              <tr>
                <td>Sitewide Sponsor</td>
                <td className="price">$750/month</td>
                <td>High-visibility advertising across multiple major sections</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="advertise-section">
          <h2>Monthly Business Packages</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>
            The heart of the program — recurring monthly revenue from a
            business presence that keeps working between newspaper editions.
            Pay securely with PayPal and your membership activates
            automatically once payment is verified.
          </p>
          <div className="plan-grid">
            <div className="plan-card">
              <h3>Basic</h3>
              <div className="plan-price">$49 <span>/ month</span></div>
              <div className="plan-tagline">Business profile + directory listing + business posts.</div>
            </div>
            <div className="plan-card featured">
              <h3>Plus</h3>
              <div className="plan-price">$99 <span>/ month</span></div>
              <div className="plan-tagline">
                Everything in Basic + deals + events + enhanced directory
                placement + 1 sponsored post each month.
              </div>
            </div>
            <div className="plan-card">
              <h3>Premier</h3>
              <div className="plan-price">$199 <span>/ month</span></div>
              <div className="plan-tagline">
                Everything in Plus + featured business placement + 2
                sponsored posts per month + priority promotion + performance
                report.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link href="/membership" className="mtr-btn signin">
              <span>Choose a membership plan</span>
            </Link>
          </div>
        </div>

        <div className="advertise-section">
          <h2>The Daily Pueblo + Pueblo Connect Combo</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>
            Print creates awareness and credibility — Pueblo Connect keeps
            that advertiser connected with customers every day between
            editions. Ask about combining a Daily Pueblo print ad with a
            discounted Pueblo Connect membership package.
          </p>
          <table className="combo-table">
            <thead>
              <tr>
                <th>Daily Pueblo Print Ad</th>
                <th>Current Print Rate</th>
                <th>Pueblo Connect Opportunity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quarter Page</td>
                <td>$125</td>
                <td>Include Basic profile / introductory digital presence</td>
              </tr>
              <tr>
                <td>Half Page</td>
                <td>$250</td>
                <td>Include or discount Plus membership</td>
              </tr>
              <tr>
                <td>Full Page</td>
                <td>$400</td>
                <td>Include premium digital benefits / featured placement</td>
              </tr>
            </tbody>
          </table>
          <div className="combo-callout">
            <h3>Don&rsquo;t just advertise once. Stay connected all month.</h3>
            <p>
              Advertise in The Daily Pueblo and continue reaching the
              community every day on Pueblo Connect.
            </p>
          </div>
        </div>

        <div className="advertise-contact">
          <h3>Ready to advertise?</h3>
          <p>
            For custom packages, the Daily Pueblo combo offer, or questions
            about any option above, reach out directly.
          </p>
          <div className="contact-name">George Cabrera</div>
          <div>Advertising &amp; Partnerships</div>
          <div>
            <a href="tel:+13232459408" style={{ color: "#088dcd", fontWeight: 600 }}>
              323-245-9408
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
