import Link from "next/link";

/**
 * Shared site footer, ported from the markup duplicated across all 63
 * winku-html pages.
 *
 * Fixed while porting (see MIGRATION_STATUS.md):
 *  - The original tagline said "...world's leading carpooling platform"
 *    (leftover from the template vendor's rideshare demo) — corrected.
 *  - The original social links pointed to real, unrelated third-party
 *    accounts (e.g. facebook.com/shopcircut) — replaced with "#" placeholders
 *    until Pueblo Connect's real social accounts are known.
 *  - The address/phone were a fake San Francisco office (template leftover).
 *    Left as an explicit placeholder rather than inventing a real one —
 *    needs The Daily Pueblo's actual contact details.
 */
export default function Footer() {
  return (
    <>
      <footer>
        <div className="container">
          <div className="row">
            <div className="col-lg-4 col-md-4">
              <div className="widget">
                <div className="foot-logo">
                  <div className="logo">
                    <Link href="/" title="">
                      <img src="/images/logo.png" alt="Pueblo Connect" />
                    </Link>
                  </div>
                  <p>
                    A community-focused social network connecting Pueblo
                    residents and local businesses, powered by The Daily Pueblo.
                  </p>
                </div>
                <ul className="location">
                  <li>
                    <i className="ti-map-alt" />
                    <p>Address coming soon.</p>
                  </li>
                  <li>
                    <i className="ti-mobile" />
                    <p>Phone number coming soon.</p>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-lg-2 col-md-4">
              <div className="widget">
                <div className="widget-title"><h4>Follow</h4></div>
                <ul className="list-style">
                  <li><i className="fa fa-facebook-square" /> <a href="#" title="Facebook">Facebook</a></li>
                  <li><i className="fa fa-twitter-square" /> <a href="#" title="Twitter">Twitter</a></li>
                  <li><i className="fa fa-instagram" /> <a href="#" title="Instagram">Instagram</a></li>
                </ul>
              </div>
            </div>
            <div className="col-lg-2 col-md-4">
              <div className="widget">
                <div className="widget-title"><h4>Navigate</h4></div>
                <ul className="list-style">
                  <li><Link href="/about" title="">About us</Link></li>
                  <li><Link href="/contact" title="">Contact us</Link></li>
                  <li><Link href="/membership" title="">Business Membership</Link></li>
                  <li><Link href="/advertise" title="">Advertise</Link></li>
                  <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                  <li><Link href="/privacy" title="">Privacy policy</Link></li>
                  <li><Link href="/sitemap-page" title="">Sitemap</Link></li>
                </ul>
              </div>
            </div>
            <div className="col-lg-2 col-md-4">
              <div className="widget">
                <div className="widget-title"><h4>Community</h4></div>
                <ul className="list-style">
                  <li><Link href="/newsfeed" title="">Newsfeed</Link></li>
                  <li><Link href="/profile" title="">Timeline</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <div className="bottombar">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <span className="copyright">
                © {new Date().getFullYear()} Pueblo Connect. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
