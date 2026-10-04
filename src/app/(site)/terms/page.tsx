import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { TERMS } from "./terms-content";

export const metadata: Metadata = {
  title: "Terms of Use & Community Agreement",
};

type Item = { readonly p: string } | { readonly b: string };

// Renders paragraphs in source order, grouping consecutive bullets into one list.
function renderItems(items: readonly Item[]) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} style={{ listStyle: "disc", paddingLeft: 24, marginBottom: 12 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    );
    bullets = [];
  };
  items.forEach((it, i) => {
    if ("b" in it) { bullets.push(it.b); return; }
    flush(`ul-${i}`);
    out.push(<p key={i}>{it.p}</p>);
  });
  flush("ul-end");
  return out;
}

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
                  <h2>Member Terms of Use &amp; Community Agreement</h2>
                  {TERMS.intro.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {TERMS.sections.map((sec) => (
                    <div key={sec.n}>
                      <h4>{sec.n}. {sec.title}</h4>
                      {renderItems(sec.items)}
                    </div>
                  ))}
                  <h4>Member Acceptance</h4>
                  <p>{TERMS.acceptance}</p>
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
