import type { Metadata } from "next";
import { PLACEHOLDER } from "@/lib/placeholders";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import LoadMoreFeed from "@/components/LoadMoreFeed";
import GroupJoinButton from "@/components/GroupJoinButton";
import { getCurrentUser } from "@/lib/require-user";
import { viewerAvatarSrc } from "@/lib/viewer";
import { getGroupBySlug, getGroupMemberRole, listPosts, listGroupMembers, parseTags } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const group = getGroupBySlug(params.slug);
  return { title: group ? group.name : "Group" };
}

// A single group's page: info, join/leave, its wall (reusing the same
// posts/PostComposer/PostCard machinery as the newsfeed — just scoped to
// target_type='group', target_id=<this group>), and its member list.
export default async function GroupDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const group = getGroupBySlug(params.slug);
  if (!group) notFound();

  const session = await getCurrentUser();
  const viewerAvatar = viewerAvatarSrc(session?.sub ?? null);
  const role = session ? getGroupMemberRole(group.id, session.sub) : null;
  const postRows = listPosts(session?.sub ?? null, "group", group.id, 31);
  const posts = postRows.slice(0, 30);
  const lastPost = posts[posts.length - 1];
  const nextCursor =
    postRows.length > 30 && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;
  const members = listGroupMembers(group.id, 12);
  const tags = parseTags(group.tags);

  return (
    <>
      <Header />
      <section>
        <div className="feature-photo">
          <figure>
            <img src={group.cover_photo_path || PLACEHOLDER.groupCover} alt="" />
          </figure>
          <div className="container-fluid">
            <div className="row merged">
              <div className="col-lg-12">
                <div className="timeline-info">
                  <ul>
                    <li className="admin-name">
                      <h5>{group.name}&nbsp;</h5>
                      <span>
                        {group.member_count} member{group.member_count === 1 ? "" : "s"} ·{" "}
                        {group.post_count} post{group.post_count === 1 ? "" : "s"}
                      </span>
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
                    <div className="widget stick-widget" style={{ marginTop: 20 }}>
                      <h4 className="widget-title">About this group</h4>
                      {group.description && (
                        <p style={{ padding: "0 16px 8px", color: "#666" }}>{group.description}</p>
                      )}
                      {tags.length > 0 && (
                        <div style={{ padding: "0 16px 16px" }}>
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                display: "inline-block",
                                background: "#f0f0f0",
                                color: "#555",
                                borderRadius: 4,
                                padding: "2px 8px",
                                marginRight: 6,
                                marginBottom: 6,
                                fontSize: 12,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ padding: "0 16px 16px" }}>
                        <GroupJoinButton
                          slug={group.slug}
                          isLoggedIn={Boolean(session)}
                          initialIsMember={Boolean(role)}
                          initialRole={role}
                        />
                      </div>
                    </div>
                    <div className="widget stick-widget" style={{ marginTop: 20 }}>
                      <h4 className="widget-title">Members</h4>
                      <ul className="naves">
                        {members.map((m) => (
                          <li key={m.user_id}>
                            <i className="ti-user" />
                            <span>
                              {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.username}
                              {m.role === "owner" ? " (owner)" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <PostComposer avatarSrc={viewerAvatar}
                      isLoggedIn={Boolean(session)}
                      targetType="group"
                      targetId={group.id}
                    />
                    <div className="loadMore">
                      {posts.length === 0 && (
                        <div className="central-meta item">
                          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            No posts yet on this group&apos;s wall.
                          </div>
                        </div>
                      )}
                      {posts.map((post) => (
                        <PostCard
                      viewerAvatar={viewerAvatar}
                          key={post.id}
                          postId={post.id}
                          authorId={post.author_id}
                          currentUserId={session?.sub ?? null}
                          isAdmin={session?.role === "admin"}
                          authorName={
                            [post.author_first_name, post.author_last_name]
                              .filter(Boolean)
                              .join(" ") || post.author_username
                          }
                          authorImage={
                            post.author_profile_photo_path ||
                            "/images/defaults/default-avatar-male.jpg"
                          }
                          publishedLabel={formatRelativeTime(post.created_at)}
                          text={post.body}
                          imageSrc={post.image_path}
                          videoSrc={post.video_path}
                          initialLikeCount={post.like_count}
                          initialLiked={Boolean(post.liked_by_viewer)}
                          initialCommentCount={post.comment_count}
                          isLoggedIn={Boolean(session)}
                        />
                      ))}
                      <LoadMoreFeed
                        initialCursor={nextCursor}
                        isLoggedIn={Boolean(session)}
                        currentUserId={session?.sub ?? null}
                        isAdmin={session?.role === "admin"}
                        viewerAvatar={viewerAvatar}
                        scope={`targetType=group&targetId=${group.id}`}
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
