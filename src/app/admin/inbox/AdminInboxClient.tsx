"use client";

import { useEffect, useState } from "react";

type ConversationSummary = {
  otherUserId: number;
  otherName: string;
  otherProfilePhotoPath: string | null;
  lastBody: string;
  unreadCount: number;
};

type Message = {
  id: number;
  senderId: number;
  body: string;
};

type AdminInboxClientProps = {
  currentUserId: number;
  initialConversations: ConversationSummary[];
};

// Real backend: GET/POST /api/messages and /api/messages/:userId — the
// exact same routes and `messages` table the real member-facing
// /messages page uses (see src/app/(site)/messages/MessagesClient.tsx,
// which this mirrors). An admin account is just a row in the same
// `users` table with role='admin', so it has real conversations of its
// own — this replaces the vendor demo's hardcoded "My Friends List" (8
// invented names) and single fake "Bob Frank" chat thread with that real
// data, rendered with the admin theme's own chat classes (client-list /
// chat-msgs / cht-bdy / chat-message) instead of inventing new CSS.
export default function AdminInboxClient({ currentUserId, initialConversations }: AdminInboxClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeUserId, setActiveUserId] = useState<number | null>(
    initialConversations[0]?.otherUserId ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = conversations.find((c) => c.otherUserId === activeUserId) || null;

  useEffect(() => {
    if (activeUserId === null) return;
    let cancelled = false;
    setLoadingThread(true);
    fetch(`/api/messages/${activeUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages || []);
        setConversations((prev) =>
          prev.map((c) => (c.otherUserId === activeUserId ? { ...c, unreadCount: 0 } : c))
        );
      })
      .finally(() => !cancelled && setLoadingThread(false));
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUserId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${activeUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send that message.");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setText("");
      fetch("/api/messages")
        .then((res) => res.json())
        .then((d) => setConversations(d.conversations || []));
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="row mrg1">
      <div className="col-md-4">
        <div className="sidebar" id="sidebar2">
          <div className="widget">
            <div className="our-clients-sec">
              <div className="widget-title">
                <h3>Conversations</h3>
                <span>
                  {conversations.length === 0
                    ? "No conversations yet"
                    : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <ul id="people-list" className="client-list">
                {conversations.length === 0 && (
                  <li>
                    <div className="client-info">
                      <p>
                        Message a member from their profile to start a real conversation — it
                        will show up here.
                      </p>
                    </div>
                  </li>
                )}
                {conversations.map((c) => (
                  <li
                    key={c.otherUserId}
                    onClick={() => setActiveUserId(c.otherUserId)}
                    style={{
                      cursor: "pointer",
                      background: c.otherUserId === activeUserId ? "#f5f5f5" : undefined,
                    }}
                  >
                    <span className="user-status online red-skin">
                      {c.otherName.charAt(0).toUpperCase()}
                    </span>
                    <div className="client-info">
                      <h3>
                        <a href="#" title="" onClick={(e) => e.preventDefault()}>
                          {c.otherName}
                        </a>
                      </h3>
                      <p>
                        {c.unreadCount > 0 ? (
                          <strong>{c.unreadCount} unread</strong>
                        ) : (
                          c.lastBody || "No messages yet"
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-8">
        <div className="chat-msgs widget">
          <div className="chat-system-innr">
            {active ? (
              <>
                <div className="chat-hdr">
                  <div className="cht-tl">
                    <h3 className="user-status online">{active.otherName}</h3>
                  </div>
                </div>
                <div className="cht-bdy">
                  <ul>
                    {loadingThread && (
                      <li>
                        <div className="msg-bx">Loading…</div>
                      </li>
                    )}
                    {!loadingThread && messages.length === 0 && (
                      <li>
                        <div className="msg-bx">No messages yet — say hello.</div>
                      </li>
                    )}
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className={`chat-message ${m.senderId === currentUserId ? "me" : "frnd"}`}
                      >
                        <span className="sndr-nm">
                          <img
                            src={
                              m.senderId === currentUserId
                                ? "/admin-assets/images/resource/admin.jpg"
                                : active.otherProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"
                            }
                            alt=""
                          />
                        </span>
                        <div className="msg-bx">{m.body}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="comment-form">
                    {error && (
                      <p role="alert" style={{ color: "#e02020", fontSize: 13, padding: "0 20px" }}>
                        {error}
                      </p>
                    )}
                    <form onSubmit={handleSend}>
                      <textarea
                        placeholder="Write something..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={sending}
                      />
                    </form>
                    <a
                      href="#"
                      title=""
                      className="purple-skin"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSend(e);
                      }}
                    >
                      {sending ? "Sending…" : "Send"}
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                No conversations yet. Message a member from their profile to start one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
