import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import MessageComposer from "./MessageComposer";

export const metadata: Metadata = {
  title: "Messages",
};

// Ported from winku-html/messages.html rather than inbox.html — messages.html
// is a single combined "contact list + conversation" view, which reads as
// "the messages page" more directly than inbox.html's multi-pane
// folders/Compose/flags email-client UI (that's a different, heavier
// feature not asked for here). Member-only — gated in src/middleware.ts.
//
// STATUS: needs backend/API — sample contacts/conversation shown for
// layout; no real messaging system exists yet. The composer at the bottom
// has a real onSubmit (MessageComposer.tsx) that honestly says sending
// isn't wired up, rather than silently doing nothing.
export default function MessagesPage() {
  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Messages</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Messages</span>
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
                <div className="central-meta">
                  <div className="messages">
                    <h5 className="f-title"><i className="ti-bell" /> All Messages</h5>
                    <div className="message-box">
                      <ul className="peoples">
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar2.jpg" alt="" />
                            <span className="status f-online" />
                          </figure>
                          <div className="people-name"><span>Molly Cyrus</span></div>
                        </li>
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar3.jpg" alt="" />
                            <span className="status f-away" />
                          </figure>
                          <div className="people-name"><span>Andrew</span></div>
                        </li>
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar.jpg" alt="" />
                            <span className="status f-online" />
                          </figure>
                          <div className="people-name"><span>Jason Bourne</span></div>
                        </li>
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar4.jpg" alt="" />
                            <span className="status off-online" />
                          </figure>
                          <div className="people-name"><span>Sarah Grey</span></div>
                        </li>
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar5.jpg" alt="" />
                            <span className="status f-online" />
                          </figure>
                          <div className="people-name"><span>Bill Doe</span></div>
                        </li>
                        <li>
                          <figure>
                            <img src="/images/resources/friend-avatar6.jpg" alt="" />
                            <span className="status f-away" />
                          </figure>
                          <div className="people-name"><span>Shen Cornery</span></div>
                        </li>
                      </ul>
                      <div className="peoples-mesg-box">
                        <div className="conversation-head">
                          <figure><img src="/images/resources/friend-avatar.jpg" alt="" /></figure>
                          <span>Jason Bourne <i>online</i></span>
                        </div>
                        <ul className="chatting-area">
                          <li className="you">
                            <figure><img src="/images/resources/userlist-2.jpg" alt="" /></figure>
                            <p>Hey, did you see the new deals on Pueblo Connect?</p>
                          </li>
                          <li className="me">
                            <figure><img src="/images/resources/userlist-1.jpg" alt="" /></figure>
                            <p>Not yet, checking it out now</p>
                          </li>
                          <li className="you">
                            <figure><img src="/images/resources/userlist-2.jpg" alt="" /></figure>
                            <p>There's a good one from the coffee shop downtown</p>
                          </li>
                        </ul>
                        <MessageComposer />
                      </div>
                    </div>
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
