import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import MessagesClient from "./MessagesClient";
import { getCurrentUser } from "@/lib/require-user";
import { listConversations, getUserById } from "@/lib/db";

export const metadata: Metadata = {
  title: "Messages",
};

// Real backend now: src/app/api/messages/* and the messages table in
// src/lib/db.ts. Gated to logged-in members by src/middleware.ts.
// ?to=<userId> (used by a "Message" link on a profile) opens that thread
// immediately even before any message has been sent.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { to?: string };
}) {
  const session = await getCurrentUser();
  // middleware.ts already redirects logged-out visitors to /login before
  // this ever renders, but keep this honest in case that ever changes.
  if (!session) {
    return (
      <>
        <Header />
        <section>
          <div className="gap gray-bg">
            <div className="container">
              <div style={{ padding: 40, textAlign: "center" }}>
                <Link href="/login" title="">Log in</Link> to view your messages.
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const conversations = listConversations(session.sub).map((c) => ({
    otherUserId: c.other_user_id,
    otherName: [c.other_first_name, c.other_last_name].filter(Boolean).join(" ") || c.other_username,
    otherProfilePhotoPath: c.other_profile_photo_path,
    lastBody: c.last_body,
    unreadCount: c.unread_count,
  }));

  const openUserIdParam = searchParams?.to ? Number(searchParams.to) : null;
  const openUser =
    openUserIdParam && Number.isInteger(openUserIdParam) ? getUserById(openUserIdParam) : null;

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
                  <MessagesClient
                    currentUserId={session.sub}
                    initialConversations={conversations}
                    initialOpenUserId={openUser ? openUser.id : undefined}
                    initialOpenName={
                      openUser
                        ? [openUser.first_name, openUser.last_name].filter(Boolean).join(" ") ||
                          openUser.username
                        : undefined
                    }
                    initialOpenPhoto={openUser?.profile_photo_path ?? undefined}
                  />
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
