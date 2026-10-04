import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Timeline",
};

// /profile (no id) is just a stable "my own page" shortcut — the real
// wall, shared by every member, lives at /profile/[userId] (see that
// route). A logged-in visitor is sent straight to their own id; a
// logged-out visitor has no "own page" to show, so they get a simple
// prompt to log in instead of the old placeholder timeline.
export default async function ProfilePage() {
  const session = await getCurrentUser();
  if (session) {
    redirect(`/profile/${session.sub}`);
  }

  return (
    <>
      <Header />
      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12" style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ color: "#888", marginBottom: 16 }}>
                  Log in to see your own timeline.
                </p>
                <a className="mtr-btn signin" href="/login">
                  <span>Log in</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
