import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Terms & Conditions",
};

export default function TermsPage() {
  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Terms &amp; Conditions</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Terms &amp; Conditions</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                <div className="faq-area">
                  <h2>Terms &amp; Conditions</h2>
                  <p>
                    <em>
                      Placeholder draft — replace with language reviewed by a
                      lawyer before Pueblo Connect goes live.
                    </em>
                  </p>

                  <h4>1. Acceptance of terms</h4>
                  <p>
                    By creating an account or otherwise using Pueblo Connect,
                    you agree to these Terms &amp; Conditions and to our
                    Privacy Policy. If you do not agree, please do not use the
                    site.
                  </p>

                  <h4>2. Who can use Pueblo Connect</h4>
                  <p>
                    Pueblo Connect is intended for residents, local
                    businesses, and organizations in and around the Pueblo
                    community. You must provide accurate information when you
                    register and keep your account credentials secure.
                  </p>

                  <h4>3. Member conduct</h4>
                  <p>
                    Members agree not to post content that is illegal,
                    harassing, defamatory, or infringes another person&apos;s
                    rights, and not to misuse messaging, groups, livestreaming,
                    or the business directory for spam, fraud, or
                    impersonation.
                  </p>

                  <h4>4. Business pages and listings</h4>
                  <p>
                    Businesses that create a page, listing, deal, or job
                    posting are responsible for the accuracy of that content.
                    Pueblo Connect and The Daily Pueblo reserve the right to
                    remove listings that violate these terms.
                  </p>

                  <h4>5. Content you post</h4>
                  <p>
                    You retain ownership of what you post, but you grant
                    Pueblo Connect a license to display it on the platform
                    (newsfeed, groups, pages, livestream replays, etc.) as
                    part of operating the service.
                  </p>

                  <h4>6. Moderation</h4>
                  <p>
                    Pueblo Connect may remove content, suspend, or terminate
                    accounts that violate these terms, at its discretion, with
                    or without notice.
                  </p>

                  <h4>7. Changes to these terms</h4>
                  <p>
                    We may update these terms as Pueblo Connect adds new
                    features, such as Pueblo Live, the business directory, or
                    classifieds. Continued use after an update means you
                    accept the revised terms.
                  </p>

                  <h4>8. Contact</h4>
                  <p>
                    Questions about these terms can be sent through the{" "}
                    <Link href="/contact" title="">Contact Us</Link> page.
                  </p>
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
