"use client";

import { useEffect, useState } from "react";

type SocialLink = { key: string; label: string; icon: string; url: string };

// The "Follow" column of the site footer. The addresses are set by staff in the admin
// area (Connect accounts) and loaded here, so changing them takes effect without a rebuild.
// With no addresses set, nothing is shown.
export default function FooterFollow() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-links")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.links)) setLinks(d.links);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (links.length === 0) return null;
  return (
    <div className="col-lg-2 col-md-4">
      <div className="widget">
        <div className="widget-title"><h4>Follow</h4></div>
        <ul className="list-style">
          {links.map((l) => (
            <li key={l.key}>
              <i className={`fa ${l.icon}`} />{" "}
              <a href={l.url} title={l.label} target="_blank" rel="noopener noreferrer">{l.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
