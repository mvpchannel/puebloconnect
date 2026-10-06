import styles from "./LinkPreviewCard.module.css";
import type { LinkPreview } from "@/lib/link-meta";

// Rich card for a shared link: big picture, site, headline, blurb and an
// "Open link" bar. The whole card is one link that opens in a new tab.
export default function LinkPreviewCard({ link, sample = false }: { link: LinkPreview; sample?: boolean }) {
  const host = (() => {
    try { return new URL(link.url).hostname.replace(/^www\./, ""); } catch { return ""; }
  })();
  const initial = (link.site || host || "?").trim().charAt(0).toUpperCase();
  return (
    <a
      className={styles.card}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      aria-label={`${link.title || link.site}, opens ${host} in a new tab`}
    >
      <span className={styles.media}>
        {link.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.image} alt="" loading="lazy" referrerPolicy="no-referrer" className={styles.img} />
        ) : (
          <span className={styles.fallback} aria-hidden="true">
            <span className={styles.initial}>{initial}</span>
          </span>
        )}
        <span className={styles.chip}>{link.site || host}</span>
      </span>
      <span className={styles.body}>
        <span className={styles.domain}>{host}</span>
        <span className={styles.title}>{link.title || host}</span>
        {link.description && <span className={styles.desc}>{link.description}</span>}
        <span className={styles.cta}>
          Open link <span aria-hidden="true">↗</span>
          {sample && <em className={styles.sample}>Sample content</em>}
        </span>
      </span>
    </a>
  );
}
