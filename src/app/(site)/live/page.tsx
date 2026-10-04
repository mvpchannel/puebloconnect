import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import StreamCreateForm from "@/components/StreamCreateForm";
import StreamsBrowser from "@/components/StreamsBrowser";
import { getCurrentUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Pueblo Live",
};

// Real backend: src/app/api/streams/* and the streams/stream_likes/
// stream_comments/stream_viewer_sessions tables in src/lib/db.ts.
// Bring-your-own-stream — see StreamCreateForm for the embedUrl model.
export default async function LivePage() {
  const session = await getCurrentUser();

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
                <h3 style={{ marginBottom: 16 }}>Pueblo Live</h3>
                {session && <StreamCreateForm />}
                <StreamsBrowser isLoggedIn={Boolean(session)} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
