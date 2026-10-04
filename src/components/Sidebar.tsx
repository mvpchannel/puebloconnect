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
            <Link href="/login" title="">Inbox</Link>
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
        </ul>
      </div>
    </aside>
  );
}
