import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
};

// Ported from winku-html/contact.html. The original page's Google Map
// section is dropped — it's a decorative vendor-template iframe with no
// real office address behind it (the footer already treats the address as
// "coming soon"); the real contact info (location, phone, email) is kept.
// The message form has a real onSubmit handler (ContactForm.tsx, a client
// component) that honestly explains there's no backend inbox yet, per this
// project's no-fake-functionality rule — see PostComposer.tsx for the same
// pattern.
export default function ContactPage() {
  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Contact Us</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Contact</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap no-top overlap">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="contct-info">
                  <ContactForm />
                  <div className="cntct-adres">
                    <h3>Contact info</h3>
                    <ul>
                      <li>
                        <i className="ti-location-pin" />
                        <span>Highland Park, Los Angeles</span>
                      </li>
                      <li>
                        <i className="fa fa-mobile-phone" />
                        <span><a href="tel:+13232459408">323-245-9408</a></span>
                      </li>
                      <li>
                        <i className="fa fa-envelope-o" />
                        <span><a href="mailto:latenitegano@gmail.com">latenitegano@gmail.com</a></span>
                      </li>
                    </ul>
                    {/* STATUS: needs real social accounts — see Footer.tsx. */}
                    <ul className="social-media">
                      <li><a href="#" title="Facebook" aria-label="Facebook"><i className="fa fa-facebook-square" /></a></li>
                      <li><a href="#" title="Twitter" aria-label="Twitter"><i className="fa fa-twitter-square" /></a></li>
                      <li><a href="#" title="Instagram" aria-label="Instagram"><i className="fa fa-instagram" /></a></li>
                    </ul>
                    <h1 className="bg-cntct">Pueblo Connect</h1>
                  </div>
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
