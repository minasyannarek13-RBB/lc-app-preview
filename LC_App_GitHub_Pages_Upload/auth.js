(() => {
  "use strict";

  const LIVE_SUPABASE_URL = "https://aspbwgsfkebduvviyeuo.supabase.co";
  const AUTH_EMAIL_KEY = "lc-app:pending-email";
  const AUTH_RETURN_KEY = "lc-app:auth-return-to";
  const VERIFY_COOLDOWN_KEY = "lc-app:verify-cooldown-until";
  const USERNAME_DEBOUNCE_MS = 380;
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  const ALLOWED_AVATAR_TYPES = new Map([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"]
  ]);

  const STATE = {
    client: null,
    session: null,
    profile: null,
    booted: false,
    busy: false,
    recovery: false,
    deletionRequest: null,
    deletionRequestsAvailable: true,
    deletionConfirm: false,
    accountObserver: null,
    profileRenderTimer: 0,
    usernameTimer: 0,
    usernameCheckSeq: 0
  };

  const REDIRECT_ERRORS = parseRedirectErrors();

  const style = document.createElement("style");
  style.textContent = `
    html.lc-auth-booting .screen{visibility:hidden}
    html.lc-auth-ready .screen{visibility:visible}
    .screen.auth-mode > :not(.lc-auth-shell):not(.toast){display:none!important}
    .lc-auth-shell{position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;gap:14px;overflow:auto;padding:calc(22px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));background:radial-gradient(circle at 80% 0%,rgba(46,230,206,.16),transparent 34%),linear-gradient(180deg,#050609,#08110f 56%,#050609);color:var(--text);overscroll-behavior:contain}
    .lc-auth-shell[hidden]{display:none!important}
    .lc-auth-card{border:1px solid rgba(46,230,206,.18);border-radius:18px;background:rgba(10,13,18,.92);box-shadow:0 24px 70px rgba(0,0,0,.34);padding:18px;backdrop-filter:blur(20px)}
    .lc-auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}.lc-auth-logo b{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:linear-gradient(135deg,var(--teal),#a7fff4);color:#031412}.lc-auth-logo strong{font-size:18px}.lc-auth-logo span{display:block;color:var(--muted);font-size:11px}
    .lc-auth-title{margin:0 0 6px;font-size:24px;line-height:1.06}.lc-auth-copy{margin:0 0 16px;color:var(--soft);font-size:12px;line-height:1.45}
    .lc-auth-form{display:grid;gap:10px}.lc-auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .lc-auth-field{display:grid;gap:6px}.lc-auth-field span,.lc-auth-check span{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
    .lc-auth-field input,.lc-auth-field textarea{width:100%;min-height:42px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.06);color:var(--text);padding:10px 12px;font:inherit;font-size:13px;outline:none}
    .lc-auth-field textarea{min-height:82px;resize:vertical}.lc-auth-field input:focus,.lc-auth-field textarea:focus{border-color:rgba(46,230,206,.68);box-shadow:0 0 0 3px rgba(46,230,206,.1)}
    .lc-auth-help{min-height:16px;color:var(--muted);font-size:11px}.lc-auth-help.ok{color:#9dffd6}.lc-auth-help.error{color:#ffb4b4}.lc-auth-help.checking{color:#a7fff4}
    .lc-auth-check{display:flex;align-items:flex-start;gap:9px;padding:9px 0;color:var(--soft);font-size:12px;line-height:1.35}.lc-auth-check input{margin-top:2px}
    .lc-auth-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}.lc-auth-btn{min-height:42px;border:0;border-radius:12px;padding:0 14px;background:linear-gradient(135deg,var(--teal),#a7fff4);color:#031412;font-weight:800;cursor:pointer}
    .lc-auth-btn.secondary{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--line)}.lc-auth-btn.danger{background:rgba(239,68,68,.16);color:#ffb4b4;border:1px solid rgba(239,68,68,.32)}
    .lc-auth-btn:disabled{opacity:.55;cursor:not-allowed}.lc-auth-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .lc-auth-link{border:0;background:transparent;color:#a7fff4;padding:0;font:inherit;font-size:12px;cursor:pointer}
    .lc-auth-alert{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.06);color:var(--soft);font-size:12px;line-height:1.4}
    .lc-auth-alert.error{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.12);color:#ffd4d4}.lc-auth-alert.ok{border-color:rgba(64,211,122,.35);background:rgba(64,211,122,.12);color:#d7ffe4}
    .lc-auth-progress{display:flex;gap:6px;margin:0 0 14px}.lc-auth-progress span{height:4px;flex:1;border-radius:999px;background:rgba(255,255,255,.12)}.lc-auth-progress span.active{background:var(--teal)}
    .lc-profile-avatar{display:flex;align-items:center;gap:12px}.lc-profile-avatar img,.lc-avatar-preview{width:58px;height:58px;border-radius:18px;object-fit:cover;border:1px solid var(--line)}
    .lc-profile-note{color:var(--muted);font-size:11px;line-height:1.4}.lc-preview-pill{position:absolute;top:92px;right:18px;z-index:20;border:1px solid rgba(46,230,206,.3);border-radius:999px;background:rgba(5,6,9,.64);color:#a7fff4;padding:5px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;backdrop-filter:blur(14px)}
    @media(max-width:390px){.lc-auth-grid{grid-template-columns:1fr}.lc-auth-shell{padding-left:14px;padding-right:14px}.lc-auth-title{font-size:21px}}
    @media(prefers-reduced-motion:reduce){.lc-auth-shell *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function eventElement(event) {
    const target = event.target;
    return target && typeof target.closest === "function" ? target : target?.parentElement || null;
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function parseRedirectErrors() {
    const params = new URLSearchParams(`${window.location.search.replace(/^\?/, "")}&${window.location.hash.split("?")[1] || window.location.hash.replace(/^#/, "")}`);
    const error = params.get("error") || params.get("error_code");
    const description = params.get("error_description") || "";
    if (!error && !description) return null;
    const expired = /expired|otp_expired/i.test(`${error} ${description}`);
    return {
      code: expired ? "AUTH_LINK_EXPIRED" : "AUTH_LINK_INVALID",
      message: expired ? "This verification link has expired. Request a new one." : "This auth link is invalid. Request a new one."
    };
  }

  function route() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const clean = hash.split("?")[0].split("&")[0];
    if (clean) return clean;
    return "feed";
  }

  function setRoute(nextRoute) {
    const next = nextRoute === "feed" ? "#/feed" : `#/${nextRoute}`;
    if (window.location.hash !== next) window.location.hash = next;
    else renderAuthState();
  }

  function isProductRoute(target) {
    return target === "product" || target.startsWith("product/");
  }

  function authReturnRoute() {
    try {
      const target = sessionStorage.getItem(AUTH_RETURN_KEY) || "";
      return isProductRoute(target) ? target : "";
    } catch {
      return "";
    }
  }

  function rememberProductReturn() {
    const target = route();
    if (!isProductRoute(target)) return;
    try {
      sessionStorage.setItem(AUTH_RETURN_KEY, target);
    } catch {}
  }

  function clearAuthReturn() {
    try {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
    } catch {}
  }

  function consumeAuthReturn(fallback = "feed") {
    const target = authReturnRoute();
    clearAuthReturn();
    return target || fallback;
  }

  function authRedirectHash(fallback = "feed") {
    return `#/${authReturnRoute() || fallback}`;
  }

  function config() {
    const provided = window.LC_APP_CONFIG || window.__LC_APP_CONFIG__ || {};
    const publishableKey = provided.SUPABASE_PUBLISHABLE_KEY || provided.supabasePublishableKey;
    return {
      url: provided.SUPABASE_URL || provided.supabaseUrl || window.LC_APP_SUPABASE_URL || localStorage.getItem("lc-app:supabase-url") || LIVE_SUPABASE_URL,
      anon: publishableKey || provided.SUPABASE_ANON_KEY || provided.supabaseAnonKey || window.LC_APP_SUPABASE_ANON_KEY || localStorage.getItem("lc-app:supabase-anon-key") || ""
    };
  }

  function markReady() {
    document.documentElement.classList.remove("lc-auth-booting");
    document.documentElement.classList.add("lc-auth-ready");
  }

  function authShell() {
    let shell = q("#lcAuthShell");
    if (!shell) {
      shell = document.createElement("section");
      shell.id = "lcAuthShell";
      shell.className = "lc-auth-shell";
      shell.setAttribute("aria-label", "LC App account access");
      q("#screen")?.appendChild(shell);
    }
    markReady();
    return shell;
  }

  function setLocked(locked) {
    const shell = authShell();
    shell.hidden = !locked;
    q("#screen")?.classList.toggle("auth-mode", locked);
  }

  function showMessage(text, tone = "") {
    const node = q("[data-auth-message]");
    if (!node) return;
    node.className = `lc-auth-alert ${tone}`.trim();
    node.textContent = text || "";
    node.hidden = !text;
  }

  function setFieldHelp(name, text, tone = "") {
    const node = q(`[data-field-help="${name}"]`);
    if (!node) return;
    node.className = `lc-auth-help ${tone}`.trim();
    node.textContent = text || "";
  }

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
  }

  function card(title, copy, body, links = "", progress = "") {
    authShell().innerHTML = `
      <div class="lc-auth-card">
        <div class="lc-auth-logo"><b>LC</b><div><strong>LC App</strong><span>Social live casino layer</span></div></div>
        ${progress}
        <h2 class="lc-auth-title">${safe(title)}</h2>
        <p class="lc-auth-copy">${safe(copy)}</p>
        <div class="lc-auth-alert" data-auth-message hidden></div>
        ${body}
        ${links ? `<div class="lc-auth-links">${links}</div>` : ""}
      </div>
    `;
  }

  function link(label, target) {
    return `<button class="lc-auth-link" type="button" data-auth-route="${safe(target)}">${safe(label)}</button>`;
  }

  function field(label, name, type = "text", value = "", attrs = "") {
    return `<label class="lc-auth-field"><span>${safe(label)}</span><input name="${safe(name)}" type="${safe(type)}" value="${safe(value)}" ${attrs}><small class="lc-auth-help" data-field-help="${safe(name)}"></small></label>`;
  }

  function textarea(label, name, value = "", attrs = "") {
    return `<label class="lc-auth-field"><span>${safe(label)}</span><textarea name="${safe(name)}" ${attrs}>${safe(value)}</textarea><small class="lc-auth-help" data-field-help="${safe(name)}"></small></label>`;
  }

  function progress(step) {
    return `<div class="lc-auth-progress" aria-label="Onboarding progress"><span class="${step === 1 ? "active" : ""}"></span><span class="${step === 2 ? "active" : ""}"></span></div>`;
  }

  function pendingEmail() {
    return localStorage.getItem(AUTH_EMAIL_KEY) || "";
  }

  function setPendingEmail(email) {
    if (email) localStorage.setItem(AUTH_EMAIL_KEY, email);
  }

  function renderLoading() {
    setLocked(true);
    card("Loading account", "Restoring your LC App session.", `<div class="lc-auth-alert">Checking session...</div>`);
  }

  function renderConfigMissing() {
    setLocked(true);
    card(
      "Supabase is not configured",
      "Add the public publishable key through runtime configuration before using real accounts.",
      `<div class="lc-auth-alert error">Required runtime config: SUPABASE_PUBLISHABLE_KEY. Project URL is set to ${LIVE_SUPABASE_URL}. Do not use service_role keys in the browser.</div>`,
      `${link("Privacy", "privacy")}${link("Terms", "terms")}`
    );
  }

  function renderLogin(message = "") {
    setLocked(true);
    card("Login", "Access your LC App profile and preview live-room feed.", `
      <form class="lc-auth-form" data-auth-form="login" novalidate>
        ${field("Email", "email", "email", "", "autocomplete=\"email\" required")}
        ${field("Password", "password", "password", "", "autocomplete=\"current-password\" required")}
        <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit">Login</button></div>
      </form>
    `, `${link("Create account", "signup")}${link("Forgot password", "forgot-password")}${link("Privacy", "privacy")}${link("Terms", "terms")}`);
    if (message) showMessage(message, "ok");
  }

  function renderSignup() {
    setLocked(true);
    card("Create account", "Sign up with email and password. Compliance confirmation happens after email verification.", `
      <form class="lc-auth-form" data-auth-form="signup" novalidate>
        ${field("Email", "email", "email", "", "autocomplete=\"email\" required")}
        ${field("Password", "password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
        ${field("Confirm password", "confirm_password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
        <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit">Create account</button></div>
      </form>
    `, `${link("Login", "login")}${link("Privacy", "privacy")}${link("Terms", "terms")}`);
  }

  function renderVerification(status = "waiting", message = "") {
    setLocked(true);
    const email = pendingEmail();
    const cooldown = Math.max(0, Math.ceil((Number(localStorage.getItem(VERIFY_COOLDOWN_KEY) || 0) - Date.now()) / 1000));
    const expired = status === "expired";
    card("Verify your email", email ? `Check your inbox. We've sent a verification link to ${email}.` : "Check your inbox for the verification link.", `
      <div class="lc-auth-alert ${expired ? "error" : ""}" data-auth-message>${safe(message || (expired ? "This verification link has expired. Request a new one." : "Email verification is required before entering LC App."))}</div>
      <div class="lc-auth-actions">
        <button class="lc-auth-btn" type="button" data-auth-resend ${cooldown ? "disabled" : ""}>${cooldown ? `Resend in ${cooldown}s` : "Resend verification"}</button>
        <button class="lc-auth-btn secondary" type="button" data-auth-route="login">Back to login</button>
      </div>
    `, `${link("Privacy", "privacy")}${link("Terms", "terms")}`);
    if (cooldown) window.setTimeout(() => route() === "verification" && renderVerification(status, message), 1000);
  }

  function renderForgot() {
    setLocked(true);
    card("Recover password", "Enter your email and we will send reset instructions if an account exists.", `
      <form class="lc-auth-form" data-auth-form="forgot" novalidate>
        ${field("Email", "email", "email", "", "autocomplete=\"email\" required")}
        <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit">Send reset link</button></div>
      </form>
    `, `${link("Back to login", "login")}`);
  }

  function renderReset(status = "ready") {
    setLocked(true);
    const invalid = status === "expired" || status === "invalid";
    card("Reset password", "Choose a new password for your LC App account.", `
      <div class="lc-auth-alert ${invalid ? "error" : ""}" data-auth-message ${invalid ? "" : "hidden"}>${invalid ? "This reset link has expired or is invalid. Request a new one." : ""}</div>
      <form class="lc-auth-form" data-auth-form="reset" novalidate>
        ${field("New password", "password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
        ${field("Confirm password", "confirm_password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
        <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit" ${invalid ? "disabled" : ""}>Update password</button></div>
      </form>
    `, `${link("Back to login", "login")}${link("Forgot password", "forgot-password")}`);
  }

  function renderLegal(target) {
    setLocked(true);
    const terms = target === "terms";
    card(
      terms ? "Terms" : "Privacy",
      terms ? "LC App is a social discovery layer around licensed third-party live-casino operators." : "LC App stores account and public profile data for access and personalization.",
      `<div class="lc-auth-alert">LC App does not manage player balances, accept wagers, process transactions, or operate gambling. Wallet, KYC/AML, responsible gaming, bet acceptance and settlement remain with external operators.</div>`,
      `${link(STATE.session ? "Back to app" : "Back to login", STATE.session ? "feed" : "login")}`
    );
  }

  function renderUnavailable() {
    setLocked(true);
    card("Account unavailable", "This account cannot access LC App right now.", `
      <div class="lc-auth-alert error">Account status: ${safe(STATE.profile?.account_status || "unavailable")}.</div>
      <div class="lc-auth-actions"><button class="lc-auth-btn secondary" type="button" data-auth-logout>Logout</button></div>
    `);
  }

  function isProfileComplete(profile) {
    return Boolean(profile?.onboarding_completed && profile?.display_name && profile?.username && profile?.age_confirmed && profile?.terms_accepted_at && profile?.privacy_accepted_at);
  }

  function languagesValue(profile) {
    return Array.isArray(profile?.languages) ? profile.languages.join(", ") : "";
  }

  function renderOnboardingStep1() {
    const p = STATE.profile || {};
    setLocked(true);
    card("Set up your profile", "Choose how you appear to the community.", `
      <form class="lc-auth-form" data-auth-form="onboarding-required" novalidate>
        ${field("Display name", "display_name", "text", p.display_name || "", "maxlength=\"80\" required")}
        ${field("Username", "username", "text", p.username || "", "maxlength=\"32\" pattern=\"[A-Za-z0-9_]{3,32}\" required data-username-input")}
        <label class="lc-auth-check"><input name="age" type="checkbox" ${p.age_confirmed ? "checked" : ""} required><span>I confirm I am 18+.</span></label>
        <label class="lc-auth-check"><input name="terms" type="checkbox" ${p.terms_accepted_at ? "checked" : ""} required><span>I accept Terms.</span></label>
        <label class="lc-auth-check"><input name="privacy" type="checkbox" ${p.privacy_accepted_at ? "checked" : ""} required><span>I accept Privacy.</span></label>
        <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit">Continue</button></div>
      </form>
    `, `${link("Terms", "terms")}${link("Privacy", "privacy")}${link("Logout", "logout")}`, progress(1));
    bindUsernameInput();
  }

  function renderOnboardingStep2() {
    const p = STATE.profile || {};
    setLocked(true);
    card("Add a personal touch", "You can always update these details later.", `
      <form class="lc-auth-form" data-auth-form="onboarding-optional" novalidate>
        <div class="lc-profile-avatar">
          <img class="lc-avatar-preview" src="${safe(profileAvatar(p))}" alt="Profile avatar preview">
          ${field("Avatar", "avatar", "file", "", "accept=\"image/png,image/jpeg,image/webp\" data-avatar-input")}
        </div>
        ${textarea("Bio", "bio", p.bio || "", "maxlength=\"280\"")}
        <div class="lc-auth-grid">
          ${field("Country", "country", "text", p.country || "", "maxlength=\"80\"")}
          ${field("Languages", "languages", "text", languagesValue(p), "placeholder=\"English, Armenian\"")}
        </div>
        <div class="lc-auth-actions">
          <button class="lc-auth-btn" type="submit">Save and enter</button>
          <button class="lc-auth-btn secondary" type="button" data-auth-skip-optional>Skip</button>
        </div>
      </form>
    `, `${link("Logout", "logout")}`, progress(2));
    bindAvatarPreview();
  }

  function profileAvatar(profile) {
    return profile?.avatar_url || "app-icon-512.png";
  }

  function scheduleProfileRender() {
    window.clearTimeout(STATE.profileRenderTimer);
    window.setTimeout(renderProfilePage, 80);
    window.setTimeout(renderProfilePage, 360);
    STATE.profileRenderTimer = window.setTimeout(renderProfilePage, 1000);
  }

  function installAccountObserver() {
    const accountPage = q("#accountPage");
    if (!accountPage || STATE.accountObserver) return;
    STATE.accountObserver = new MutationObserver(() => {
      if (!STATE.session || !STATE.profile) return;
      const accountActive = accountPage.getAttribute("aria-hidden") === "false" || q("[data-nav='account'].active");
      if (accountActive && !q("[data-lc-live-profile]", accountPage)) {
        window.clearTimeout(STATE.profileRenderTimer);
        STATE.profileRenderTimer = window.setTimeout(renderProfilePage, 40);
      }
    });
    STATE.accountObserver.observe(accountPage, { childList: true, attributes: true, attributeFilter: ["aria-hidden"] });
  }

  function renderProfilePage() {
    if (!STATE.session || !STATE.profile) return;
    const p = STATE.profile;
    const email = STATE.session.user.email || "";
    const icon = window.icon || (() => "");
    if (q("#appTop")) q("#appTop").innerHTML = `
      <div class="account-topbar">
        <div class="account-top-copy">
          <span class="account-avatar"><img src="${safe(profileAvatar(p))}" alt="Player profile" /></span>
          <div class="account-top-meta">
            <span>Player account</span>
            <strong>${safe(p.display_name || p.username || "LC App user")}</strong>
            <p>${safe(email)}</p>
          </div>
        </div>
        <div class="account-top-actions"><button class="icon-btn" type="button" data-auth-logout aria-label="Logout">${icon("close") || "×"}</button></div>
      </div>
    `;
    if (!q("#accountPage")) return;
    q("#accountPage").innerHTML = `
      <div class="account-page-stack" data-lc-live-profile="true">
        <div class="account-hub">
          <div class="account-hub-top">
            <span class="pill teal">Profile</span>
            <span class="account-hub-tag">${icon("shield")}${safe(p.account_status || "active")}</span>
          </div>
          <div class="account-hub-balance">
            <strong>${safe(p.display_name || "Profile")}</strong>
            <span>${safe(p.bio || "Your LC App community profile.")}</span>
          </div>
          <div class="account-hub-strip">
            <span class="account-hub-tag">@${safe(p.username || "")}</span>
            <span class="account-hub-tag">${safe(p.country || "Country not set")}</span>
            <span class="account-hub-tag">${safe(languagesValue(p) || "Languages not set")}</span>
          </div>
        </div>
        <div class="account-page-section">
          <div class="sheet-section-head"><strong>Profile settings</strong><span>real data</span></div>
          <form class="lc-auth-form" data-auth-form="profile" novalidate>
            <div class="lc-profile-avatar">
              <img class="lc-avatar-preview" src="${safe(profileAvatar(p))}" alt="Profile avatar preview">
              ${field("Replace avatar", "avatar", "file", "", "accept=\"image/png,image/jpeg,image/webp\" data-avatar-input")}
            </div>
            ${field("Display name", "display_name", "text", p.display_name || "", "maxlength=\"80\" required")}
            ${textarea("Bio", "bio", p.bio || "", "maxlength=\"280\"")}
            <div class="lc-auth-grid">
              ${field("Country", "country", "text", p.country || "", "maxlength=\"80\"")}
              ${field("Languages", "languages", "text", languagesValue(p), "placeholder=\"English, Armenian\"")}
            </div>
            <div class="lc-auth-actions"><button class="lc-auth-btn" type="submit">Save profile</button></div>
          </form>
        </div>
        <div class="account-page-section">
          <div class="sheet-section-head"><strong>Username</strong><span>deliberate change</span></div>
          <form class="lc-auth-form" data-auth-form="username" novalidate>
            ${field("Username", "username", "text", p.username || "", "maxlength=\"32\" pattern=\"[A-Za-z0-9_]{3,32}\" required data-username-input")}
            <div class="lc-auth-actions"><button class="lc-auth-btn secondary" type="submit">Update username</button></div>
          </form>
        </div>
        <div class="account-page-section">
          <div class="sheet-section-head"><strong>Product experience</strong><span>real Supabase</span></div>
          <p class="lc-profile-note">Choose player, creator/dealer or industry mode without changing your security role.</p>
          <div class="lc-auth-actions"><button class="lc-auth-btn" type="button" data-auth-route="product">Open product experience</button></div>
        </div>
        <div class="account-page-section">
          <div class="sheet-section-head"><strong>Security</strong><span>auth</span></div>
          <form class="lc-auth-form" data-auth-form="change-password" novalidate>
            ${field("New password", "password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
            ${field("Confirm password", "confirm_password", "password", "", "autocomplete=\"new-password\" minlength=\"8\" required")}
            <div class="lc-auth-actions">
              <button class="lc-auth-btn secondary" type="submit">Change password</button>
              <button class="lc-auth-btn secondary" type="button" data-auth-logout>Logout</button>
            </div>
          </form>
        </div>
        <div class="account-page-section">
          <div class="sheet-section-head"><strong>Account deletion</strong><span>${STATE.deletionRequest ? "request pending" : "privacy control"}</span></div>
          <div class="lc-auth-alert" data-auth-message hidden></div>
          ${accountDeletionControls()}
        </div>
      </div>
    `;
    bindUsernameInput();
    bindAvatarPreview();
  }

  function accountDeletionControls() {
    if (!STATE.deletionRequestsAvailable) return `<p class="lc-profile-note">Account deletion requests are not available until the privacy backend is enabled.</p><button class="lc-auth-btn danger" type="button" disabled>Request unavailable</button>`;
    if (STATE.deletionRequest) {
      const requested = new Date(STATE.deletionRequest.requested_at).toLocaleString();
      return `<div class="lc-auth-alert">Deletion requested ${safe(requested)}. Your account remains active until an authorised administrator completes the request.</div><p class="lc-profile-note">LC does not silently delete or alter your account from this browser. You can cancel while the request is pending.</p><button class="lc-auth-btn secondary" type="button" data-auth-cancel-deletion>Cancel deletion request</button>`;
    }
    if (STATE.deletionConfirm) return `<form class="lc-auth-form" data-auth-form="deletion-request" novalidate><div class="lc-auth-alert">This submits a private deletion request for authorised review. It does not immediately delete your account or bypass identity, legal-retention or dispute checks.</div>${field("Type DELETE to confirm", "deletion_confirmation", "text", "", "autocomplete=\"off\" required")}<div class="lc-auth-actions"><button class="lc-auth-btn danger" type="submit">Submit deletion request</button><button class="lc-auth-btn secondary" type="button" data-auth-cancel-deletion-confirmation>Keep account</button></div></form>`;
    return `<p class="lc-profile-note">Submit a private request for authorised account deletion. The request is reversible until processing begins.</p><button class="lc-auth-btn danger" type="button" data-auth-request-deletion>Request account deletion</button>`;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalizeUsername(value) {
    return String(value || "").trim().replace(/^@/, "");
  }

  function validUsername(username) {
    return /^[A-Za-z0-9_]{3,32}$/.test(username);
  }

  function parseLanguages(value) {
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  }

  function authErrorCode(error) {
    const text = `${error?.code || ""} ${error?.message || ""} ${error?.status || ""}`.toLowerCase();
    if (/failed to fetch|network|offline|load failed|fetcherror/.test(text)) return "NETWORK_ERROR";
    if (/email not confirmed|not confirmed/.test(text)) return "AUTH_EMAIL_NOT_VERIFIED";
    if (/invalid login|invalid credentials|invalid email or password/.test(text)) return "AUTH_INVALID_CREDENTIALS";
    if (/weak password|password/.test(text) && /weak|short|least|characters/.test(text)) return "AUTH_WEAK_PASSWORD";
    if (/rate|too many|over_email_send_rate_limit/.test(text)) return "RATE_LIMITED";
    if (/expired|otp_expired/.test(text)) return "AUTH_LINK_EXPIRED";
    if (/duplicate|unique|23505|already/.test(text) && /username/.test(text)) return "USERNAME_TAKEN";
    if (/jwt|session|refresh_token|invalid_grant/.test(text)) return "AUTH_SESSION_EXPIRED";
    return "UNKNOWN_ERROR";
  }

  function safeAuthMessage(code, email = "") {
    const messages = {
      AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
      AUTH_EMAIL_NOT_VERIFIED: "Email verification is required before you can log in.",
      AUTH_EMAIL_TAKEN: "Check your inbox. We've sent a verification link to " + email + ".",
      AUTH_WEAK_PASSWORD: "Password must be at least 8 characters.",
      AUTH_SESSION_EXPIRED: "Your session has expired. Please log in to continue.",
      AUTH_LINK_EXPIRED: "This verification link has expired. Request a new one.",
      USERNAME_TAKEN: "This username is already taken. Try another.",
      VALIDATION_ERROR: "Please check the highlighted fields.",
      NETWORK_ERROR: "Connection problem. Check your internet and try again.",
      RATE_LIMITED: "Too many attempts. Please wait and try again.",
      UNKNOWN_ERROR: "Something went wrong. Please try again."
    };
    return messages[code] || messages.UNKNOWN_ERROR;
  }

  function validatePasswords(formData) {
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm_password") || "");
    if (password.length < 8) return "AUTH_WEAK_PASSWORD";
    if (confirm !== password) return "PASSWORD_MISMATCH";
    return "";
  }

  async function ensureProfile() {
    if (!STATE.client || !STATE.session?.user) return null;
    const user = STATE.session.user;
    const { data, error } = await STATE.client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw error;
    STATE.profile = data;
    await loadDeletionRequest();
    if (data) {
      STATE.client.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
    }
    return data;
  }

  async function loadDeletionRequest() {
    if (!STATE.client || !STATE.session?.user) return;
    const { data, error } = await STATE.client.from("account_deletion_requests")
      .select("id,status,requested_at,cancelled_at")
      .eq("user_id", STATE.session.user.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      const unavailable = ["42P01", "PGRST205"].includes(error.code) || /account_deletion_requests/i.test(error.message || "");
      if (!unavailable) throw error;
      STATE.deletionRequestsAvailable = false;
      STATE.deletionRequest = null;
      return;
    }
    STATE.deletionRequestsAvailable = true;
    STATE.deletionRequest = data || null;
  }

  async function cancelDeletionRequest() {
    if (!STATE.deletionRequest) return;
    const { data, error } = await STATE.client.from("account_deletion_requests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", STATE.deletionRequest.id)
      .eq("user_id", STATE.session.user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      await loadDeletionRequest();
      throw new Error("REQUEST_NOT_PENDING");
    }
    STATE.deletionRequest = null;
  }

  async function checkUsername(username) {
    if (!STATE.client || !validUsername(username)) return "invalid";
    const seq = ++STATE.usernameCheckSeq;
    const { data, error } = await STATE.client.from("profiles").select("id").ilike("username", username).limit(1);
    if (seq !== STATE.usernameCheckSeq) return "stale";
    if (error) return "unknown";
    const takenByOther = (data || []).some((row) => row.id !== STATE.session?.user?.id);
    return takenByOther ? "taken" : "available";
  }

  function bindUsernameInput() {
    q("[data-username-input]")?.addEventListener("input", (event) => {
      const username = normalizeUsername(event.target.value);
      clearTimeout(STATE.usernameTimer);
      if (!validUsername(username)) {
        setFieldHelp("username", "Use 3-32 letters, numbers or underscore.", "error");
        return;
      }
      setFieldHelp("username", "Checking username...", "checking");
      STATE.usernameTimer = window.setTimeout(async () => {
        const status = await checkUsername(username);
        if (status === "available") setFieldHelp("username", "Username is likely available.", "ok");
        if (status === "taken") setFieldHelp("username", safeAuthMessage("USERNAME_TAKEN"), "error");
        if (status === "invalid") setFieldHelp("username", "Use 3-32 letters, numbers or underscore.", "error");
        if (status === "unknown") setFieldHelp("username", "Availability will be checked on save.", "");
      }, USERNAME_DEBOUNCE_MS);
    }, { once: false });
  }

  function bindAvatarPreview() {
    q("[data-avatar-input]")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      const preview = q(".lc-avatar-preview");
      if (!file || !preview) return;
      if (!ALLOWED_AVATAR_TYPES.has(file.type) || file.size > MAX_AVATAR_BYTES) {
        setFieldHelp("avatar", "Use PNG, JPEG or WEBP up to 5MB.", "error");
        event.target.value = "";
        return;
      }
      preview.src = URL.createObjectURL(file);
    });
  }

  async function uploadAvatar(file) {
    if (!file || !STATE.session?.user || (!file.name && file.size === 0)) return STATE.profile?.avatar_url || null;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) throw new Error("VALIDATION_AVATAR_TYPE");
    if (file.size > MAX_AVATAR_BYTES) throw new Error("VALIDATION_AVATAR_SIZE");
    const ext = ALLOWED_AVATAR_TYPES.get(file.type);
    const path = `${STATE.session.user.id}/avatar.${ext}`;
    const { error } = await STATE.client.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });
    if (error) throw error;
    const { data } = STATE.client.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  async function updateProfile(payload) {
    const { data, error } = await STATE.client.from("profiles").update(payload).eq("id", STATE.session.user.id).select("*").single();
    if (error) throw error;
    STATE.profile = data;
    return data;
  }

  async function saveRequiredOnboarding(formData) {
    const username = normalizeUsername(formData.get("username"));
    const display = String(formData.get("display_name") || "").trim();
    if (!display || !validUsername(username) || !formData.get("age") || !formData.get("terms") || !formData.get("privacy")) {
      throw new Error("VALIDATION_ERROR");
    }
    const now = new Date().toISOString();
    return updateProfile({
      username,
      display_name: display,
      age_confirmed: true,
      terms_accepted_at: now,
      privacy_accepted_at: now
    });
  }

  async function saveOptionalOnboarding(form) {
    const formData = new FormData(form);
    const avatarUrl = await uploadAvatar(formData.get("avatar"));
    return updateProfile({
      avatar_url: avatarUrl,
      bio: String(formData.get("bio") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      languages: parseLanguages(formData.get("languages")),
      onboarding_completed: true
    });
  }

  async function saveProfile(form) {
    const formData = new FormData(form);
    const display = String(formData.get("display_name") || "").trim();
    if (!display) throw new Error("VALIDATION_ERROR");
    const avatarUrl = await uploadAvatar(formData.get("avatar"));
    return updateProfile({
      display_name: display,
      avatar_url: avatarUrl,
      bio: String(formData.get("bio") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      languages: parseLanguages(formData.get("languages"))
    });
  }

  async function saveUsername(formData) {
    const username = normalizeUsername(formData.get("username"));
    if (!validUsername(username)) throw new Error("VALIDATION_ERROR");
    return updateProfile({ username });
  }

  async function submit(event) {
    const form = event.target.closest("[data-auth-form]");
    if (!form || STATE.busy) return;
    event.preventDefault();
    STATE.busy = true;
    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.dataset.originalText = button.textContent;
      button.textContent = "Please wait...";
      button.disabled = true;
    }
    try {
      const formData = new FormData(form);
      const type = form.dataset.authForm;
      if (type === "signup") {
        const email = String(formData.get("email") || "").trim();
        if (!validateEmail(email)) throw new Error("VALIDATION_EMAIL");
        const passwordError = validatePasswords(formData);
        if (passwordError === "PASSWORD_MISMATCH") throw new Error("PASSWORD_MISMATCH");
        if (passwordError) throw new Error(passwordError);
        setPendingEmail(email);
        const redirectTo = new URL(window.location.href);
        redirectTo.hash = authRedirectHash("feed");
        const { error } = await STATE.client.auth.signUp({
          email,
          password: String(formData.get("password") || ""),
          options: { emailRedirectTo: redirectTo.toString() }
        });
        if (error) throw error;
        setRoute("verification");
        return;
      }
      if (type === "login") {
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");
        if (!validateEmail(email) || !password) throw new Error("VALIDATION_LOGIN");
        const returnTarget = authReturnRoute();
        setPendingEmail(email);
        const { error } = await STATE.client.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          const code = authErrorCode(error);
          if (code === "AUTH_EMAIL_NOT_VERIFIED") {
            setRoute("verification");
            return;
          }
          throw new Error(code);
        }
        await refreshSession();
        const nextRoute = returnTarget || authReturnRoute() || "feed";
        if (isProfileComplete(STATE.profile)) clearAuthReturn();
        setRoute(nextRoute);
        return;
      }
      if (type === "forgot") {
        const email = String(formData.get("email") || "").trim();
        if (!validateEmail(email)) throw new Error("VALIDATION_EMAIL");
        setPendingEmail(email);
        const redirectTo = new URL(window.location.href);
        redirectTo.hash = "#/reset-password";
        const { error } = await STATE.client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo.toString() });
        if (error && authErrorCode(error) === "RATE_LIMITED") throw error;
        showMessage(`If an account exists for ${email}, password reset instructions have been sent.`, "ok");
        return;
      }
      if (type === "reset" || type === "change-password") {
        const passwordError = validatePasswords(formData);
        if (passwordError === "PASSWORD_MISMATCH") throw new Error("PASSWORD_MISMATCH");
        if (passwordError) throw new Error(passwordError);
        const { error } = await STATE.client.auth.updateUser({ password: String(formData.get("password") || "") });
        if (error) throw error;
        if (type === "reset") {
          await STATE.client.auth.signOut();
          STATE.session = null;
          STATE.profile = null;
          setRoute("login");
          renderLogin("Password updated successfully.");
        } else {
          showMessage("Password updated successfully.", "ok");
        }
        return;
      }
      if (type === "onboarding-required") {
        await saveRequiredOnboarding(formData);
        setRoute("onboarding-optional");
        return;
      }
      if (type === "onboarding-optional") {
        await saveOptionalOnboarding(form);
        setRoute(consumeAuthReturn("feed"));
        return;
      }
      if (type === "profile") {
        await saveProfile(form);
        renderProfilePage();
        toast("Profile saved");
        return;
      }
      if (type === "username") {
        await saveUsername(formData);
        renderProfilePage();
        toast("Username updated");
        return;
      }
      if (type === "deletion-request") {
        if (String(formData.get("deletion_confirmation") || "").trim() !== "DELETE") throw new Error("DELETION_CONFIRMATION");
        const { data, error } = await STATE.client.from("account_deletion_requests").insert({ user_id: STATE.session.user.id }).select("id,status,requested_at,cancelled_at").single();
        if (error) throw error;
        STATE.deletionRequest = data;
        STATE.deletionConfirm = false;
        renderProfilePage();
        toast("Deletion request submitted");
        return;
      }
    } catch (error) {
      const raw = error?.message || "";
      let code = raw.startsWith("AUTH_") || raw === "USERNAME_TAKEN" || raw === "RATE_LIMITED" ? raw : authErrorCode(error);
      if (raw === "VALIDATION_EMAIL") code = "VALIDATION_ERROR";
      if (raw === "VALIDATION_LOGIN") code = "AUTH_INVALID_CREDENTIALS";
      if (raw === "DELETION_CONFIRMATION") {
        showMessage("Type DELETE exactly to submit the request.", "error");
      } else if (raw === "PASSWORD_MISMATCH") {
        showMessage("Passwords do not match.", "error");
      } else if (raw === "VALIDATION_AVATAR_TYPE" || raw === "VALIDATION_AVATAR_SIZE") {
        showMessage("Use PNG, JPEG or WEBP up to 5MB.", "error");
      } else {
        showMessage(safeAuthMessage(code), "error");
      }
      if (code === "USERNAME_TAKEN") setFieldHelp("username", safeAuthMessage("USERNAME_TAKEN"), "error");
    } finally {
      STATE.busy = false;
      if (button) {
        button.textContent = button.dataset.originalText || "Submit";
        button.disabled = false;
      }
    }
  }

  async function resendVerification() {
    if (STATE.busy) return;
    const email = pendingEmail();
    if (!email) {
      showMessage("Enter your email on signup or login first.", "error");
      return;
    }
    const cooldownUntil = Number(localStorage.getItem(VERIFY_COOLDOWN_KEY) || 0);
    if (cooldownUntil > Date.now()) return;
    localStorage.setItem(VERIFY_COOLDOWN_KEY, String(Date.now() + 60000));
    STATE.busy = true;
    try {
      const redirectTo = new URL(window.location.href);
      redirectTo.hash = authRedirectHash("feed");
      const { error } = await STATE.client.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo.toString() } });
      if (error) throw error;
      renderVerification("waiting", `Check your inbox. We've sent a verification link to ${email}.`);
    } catch (error) {
      const code = authErrorCode(error);
      renderVerification("waiting", code === "RATE_LIMITED" ? safeAuthMessage("RATE_LIMITED") : safeAuthMessage(code));
    } finally {
      STATE.busy = false;
    }
  }

  async function logout(message = "") {
    if (message) rememberProductReturn();
    else clearAuthReturn();
    if (STATE.client) await STATE.client.auth.signOut();
    STATE.session = null;
    STATE.profile = null;
    STATE.deletionRequest = null;
    STATE.deletionConfirm = false;
    if (window.LCAppSocial?.clear) window.LCAppSocial.clear();
    if (window.LCAppProduct?.clear) window.LCAppProduct.clear();
    setRoute("login");
    if (message) window.setTimeout(() => showMessage(message, "error"), 0);
  }

  async function refreshSession() {
    const { data, error } = await STATE.client.auth.getSession();
    if (error) throw error;
    STATE.session = data.session || null;
    if (STATE.session) await ensureProfile();
  }

  function shouldShowRequiredOnboarding() {
    const p = STATE.profile;
    return !(p?.display_name && p?.username && p?.age_confirmed && p?.terms_accepted_at && p?.privacy_accepted_at);
  }

  function renderAuthenticated(target) {
    if (!STATE.profile) {
      setLocked(true);
      card("Profile unavailable", "Your account was created, but the profile row is not available yet.", `<div class="lc-auth-alert error">Try refreshing in a moment.</div><div class="lc-auth-actions"><button class="lc-auth-btn secondary" type="button" data-auth-logout>Logout</button></div>`);
      return;
    }
    if (STATE.profile.account_status !== "active") {
      renderUnavailable();
      return;
    }
    if (shouldShowRequiredOnboarding()) {
      renderOnboardingStep1();
      return;
    }
    if (!STATE.profile.onboarding_completed || target === "onboarding-optional") {
      renderOnboardingStep2();
      return;
    }
    if (["login", "signup"].includes(target) && authReturnRoute()) {
      setRoute(consumeAuthReturn("feed"));
      return;
    }
    setLocked(false);
    if (isProductRoute(target) && window.LCAppProduct?.mount) {
      window.LCAppProduct.mount({ client: STATE.client, profile: STATE.profile, target });
      installAccountObserver();
      return;
    }
    if (window.LCAppProduct?.clear) window.LCAppProduct.clear();
    if (window.LCAppSocial?.mount) window.LCAppSocial.mount({ client: STATE.client, profile: STATE.profile });
    markDemoContent();
    installAccountObserver();
    if (target === "profile") {
      if (typeof window.closeSheet === "function") window.closeSheet();
      if (typeof window.setView === "function") window.setView("account");
      window.setTimeout(renderProfilePage, 0);
      return;
    }
    if (target === "community") {
      if (typeof window.openSheet === "function") window.openSheet("saved");
      return;
    }
    if (typeof window.setView === "function") window.setView("home");
  }

  function markDemoContent() {
    const screen = q("#screen");
    if (!screen || q(".lc-preview-pill", screen)) return;
    const pill = document.createElement("span");
    pill.className = "lc-preview-pill";
    pill.textContent = "Real + Preview";
    screen.appendChild(pill);
    const signal = q("#signalStrip");
    if (signal) signal.innerHTML = "<b>Preview</b><span>Demo discovery content only</span>";
  }

  function openControlledSheet(kind) {
    const sheet = q("#sheet");
    const panel = q("#sheetPanel");
    if (!sheet || !panel) return;
    const handoff = kind === "handoff";
    panel.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-title"><span class="pill teal">${handoff ? "External site" : "MVP scope"}</span><h3>${handoff ? "Leaving LC App" : "Feature not available"}</h3></div>
        <button class="close" type="button" data-close aria-label="Close">×</button>
      </div>
      <div class="lc-auth-alert">${handoff ? "Continue with the external operator providing this game. LC App does not handle deposits, wagering, KYC/AML, player funds or settlement." : "Wallets, tipping and payments are not part of this LC App real-user MVP."}</div>
      <div class="sheet-actions">
        ${handoff ? '<button class="btn" type="button" data-auth-external-handoff>Simulate operator step</button>' : ""}
        <button class="btn secondary" type="button" data-close>${handoff ? "Return to LC App" : "Close"}</button>
      </div>
    `;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }

  async function initClient() {
    const cfg = config();
    if (!cfg.anon || !window.supabase?.createClient) {
      renderConfigMissing();
      return false;
    }
    if (!STATE.client) {
      STATE.client = window.supabase.createClient(cfg.url, cfg.anon, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      STATE.client.auth.onAuthStateChange(async (event, session) => {
        STATE.session = session || null;
        STATE.recovery = event === "PASSWORD_RECOVERY";
        if (event === "SIGNED_OUT") {
          STATE.profile = null;
          if (!["login", "signup", "forgot-password", "privacy", "terms"].includes(route())) setRoute("login");
          return;
        }
        if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "USER_UPDATED") {
          try {
            if (STATE.session) await ensureProfile();
            if (STATE.recovery) setRoute("reset-password");
            else renderAuthState();
          } catch (error) {
            await logout(safeAuthMessage("AUTH_SESSION_EXPIRED"));
          }
        }
      });
    }
    return true;
  }

  async function renderAuthState() {
    const target = route();
    if (!STATE.booted) renderLoading();
    if (["privacy", "terms"].includes(target)) {
      markReady();
      renderLegal(target);
      return;
    }
    if (REDIRECT_ERRORS?.code === "AUTH_LINK_EXPIRED" && !STATE.session) {
      await initClient();
      if (target === "reset-password") renderReset("expired");
      else {
        setRoute("verification");
        renderVerification("expired", REDIRECT_ERRORS.message);
      }
      return;
    }
    const ready = await initClient();
    STATE.booted = true;
    if (!ready) return;
    try {
      await refreshSession();
    } catch (error) {
      await logout(safeAuthMessage("AUTH_SESSION_EXPIRED"));
      return;
    }
    if (target === "reset-password") {
      if (!STATE.session) renderReset(REDIRECT_ERRORS ? "expired" : "invalid");
      else renderReset();
      return;
    }
    if (!STATE.session) {
      if (isProductRoute(target) && window.LCAppProduct?.mountDemoEntry) {
        setLocked(false);
        window.LCAppProduct.mountDemoEntry();
        return;
      }
      if (window.LCAppProduct?.clear) window.LCAppProduct.clear();
      if (target === "signup") renderSignup();
      else if (target === "forgot-password") renderForgot();
      else if (target === "verification") renderVerification(REDIRECT_ERRORS ? "expired" : "waiting", REDIRECT_ERRORS?.message || "");
      else renderLogin();
      return;
    }
    renderAuthenticated(target);
  }

  document.addEventListener("click", (event) => {
    const target = eventElement(event);
    if (target?.closest("[data-nav='account']")) {
      scheduleProfileRender();
      window.setTimeout(() => STATE.session && setRoute("profile"), 120);
    }
  }, true);

  document.addEventListener("submit", submit);
  document.addEventListener("pointerdown", async (event) => {
    const target = eventElement(event);
    const submitButton = target?.closest('[data-auth-form] button[type="submit"]');
    if (!submitButton) return;
    const form = submitButton.closest("[data-auth-form]");
    if (!form || STATE.busy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await submit({ target: form, preventDefault() {} });
  }, true);
  document.addEventListener("click", async (event) => {
    const target = eventElement(event);
    const submitButton = target?.closest('[data-auth-form] button[type="submit"]');
    if (submitButton) {
      const form = submitButton.closest("[data-auth-form]");
      if (form && !STATE.busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submit({ target: form, preventDefault() {} });
        return;
      }
    }
    if (target?.closest("[data-auth-external-handoff]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast("Operator step simulated. Return to LC App.");
      return;
    }
    const blockedSheet = target?.closest('[data-sheet="handoff"],[data-sheet="wallet"],[data-sheet="tips"]');
    if (blockedSheet && STATE.session) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openControlledSheet(blockedSheet.dataset.sheet);
      return;
    }
    const routeButton = target?.closest("[data-auth-route]");
    if (routeButton) {
      const routeTarget = routeButton.dataset.authRoute;
      if (routeTarget === "logout") await logout();
      else {
        if (routeTarget === "login" || routeTarget === "signup") rememberProductReturn();
        setRoute(routeTarget);
      }
      return;
    }
    if (target?.closest("[data-auth-logout]")) {
      await logout();
      return;
    }
    if (target?.closest("[data-auth-resend]")) {
      await resendVerification();
      return;
    }
    if (target?.closest("[data-auth-request-deletion]")) {
      STATE.deletionConfirm = true;
      renderProfilePage();
      return;
    }
    if (target?.closest("[data-auth-cancel-deletion-confirmation]")) {
      STATE.deletionConfirm = false;
      renderProfilePage();
      return;
    }
    if (target?.closest("[data-auth-cancel-deletion]")) {
      try {
        await cancelDeletionRequest();
        renderProfilePage();
        toast("Deletion request cancelled");
      } catch (error) {
        showMessage(safeAuthMessage(authErrorCode(error)), "error");
      }
      return;
    }
    if (target?.closest("[data-auth-skip-optional]")) {
      await updateProfile({ onboarding_completed: true });
      setRoute(consumeAuthReturn("feed"));
      return;
    }
  }, true);

  window.addEventListener("hashchange", renderAuthState);
  window.addEventListener("popstate", renderAuthState);
  window.addEventListener("load", renderAuthState);
  renderAuthState();
})();
