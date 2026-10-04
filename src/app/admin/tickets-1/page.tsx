import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Ticket — Style 1",
};

/**
 * Ported from winku admin/ticket2.html (shared top-bar/sidebar now live in
 * AdminChrome via admin/layout.tsx, which also gates this whole route
 * through src/middleware.ts — role: admin required).
 *
 * STATUS: visual port of the vendor demo UI only — no real data or backend
 * behind it yet (tables/cards below show the original template's sample
 * content). Buttons/links that were decorative in the original (no href,
 * `href="#"`) are left as-is rather than wired to fake handlers. See
 * FUNCTIONALITY_STATUS.md for the page-by-page backend work still needed.
 */
export default function Page() {
  return (
    <>

    <div className="row">
      <div className="col-md-12">
        <div className="profile-sec">
          <div className="profile-banner-sec">
            <ul>
              <li>
                <input accept="image/*" type="file" name="file-1[]" id="file-1" className="new-img inputfile inputfile-1" data-multiple-caption="{count} files selected" multiple />
                <label htmlFor="file-1"><i className="fa fa-picture-o"></i><span>Choose a file</span></label>
              </li>
              <li><a href="/admin/edit-profile" title=""><i className="fa fa-pencil"></i> Edit Profile</a></li>
            </ul>
            <img src="/admin-assets/images/resource/banner.jpg" alt="" /> </div>
          <div className="user-bar">
            <div className="user-thumb"> <img src="/admin-assets/images/resource/admin.jpg" alt="" /> </div>
            <a title="" className="purple-skin"><i className="fa fa-heart-o"></i> Follow</a>
            <ul>
              <li> 1,245 <span>Followers</span> </li>
              <li> 535 <span>Projects</span> </li>
              <li> 994 <span>Following</span> </li>
            </ul>
            <div className="notif"> <span><img src="/admin-assets/images/icon-bell.png" alt=""/><i>3</i></span>
              <div className="noti-lst">
                <div className="noti-tp"> <span>Notifications</span> </div>
                <div className="noti-bd">
                  <ul>
                    <li className="rd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>15 Min Ago</span> <i>Read</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>BuddyPress</strong> Using Dropbox To Host Your On WordPress Theme! BP-Tricks</a> <span>30 Min Ago</span> <i>Unread</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>BP-Tricks:</strong> Sharing BuddyPress Knowledge made eassy!</a> <span>12 Hours Ago</span> <i>Unread</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>19 Hours Ago</span> <i>Unread</i></li>
                  </ul>
                </div>
                <div className="noti-bt"> <a href="#" title="">View All Notification</a> </div>
              </div>
            </div>
            <div className="notif"> <span><img src="/admin-assets/images/icon-envelop.png" alt=""/><i>3</i></span>
              <div className="noti-lst">
                <div className="noti-tp"> <span>Notifications</span> </div>
                <div className="noti-bd">
                  <ul>
                    <li className="rd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>15 Min Ago</span> <i>Read</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>BuddyPress</strong> Using Dropbox To Host Your On WordPress Theme! BP-Tricks</a> <span>30 Min Ago</span> <i>Unread</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>BP-Tricks:</strong> Sharing BuddyPress Knowledge made eassy!</a> <span>12 Hours Ago</span> <i>Unread</i></li>
                    <li className="unrd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>19 Hours Ago</span> <i>Unread</i></li>
                  </ul>
                </div>
                <div className="noti-bt"> <a href="#" title="">View All Notification</a> </div>
              </div>
            </div>
            <div className="social-btns">
              <ul>
                <li><a href="#" title="Facebook" aria-label="Facebook"><i className="fa fa-facebook"></i></a></li>
                <li><a href="#" title="Twitter" aria-label="Twitter"><i className="fa fa-twitter"></i></a></li>
                <li><a href="#" title="Google+" aria-label="Google+"><i className="fa fa-google-plus"></i></a></li>
              </ul>
            </div>
          </div>
          <div className="usr-pnl">
            <div className="pnl-tl">
              <h4>Ticketing</h4>
            </div>
            {/* Panel Title */}
            <div className="pnl-bdy">
              <div className="tckt-itm">
                <div className="tckt-sndr"> <img src="/admin-assets/images/resource/tckt-sndr1.jpg" alt="" />
                  <div className="sndr-tckt">
                    <h2><a href="#" title="">Marketingmike77</a></h2>
                    <div className="tckr-dta"> <span><i className="fa fa-check"></i></span>
                      <ul className="pst-rt">
                        <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                        <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                        <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                      </ul>
                    </div>
                    <a href="#" title="" className="sndr-alt">@markr</a> <a href="#" title="" className="sndr-adr">42 avenue des champs elysees 75000</a>
                    <p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily</p>
                    <textarea placeholder="Reply To Comment"></textarea>
                    <button type="submit" className="purple-skin rply">Reply</button>
                  </div>
                </div>
              </div>
              {/* Ticket Item */}
              <div className="tckt-itm">
                <div className="tckt-sndr"> <img src="/admin-assets/images/resource/tckt-sndr2.jpg" alt="" />
                  <div className="sndr-tckt">
                    <h2><a href="#" title="">Marketingmike77</a></h2>
                    <div className="tckr-dta"> <span><i className="fa fa-check"></i></span>
                      <ul className="pst-rt">
                        <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                        <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                        <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                      </ul>
                    </div>
                    <a href="#" title="" className="sndr-alt">@markr</a> <a href="#" title="" className="sndr-adr">42 avenue des champs elysees 75000</a>
                    <p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily</p>
                    <div className="tckt-sndr reply"> <img src="/admin-assets/images/resource/tckt-sndr2.jpg" alt="" />
                      <div className="sndr-tckt">
                        <h2><a href="#" title="">Marketingmike77</a></h2>
                        <a href="#" title="" className="sndr-alt">@markr</a> <a href="#" title="" className="sndr-adr">42 avenue des champs elysees 75000</a>
                        <p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily</p>
                      </div>
                    </div>
                    <textarea placeholder="Reply To Comment"></textarea>
                    <button type="submit" className="purple-skin rply">Reply</button>
                  </div>
                </div>
              </div>
              {/* Ticket Item */} 
            </div>
            {/* Panel Body */} 
          </div>
          {/* User panel */} 
        </div>
        {/* Profile Sec */} 
      </div>
    </div>
  
    </>
  );
}
