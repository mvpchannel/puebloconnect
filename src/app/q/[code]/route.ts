import { recordQrScan } from "@/lib/db";

// Public. The address a printed QR code opens: counts the visit, then sends the
// browser to the internal page the link was created for. The Location is a
// relative path so it works on any host.
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toLowerCase();
  const link = /^[a-z0-9]{4,16}$/.test(code) ? recordQrScan(code) : undefined;
  if (!link) {
    return new Response("This link is no longer active.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response(null, { status: 302, headers: { Location: link.target_path, "Cache-Control": "no-store" } });
}
