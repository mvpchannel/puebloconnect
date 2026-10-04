import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox",
};

/**
 * Ported from winku admin/inbox.html (shared top-bar/sidebar now live in
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
          <div className="profile-all">
            <div className="row mrg1">
              <div className="col-md-4">
                <div className="sidebar" id="sidebar2">
                  <div className="widget">
                    <div className="our-clients-sec">
                      <div className="widget-title">
                        <h3>My Friends List</h3>
                        <span>You have 522 Freinds</span> </div>
                      <div id="searchDir"></div>
                      <ul id="people-list" className="client-list">
                        <li> <span className="user-status online red-skin">J</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Jamed line</a></h3>
                            <p>creative designer</p>
                          </div>
                        </li>
                        <li> <span className="user-status offline purple-skin">H</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Hurisa joe</a></h3>
                            <p>marketing</p>
                          </div>
                        </li>
                        <li> <span className="user-status away pink-skin">K</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Komail set</a></h3>
                            <p>supervisor</p>
                          </div>
                        </li>
                        <li> <span className="user-status away sky-skin">B</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Bason Durel</a></h3>
                            <p>web developer</p>
                          </div>
                        </li>
                        <li> <span className="user-status offline red-skin">D</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Danzil Dare</a></h3>
                            <p>software engineer</p>
                          </div>
                        </li>
                        <li> <span className="user-status online purple-skin">Z</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Zubain Dui</a></h3>
                            <p>road master</p>
                          </div>
                        </li>
                        <li> <span className="user-status online pink-skin">L</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Lara Croft</a></h3>
                            <p>content writer</p>
                          </div>
                        </li>
                        <li> <span className="user-status offline sky-skin">B</span>
                          <div className="client-info">
                            <h3><a href="#" title="">Bisman Dazy</a></h3>
                            <p>blogger</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                    {/* Our Clients Sec */} 
                  </div>
                  {/* Widget */} 
                </div>
              </div>
              <div className="col-md-8">
                <div className="chat-msgs widget">
                  <div className="chat-system-innr">
                    <div className="chat-hdr">
                      <div className="cht-tl">
                        <h3 className="user-status online">Bob Frank</h3>
                        <span>Web Coder</span> </div>
                      <ul className="cht-optns">
                        <li><a href="#" title=""><i className="fa fa-user"></i></a></li>
                        <li><a href="#" title=""><i className="fa fa-video-camera"></i></a></li>
                        <li><a href="#" title=""><i className="fa fa-gear"></i></a></li>
                      </ul>
                    </div>
                    <div className="cht-bdy">
                      <ul>
                        <li className="chat-message frnd"> <span className="sndr-nm"><img src="/admin-assets/images/resource/frnd-1.jpg" alt=""/></span>
                          <div className="msg-bx">Hello</div>
                        </li>
                        <li className="chat-message me"> <span className="sndr-nm"><img src="/admin-assets/images/resource/frnd-1.jpg" alt=""/></span>
                          <div className="msg-bx">Hello</div>
                        </li>
                        <li className="chat-message me"> <span className="sndr-nm"><img src="/admin-assets/images/resource/frnd-1.jpg" alt=""/></span>
                          <div className="msg-bx">How are you?</div>
                        </li>
                        <li className="chat-message frnd"> <span className="sndr-nm"><img src="/admin-assets/images/resource/frnd-1.jpg" alt=""/></span>
                          <div className="msg-bx">Please type something on the field below I am fine. Please something on the field.</div>
                        </li>
                      </ul>
                      <div className="comment-form">
                        <form>
                          <textarea placeholder="Write Somthing..."></textarea>
                          <a href="#" title=""><i className="flaticon-smile"></i></a>
                        </form>
                        <span> <i className="fa fa-paperclip"></i>
                        <label className="fileContainer"> Add Files
                          <input type="file"/>
                        </label>
                        </span> <span> <i className="fa fa-photo"></i>
                        <label className="fileContainer"> Add Photos
                          <input type="file"/>
                        </label>
                        </span> <a href="#" title="" className="purple-skin">Send</a> </div>
                    </div>
                  </div>
                </div>
                {/* Chat Messages */} 
              </div>
            </div>
          </div>
        </div>
        {/* Profile Sec */} 
      </div>
    </div>
  
    </>
  );
}
