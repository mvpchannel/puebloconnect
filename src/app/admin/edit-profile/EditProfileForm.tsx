"use client";

/**
 * "Save Settings Now" form for admin/edit-profile, ported from a
 * `<button type="submit">` that wasn't wrapped in any `<form>` in the
 * original markup (a real HTML bug — clicking it did nothing even as a
 * no-op, because there was no form to submit).
 *
 * STATUS: needs backend/API — no settings-save system exists yet; submit
 * is a no-op (e.preventDefault()).
 */
export default function EditProfileForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="row">
      <div className="col-md-6 field">
        <label>Your Name <span>*</span> </label>
        <input type="text" defaultValue="Brian" />
      </div>
      <div className="col-md-6 field">
        <label>Last Name <span>*</span> </label>
        <input type="text" defaultValue="Kelly" />
      </div>
      <div className="col-md-6 field">
        <label>Country <span>*</span> </label>
        <select>
          <option>United State</option>
          <option>Pakistan</option>
          <option>United State</option>
        </select>
      </div>
      <div className="col-md-6 field">
        <label>City <span>*</span> </label>
        <input type="text" placeholder="Enter Your City" />
      </div>
      <div className="col-md-12 field">
        <label>Address Line 1 <span>*</span> </label>
        <input type="text" placeholder="" />
      </div>
      <div className="col-md-12 field">
        <label>Address Line 2 <span>*</span> </label>
        <input type="text" placeholder="" />
      </div>
      <div className="col-md-6 field">
        <label>State / Province <span>*</span> </label>
        <input type="text" placeholder="" />
      </div>
      <div className="col-md-6 field">
        <label>Zip / Postal Code <span>*</span> </label>
        <input type="text" defaultValue="" />
      </div>
      <div className="col-md-4 field">
        <label>Add Facebook URL <span>*</span> </label>
        <input type="text" defaultValue="https://www.facebook.com/manushichillaroffical" />
      </div>
      <div className="col-md-4 field">
        <label>Add Twitter URL <span>*</span> </label>
        <input type="text" defaultValue="https://www.facebook.com/manushichillaroffical" />
      </div>
      <div className="col-md-4 field">
        <label>Add Google URL <span>*</span> </label>
        <input type="text" defaultValue="https://www.facebook.com/manushichillaroffical" />
      </div>
      <div className="col-md-12 field">
        <label>Add Google URL <span>*</span> </label>
        <input type="text" defaultValue="https://www.facebook.com/manushichillaroffical" />
      </div>
      <div className="col-md-12">
        <button type="submit">Save Settings Now</button>
      </div>
    </form>
  );
}
