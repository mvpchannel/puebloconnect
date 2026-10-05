import type { Metadata } from "next";
import { listQrLinks } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { qrLinkUrl } from "@/lib/qr-links";
import QrLinksPanel from "@/components/admin/QrLinksPanel";

export const metadata: Metadata = { title: "QR codes" };
export const dynamic = "force-dynamic";

// Daily Pueblo Digital Connection: make a QR code for a printed story or ad
// that opens a page on this site, and see how many times it was opened.
// Gated to admins by src/middleware.ts plus each route's requireAdmin check.
export default function QrLinksAdminPage() {
  const links = listQrLinks();
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>QR codes for The Daily Pueblo</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Print one of these beside a story or ad. Scanning it opens the page you choose on Pueblo Connect, and we
          count the visit. Download the SVG for print.
        </p>
        <QrLinksPanel
          links={links.map((l) => ({
            id: l.id,
            code: l.code,
            label: l.label,
            targetPath: l.target_path,
            scans: l.scans,
            lastScannedAt: l.last_scanned_at,
            url: qrLinkUrl(l.code),
            svg: qrSvg(qrLinkUrl(l.code), 100),
          }))}
        />
      </div>
    </div>
  );
}
