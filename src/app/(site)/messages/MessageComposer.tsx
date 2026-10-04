"use client";

import { useState, FormEvent } from "react";

/**
 * STATUS: needs backend/API. Typing works; sending does not actually
 * deliver anywhere yet — there is no messages/conversations table or API
 * route. Same honest-placeholder pattern as src/components/PostComposer.tsx.
 */
export default function MessageComposer() {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setNotice(true);
    setText("");
  }

  return (
    <div className="message-text-container">
      <form method="post" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
        />
        <button type="submit" title="send">
          <i className="fa fa-paper-plane" />
        </button>
      </form>
      {notice && (
        <p role="status" style={{ fontSize: 13, color: "#999", margin: "8px 0 0" }}>
          Messaging isn&rsquo;t wired up to a backend yet &mdash; this
          wasn&rsquo;t actually sent.
        </p>
      )}
    </div>
  );
}
