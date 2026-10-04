import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import FriendsClient from "@/components/FriendsClient";
import { getCurrentUser } from "@/lib/require-user";
import { listFriends, listIncomingFriendRequests, listOutgoingFriendRequests } from "@/lib/db";

export const metadata: Metadata = {
  title: "Friends",
};

// Real backend: src/app/api/friends/* and src/app/api/users/search,
// backed by the friend_requests/friendships tables in src/lib/db.ts.
// Gated to logged-in members by src/middleware.ts.
export default async function FriendsPage() {
  const session = await getCurrentUser();
  // middleware.ts already redirects logged-out visitors before this
  // renders; session is non-null in practice, but keep this honest.
  const friends = session
    ? listFriends(session.sub).map((f) => ({
        userId: f.user_id,
        name: [f.first_name, f.last_name].filter(Boolean).join(" ") || f.username,
        profilePhotoPath: f.profile_photo_path,
      }))
    : [];
  const incoming = session
    ? listIncomingFriendRequests(session.sub).map((r) => ({
        id: r.id,
        otherUserId: r.other_user_id,
        otherName: [r.other_first_name, r.other_last_name].filter(Boolean).join(" ") || r.other_username,
        otherProfilePhotoPath: r.other_profile_photo_path,
      }))
    : [];
  const outgoing = session
    ? listOutgoingFriendRequests(session.sub).map((r) => ({
        id: r.id,
        otherUserId: r.other_user_id,
        otherName: [r.other_first_name, r.other_last_name].filter(Boolean).join(" ") || r.other_username,
        otherProfilePhotoPath: r.other_profile_photo_path,
      }))
    : [];

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                <h3 style={{ marginBottom: 16 }}>Friends</h3>
                <FriendsClient
                  initialFriends={friends}
                  initialIncoming={incoming}
                  initialOutgoing={outgoing}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
