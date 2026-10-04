"use client";

/**
 * "Preview" button for admin/post-preview, ported from a
 * `<button type="submit">` that wasn't wrapped in any `<form>` in the
 * original markup (a real HTML bug — clicking it did nothing even as a
 * no-op, because there was no form to submit).
 *
 * STATUS: needs backend/API — no post-preview system exists yet; submit is
 * a no-op (e.preventDefault()).
 */
export default function PostPreviewForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="add-content">
      <ul>
        <li><a href="#" title=""><i className="fa fa-location-arrow"></i></a></li>
        <li><a href="#" title=""><i className="fa fa-microphone"></i></a></li>
        <li><a href="#" title=""><i className="fa fa-picture-o"></i></a></li>
        <li><a href="#" title=""><i className="fa fa-cloud-upload"></i></a></li>
      </ul>
      <a href="#" title="" className="pstng-sdl purple-skin">Posting Schdule</a>
      <button type="submit" className="purple-skin">Preview</button>
    </form>
  );
}
