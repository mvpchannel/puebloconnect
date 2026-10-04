import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";

export const metadata: Metadata = {
  title: "Timeline",
};

export default function ProfilePage() {
  return (
    <>
      <Header />

      <section>
        <div className="feature-photo">
          <figure>
            <img src="/images/resources/timeline-1.jpg" alt="" />
          </figure>
          <div className="add-btn">
            <span>0 followers</span>
            {/* STATUS: needs backend/API — follower count and "Add Friend" are static for now. */}
            <a href="#" title="" data-ripple="">Add Friend</a>
          </div>
          <div className="container-fluid">
            <div className="row merged">
              <div className="col-lg-2 col-sm-3">
                <div className="user-avatar">
                  <figure>
                    <img src="/images/resources/user-avatar.jpg" alt="" />
                  </figure>
                </div>
              </div>
              <div className="col-lg-10 col-sm-9">
                <div className="timeline-info">
                  <ul>
                    <li className="admin-name">
                      <h5>Pueblo Connect&nbsp;</h5>
                      <span>Member</span>
                    </li>
                    <li>
                      <a className="active" href="#" title="" data-ripple="">Timeline</a>
                      <a className="" href="#" title="" data-ripple="">Photos</a>
                      <a className="" href="#" title="" data-ripple="">Videos</a>
                      <a className="" href="#" title="" data-ripple="">Friends</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="row merged20" id="page-contents">
                  <div className="col-lg-3">
                    <Sidebar />
                  </div>
                  <div className="col-lg-6">
                    <PostComposer />
                    <div className="loadMore">
                      <PostCard
                        authorName="You"
                        authorImage="/images/resources/admin3.jpg"
                        publishedLabel="just now"
                        text="This is my timeline on the new Pueblo Connect."
                      />
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
