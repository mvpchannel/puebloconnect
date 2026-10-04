"use client";

import { useState } from "react";

/**
 * Ported from landing.html. The sign-in/register panel swap was originally
 * driven by main.min.js (jQuery) toggling a `.show` class — reimplemented
 * here as real React state instead of silently dropping the interaction.
 *
 * STATUS: needs backend/API. The toggle between Login/Register is fully
 * functional; the forms themselves do not submit anywhere yet — no auth
 * system is wired up. See /FUNCTIONALITY_STATUS.md.
 */
function LoginForm() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="container-fluid pdng0">
      <div className="row merged">
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className="land-featurearea">
            <div className="land-meta">
              <h1>Pueblo Connect&nbsp;</h1>
              <p>
                Pueblo Connect is free to use for as long as you want.
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className={`login-reg-bg${showRegister ? " show" : ""}`}>
            <div className="log-reg-area sign">
              <h2 className="log-title">Login</h2>
              <p>
                Don&rsquo;t use Pueblo Connect yet?{" "}
                <a href="#" title="">Take the tour</a> or{" "}
                <a
                  href="#"
                  title=""
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRegister(true);
                  }}
                >
                  Join now
                </a>
              </p>
              <form method="post">
                <div className="form-group">
                  <input type="text" id="login-username" required />
                  <label className="control-label" htmlFor="login-username">Username</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input type="password" id="login-password" required />
                  <label className="control-label" htmlFor="login-password">Password</label>
                  <i className="mtrl-select" />
                </div>
                <div className="checkbox">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <i className="check-box" />
                    Always remember me.
                  </label>
                </div>
                <a href="#" title="" className="forgot-pwd">Forgot password?</a>
                <div className="submit-btns">
                  <button className="mtr-btn signin" type="submit">
                    <span>Login</span>
                  </button>
                  <button
                    className="mtr-btn signup"
                    type="button"
                    onClick={() => setShowRegister(true)}
                  >
                    <span>Register</span>
                  </button>
                </div>
              </form>
            </div>
            <div className="log-reg-area reg">
              <h2 className="log-title">Register</h2>
              <p>
                Don&rsquo;t use Pueblo Connect yet?{" "}
                <a href="#" title="">Take the tour</a> or{" "}
                <a
                  href="#"
                  title=""
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRegister(true);
                  }}
                >
                  Join now
                </a>
              </p>
              <form method="post">
                <div className="form-group">
                  <input type="text" id="reg-name" required />
                  <label className="control-label" htmlFor="reg-name">First &amp; Last Name</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input type="text" id="reg-username" required />
                  <label className="control-label" htmlFor="reg-username">User Name</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input type="password" id="reg-password" required />
                  <label className="control-label" htmlFor="reg-password">Password</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-radio">
                  <div className="radio">
                    <label>
                      <input type="radio" name="gender" defaultChecked />
                      <i className="check-box" />
                      Male
                    </label>
                  </div>
                  <div className="radio">
                    <label>
                      <input type="radio" name="gender" />
                      <i className="check-box" />
                      Female
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <input type="email" id="reg-email" required />
                  <label className="control-label" htmlFor="reg-email">Email</label>
                  <i className="mtrl-select" />
                </div>
                <div className="checkbox">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <i className="check-box" />
                    Accept Terms &amp; Conditions?
                  </label>
                </div>
                <a
                  href="#"
                  title=""
                  className="already-have"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRegister(false);
                  }}
                >
                  Already have an account
                </a>
                <div className="submit-btns">
                  <button className="mtr-btn signup" type="submit">
                    <span>Register</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
