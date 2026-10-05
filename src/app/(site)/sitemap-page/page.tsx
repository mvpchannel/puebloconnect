import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

/**
 * NOTE on the route name: Next.js reserves the special file `sitemap.ts` at
 * the app root for generating an actual XML sitemap.xml (good for SEO —
 * see MIGRATION_STATUS.md). This human-readable "site map" page therefore
 * lives at /sitemap-page instead of /sitemap to avoid colliding with that
 * convention; link text can still say "Sitemap".
 */
export const metadata: Metadata = {
  title: "Sitemap",
};

export default function SitemapPage() {
  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Sitemap</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Sitemap</span>
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
                  <h2>Sitemap</h2>
                  <p>A full list of Pueblo Connect pages ported to this app so far. The rest of the site is still the Phase 0 static HTML — see MIGRATION_STATUS.md.</p>

                  <h4>Account</h4>
                  <ul className="naves">
                    <li><Link href="/login" title="">Sign up / Log in</Link></li>
                  </ul>

                  <h4>Community</h4>
                  <ul className="naves">
                    <li><Link href="/newsfeed" title="">Newsfeed</Link></li>
                    <li><Link href="/profile" title="">Timeline</Link></li>
                  </ul>

                  <h4>Business</h4>
                  <ul className="naves">
                    <li><Link href="/membership" title="">Business Membership</Link></li>
                    <li><Link href="/advertise" title="">Advertise</Link></li>
                  </ul>

                  <h4>Admin</h4>
                  <ul className="naves">
                    <li><Link href="/admin" title="">Admin panel</Link> (role: admin required)</li>
                  </ul>

                  <h4>Support</h4>
                  <ul className="naves">
                    <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                    <li><Link href="/privacy" title="">Privacy policy</Link></li>
                  </ul>
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
