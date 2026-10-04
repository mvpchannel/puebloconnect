"use client";

import { useState } from "react";

/**
 * STATUS: needs backend/API. Typing works; "Post" does not actually publish
 * anywhere yet — there is no posts API or database. See
 * /FUNCTIONALITY_STATUS.md. The file-attachment icons are decorative only
 * (no upload endpoint exists).
 */
export default function PostComposer() {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Needs backend/API — nothing to post to yet.
    alert(
      "Posting isn't wired up to a backend yet. See FUNCTIONALITY_STATUS.md."
    );
  }

  return (
    <div className="central-meta new-pst">
      <div className="new-postbox">
        <figure>
          <img src="/images/resources/admin2.jpg" alt="" />
        </figure>
        <div className="newpst-input">
          <form method="post" onSubmit={handleSubmit}>
            <textarea
              rows={2}
              placeholder="Write something"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="attachments">
              <ul>
                <li>
                  <i className="fa fa-image" />
                  <label className="fileContainer">
                    <input type="file" accept="image/*" disabled />
                  </label>
                </li>
                <li>
                  <i className="fa fa-video-camera" />
                  <label className="fileContainer">
                    <input type="file" accept="video/*" disabled />
                  </label>
                </li>
                <li>
                  <button type="submit">Post</button>
                </li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
