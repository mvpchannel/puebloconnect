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
            <Link href="/login" title="">My pages</Link>
          </li>
          <li>
            <i className="ti-user" />
            <Link href="/profile" title="">Friends</Link>
          </li>
          <li>
            <i className="ti-image" />
            <Link href="/profile" title="">Photos</Link>
          </li>
          <li>
            <i className="ti-video-camera" />
            <Link href="/profile" title="">Videos</Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
