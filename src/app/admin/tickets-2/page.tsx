import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Ticket — Style 2",
};

/**
 * Ported from winku admin/ticket3.html (shared top-bar/sidebar now live in
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
              <div className="tcktng-lst">
                <div className="tcktng-itm">
                  <h2><a href="#" title="">Bspotted</a></h2>
                  <ul className="snd-inf">
                    <li>am</li>
                    <li>April 21, 2017</li>
                    <li>17:00</li>
                  </ul>
                  <a href="#" className="cmt-btn"><i className="fa fa-comments"></i> 02 New Comment</a>
                  <p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily</p>
                  <ul className="cmt-mta">
                    <li><i className="fa fa-heart"></i> <a href="#" title="">30 Likes</a></li>
                    <li><i className="fa fa-comment"></i> <a href="#" title="">2 Comments</a></li>
                    <li><i className="fa fa-share"></i> <a href="#" title="">1 Share</a></li>
                  </ul>
                  <span className="tgl-icn"><i className="fa fa-chevron-down "></i></span>
                  <ul className="cmt-thrd">
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt2.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Peter Alexander</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Congratulations to the Bspotted team!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt3.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Eva De Villers</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Fly me to the moon!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="tcktng-itm">
                  <h2><a href="#" title="">Bspotted</a></h2>
                  <ul className="snd-inf">
                    <li>am</li>
                    <li>April 21, 2017</li>
                    <li>17:00</li>
                  </ul>
                  <p>Corporate PSD Template files are well organized and named accordingly so its very easy to customize and update. We have included best practice of web development – you can create great website layout based on Twitter Bootstrap or Grid 1170px.</p>
                  <ul className="cmt-mta">
                    <li><i className="fa fa-heart"></i> <a href="#" title="">30 Likes</a></li>
                    <li><i className="fa fa-comment"></i> <a href="#" title="">2 Comments</a></li>
                    <li><i className="fa fa-share"></i> <a href="#" title="">1 Share</a></li>
                  </ul>
                  <span className="tgl-icn"><i className="fa fa-chevron-down "></i></span>
                  <ul className="cmt-thrd">
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt2.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Peter Alexander</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Congratulations to the Bspotted team!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt3.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Eva De Villers</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Fly me to the moon!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="tcktng-itm">
                  <h2><a href="#" title="">Bspotted</a></h2>
                  <ul className="snd-inf">
                    <li>am</li>
                    <li>April 21, 2017</li>
                    <li>17:00</li>
                  </ul>
                  <p>One Page Multipurpose PSD Template. PSD files is perfectly organized, so you can easily customize everything you need. The PSD is designed on Bootstrap 1170 grid system and can be easily converted into responsive Html.</p>
                  <ul className="cmt-mta">
                    <li><i className="fa fa-heart"></i> <a href="#" title="">30 Likes</a></li>
                    <li><i className="fa fa-comment"></i> <a href="#" title="">2 Comments</a></li>
                    <li><i className="fa fa-share"></i> <a href="#" title="">1 Share</a></li>
                  </ul>
                  <span className="tgl-icn"><i className="fa fa-chevron-down "></i></span>
                  <ul className="cmt-thrd">
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt2.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Peter Alexander</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Congratulations to the Bspotted team!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                    <li>
                      <div className="cmt-prs"> <img src="/admin-assets/images/resource/cmt3.jpg" alt="" />
                        <div className="cmt-dtl">
                          <h2><a href="#" title="">Eva De Villers</a></h2>
                          <span>Rotenturmstrasse 17/14, 1010 W.ien</span>
                          <p>Fly me to the moon!</p>
                          <ul className="pst-rt">
                            <li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
                            <li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
                          </ul>
                          <a href="#" title="" className="purple-skin">Reply</a> </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
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
