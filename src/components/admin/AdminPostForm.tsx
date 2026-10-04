"use client";

/**
 * Shared "what's on your mind" post-composer form used by several admin
 * vendor-demo pages (image-cropper, image-opener, link-posting,
 * notifications, posting-panel). Ported from a `<button type="submit">`
 * that wasn't wrapped in any `<form>` in the original markup (a real HTML
 * bug — clicking it did nothing even as a no-op, because there was no form
 * to submit). Wrapped in a real `<form>` here, same pattern as
 * AdminChrome's search form.
 *
 * STATUS: needs backend/API — no posting system exists yet for this admin
 * demo UI; submit is a no-op (e.preventDefault()).
 */
export default function AdminPostForm({
  placeholder = "What Is In Your Mind",
}: {
  placeholder?: string;
}) {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <textarea placeholder={placeholder}></textarea>
      <div className="add-content">
        <ul>
          <li><a href="#" title=""><i className="fa fa-location-arrow"></i></a></li>
          <li><a href="#" title=""><i className="fa fa-microphone"></i></a></li>
          <li><a href="#" title=""><i className="fa fa-picture-o"></i></a></li>
          <li><a href="#" title=""><i className="fa fa-cloud-upload"></i></a></li>
        </ul>
        <button type="submit" className="purple-skin">POST</button>
      </div>
    </form>
  );
}
