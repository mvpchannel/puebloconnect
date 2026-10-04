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

type MessagesClientProps = {
  currentUserId: number;
  initialConversations: ConversationSummary[];
  // When set (e.g. arriving via /messages?to=42 from a "Message" button on
  // someone's profile), opens that thread immediately even if there's no
  // existing conversation with them yet.
  initialOpenUserId?: number;
  initialOpenName?: string;
  initialOpenPhoto?: string | null;
};

// Real backend: GET/POST /api/messages and /api/messages/:userId
// (src/app/api/messages/*), backed by the messages table in src/lib/db.ts.
// Replaces the static sample contact list + conversation that used to
// live directly in page.tsx.
export default function MessagesClient({
  currentUserId,
  initialConversations,
  initialOpenUserId,
  initialOpenName,
  initialOpenPhoto,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeUserId, setActiveUserId] = useState<number | null>(
    initialOpenUserId ?? initialConversations[0]?.otherUserId ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active =
    conversations.find((c) => c.otherUserId === activeUserId) ||
    (activeUserId === initialOpenUserId && initialOpenUserId !== undefined
      ? {
          otherUserId: initialOpenUserId,
          otherName: initialOpenName ?? "Member",
          otherProfilePhotoPath: initialOpenPhoto ?? null,
          lastBody: "",
          unreadCount: 0,
        }
      : null);

  useEffect(() => {
    if (activeUserId === null) return;
    let cancelled = false;
    setLoadingThread(true);
    fetch(`/api/messages/${activeUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages || []);
        // Opening a thread marks the other person's messages read
        // server-side — reflect that locally too.
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
      // Refresh the conversation list so a brand-new thread shows up in
      // the sidebar and the "last message" preview updates.
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
    <div className="messages">
      <h5 className="f-title"><i className="ti-bell" /> All Messages</h5>
      <div className="message-box">
        <ul className="peoples">
          {conversations.length === 0 && !active && (
            <li>
              <div className="people-name">
                <span style={{ color: "#999" }}>No conversations yet.</span>
              </div>
            </li>
          )}
          {conversations.map((c) => (
            <li
              key={c.otherUserId}
              onClick={() => setActiveUserId(c.otherUserId)}
              style={{ cursor: "pointer", background: c.otherUserId === activeUserId ? "#f5f5f5" : undefined }}
            >
              <figure>
                <img
                  src={c.otherProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
                  alt=""
                />
              </figure>
              <div className="people-name">
                <span>
                  {c.otherName}
                  {c.unreadCount > 0 && (
                    <strong style={{ color: "#1f6feb" }}> ({c.unreadCount})</strong>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="peoples-mesg-box">
          {active ? (
            <>
              <div className="conversation-head">
                <figure>
                  <img
                    src={active.otherProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
                    alt=""
                  />
                </figure>
                <span>{active.otherName}</span>
              </div>
              <ul className="chatting-area">
                {loadingThread && <li><p style={{ color: "#999" }}>Loading…</p></li>}
                {!loadingThread && messages.length === 0 && (
                  <li><p style={{ color: "#999" }}>No messages yet — say hello.</p></li>
                )}
                {messages.map((m) => (
                  <li className={m.senderId === currentUserId ? "me" : "you"} key={m.id}>
                    <p>{m.body}</p>
                  </li>
                ))}
              </ul>
              <div className="message-text-container">
                {error && (
                  <p role="alert" style={{ color: "#c0392b", fontSize: 13, margin: "0 0 8px" }}>
                    {error}
                  </p>
                )}
                <form method="post" onSubmit={handleSend}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write a message..."
                    disabled={sending}
                  />
                  <button type="submit" title="send" disabled={sending || !text.trim()}>
                    <i className="fa fa-paper-plane" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ padding: 24, color: "#999" }}>
              Select a conversation, or visit a member&apos;s profile to start one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
