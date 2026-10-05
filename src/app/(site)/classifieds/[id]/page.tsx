import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ClassifiedOwnerActions from "@/components/ClassifiedOwnerActions";
import { getCurrentUser } from "@/lib/require-user";
import { getClassifiedById } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import { classifiedCategoryLabel } from "@/lib/classified-categories";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getClassifiedById(Number(params.id));
  return { title: item ? `${item.title} — Pueblo Classifieds` : "Listing" };
}

export default async function ClassifiedPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const item = getClassifiedById(id);
  if (!item) notFound();

  const session = await getCurrentUser();
  const isOwner = session?.sub === item.author_id;
  const isAdmin = session?.role === "admin";
  const poster = [item.author_first_name, item.author_last_name].filter(Boolean).join(" ") || item.author_username;

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
                <p><Link href="/classifieds" title="">&larr; All listings</Link></p>
                <div className="central-meta item">
                  <div style={{ padding: "20px 24px" }}>
                    {item.expired && (
                      <p style={{ background: "#fff3cd", color: "#664d03", padding: "8px 12px", borderRadius: 4 }}>
                        This listing is more than 30 days old and no longer appears on the board.
                      </p>
                    )}
                    {item.image_path && (
                      <img src={item.image_path} alt="" style={{ width: "100%", maxHeight: 460, objectFit: "contain", background: "#f5f6f7", borderRadius: 6, marginBottom: 14 }} />
                    )}
                    <h3 style={{ marginBottom: 4 }}>
                      {item.title}
                      {item.status === "sold" && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#fff", background: "#7b8794", borderRadius: 10, padding: "2px 10px", verticalAlign: "middle" }}>SOLD</span>
                      )}
                    </h3>
                    <p style={{ color: "#888", marginBottom: 12 }}>
                      {classifiedCategoryLabel(item.category)}
                      {item.price_text && <> · <strong style={{ color: "#333" }}>{item.price_text}</strong></>}
                      {" · "}posted {formatRelativeTime(item.created_at)} by{" "}
                      <Link href={`/profile/${item.author_id}`} title="">{poster}</Link>
                    </p>
                    <p style={{ whiteSpace: "pre-wrap", color: "#444" }}>{item.body}</p>

                    {!isOwner && (
                      session ? (
                        <Link className="mtr-btn signup" href={`/messages?to=${item.author_id}`} title="">
                          <span>Message {item.author_first_name || item.author_username}</span>
                        </Link>
                      ) : (
                        <p><Link href="/login" title="">Log in</Link> to message the poster.</p>
                      )
                    )}
                    {(isOwner || isAdmin) && (
                      <ClassifiedOwnerActions id={item.id} status={item.status} isOwner={isOwner} />
                    )}
                    <p style={{ fontSize: 12, color: "#999", marginTop: 16 }}>
                      Pueblo Connect doesn&rsquo;t verify listings or take part in sales between neighbors. Meet in a public place and use good judgment — see our{" "}
                      <Link href="/terms" title="">Terms</Link>.
                    </p>
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
