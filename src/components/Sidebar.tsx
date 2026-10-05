import Link from "next/link";

/**
 * Shared "Shortcuts" sidebar widget, ported from the markup duplicated
 * across most winku-html pages (newsfeed, faq, timeline, etc.).
 */
export default function Sidebar() {
  return (
    <aside className="sidebar static">
      <div className="widget stick-widget">
        <h4 className="widget-title">Shortcuts</h4>
        <ul className="naves">
          <li>
            <i className="ti-clipboard" />
            <Link href="/newsfeed" title="">Newsfeed</Link>
          </li>
          <li>
            <i className="ti-mouse-alt" />
            <Link href="/messages" title="">Inbox</Link>
          </li>
          <li>
            <i className="ti-files" />
            <Link href="/groups" title="">Groups</Link>
          </li>
          <li>
            <i className="ti-user" />
            <Link href="/friends" title="">Friends</Link>
          </li>
          <li>
            <i className="ti-location-pin" />
            <Link href="/nearby" title="">Members Near You</Link>
          </li>
          <li>
            <i className="ti-image" />
            <Link href="/profile" title="">Photos</Link>
          </li>
          <li>
            <i className="ti-video-camera" />
            <Link href="/live" title="">Pueblo Live</Link>
          </li>
          <li>
            <i className="ti-briefcase" />
            <Link href="/businesses" title="">Business Channels</Link>
          </li>
          <li>
            <i className="ti-calendar" />
            <Link href="/events" title="">Events</Link>
          </li>
          <li>
            <i className="ti-tag" />
            <Link href="/deals" title="">Pueblo Deals</Link>
          </li>
          <li>
            <i className="ti-crown" />
            <Link href="/best-of" title="">Best of the Pueblo</Link>
          </li>
          <li>
            <i className="ti-flag-alt-2" />
            <Link href="/reports" title="">Report &amp; Track</Link>
          </li>
          <li>
            <i className="ti-camera" />
            <Link href="/street-team" title="">Pueblo Street Team</Link>
          </li>
          <li>
            <i className="ti-microphone-alt" />
            <Link href="/booth" title="">The Pueblo Booth</Link>
          </li>
          <li>
            <i className="ti-id-badge" />
            <Link href="/passport" title="">Pueblo Passport</Link>
          </li>
          <li>
            <i className="ti-star" />
            <Link href="/rewards" title="">Pueblo Rewards</Link>
          </li>
          <li>
            <i className="ti-clipboard" />
            <Link href="/classifieds" title="">Classifieds</Link>
          </li>
          <li>
            <i className="ti-timer" />
            <Link href="/tonight" title="">Happening Tonight</Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
