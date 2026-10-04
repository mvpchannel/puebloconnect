import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import GroupCreateForm from "@/components/GroupCreateForm";
import { getCurrentUser } from "@/lib/require-user";
import { listGroups, parseTags } from "@/lib/db";

export const metadata: Metadata = {
  title: "Groups",
};

// Browse + create groups/pages — dating-agnostic, open to any topic
// (a neighborhood group, a local business, a hobby club). Real backend:
// src/app/api/groups/route.ts, src/lib/db.ts (groups/group_members
// tables).
export default async function GroupsPage() {
  const session = await getCurrentUser();
  const groups = listGroups();

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
                <h3 style={{ marginBottom: 16 }}>Groups</h3>
                {session ? (
                  <GroupCreateForm />
                ) : (
                  <div className="central-meta item" style={{ padding: "20px", textAlign: "center" }}>
                    <Link href="/login" title="">Log in</Link> to create a group.
                  </div>
                )}

                {groups.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No groups yet — be the first to create one.
                    </div>
                  </div>
                )}

                {groups.map((group) => {
                  const tags = parseTags(group.tags);
                  return (
                    <div className="central-meta item" key={group.id}>
                      <div style={{ padding: "16px 20px" }}>
                        <h4 style={{ marginBottom: 4 }}>
                          <Link href={`/groups/${group.slug}`} title="">{group.name}</Link>
                        </h4>
                        {group.description && (
                          <p style={{ color: "#666", margin: "4px 0 8px" }}>{group.description}</p>
                        )}
                        <span style={{ color: "#999", fontSize: 13 }}>
                          {group.member_count} member{group.member_count === 1 ? "" : "s"} ·{" "}
                          {group.post_count} post{group.post_count === 1 ? "" : "s"}
                        </span>
                        {tags.length > 0 && (
                          <div style={{ marginTop: 8 }}>
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
                                  fontSize: 12,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
