import { Fragment } from "react";

// Turns web addresses (http:// or https:// only) inside plain post text into
// links that open in a new tab. Anything else stays plain text, and the text is
// rendered by React, so nothing in it can run as markup.
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const TRAILING = /[.,;:!?)\]]+$/;

export default function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trail = TRAILING.exec(part)?.[0] ?? "";
        const url = trail ? part.slice(0, -trail.length) : part;
        return (
          <Fragment key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc">{url}</a>
            {trail}
          </Fragment>
        );
      })}
    </>
  );
}
