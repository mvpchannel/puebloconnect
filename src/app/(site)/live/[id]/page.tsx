import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import StreamWatchClient from "@/components/StreamWatchClient";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";
import { getCurrentUser } from "@/lib/require-user";
import { getStreamById, getLiveViewerCount, getTotalViewerSessionCount } from "@/lib/db";
import { toEmbedSrc } from "@/lib/stream-embed";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const streamId = Number(params.id);
  const stream = Number.isInteger(streamId) ? getStreamById(streamId, null) : undefined;
  return { title: stream ? stream.title : "Pueblo Live" };
}

export default async function StreamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) notFound();

  const session = await getCurrentUser();
  const stream = getStreamById(streamId, session?.sub ?? null);
  if (!stream) notFound();

  const isHost = session?.sub === stream.host_id;
  const embedSrc = toEmbedSrc(stream.platform, stream.embed_url);

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
                <PassportVisitBeacon
                  isLoggedIn={Boolean(session)}
                  category="pueblo_live"
                  refId={stream.id}
                  label={`Watched ${stream.title}`}
                />
                <h3 style={{ marginBottom: 4 }}>{stream.title}</h3>
                <p style={{ color: "#888", marginBottom: 16 }}>
                  Hosted by {[stream.host_first_name, stream.host_last_name].filter(Boolean).join(" ") || stream.host_username}
                  {stream.description ? ` — ${stream.description}` : ""}
                </p>
                <StreamWatchClient
                  streamId={stream.id}
                  embedSrc={embedSrc}
                  status={stream.status}
                  isHost={isHost}
                  isLoggedIn={Boolean(session)}
                  initialLikeCount={stream.like_count}
                  initialLiked={Boolean(stream.liked_by_viewer)}
                  initialLiveViewerCount={stream.status === "live" ? getLiveViewerCount(stream.id) : null}
                  initialTotalViewCount={stream.status === "ended" ? getTotalViewerSessionCount(stream.id) : null}
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
