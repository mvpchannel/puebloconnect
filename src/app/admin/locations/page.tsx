import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Location Management",
};

/**
 * Ported from winku admin/location-management.html (shared top-bar/sidebar now live in
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
							<img src="/admin-assets/images/resource/banner.jpg" alt="" />
						</div>
						<div className="user-bar">
							<div className="user-thumb">
								<img src="/admin-assets/images/resource/admin.jpg" alt="" />
							</div>
							<a title="" className="purple-skin"><i className="fa fa-heart-o"></i> Follow</a>
							<ul>
								<li>
									1,245
									<span>Followers</span>
								</li>
								<li>
									535
									<span>Projects</span>
								</li>
								<li>
									994
									<span>Following</span>
								</li>							
							</ul>
							<div className="notif">
								<span><img src="/admin-assets/images/icon-bell.png" alt=""/><i>3</i></span>
								<div className="noti-lst">
									<div className="noti-tp">
										<span>Notifications</span>
									</div>
									<div className="noti-bd">
										<ul>
											<li className="rd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>15 Min Ago</span> <i>Read</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>BuddyPress</strong> Using Dropbox To Host Your On WordPress Theme! BP-Tricks</a> <span>30 Min Ago</span> <i>Unread</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>BP-Tricks:</strong> Sharing BuddyPress Knowledge made eassy!</a> <span>12 Hours Ago</span> <i>Unread</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>19 Hours Ago</span> <i>Unread</i></li>
										</ul>
									</div>
									<div className="noti-bt">
										<a href="#" title="">View All Notification</a>
									</div>
								</div>
							</div>
                            <div className="notif">
								<span><img src="/admin-assets/images/icon-envelop.png" alt=""/><i>3</i></span>
								<div className="noti-lst">
									<div className="noti-tp">
										<span>Notifications</span>
									</div>
									<div className="noti-bd">
										<ul>
											<li className="rd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>15 Min Ago</span> <i>Read</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>BuddyPress</strong> Using Dropbox To Host Your On WordPress Theme! BP-Tricks</a> <span>30 Min Ago</span> <i>Unread</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>BP-Tricks:</strong> Sharing BuddyPress Knowledge made eassy!</a> <span>12 Hours Ago</span> <i>Unread</i></li>
											<li className="unrd-noti"><a href="#" title=""><strong>Alexander</strong></a> Liked <a href="#" title="">Zebra Styling Of Activity Feed Items</a> with <a href="#" title="">Css3 I BP Triks.</a> <span>19 Hours Ago</span> <i>Unread</i></li>
										</ul>
									</div>
									<div className="noti-bt">
										<a href="#" title="">View All Notification</a>
									</div>
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
								<h4>Locations Management</h4>
							</div>{/* Panel Title */}
							<div className="pnl-bdy">
								<div className="cmp-loc">
									<div className="cmp-sc1">
										<div className="cmp-thm">
											<img src="/admin-assets/images/resource/cmp-thm1.jpg" alt="" />
										</div>
										
									</div>
									<div className="cmp-sc2">
										<h2>Finance Industry</h2>
										<span><i className="fa fa-location-arrow"></i> 43-L Complex Plaza, Gulberg ||</span>
										<span><i className="fa fa-phone"></i> (+46) 123-245-11</span>
										<span><i className="fa fa-globe"></i> <a href="#" title="">www.wpkixx.com</a></span>
									</div>
									<div className="cmp-sc3">
										<h2>Office Timing</h2>
										<span><i className="fa fa-clock-o"></i> Monday - Saturday <br /> 09:00 - 19:00</span>
										<span>Sunday - <i>Closed</i></span>
									</div>
									<div className="cmp-sc4">
										<div className="cmp-bnr">
											<img src="/admin-assets/images/resource/cmp-bnr1.jpg" alt="" />
                                            <a href="#" title=""><i className="fa fa-pencil"></i> Edit</a>
										</div>
									</div>
								</div>
								<div className="cmp-loc">
									<div className="cmp-sc1">
										<div className="cmp-thm">
											<img src="/admin-assets/images/resource/cmp-thm2.jpg" alt="" />
										</div>
										
									</div>
									<div className="cmp-sc2">
										<h2>Finance Industry</h2>
										<span><i className="fa fa-location-arrow"></i> 43-L Complex Plaza, Gulberg ||</span>
										<span><i className="fa fa-phone"></i> (+46) 123-245-11</span>
										<span><i className="fa fa-globe"></i> <a href="#" title="">www.wpkixx.com</a></span>
									</div>
									<div className="cmp-sc3">
										<h2>Office Timing</h2>
										<span><i className="fa fa-clock-o"></i> Monday - Saturday <br /> 09:00 - 19:00</span>
										<span>Sunday - <i>Closed</i></span>
									</div>
									<div className="cmp-sc4">
										<div className="cmp-bnr">
											<img src="/admin-assets/images/resource/cmp-bnr2.jpg" alt="" />
                                            <a href="#" title=""><i className="fa fa-pencil"></i> Edit</a>
										</div>
									</div>
									
								</div>
								<div className="cmp-loc">
									<div className="cmp-sc1">
										<div className="cmp-thm">
											<img src="/admin-assets/images/resource/cmp-thm3.jpg" alt="" />
										</div>
										
									</div>
									<div className="cmp-sc2">
										<h2>Finance Industry</h2>
										<span><i className="fa fa-location-arrow"></i> 43-L Complex Plaza, Gulberg ||</span>
										<span><i className="fa fa-phone"></i> (+46) 123-245-11</span>
										<span><i className="fa fa-globe"></i> <a href="#" title="">www.wpkixx.com</a></span>
									</div>
									<div className="cmp-sc3">
										<h2>Office Timing</h2>
										<span><i className="fa fa-clock-o"></i> Monday - Saturday <br /> 09:00 - 19:00</span>
										<span>Sunday - <i>Closed</i></span>
									</div>
									<div className="cmp-sc4">
										<div className="cmp-bnr">
											<img src="/admin-assets/images/resource/cmp-bnr3.jpg" alt="" />
                                            <a href="#" title=""><i className="fa fa-pencil"></i> Edit</a>
										</div>
									</div>
									
								</div>
							</div>{/* Panel Body */}
						</div>{/* User panel */}
					</div>{/* Profile Sec */}
				</div>
			</div>
		
    </>
  );
}
