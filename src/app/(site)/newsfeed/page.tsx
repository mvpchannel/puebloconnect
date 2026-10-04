import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";

export const metadata: Metadata = {
  title: "Newsfeed",
};

// Placeholder sample posts, same role as the dummy data in the original
// static template — replace with real data once a posts API exists.
const samplePosts = [
  {
    authorName: "You",
    authorImage: "/images/resources/admin3.jpg",
    publishedLabel: "just now",
    text: "Welcome to the new Pueblo Connect! We're rebuilding the site feature by feature — this feed is one of the first pieces ported to the new codebase.",
    initialLikes: 3,
    initialComments: 1,
  },
  {
    authorName: "The Daily Pueblo",
    authorImage: "/images/resources/admin4.jpg",
    publishedLabel: "2 hours ago",
    text: "Looking for a local business near you? The Pueblo Connect business directory is coming soon.",
    initialLikes: 7,
    initialComments: 2,
  },
];

export default function NewsfeedPage() {
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
              <div className="col-lg-6">
                <PostComposer />
                <div className="loadMore">
                  {samplePosts.map((post, i) => (
                    <PostCard key={i} {...post} />
                  ))}
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
