import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preview Post",
};

/**
 * Ported from winku admin/post-preview-page.html (shared top-bar/sidebar now live in
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
            <div className="row">
              <div className="col-lg-8 offset-lg-2 col-md-12">
                <div className="widget">
                  <div className="user-activity ad-pst ">
                    <div className="who-post-this">
                      <div className="who-post-detail">
                        <p>Freebie this time is another PSD file. I was <a href="#" title="">inspired</a> by the metro concept adapted by the microsoft . It was elegant,  clean, minimal ,intuitive and free from clutter. I happen to notice many designs based on this concept and wanted to do something for <a href="#" title="">WordPress</a> similarly.  So there it is , a twitter widget PSD. It very simple design and I hope I did justice to the metro ui <a href="#" title="">concept</a> on this design.  One can use this design while <a href="#" title="">developing</a> a custom twitter widget for wordpress.</p>
                      </div>
                    </div>
                    <div className="add-img mrg10">
                      <div className="row">
                        <div className="col-md-3 col-sm-3 col-xs-6">
                          <div className="pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/ad-sml-img1.jpg" alt="" /></a> </div>
                        </div>
                        <div className="col-md-3 col-sm-3 col-xs-6">
                          <div className="pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/ad-sml-img2.jpg" alt="" /></a> </div>
                        </div>
                        <div className="col-md-3 col-sm-3 col-xs-6">
                          <div className="pst-img ad-img-lnk">
                            <label className="fileContainer"> Click here to trigger the file uploader!
                              <input type="file"/>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="add-img mrg10"></div>
                  </div>
                  <div className="add-content">
                    <ul>
                      <li><a href="#" title=""><i className="fa fa-location-arrow"></i></a></li>
                      <li><a href="#" title=""><i className="fa fa-microphone"></i></a></li>
                      <li><a href="#" title=""><i className="fa fa-picture-o"></i></a></li>
                      <li><a href="#" title=""><i className="fa fa-cloud-upload"></i></a></li>
                    </ul>
                    <a href="#" title="" className="pstng-sdl purple-skin">Posting Schdule</a>
                    <button type="submit" className="purple-skin">Preview</button>
                  </div>
                </div>
              </div>
              <div className="col-lg-8 offset-lg-2 col-sm-12">
                <div className="widget gry-bg-pd">
                  <div className="fb-pst-prvw">
                    <div className="fb-sndr-info"> <img src="/admin-assets/images/resource/fb-pst-sndr.jpg" alt="" />
                      <div className="fb-sndr-nm">
                        <h5><a href="#" title="">Felix Russell</a></h5>
                        <span>Posted in <a href="#" title="">Beauty album</a></span>
                        <div className="fb-pst-shr-inf"> <i>2 minutes ago</i>
                          <div className="fb-slct-pst-typ"> <span><i className="fa fa-lock"></i> Only Me</span>
                            <ul>
                              <li><i className="fa fa-lock"></i>Only Me</li>
                              <li><i className="fa fa-globe"></i>Public</li>
                              <li><i className="fa fa-users"></i>Friends</li>
                            </ul>
                          </div>
                        </div>
                        <div className="pst-optns"> <i className="fa fa-caret-down"></i>
                          <ul>
                            <li><a href="#" title="">Save post</a></li>
                            <li><a href="#" title="">Edit Post</a></li>
                            <li><a href="#" title="">Change Date</a></li>
                            <li><a href="#" title="">Embed</a></li>
                            <li><a href="#" title="">Turn off notifications for this post</a></li>
                            <li><a href="#" title="">Show in tab</a></li>
                            <li><a href="#" title="">Hide from Timeline</a></li>
                            <li><a href="#" title="">Delete</a></li>
                            <li><a href="#" title="">Turn Off Translations</a></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="fb-pst-dta">
                      <textarea>Exhibiting a cool and F@m!lY Fr!End$ layout, Electric Admin Angular JS template for an easier and more Computerworld management of a single or multiple projects. Its all-purpose active and energetic</textarea>
                      <span className="fb-wrds-lft">250Left</span>
                      <div className="fb-pst-imgs">
                        <div className="row mrg1">
                          <div className="col-md-12">
                            <div className="fb-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/fb-pst-img1.jpg" alt="" /></a> </div>
                          </div>
                          <div className="col-md-6 col-sm-6 col-xs-6">
                            <div className="fb-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/fb-pst-img2.jpg" alt="" /></a> </div>
                          </div>
                          <div className="col-md-6 col-sm-6 col-xs-6">
                            <div className="fb-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/fb-pst-img3.jpg" alt="" /></a> </div>
                          </div>
                        </div>
                      </div>
                      <ul className="fb-pst-lk-cm">
                        <li><a href="#" title=""><i className="fa fa-thumbs-o-up"></i> Like</a></li>
                        <li><a href="#" title=""><i className="fa fa-comment"></i> Comments</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="widget gry-bg-pd">
                  <div className="gpl-pst-prvw">
                    <div className="gpl-sndr-info"> <img src="/admin-assets/images/resource/gpl-pst-sndr.jpg" alt="" />
                      <div className="gpl-sndr-nm">
                        <h5><a href="#" title="">Felix Russell</a></h5>
                        <span><i className="fa fa-caret-right"></i> <a href="#" title=""> Public</a></span> <i>12h</i> </div>
                    </div>
                    <div className="gpl-pst-dta">
                      <textarea>Exhibiting a cool and F@m!lY Fr!End$ layout, Electric Admin Angular JS template for an easier and more Computerworld management of a single or multiple projects. Its all-purpose active and energetic. Its all- purpose framework is replete with active</textarea>
                      <div className="gpl-pst-imgs">
                        <div className="gpl-crsl">
                          <div className="gpl-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/gpl-pst-img1.jpg" alt="" /></a> </div>
                          <div className="gpl-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/gpl-pst-img2.jpg" alt="" /></a> </div>
                          <div className="gpl-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/gpl-pst-img3.jpg" alt="" /></a> </div>
                        </div>
                      </div>
                      <ul className="gpl-pst-lk-cm">
                        <li><a href="#" title="">+1</a></li>
                        <li><a href="#" title=""><i className="fa fa-share-alt"></i></a></li>
                        <li><a href="#" title=""><i className="fa fa-commenting"></i></a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-8 offset-lg-2 col-sm-12">
                <div className="widget gry-bg-pd">
                  <div className="twt-pst-prvw">
                    <div className="twt-sndr-info"> <img src="/admin-assets/images/resource/twt-pst-sndr.jpg" alt="" />
                      <div className="twt-sndr-nm">
                        <h5><a href="#" title="">Felix Russell</a></h5>
                        <span><a href="#" title="">@shoaibsugotech1</a> - 12h</span> </div>
                      <div className="pst-optns"> <i className="fa fa-caret-down"></i>
                        <ul>
                          <li><a href="#" title="">Save post</a></li>
                          <li><a href="#" title="">Edit Post</a></li>
                          <li><a href="#" title="">Change Date</a></li>
                          <li><a href="#" title="">Embed</a></li>
                          <li><a href="#" title="">Turn off notifications for this post</a></li>
                          <li><a href="#" title="">Show in tab</a></li>
                          <li><a href="#" title="">Hide from Timeline</a></li>
                          <li><a href="#" title="">Delete</a></li>
                          <li><a href="#" title="">Turn Off Translations</a></li>
                        </ul>
                      </div>
                    </div>
                    <div className="twt-pst-dta">
                      <textarea>Exhibiting a cool and F@m!lY Fr!End$ layout, Electric Admin Angular JS template for an easier and more</textarea>
                      <span className="twt-wrds-lft">0Left</span>
                      <div className="twt-pst-imgs">
                        <div className="row mrg1">
                          <div className="col-md-8 col-sm-8">
                            <div className="twt-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/tw-pst-img1.jpg" alt="" /></a> </div>
                          </div>
                          <div className="col-md-4 col-sm-4">
                            <div className="twt-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/tw-pst-img2.jpg" alt="" /></a> </div>
                            <div className="twt-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/tw-pst-img3.jpg" alt="" /></a> </div>
                          </div>
                        </div>
                      </div>
                      <ul className="twt-pst-lk-cm">
                        <li><a href="#" title=""><i className="fa fa-reply"></i></a></li>
                        <li><a href="#" title=""><i className="fa fa-retweet"></i></a></li>
                        <li><a href="#" title=""><i className="fa fa-heart"></i></a></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="widget gry-bg-pd">
                  <div className="msg-pst-prvw"> <img src="/admin-assets/images/resource/msg-pst-thmb.png" alt="" />
                    <div className="msg-pst-dta">
                      <h2><a href="#" title="">ShoaibSugotech</a></h2>
                      <span className="sndr-nm">+94 231-1119-42</span>
                      <textarea>Exhibiting a cool and F@m!lY Fr!end$ gaging layout, Electric Admin is an extraordinarily complete Angular JS template for an easier and more Computerworld rehensive backend & frontend management of a single or multiple projects. Its all-purpose frameword is replete with active and Energetics</textarea>
                    </div>
                  </div>
                </div>
                <div className="widget gry-bg-pd">
                  <div className="bsp-pst-prvw">
                    <div className="bsp-pst-info"> <img src="/admin-assets/images/resource/cmt1.jpg" alt="" />
                      <h2><a href="#" title="">BSPOTTED</a></h2>
                      <span className="tm">vor 1 Woche</span> </div>
                    <div className="bsp-pst-dta">
                      <textarea>Exhibiting a cool and F@m!lY Fr!End$ layout, Electric Admin Angular JS template for an easier and more</textarea>
                      <div className="bsp-pst-imgs">
                        <div className="row">
                          <div className="col-md-4 col-sm-4">
                            <div className="bsp-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/bsp-pst-img1.jpg" alt="" /></a> </div>
                          </div>
                          <div className="col-md-4 col-sm-4">
                            <div className="bsp-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/bsp-pst-img2.jpg" alt="" /></a> </div>
                          </div>
                          <div className="col-md-4 col-sm-4">
                            <div className="bsp-pst-img"> <a href="#" title=""><img src="/admin-assets/images/resource/bsp-pst-img3.jpg" alt="" /></a> </div>
                          </div>
                        </div>
                      </div>
                      <ul className="bsp-pst-shr-cmt">
                        <li><a href="#" title=""><i className="fa fa-long-arrow-up"></i> Positive Bewertung</a></li>
                        <li><a href="#" title=""><i className="fa fa-long-arrow-down"></i> Negative Bewertung</a></li>
                        <li><a href="#" title=""><i className="fa fa-ellipsis-h"></i> Mehr</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="widget gry-bg-pd">
                  <div className="forsq-pst-prvw">
                    <div className="forsq-pst-info"> <img src="/admin-assets/images/resource/frsq-pst-sndr.jpg" alt="" />
                      <h2><a href="#" title="">FORSQUARE</a></h2>
                    </div>
                    <div className="forsq-pst-dv"> <img src="/admin-assets/images/resource/frsq-pst-img.jpg" alt="" />
                      <div className="forsq-pst-dta">
                        <h4><a href="#" title="">Cosa Nostra La Gelateria</a></h4>
                        <span>January 4, 2019</span>
                        <textarea>Exhibiting a cool and F@m!lY Fr!End$ layout, Electric Admin Angular JS template and more.</textarea>
                        <a href="#" title=""><i className="fa fa-ellipsis-h"></i> Save</a> </div>
                    </div>
                  </div>
                </div>
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
