import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crop Image",
};

/**
 * Ported from winku admin/image-croper-panel.html (shared top-bar/sidebar now live in
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
						<div className="profile-all">
							<div className="row">
								<div className="col-md-8">
									<div className="widget">
										<div className="add-content-form">
											<textarea placeholder=""></textarea>
											<div className="add-content">
												<ul>
													<li><a href="#" title=""><i className="fa fa-location-arrow"></i></a></li>
													<li><a href="#" title=""><i className="fa fa-microphone"></i></a></li>
													<li><a href="#" title=""><i className="fa fa-picture-o"></i></a></li>
													<li><a href="#" title=""><i className="fa fa-cloud-upload"></i></a></li>
												</ul>
												<button type="submit" className="purple-skin">POST</button>
											</div>
										</div>
									</div>
									<div className="widget no-color">
										<div className="activity-feed">
											<ul className="fltrs-lst">
												<li className="selected"><a href="#" title="" data-filter="*">All Feeds</a></li>
												<li><a href="#" title="" data-filter=".fb-pst"><i className="fa fa-facebook"></i></a></li>
												<li><a href="#" title="" data-filter=".tw-pst"><i className="fa fa-twitter"></i></a></li>
												<li><a href="#" title="" data-filter=".fr-pst"><i className="fa fa-foursquare"></i></a></li>
												<li><a href="#" title="" data-filter=".glp-pst"><i className="fa fa-google-plus"></i></a></li>
												<li><a href="#" title="" data-filter=".in-pst"><i className="fa fa-instagram"></i></a></li>
											</ul>
											<div className="widget-title">
												<h3>All Activity Feeds</h3>
												<span>Your last activity is posted 4 hours ago</span>
											</div>
											<ul className="activity-timeline masonry">
												<li className="fb-pst flt-itm">
													<span className="user-device"><i className="fa fa-facebook"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<a href="#" title="" className="lnk">https://themeforest.net/item/electric-admin-panel-dashboard-angular-js-template/14879635</a>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="pst-frmt">
																<a href="#" title=""><img src="/admin-assets/images/resource/pst-big-img1.jpg" alt="" /></a>
																<div className="pst-inf">
																	<h2><a href="#" title="">Electric - Admin Panel Dashboard Angular JS Templete</a></h2>
																	<p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily complete Angular JS template for an easier and more...</p>
																	<span>themeforest.net</span>
																</div>
															</div>
															<div className="cmnts-liks">
																<a href="#" title="" className="viw-prv-cmt">View Previous Comments</a>
																<a href="#" title="" className="lks">25 Likes</a>
																<a href="#" title="" className="cmts">30 Coments</a>
															</div>
														</div>
														<div className="comment-form">
															<ul className="comments-thread">
																<li>
																	<div className="comment">
																		<img className="comment-thumb" src="/admin-assets/images/resource/comment1.jpg" alt="" />
																		<div className="comment-detail">
																			<h2><a href="#" title="">Alexander</a></h2>
																			<p>Exhibiting a cool and engaging layout.</p>
																			<ul className="cmnt-meta">
																				<li><a href="#" title="">Like</a></li>
																				<li><a href="#" title="">Reply</a></li>
																				<li className="cmt-tm">15 Min Ago</li>
																			</ul>
																			<div className="cmt-opt">
																				<i className="fa fa-angle-down"></i>
																				<ul>
																					<li><a href="#" title="">Delete</a></li>
																					<li><a href="#" title="">Edit</a></li>
																				</ul>
																			</div>
																		</div>
																	</div>
																</li>
																<li>
																	<div className="comment">
																		<img className="comment-thumb" src="/admin-assets/images/resource/comment2.jpg" alt="" />
																		<div className="comment-detail">
																			<h2><a href="#" title="">Micheal Doe</a></h2>
																			<p>Exhibiting a cool and engaging layout.</p>
																			<ul className="cmnt-meta">
																				<li><a href="#" title="">Like</a></li>
																				<li><a href="#" title="">Reply</a></li>
																				<li className="cmt-tm">10 Min Ago</li>
																			</ul>
																			<div className="cmt-opt">
																				<i className="fa fa-angle-down"></i>
																				<ul>
																					<li><a href="#" title="">Delete</a></li>
																					<li><a href="#" title="">Edit</a></li>
																				</ul>
																			</div>
																		</div>
																	</div>
																	<ul className="sub-comment">
																		<li>
																			<div className="comment">
																				<img className="comment-thumb" src="/admin-assets/images/resource/comment3.jpg" alt="" />
																				<div className="comment-detail">
																					<h2><a href="#" title="">Edwards Hill</a></h2>
																					<p>Exhibiting a cool and engaging layout.</p>
																					<ul className="cmnt-meta">
																						<li><a href="#" title="">Like</a></li>
																						<li><a href="#" title="">Reply</a></li>
																						<li className="cmt-tm">15 Min Ago</li>
																					</ul>
																					<div className="cmt-opt">
																						<i className="fa fa-angle-down"></i>
																						<ul>
																							<li><a href="#" title="">Delete</a></li>
																							<li><a href="#" title="">Edit</a></li>
																						</ul>
																					</div>
																				</div>
																			</div>
																		</li>
																	</ul>
																</li>
																<li>
																	<div className="comment">
																		<img className="comment-thumb" src="/admin-assets/images/resource/comment4.jpg" alt="" />
																		<div className="comment-detail">
																			<h2><a href="#" title="">Robinson Baker</a></h2>
																			<p>Exhibiting a cool and engaging layout.</p>
																			<ul className="cmnt-meta">
																				<li><a href="#" title="">Like</a></li>
																				<li><a href="#" title="">Reply</a></li>
																				<li className="cmt-tm">10 Min Ago</li>
																			</ul>
																			<div className="cmt-opt">
																				<i className="fa fa-angle-down"></i>
																				<ul>
																					<li><a href="#" title="">Delete</a></li>
																					<li><a href="#" title="">Edit</a></li>
																				</ul>
																			</div>
																		</div>
																	</div>
																</li>
																<li>
																	<div className="comment">
																		<img className="comment-thumb" src="/admin-assets/images/resource/comment5.jpg" alt="" />
																		<div className="comment-detail">
																			<h2><a href="#" title="">Lopez Perez</a></h2>
																			<p>Exhibiting a cool and engaging layout.</p>
																			<ul className="cmnt-meta">
																				<li><a href="#" title="">Like</a></li>
																				<li><a href="#" title="">Reply</a></li>
																				<li className="cmt-tm">10 Min Ago</li>
																			</ul>
																			<div className="cmt-opt">
																				<i className="fa fa-angle-down"></i>
																				<ul>
																					<li><a href="#" title="">Delete</a></li>
																					<li><a href="#" title="">Edit</a></li>
																				</ul>
																			</div>
																		</div>
																	</div>
																</li>
															</ul>
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="tw-pst flt-itm">
													<span className="user-device"><i className="fa fa-twitter"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<a href="#" title="" className="lnk">https://themeforest.net/item/electric-admin-panel-dashboard-angular-js-template/14879635</a>
																<a href="#" title="" className="lnk">https://themeforest.net/item/kraft-simple-portfolio-wordpress-theme/17515270</a>
																<a href="#" title="" className="lnk">https://themeforest.net/item/picstock-ultra-advanced-stock-media-html-template/14312683</a>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="pst-carousel">
																<div className="pst-frmt">
																	<a href="#" title=""><img src="/admin-assets/images/resource/pst-md-img1.jpg" alt="" /></a>
																	<div className="pst-inf">
																		<h2><a href="#" title="">Electric - Admin Panel Dashboard Angular JS Templete</a></h2>
																		<span>themeforest.net</span>
																	</div>
																</div>
																<div className="pst-frmt">
																	<a href="#" title=""><img src="/admin-assets/images/resource/pst-md-img2.jpg" alt="" /></a>
																	<div className="pst-inf">
																		<h2><a href="#" title="">Kraft - Simple Prtfolio WordPress Theme</a></h2>
																		<span>themeforest.net</span>
																	</div>
																</div>
																<div className="pst-frmt">
																	<a href="#" title=""><img src="/admin-assets/images/resource/pst-md-img3.jpg" alt="" /></a>
																	<div className="pst-inf">
																		<h2><a href="#" title="">PicStock- Ultra Advanced Stock Media HTML Template</a></h2>
																		<span>themeforest.net</span>
																	</div>
																</div>
															</div>
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="tw-pst flt-itm">
													<span className="user-device"><i className="fa fa-twitter"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<p>Exhibiting a cool and engaging layout, Electric Admin is an extraordinarily complete Angular JS template for an easier and more comprehensive backend & frontend management of a single or multiple projects. Its all-purpose framework is replete with active and energetic features, including 4+ dashboard styles...</p>
																<a href="#" title="" className="lnk">Read More</a>
																<ul className="hsh-tgs">
																	<li><a href="#" title=""># Facebook</a>,</li>
																	<li><a href="#" title=""># Health</a>,</li>
																	<li><a href="#" title=""># Beauty</a></li>
																</ul>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content no-pd">
															
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="fb-pst flt-itm">
													<span className="user-device"><i className="fa fa-facebook"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="pst-img">
																<a href="#" title=""><img src="/admin-assets/images/resource/pst-big-img2.jpg" alt=""/></a>
															</div>
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="fr-pst flt-itm">
													<span className="user-device"><i className="fa fa-foursquare"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="mrg15">
																<div className="row">
																	<div className="col-md-12">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-big-img2.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-6">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-md-img4.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-6">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-md-img5.jpg" alt=""/></a>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="glp-pst flt-itm">
													<span className="user-device"><i className="fa fa-google-plus"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="mrg15">
																<div className="row">
																	<div className="col-md-12">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-big-img2.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img1.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img2.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img3.jpg" alt=""/></a>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
												<li className="tw-pst flt-itm">
													<span className="user-device"><i className="fa fa-facebook"></i></span>
													<div className="user-activity">
														<div className="who-post-this">
															<span><img src="/admin-assets/images/resource/user.jpg" alt="" /></span>
															<div className="who-post-detail">
																<h3><a href="#" title="">Diana Dare<i className="poster-status online"></i></a></h3>
																<span><a href="#" title="">Diana Dare</a> Posted in <a href="#" title="">Beauty album</a></span>
																<p>Exhibiting a cool and <a href="#" title="">Engaging</a> layout, Electric Admin is an extraordinarily complete Angular JS template for an easier and more <a href="#" title="">Comprehensive</a> backend & frontend management of a single or multiple projects. Its all-purpose framework is replete with active and <a href="#" title="">Energetic</a> features, including 4+ dashboard styles...</p>
																<a href="#" title="" className="lnk">Read More</a>
																<ul className="hsh-tgs">
																	<li><a href="#" title=""># Facebook</a>,</li>
																	<li><a href="#" title=""># Health</a>,</li>
																	<li><a href="#" title=""># Beauty</a></li>
																</ul>
																<div className="pst-shr-inf">
																	<i>2 minutes ago</i>
																	<div className="slct-whr-pst">
																		<span><i className="fa fa-lock"></i> Only Me</span>
																		<ul>
																			<li><i className="fa fa-lock"></i> Only Me</li>
																			<li><i className="fa fa-globe"></i> Public</li>
																			<li><i className="fa fa-users"></i> Friends</li>
																		</ul>
																	</div>
																</div>
															</div>
														</div>
														<div className="post-content">
															<div className="mrg15">
																<div className="row">
																	<div className="col-md-12">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-big-img2.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img1.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img">
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img2.jpg" alt=""/></a>
																		</div>
																	</div>
																	<div className="col-md-4">
																		<div className="pst-img mor-imgs">
																			<a href="#" title="" className="mor-cnt">4+</a>
																			<a href="#" title=""><img src="/admin-assets/images/resource/pst-sm-img3.jpg" alt=""/></a>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div className="comment-form">
															<form>
																<textarea placeholder="Add Commemts"></textarea>	
															</form>
															<span><i className="fa fa-thumbs-o-up"></i> Like</span>
															<span><i className="fa fa-comment-o"></i> Comments</span>
															<a href="#" title="" className="purple-skin">Send</a>
															<ul className="pst-rt">
																<li><a href="#" title=""><i className="flaticon-smile"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-meh-face-emoticon"></i></a></li>
																<li><a href="#" title=""><i className="flaticon-frown"></i></a></li>
															</ul>
														</div>
													</div>
												</li>
											</ul>
										</div>{/* Activity Feed */}
									</div>
									<div data-sidebar-bottom="sidebar2"></div>
								</div>
								<div className="col-md-4">
									<div data-sidebar-dummy="sidebar2"></div>
									<div className="sidebar" id="sidebar2">
										<div className="widget">
											<div className="our-clients-sec">
												<div className="widget-title">
													<h3>My Friends List</h3>
													<span>You have 522 Freinds</span>
												</div>
												<div id="searchDir"></div>
												<ul id="people-list" className="client-list">
													<li>
														<span className="user-status online red-skin">J</span>
														<div className="client-info">
															<h3><a href="#" title="">Jamed line</a></h3>
															<p>creative designer</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status offline purple-skin">H</span>
														<div className="client-info">
															<h3><a href="#" title="">Hurisa joe</a></h3>
															<p>marketing</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status away pink-skin">K</span>
														<div className="client-info">
															<h3><a href="#" title="">Komail set</a></h3>
															<p>supervisor</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status away sky-skin">B</span>
														<div className="client-info">
															<h3><a href="#" title="">Bason Durel</a></h3>
															<p>web developer</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status offline red-skin">D</span>
														<div className="client-info">
															<h3><a href="#" title="">Danzil Dare</a></h3>
															<p>software engineer</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status online purple-skin">Z</span>
														<div className="client-info">
															<h3><a href="#" title="">Zubain Dui</a></h3>
															<p>road master</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status online pink-skin">L</span>
														<div className="client-info">
															<h3><a href="#" title="">Lara Croft</a></h3>
															<p>content writer</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
													<li>
														<span className="user-status offline sky-skin">B</span>
														<div className="client-info">
															<h3><a href="#" title="">Bisman Dazy</a></h3>
															<p>blogger</p>
															<a href="#" title=""><i className="fa fa-comment-o"></i></a>
														</div>
													</li>
												</ul>
											</div>{/* Our Clients Sec */}
										</div>{/* Widget */}
									</div>
								</div>
							</div>
						</div>
					</div>{/* Profile Sec */}
				</div>
			</div>
		
    </>
  );
}
