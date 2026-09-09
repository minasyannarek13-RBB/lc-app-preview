(() => {
  "use strict";

  const state = {
    client: null,
    profile: null,
    personas: [],
    current: null,
    player: null,
    creator: null,
    industry: null,
    sessions: [],
    creators: [],
    posts: [],
    follows: new Set(),
    creatorLiveAlerts: new Map(),
    reminders: new Set(),
    notifications: [],
    returnSignalsAvailable: true,
    creatorLiveAlertsAvailable: true,
    liveSignalsEnabled: true,
    accessRequests: [],
    pilotBriefs: [],
    pilotBriefsAvailable: true,
    blockedIds: new Set(),
    blockedProfiles: [],
    selectedCreator: null,
    selectedSession: null,
    search: "",
    discoveryFilter: "for_you",
    socialView: "home",
    businessView: "overview",
    demo: false,
    demoPersona: null,
    busy: false,
    ready: false,
    loadError: null,
    retrying: false,
    analyticsAvailable: true,
    eventDedupe: new Set()
  };

  const games = ["Blackjack", "Baccarat", "Roulette", "Poker", "Game Show"];
  const languages = ["English", "French", "Italian", "Spanish", "Armenian"];
  const interests = ["creator network", "player discovery", "retention/engagement", "live discovery", "integration", "attribution"];
  const REGULATED_BOUNDARY = "The licensed operator keeps gameplay, wallet, KYC/AML, responsible gaming, wagering and settlement.";
  const DATA_BOUNDARY = "No deposits, wagering, KYC, AML, wallet or settlement data passes through LC.";
  const EVIDENCE_BOUNDARY = "These are product hypotheses to validate through integration and pilot data.";
  const CLAIM_BOUNDARY = "LC does not claim proven uplift, revenue or retention.";
  const ATTRIBUTION_KEY_PREFIX = "lc-app:attribution-v1";
  const reportReasons = [["spam", "Spam"], ["abuse", "Abuse or harassment"], ["illegal_content", "Illegal content"], ["other", "Other"]];
  const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  const PRODUCT_EVENTS = new Set(["product_open", "creator_impression", "discovery_search", "creator_profile_open", "creator_follow", "live_session_open", "schedule_reminder", "handoff_intent", "handoff_return", "notification_response"]);
  const PILOT_EVENTS = [["creator_impression", "Creator impression"], ["creator_profile_open", "Profile open"], ["creator_follow", "Follow"], ["live_session_open", "Live open"], ["schedule_reminder", "Schedule reminder"], ["handoff_intent", "Handoff intent"], ["handoff_return", "Return visit"], ["notification_response", "Signal response"]];
  const PILOT_HYPOTHESES = [["creator_handoff", "Creator-led discovery produces operator handoff intent"], ["creator_return", "Following a Creator contributes to return activity"], ["live_signal_response", "Live signals prompt measurable player response"], ["creator_source_attribution", "Creator source remains attributable through handoff and return"]];
  const demoStore = { follows: new Set(), creatorLiveAlerts: new Map(), reminders: new Set(), likes: new Set(), comments: [], posts: [], sessions: [], notifications: [], requests: new Set(), pilotBriefs: [] };
  const demoProfiles = [
    { id: "demo-sofia", username: "sofia_live", display_name: "Sofia Laurent", avatar_url: "app_prototype_assets/dealers/v2_polish/sofia_avatar_public.jpg", bio: "Blackjack dealer building a followable Live Casino audience.", country: "Malta", languages: ["English", "French"] },
    { id: "demo-mia", username: "mia_tables", display_name: "Mia Novak", avatar_url: "app_prototype_assets/dealers/dealer_mia_avatar_v1.jpg", bio: "Roulette and baccarat sessions with a calm table style.", country: "Latvia", languages: ["English", "Italian"] },
    { id: "demo-marcus", username: "marcus_live", display_name: "Marcus Reed", avatar_url: "app_prototype_assets/dealers/dealer_marcus_avatar_v1.jpg", bio: "Game-show host focused on community return visits.", country: "UK", languages: ["English", "Spanish"] },
    { id: "demo-alex", username: "alex_baccarat", display_name: "Alex Moreau", avatar_url: "app_prototype_assets/dealers/v2_polish/alex_portrait.jpg", bio: "Baccarat host connecting premium table rhythm with repeat players.", country: "France", languages: ["English", "French"] },
    { id: "demo-lilit", username: "lilit_cards", display_name: "Lilit Aram", avatar_url: "app_prototype_assets/dealers/dealer_lilit_avatar_v1.jpg", bio: "Blackjack and poker creator focused on clear table explainers.", country: "Armenia", languages: ["English", "Armenian"] }
  ];
  const demoCreators = [
    { user_id: "demo-sofia", headline: "Featured Blackjack creator", games: ["Blackjack", "Baccarat"], languages: ["English", "French"], affiliation_name: "Demo Casino", affiliation_verification_status: "unverified", verification_status: "unverified", profile_status: "published" },
    { user_id: "demo-mia", headline: "Roulette table personality", games: ["Roulette", "Baccarat"], languages: ["English", "Italian"], affiliation_name: "Demo Studio", affiliation_verification_status: "unverified", verification_status: "unverified", profile_status: "published" },
    { user_id: "demo-marcus", headline: "Game Show host", games: ["Game Show"], languages: ["English", "Spanish"], affiliation_name: "Demo Provider", affiliation_verification_status: "unverified", verification_status: "unverified", profile_status: "published" },
    { user_id: "demo-alex", headline: "Baccarat creator for premium sessions", games: ["Baccarat"], languages: ["English", "French"], affiliation_name: "Demo Casino", affiliation_verification_status: "unverified", verification_status: "unverified", profile_status: "published" },
    { user_id: "demo-lilit", headline: "Blackjack and poker table explainer", games: ["Blackjack", "Poker"], languages: ["English", "Armenian"], affiliation_name: "Demo Studio", affiliation_verification_status: "unverified", verification_status: "unverified", profile_status: "published" }
  ];
  const demoSessions = [
    { id: "demo-session-sofia", creator_id: "demo-sofia", title: "Evening Blackjack table", game: "Blackjack", operator_name: "Demo Casino", starts_at: new Date(Date.now() + 3600000).toISOString(), status: "live", visibility: "public", provenance: "illustrative_demo_data" },
    { id: "demo-session-mia", creator_id: "demo-mia", title: "Roulette community hour", game: "Roulette", operator_name: "Demo Casino", starts_at: new Date(Date.now() + 7200000).toISOString(), status: "scheduled", visibility: "public", provenance: "illustrative_demo_data" },
    { id: "demo-session-marcus", creator_id: "demo-marcus", title: "Game Show warm-up", game: "Game Show", operator_name: "Demo Provider", starts_at: new Date(Date.now() + 10800000).toISOString(), status: "scheduled", visibility: "public", provenance: "illustrative_demo_data" },
    { id: "demo-session-alex", creator_id: "demo-alex", title: "Premium Baccarat room", game: "Baccarat", operator_name: "Demo Casino", starts_at: new Date(Date.now() + 1800000).toISOString(), status: "live", visibility: "public", provenance: "illustrative_demo_data" },
    { id: "demo-session-lilit", creator_id: "demo-lilit", title: "Blackjack strategy table", game: "Blackjack", operator_name: "Demo Studio", starts_at: new Date(Date.now() + 14400000).toISOString(), status: "scheduled", visibility: "public", provenance: "illustrative_demo_data" }
  ];
  const demoPosts = [
    { id: "demo-post-sofia", author_id: "demo-sofia", body: "Tonight's Blackjack table is live. Follow the session and come back when the seat opens.", created_at: new Date(Date.now() - 900000).toISOString(), status: "active", deleted_at: null },
    { id: "demo-post-mia", author_id: "demo-mia", body: "Roulette players asked for a slower table pace today. I added it to the next session.", created_at: new Date(Date.now() - 3600000).toISOString(), status: "active", deleted_at: null },
    { id: "demo-post-marcus", author_id: "demo-marcus", body: "Game Show preview: new community challenge format for returning players.", created_at: new Date(Date.now() - 5400000).toISOString(), status: "active", deleted_at: null },
    { id: "demo-post-alex", author_id: "demo-alex", body: "Baccarat table is live soon. I will host the slower premium room tonight.", created_at: new Date(Date.now() - 2700000).toISOString(), status: "active", deleted_at: null },
    { id: "demo-post-lilit", author_id: "demo-lilit", body: "Posted a quick Blackjack note for players joining my next session.", created_at: new Date(Date.now() - 7200000).toISOString(), status: "active", deleted_at: null }
  ];
  const visualMedia = {
    "demo-sofia": "app_prototype_assets/dealers/v2_polish/sofia_profile_public.jpg",
    "demo-mia": "app_prototype_assets/dealers/v2_polish/mia_roulette.jpg",
    "demo-marcus": "app_prototype_assets/dealers/v2_polish/marcus_community.jpg",
    "demo-alex": "app_prototype_assets/dealers/v2_polish/alex_baccarat.jpg",
    "demo-lilit": "app_prototype_assets/dealers/v2_polish/sofia_discover_public.jpg",
    fallback: "app_prototype_assets/dealers/v2_polish/sofia_welcome_public.jpg"
  };

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
  const profileName = (profile) => profile?.display_name || profile?.username || "LC App user";
  const avatar = (profile) => profile?.avatar_url || "app-icon-512.png";
  const toast = (text) => {
    if (typeof window.showToast === "function") window.showToast(text);
    const node = q("#toast");
    if (!node) return;
    node.textContent = text;
    node.classList.add("show");
    window.setTimeout(() => node.classList.remove("show"), 1400);
  };
  const err = (error) => {
    const raw = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    if (/not_verified/.test(raw)) return "Creator verification and a published profile are required.";
    if (/publish_first/.test(raw)) return "Publish this session before going live.";
    if (/already_live/.test(raw)) return "End the current Live session before starting another.";
    if (/duplicate|23505/.test(raw)) return "Already saved.";
    if (/permission|policy|rls|42501|not authorized/.test(raw)) return "This action is not available.";
    if (/network|fetch|failed/.test(raw)) return "Connection issue. Try again.";
    return "Something went wrong. Please try again.";
  };
  const validDemoPersonas = new Set(["player", "creator", "operator", "provider", "admin"]);
  const productParts = (target = "") => {
    const clean = (target || window.location.hash.replace(/^#\/?/, "")).split("?")[0].split("&")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[0] === "product" ? parts.slice(1) : [];
  };
  const setProductHash = (parts = []) => {
    const next = `#/product${parts.length ? "/" + parts.map(encodeURIComponent).join("/") : ""}`;
    if (window.location.hash === next) return false;
    window.location.hash = next;
    return true;
  };
  const resetDemoStore = () => {
    demoStore.follows.clear();
    demoStore.creatorLiveAlerts.clear();
    demoStore.reminders.clear();
    demoStore.likes.clear();
    demoStore.comments = [];
    demoStore.posts = [];
    demoStore.sessions = [];
    demoStore.notifications = [];
    demoStore.requests.clear();
    demoStore.pilotBriefs = [];
  };
  const sessionStatusLabel = (session) => {
    if (!session) return "NO SESSION";
    if (session?.status === "live") return "LIVE NOW";
    if (session?.status === "scheduled") return "UPCOMING";
    return "ENDED";
  };
  const localDateTimeInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const sessionLine = (session) => `${sessionStatusLabel(session)} · ${new Date(session.starts_at).toLocaleString()}`;
  const creatorPublication = () => {
    const verification = state.creator?.verification_status || "not_requested";
    const approved = state.demo || verification === "verified";
    const published = state.creator?.profile_status === "published";
    return { verification, approved, published, publicReady: approved && published };
  };
  const creatorReviewCopy = (verification) => ({
    not_requested: ["Draft", "Complete Creator setup to submit your identity for review."],
    submitted: ["Submitted", "Your profile is saved. Sessions stay private while verification is reviewed."],
    under_review: ["Under review", "Your profile and sessions stay private until verification is complete."],
    verified: ["Verified", "You control when your approved profile and sessions become public."],
    rejected: ["Needs attention", "Your drafts remain private. Contact support before submitting new public information."]
  }[verification] || ["Private", "Your Creator workspace is not public."]);
  const findSessionEntry = (sessionId) => {
    for (const entry of state.creators) {
      const session = entry.sessions.find((row) => row.id === sessionId);
      if (session) return { entry, session };
    }
    return null;
  };
  const addDemoNotification = (text, targetId = null) => {
    demoStore.notifications.unshift({ id: `demo-note-${Date.now()}`, text, target_id: targetId, created_at: new Date().toISOString() });
    demoStore.notifications = demoStore.notifications.slice(0, 6);
  };

  function uuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    return [...bytes].map((byte, index) => `${[4, 6, 8, 10].includes(index) ? "-" : ""}${byte.toString(16).padStart(2, "0")}`).join("");
  }

  function cleanAttributionValue(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 80) || null;
  }

  function attributionStorageKey() {
    const accountId = String(state.profile?.id || "").trim();
    return ATTRIBUTION_KEY_PREFIX + ":" + (accountId || "anonymous");
  }

  function attributionContext() {
    const now = Date.now();
    const storageKey = attributionStorageKey();
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) {}
    if (!saved.journey_id || now - Number(saved.updated_at || 0) > ATTRIBUTION_MAX_AGE) saved = { journey_id: uuid() };
    const params = new URLSearchParams(window.location.search);
    saved.campaign_source = cleanAttributionValue(params.get("utm_source") || params.get("source")) || saved.campaign_source || null;
    saved.campaign_name = cleanAttributionValue(params.get("utm_campaign") || params.get("campaign")) || saved.campaign_name || null;
    saved.updated_at = now;
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }

  function updateAttribution(creatorId = null, sessionId = null) {
    const context = attributionContext();
    if (creatorId) context.last_creator_id = creatorId;
    if (sessionId) context.last_session_id = sessionId;
    context.updated_at = Date.now();
    try { localStorage.setItem(attributionStorageKey(), JSON.stringify(context)); } catch (_) {}
    return context;
  }

  async function trackProductEvent(eventName, options = {}) {
    if (state.demo || !state.analyticsAvailable || !state.client || !state.profile || !PRODUCT_EVENTS.has(eventName)) return;
    const dedupeKey = options.dedupeKey || null;
    if (dedupeKey && state.eventDedupe.has(dedupeKey)) return;
    if (dedupeKey) state.eventDedupe.add(dedupeKey);
    const context = updateAttribution(options.creatorId, options.sessionId);
    const creatorId = options.creatorId || context.last_creator_id || null;
    const sessionId = options.sessionId || context.last_session_id || null;
    const confidence = options.confidence || (creatorId && context.campaign_source ? "direct" : creatorId || context.campaign_source ? "contextual" : "unattributed");
    try {
      const { error } = await state.client.from("product_events").insert({
        user_id: state.profile.id,
        event_name: eventName,
        event_key: uuid(),
        journey_id: context.journey_id,
        creator_id: creatorId,
        creator_session_id: sessionId,
        campaign_source: context.campaign_source,
        campaign_name: context.campaign_name,
        attribution_confidence: confidence,
        metadata: options.metadata || {}
      });
      if (!error) return;
      if (/42P01|PGRST205|product_events/i.test(`${error.code || ""} ${error.message || ""}`)) state.analyticsAvailable = false;
      if (dedupeKey) state.eventDedupe.delete(dedupeKey);
    } catch (_) {
      if (dedupeKey) state.eventDedupe.delete(dedupeKey);
    }
  }

  function injectStyles() {
    if (q("#lcProductStyles")) return;
    const style = document.createElement("style");
    style.id = "lcProductStyles";
    style.textContent = `
      #screen.lc-product-mode #homeView,#screen.lc-product-mode #accountPage,#screen.lc-product-mode>.bottom-nav,#screen.lc-product-mode #lcAuthShell{display:none!important}
      #lcProductShell{position:absolute;inset:0;z-index:74;overflow:auto;padding:calc(18px + env(safe-area-inset-top)) max(14px,env(safe-area-inset-left)) calc(72px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-right));background:radial-gradient(circle at 85% 0,rgba(46,230,206,.13),transparent 35%),linear-gradient(180deg,#071012,#050708 72%);color:var(--text);scrollbar-width:none;-webkit-overflow-scrolling:touch}
      #lcProductShell[hidden]{display:none!important}.lc-product-stack{display:grid;gap:12px;width:100%;max-width:980px;margin:0 auto}.lc-product-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 auto 12px;width:100%;max-width:980px}.lc-product-brand{display:flex;align-items:center;gap:10px;min-width:0}.lc-product-logo{flex:0 0 auto;width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,var(--teal),#a7fff4);color:#031412;display:grid;place-items:center;font-weight:950}.lc-product-brand strong{display:block;font-size:14px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lc-product-brand span,.lc-product-muted{display:block;color:var(--muted);font-size:12px;line-height:1.35}
      .lc-product-card{border:1px solid rgba(46,230,206,.15);border-radius:18px;background:rgba(8,13,16,.84);box-shadow:0 20px 52px rgba(0,0,0,.28);padding:14px;overflow:hidden}.lc-product-hero{padding:18px;background:linear-gradient(145deg,rgba(46,230,206,.14),rgba(255,255,255,.04));border-color:rgba(46,230,206,.32)}
      .lc-product-card h1,.lc-product-card h2,.lc-product-card h3{margin:0 0 8px;letter-spacing:0;text-wrap:balance}.lc-product-card h1{font-size:clamp(26px,7vw,36px);line-height:1.05}.lc-product-card h2{font-size:clamp(18px,4.5vw,22px);line-height:1.15}.lc-product-card h3{font-size:15px;line-height:1.2}.lc-product-card p{margin:0;color:var(--soft);font-size:14px;line-height:1.45;overflow-wrap:anywhere}.lc-product-label{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(46,230,206,.28);border-radius:999px;padding:6px 10px;color:#a7fff4;background:rgba(46,230,206,.1);font-size:10px;line-height:1;font-weight:900;text-transform:uppercase;margin-bottom:10px}.lc-product-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:6px}.lc-product-section-head span{color:var(--muted);font-size:11px;line-height:1.3}.lc-product-flow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.lc-product-flow span{min-height:44px;display:grid;place-items:center;border:1px solid rgba(46,230,206,.14);border-radius:13px;background:rgba(255,255,255,.045);color:var(--soft);font-size:10px;line-height:1.1;font-weight:900;text-align:center;text-transform:uppercase;padding:6px}
      .lc-product-grid{display:grid;gap:10px}.lc-product-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.lc-product-choice{min-height:98px;text-align:left;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.05);color:var(--text);padding:14px;cursor:pointer}.lc-product-choice b{display:block;font-size:15px;line-height:1.2;margin-bottom:7px}.lc-product-choice span{color:var(--muted);font-size:12px;line-height:1.35}.lc-product-choice.active{border-color:rgba(46,230,206,.58);background:rgba(46,230,206,.13)}
      .lc-product-form{display:grid;gap:10px}.lc-product-input,.lc-product-select,.lc-product-textarea{width:100%;min-height:46px;border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(255,255,255,.06);color:var(--text);padding:12px 13px;font:inherit;font-size:16px;line-height:1.35;outline:none}.lc-product-textarea{min-height:88px;resize:vertical}.lc-product-input:focus,.lc-product-select:focus,.lc-product-textarea:focus{border-color:rgba(46,230,206,.65);box-shadow:0 0 0 3px rgba(46,230,206,.1)}
      .lc-product-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.lc-product-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--teal),#a7fff4);color:#031412;padding:0 16px;font-size:12px;line-height:1.1;font-weight:900;cursor:pointer;text-align:center;white-space:normal}.lc-product-btn.secondary{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:var(--text)}.lc-product-btn:disabled{opacity:.55;cursor:not-allowed}.lc-product-chip{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.06);color:var(--soft);padding:0 11px;font-size:11px;line-height:1.1;font-weight:850;cursor:pointer;text-align:center}.lc-product-chip.active{border-color:rgba(46,230,206,.58);background:rgba(46,230,206,.14);color:#a7fff4}
      .lc-product-row{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}.lc-product-row:first-child{border-top:0}.lc-product-row img{flex:0 0 auto;width:50px;height:50px;border-radius:16px;object-fit:cover}.lc-product-row-main{min-width:0;flex:1}.lc-product-row-main b{display:block;font-size:14px;line-height:1.25;overflow-wrap:anywhere}.lc-product-row-main span{display:block;color:var(--muted);font-size:12px;line-height:1.35;overflow-wrap:anywhere}.lc-product-status-dot{width:8px;height:8px;border-radius:50%;background:#778287;box-shadow:0 0 0 3px rgba(255,255,255,.04);flex:0 0 auto}.lc-product-status-dot.live{background:#5dffce;box-shadow:0 0 18px rgba(93,255,206,.45)}.lc-product-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.lc-product-stat{padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.04);min-width:0}.lc-product-stat b{display:block;font-size:17px;line-height:1.15;overflow-wrap:anywhere}.lc-product-stat span{display:block;color:var(--muted);font-size:10px;line-height:1.2;text-transform:uppercase;font-weight:850}
      .lc-product-row.unread{border-left:2px solid rgba(46,230,206,.72);padding-left:10px;background:linear-gradient(90deg,rgba(46,230,206,.055),transparent 48%)}
      .lc-product-tabs{position:relative;bottom:auto;z-index:3;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:7px;border:1px solid rgba(46,230,206,.16);border-radius:20px;background:rgba(5,8,9,.92);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);margin:12px auto 0;width:100%;max-width:980px}.lc-product-tabs button{min-height:44px;border:0;border-radius:14px;background:transparent;color:var(--muted);font-size:11px;line-height:1.05;font-weight:900;cursor:pointer}.lc-product-tabs button.active{background:rgba(46,230,206,.14);color:#a7fff4}.lc-product-note{display:block;margin-top:9px;color:var(--muted);font-size:11px;line-height:1.4;overflow-wrap:anywhere}.lc-product-empty{padding:24px 14px;text-align:center;color:var(--muted);font-size:14px;line-height:1.4}
      .lc-product-demo-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 auto 10px;padding:7px 8px;border:1px solid rgba(46,230,206,.16);border-radius:14px;background:rgba(255,255,255,.04);width:100%;max-width:980px}.lc-product-demo-banner strong{font-size:10px;line-height:1.1;color:#a7fff4;text-transform:uppercase;white-space:nowrap}.lc-product-demo-banner .lc-product-actions{margin-left:auto;justify-content:flex-end}
      .lc-product-connectivity{position:sticky;top:0;z-index:8;width:100%;max-width:980px;margin:0 auto 10px;padding:9px 12px;border:1px solid rgba(255,185,86,.24);border-radius:14px;background:rgba(45,29,8,.94);color:#ffe0ad;font-size:11px;line-height:1.35;text-align:center;box-shadow:0 14px 36px rgba(0,0,0,.22)}
      .lc-product-entry{min-height:100%;display:flex;flex-direction:column;gap:12px;width:100%;max-width:980px;margin:0 auto}.lc-product-entry-hero{padding:18px 4px 4px}.lc-product-entry-hero .lc-product-label{margin-bottom:12px}.lc-product-entry-hero h1{margin:0 0 8px;font-size:clamp(30px,8vw,46px);line-height:1.04;letter-spacing:0;color:var(--text);text-wrap:balance}.lc-product-entry-hero p{margin:0;color:var(--muted);font-size:13px;line-height:1.25;font-weight:850;text-transform:uppercase}.lc-product-entry-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}.lc-product-entry-title strong{font-size:12px;line-height:1.2;text-transform:uppercase;color:var(--soft)}.lc-product-personas{display:grid;gap:10px}.lc-product-persona{position:relative;min-height:96px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.035));color:var(--text);padding:14px;text-align:left;overflow:hidden;cursor:pointer}.lc-product-persona:after{content:"";position:absolute;right:-24px;top:-26px;width:80px;height:80px;border-radius:999px;background:rgba(46,230,206,.1);filter:blur(8px)}.lc-product-persona b{display:block;font-size:15px;line-height:1.2;margin-bottom:7px}.lc-product-persona span{display:block;max-width:32ch;color:var(--muted);font-size:12px;line-height:1.35}.lc-product-entry-auth{display:flex;gap:8px;margin-top:2px}.lc-product-entry-auth .lc-product-btn{flex:1}
      .lc-product-btn:focus-visible,.lc-product-chip:focus-visible,.lc-product-choice:focus-visible,.lc-product-persona:focus-visible,.lc-product-tabs button:focus-visible{outline:2px solid rgba(167,255,244,.9);outline-offset:2px}
      .lc-product-cinema{position:relative;min-height:520px;display:grid;align-content:end;overflow:hidden;border-radius:24px;border:1px solid rgba(167,255,244,.14);background:#020504;box-shadow:0 30px 90px rgba(0,0,0,.36),inset 0 0 0 1px rgba(255,255,255,.035)}.lc-product-cinema.compact{min-height:360px}.lc-product-cinema.copy-top{align-content:start}.lc-product-cinema img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.05) contrast(1.04) brightness(.68)}.lc-product-cinema:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,5,4,.04),rgba(2,5,4,.12) 34%,rgba(2,5,4,.9)),linear-gradient(90deg,rgba(2,5,4,.58),transparent 54%);z-index:1}.lc-product-cinema.copy-top:after{background:linear-gradient(180deg,rgba(2,5,4,.88),rgba(2,5,4,.18) 46%,rgba(2,5,4,.86)),linear-gradient(90deg,rgba(2,5,4,.56),transparent 54%)}.lc-product-cinema-copy{position:relative;z-index:2;display:grid;justify-items:start;gap:10px;padding:18px}.lc-product-cinema-copy h1{margin:0;max-width:12ch;font-size:clamp(36px,9vw,58px);line-height:.92;font-weight:870;color:#f7fffb}.lc-product-cinema-copy p{max-width:31ch;color:#f7fffb;font-size:14px}.lc-product-cinema .lc-product-actions{position:relative;z-index:2}.lc-product-media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.lc-product-media-tile{position:relative;min-height:176px;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:#07100e}.lc-product-media-tile.large{grid-column:1/-1;min-height:260px}.lc-product-media-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.04) brightness(.72)}.lc-product-media-tile:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(2,5,4,.86));z-index:1}.lc-product-media-copy{position:absolute;left:12px;right:12px;bottom:12px;z-index:2;display:grid;gap:7px;justify-items:start}.lc-product-card{border-color:rgba(167,255,244,.12);background:rgba(5,9,8,.72);box-shadow:0 24px 70px rgba(0,0,0,.26);backdrop-filter:blur(18px)}.lc-product-hero{background:linear-gradient(145deg,rgba(31,216,196,.1),rgba(255,255,255,.035));border-color:rgba(167,255,244,.2)}.lc-product-tabs{border-color:rgba(167,255,244,.13);background:rgba(2,6,5,.9)}@media(prefers-reduced-motion:reduce){.screen,.lc-product-cinema,.lc-product-card{animation:none!important;transition:none!important}}@media(max-width:430px){.lc-product-cinema{min-height:calc(var(--app-height) - 168px)}.lc-product-cinema.compact{min-height:390px}.lc-product-cinema-copy{padding:16px}.lc-product-cinema-copy h1{font-size:40px}.lc-product-media-grid{grid-template-columns:1fr}.lc-product-media-tile.large{min-height:260px}}
      @media(min-width:720px){#lcProductShell{padding:24px 18px 104px}.lc-product-grid.desktop-two{grid-template-columns:repeat(2,minmax(0,1fr))}.lc-product-personas{grid-template-columns:repeat(2,minmax(0,1fr))}.lc-product-card{padding:16px}.lc-product-hero{padding:20px}.lc-product-entry{max-width:min(920px,92vw)}}@media(min-width:1180px){#lcProductShell{padding:30px 28px 112px}.lc-product-stack,.lc-product-top,.lc-product-tabs,.lc-product-demo-banner{max-width:1040px}.lc-product-entry{max-width:960px}.lc-product-persona{min-height:112px;padding:18px}}@media(max-width:430px){#lcProductShell{padding-top:calc(12px + env(safe-area-inset-top));padding-left:12px;padding-right:12px;padding-bottom:calc(48px + env(safe-area-inset-bottom))}.lc-product-top{margin-bottom:8px}.lc-product-logo{width:34px;height:34px;border-radius:12px}.lc-product-brand span{display:none}.lc-product-brand strong{font-size:13px}.lc-product-top>.lc-product-chip{min-height:32px;padding:0 10px}.lc-product-cinema.compact{min-height:350px}.lc-product-card{padding:13px;border-radius:17px}.lc-product-card h1{font-size:26px}.lc-product-grid.two{grid-template-columns:1fr}.lc-product-flow{grid-template-columns:repeat(3,minmax(0,1fr))}.lc-product-row{align-items:flex-start}.lc-product-row .lc-product-chip{margin-left:auto}.lc-product-actions{gap:7px}.lc-product-btn{min-height:44px;padding:0 13px;font-size:11px}.lc-product-chip{min-height:35px;font-size:10.5px}.lc-product-entry-hero h1{font-size:30px}.lc-product-persona{min-height:92px;padding:13px}.lc-product-demo-banner{align-items:center;flex-direction:row;padding:5px 6px;gap:5px;min-height:42px}.lc-product-demo-banner strong{font-size:9px;letter-spacing:.08em;flex:0 0 auto}.lc-product-demo-banner .lc-product-actions{width:auto;min-width:0;flex:1;margin-left:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.lc-product-demo-banner .lc-product-chip{min-width:0;min-height:31px;padding:0 6px;font-size:9px;line-height:1;white-space:nowrap}.lc-product-entry-auth{position:sticky;bottom:8px;z-index:3;padding:7px;border:1px solid rgba(46,230,206,.16);border-radius:20px;background:rgba(5,8,9,.92);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}}
    `;
    document.head.appendChild(style);
  }

  function shell() {
    injectStyles();
    let node = q("#lcProductShell");
    if (!node) {
      node = document.createElement("section");
      node.id = "lcProductShell";
      node.setAttribute("aria-label", "LC App product experience");
      q("#screen")?.appendChild(node);
    }
    q("#screen")?.classList.add("lc-product-mode");
    node.hidden = false;
    node.scrollTop = 0;
    window.scrollTo(0, 0);
    return node;
  }

  function hide() {
    q("#lcProductShell")?.setAttribute("hidden", "");
    q("#screen")?.classList.remove("lc-product-mode");
  }

  function setBusy(button, busy = true) {
    state.busy = busy;
    if (button) button.disabled = busy;
  }

  function values(form, name) {
    return qa(`[name="${name}"]:checked`, form).map((input) => input.value);
  }

  async function loadState() {
    const userId = state.profile.id;
    const followResultPromise = (async () => {
      let result = await state.client.from("follows").select("following_id,live_alerts_enabled").eq("follower_id", userId);
      if (result.error && (["42703", "PGRST204"].includes(result.error.code) || /live_alerts_enabled/i.test(result.error.message || ""))) {
        state.creatorLiveAlertsAvailable = false;
        result = await state.client.from("follows").select("following_id").eq("follower_id", userId);
      } else {
        state.creatorLiveAlertsAvailable = true;
      }
      return result;
    })();
    const [personas, player, creator, industry, reminders, follows, accessRequests, notifications, blocks] = await Promise.all([
      state.client.from("account_personas").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      state.client.from("player_preferences").select("*").eq("user_id", userId).maybeSingle(),
      state.client.from("creator_profiles").select("*").eq("user_id", userId).maybeSingle(),
      state.client.from("industry_profiles").select("*").eq("user_id", userId).maybeSingle(),
      state.client.from("player_session_reminders").select("session_id").eq("user_id", userId),
      followResultPromise,
      state.client.from("partnership_access_requests").select("industry_subtype,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      state.client.from("notifications").select("id,type,target_type,target_id,read_at,created_at").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(8),
      state.client.from("user_blocks").select("blocked_id").eq("blocker_id", userId)
    ]);
    [personas, player, creator, industry, reminders, follows, accessRequests, notifications, blocks].forEach((res) => { if (res.error) throw res.error; });
    state.personas = personas.data || [];
    state.current = state.personas.find((p) => p.is_current) || state.personas[0] || null;
    state.player = player.data || null;
    state.creator = creator.data || null;
    state.industry = industry.data || null;
    state.reminders = new Set((reminders.data || []).map((row) => row.session_id));
    state.follows = new Set((follows.data || []).map((row) => row.following_id));
    state.creatorLiveAlerts = new Map((follows.data || []).map((row) => [row.following_id, row.live_alerts_enabled !== false]));
    state.accessRequests = accessRequests.data || [];
    state.notifications = notifications.data || [];
    state.blockedIds = new Set((blocks.data || []).map((row) => row.blocked_id));
    state.creators = state.creators.filter((item) => !state.blockedIds.has(item.profile.id));
    if (state.blockedIds.size) {
      const { data: blockedProfiles, error: blockedProfilesError } = await state.client.from("profiles").select("id,username,display_name,avatar_url").in("id", [...state.blockedIds]);
      const blockedProfileMap = new Map((blockedProfilesError ? [] : blockedProfiles || []).map((profile) => [profile.id, profile]));
      state.blockedProfiles = [...state.blockedIds].map((id) => blockedProfileMap.get(id) || { id, display_name: "Blocked Creator" });
    } else {
      state.blockedProfiles = [];
    }
    await loadReturnSignals();
    if (state.creator) await loadOwnCreatorData();
    if (["player", "creator", "industry"].includes(state.current?.persona)) await loadCreators();
    await loadPilotBriefs();
  }

  async function loadPilotBriefs() {
    if (state.demo) {
      state.pilotBriefs = [...demoStore.pilotBriefs];
      return;
    }
    const { data, error } = await state.client.from("pilot_measurement_briefs").select("*").eq("user_id", state.profile.id);
    if (error && (["42P01", "PGRST205"].includes(error.code) || /pilot_measurement_briefs/i.test(error.message || ""))) {
      state.pilotBriefsAvailable = false;
      state.pilotBriefs = [];
      return;
    }
    if (error) throw error;
    state.pilotBriefsAvailable = true;
    state.pilotBriefs = data || [];
  }

  async function loadReturnSignals() {
    if (state.demo) return;
    const [signals, preferences] = await Promise.all([
      state.client.from("return_signals").select("id,signal_type,creator_id,session_id,read_at,created_at").eq("recipient_id", state.profile.id).order("created_at", { ascending: false }).limit(20),
      state.client.from("return_signal_preferences").select("creator_live_enabled").eq("user_id", state.profile.id).maybeSingle()
    ]);
    const unavailable = [signals.error, preferences.error].some((error) => error && (["42P01", "PGRST205"].includes(error.code) || /return_signals|return_signal_preferences/i.test(error.message || "")));
    if (unavailable) {
      state.returnSignalsAvailable = false;
      return;
    }
    if (signals.error) throw signals.error;
    if (preferences.error) throw preferences.error;
    state.returnSignalsAvailable = true;
    state.liveSignalsEnabled = preferences.data?.creator_live_enabled !== false;
    const returnSignals = (signals.data || []).filter((row) => !state.blockedIds.has(row.creator_id)).map((row) => ({
      id: row.id,
      type: row.signal_type,
      target_type: "creator_session",
      target_id: row.session_id,
      creator_id: row.creator_id,
      read_at: row.read_at,
      created_at: row.created_at,
      source: "return_signal"
    }));
    state.notifications = [...returnSignals, ...state.notifications.map((row) => ({ ...row, source: "notification" }))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);
  }

  async function loadOwnCreatorData() {
    const [sessions, posts] = await Promise.all([
      state.client.from("creator_sessions").select("*").eq("creator_id", state.profile.id).order("starts_at", { ascending: true }),
      state.client.from("posts").select("id,author_id,body,created_at,status,deleted_at").eq("author_id", state.profile.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(20)
    ]);
    if (sessions.error) throw sessions.error;
    if (posts.error) throw posts.error;
    state.sessions = sessions.data || [];
    state.posts = posts.data || [];
  }

  async function loadCreators() {
    if (state.demo) {
      setDemoCreators();
      return;
    }
    const reminderIds = [...state.reminders].slice(0, 100);
    const [discovery, reminderSessions] = await Promise.all([
      state.client.from("creator_profiles").select("*").eq("profile_status", "published").order("updated_at", { ascending: false }).limit(30),
      reminderIds.length
        ? state.client.from("creator_sessions").select("id,creator_id").in("id", reminderIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (discovery.error) throw discovery.error;
    if (reminderSessions.error) throw reminderSessions.error;
    const requiredIds = new Set([
      ...[...state.follows].slice(0, 100),
      ...state.notifications.map((row) => row.creator_id).filter(Boolean),
      ...(reminderSessions.data || []).map((row) => row.creator_id)
    ]);
    const discoveryIds = new Set((discovery.data || []).map((row) => row.user_id));
    const missingRequiredIds = [...requiredIds].filter((id) => !discoveryIds.has(id) && id !== state.profile.id && !state.blockedIds.has(id)).slice(0, 100);
    const required = missingRequiredIds.length
      ? await state.client.from("creator_profiles").select("*").eq("profile_status", "published").in("user_id", missingRequiredIds)
      : { data: [], error: null };
    if (required.error) throw required.error;
    const creatorRows = [...new Map([...(discovery.data || []), ...(required.data || [])].map((row) => [row.user_id, row])).values()];
    const ids = (creatorRows || []).map((row) => row.user_id).filter((id) => id !== state.profile.id && !state.blockedIds.has(id));
    if (!ids.length) {
      state.creators = [];
      return;
    }
    const [profiles, sessions, posts] = await Promise.all([
      state.client.from("profiles").select("id,username,display_name,avatar_url,bio,country,languages,last_seen_at").in("id", ids),
      state.client.from("creator_sessions").select("*").in("creator_id", ids).in("status", ["scheduled", "live"]).eq("visibility", "public").order("starts_at", { ascending: true }),
      state.client.from("posts").select("id,author_id,body,created_at,status,deleted_at").in("author_id", ids).eq("status", "active").is("deleted_at", null).order("created_at", { ascending: false }).limit(60)
    ]);
    if (profiles.error) throw profiles.error;
    if (sessions.error) throw sessions.error;
    if (posts.error) throw posts.error;
    const profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
    const eligibleSessions = (sessions.data || [])
      .filter((session) => session.status === "live" || new Date(session.starts_at).getTime() > Date.now())
      .sort((a, b) => (a.status === "live" ? -1 : 0) - (b.status === "live" ? -1 : 0) || new Date(a.starts_at) - new Date(b.starts_at));
    state.creators = (creatorRows || []).map((creator) => ({
      creator,
      profile: profileMap.get(creator.user_id),
      sessions: eligibleSessions.filter((session) => session.creator_id === creator.user_id),
      posts: (posts.data || []).filter((post) => post.author_id === creator.user_id)
    })).filter((item) => item.profile);
  }

  async function setCurrentPersona(persona, industrySubtype = null) {
    const existing = state.personas.find((row) => row.persona === persona && (persona !== "industry" || row.industry_subtype === industrySubtype));
    await state.client.from("account_personas").update({ is_current: false }).eq("user_id", state.profile.id);
    if (existing) {
      const { error } = await state.client.from("account_personas").update({ is_current: true }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await state.client.from("account_personas").insert({
        user_id: state.profile.id,
        persona,
        industry_subtype: industrySubtype,
        onboarding_status: "started",
        is_current: true
      });
      if (error) throw error;
    }
    await loadState();
  }

  async function completeCurrentPersona() {
    if (!state.current) return;
    const { error } = await state.client.from("account_personas").update({ onboarding_status: "completed", is_current: true }).eq("id", state.current.id);
    if (error) throw error;
    await loadState();
  }

  function top(title = "LC App", subtitle = "Live Casino. Social Experience.") {
    const persona = state.profile?.role === "admin" || state.profile?.role === "moderator"
      ? "admin"
      : state.current?.persona === "industry"
        ? (state.industry?.subtype || state.current?.industry_subtype || "operator")
        : (state.current?.persona || "persona");
    return `
      <div class="lc-product-top">
        <div class="lc-product-brand"><span class="lc-product-logo">LC</span><div><strong>${safe(title)}</strong><span>${safe(subtitle)}</span></div></div>
        <button class="lc-product-chip" type="button" data-lc-product="profile">${safe(persona)}</button>
      </div>
      ${state.demo ? `<div class="lc-product-demo-banner"><strong>${safe((state.demoPersona || "preview").toUpperCase())}</strong><div class="lc-product-actions"><button class="lc-product-chip" type="button" data-lc-demo-switch>Switch</button><button class="lc-product-chip" type="button" data-lc-demo-reset>Reset</button><button class="lc-product-chip" type="button" data-lc-demo-exit>Opening</button></div></div>` : ""}
    `;
  }

  function tabs(active) {
    const current = state.current?.persona || "start";
    if (current === "industry") return "";
    const items = [["home", "Home"], ["explore", "Explore"], ["create", "Create"], ["activity", "Activity"], ["profile", "Profile"]];
    return `<div class="lc-product-tabs" aria-label="Primary navigation">${items.map(([id, label]) => {
      return `<button class="${active === id ? "active" : ""}" type="button" data-lc-product="${id}"><span class="lc-v4-social-icon" aria-hidden="true">${({ home:"⌂", explore:"◎", create:"+", activity:"♡", profile:"◉" })[id]}</span><span>${label}</span></button>`;
    }).join("")}</div>`;
  }

  function checks(name, list, selected = []) {
    const set = new Set(selected || []);
    return `<div class="lc-product-actions">${list.map((item) => `<label class="lc-product-chip ${set.has(item) ? "active" : ""}"><input style="display:none" type="checkbox" name="${safe(name)}" value="${safe(item)}" ${set.has(item) ? "checked" : ""}>${safe(item)}</label>`).join("")}</div>`;
  }

  const visualImage = (profile) => visualMedia[profile?.id] || visualMedia.fallback;
  const visualHero = (label, title, body, image, actions = "", mode = "") => `<section class="lc-product-cinema ${mode}"><img src="${safe(image || visualMedia.fallback)}" alt=""><div class="lc-product-cinema-copy"><span class="lc-product-label">${safe(label)}</span><h1>${safe(title)}</h1><p>${safe(body)}</p>${actions ? `<div class="lc-product-actions">${actions}</div>` : ""}</div></section>`;
  const visualTile = (image, label, title, body, large = false) => `<article class="lc-product-media-tile ${large ? "large" : ""}"><img src="${safe(image || visualMedia.fallback)}" alt=""><div class="lc-product-media-copy"><span class="lc-product-label">${safe(label)}</span><h3>${safe(title)}</h3><p>${safe(body)}</p></div></article>`;

  function renderLoading() {
    shell().innerHTML = `${top()}<div class="lc-product-card lc-product-empty">Loading product experience...</div>`;
    syncConnectivity();
  }

  function syncConnectivity() {
    const root = q("#lcProductShell");
    if (!root) return;
    const existing = q("#lcProductConnectivity", root);
    if (navigator.onLine) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const banner = document.createElement("div");
    banner.id = "lcProductConnectivity";
    banner.className = "lc-product-connectivity";
    banner.setAttribute("role", "status");
    banner.textContent = "You are offline. Your account data will reconnect automatically.";
    root.prepend(banner);
  }

  function renderLoadError(error) {
    state.loadError = error || new Error("load");
    shell().innerHTML = `${top()}<section class="lc-product-card lc-product-empty"><h2>Product experience unavailable</h2><p>${safe(err(error))}</p><div class="lc-product-actions"><button class="lc-product-btn" type="button" data-lc-retry>Retry</button></div><span class="lc-product-note">Your account data has not been changed.</span></section>`;
    syncConnectivity();
  }

  async function retryLoad(button = null, silent = false) {
    if (state.retrying || !state.client || !state.profile) return;
    state.retrying = true;
    if (button) button.disabled = true;
    renderLoading();
    try {
      await loadState();
      state.loadError = null;
      renderProductTarget(productParts());
      syncConnectivity();
      if (!silent) toast("Product reconnected");
    } catch (error) {
      renderLoadError(error);
    } finally {
      state.retrying = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  function demoProfile(id) {
    return demoProfiles.find((profile) => profile.id === id) || demoProfiles[0];
  }

  function setDemoCreators() {
    state.creators = demoCreators.map((creator) => ({
      creator,
      profile: demoProfile(creator.user_id),
      sessions: [...demoSessions, ...demoStore.sessions].filter((session) => session.creator_id === creator.user_id),
      posts: [...demoStore.posts, ...demoPosts].filter((post) => post.author_id === creator.user_id)
    }));
  }

  function refreshDemoData() {
    setDemoCreators();
    state.follows = new Set(demoStore.follows);
    state.creatorLiveAlerts = new Map(demoStore.creatorLiveAlerts);
    state.reminders = new Set(demoStore.reminders);
    state.accessRequests = [...demoStore.requests].map((industry_subtype) => ({ industry_subtype, status: "submitted", created_at: new Date().toISOString() }));
    state.pilotBriefs = [...demoStore.pilotBriefs];
    state.notifications = demoStore.notifications;
    state.sessions = [...demoSessions, ...demoStore.sessions].filter((session) => session.creator_id === state.profile?.id);
    state.posts = [...demoStore.posts, ...demoPosts].filter((post) => post.author_id === state.profile?.id);
  }

  function setupDemo(persona, shouldReset = false) {
    if (shouldReset) resetDemoStore();
    if (shouldReset && persona === "player") {
      demoStore.follows.add("demo-sofia");
      demoStore.creatorLiveAlerts.set("demo-sofia", true);
      demoStore.reminders.add("demo-session-mia");
      addDemoNotification("Sofia is live now. Your followed creator is ready to play.", "demo-session-sofia");
    }
    if (shouldReset && persona === "creator") {
      addDemoNotification("Demo reviewer followed Sofia and saved the next session.", "demo-sofia");
    }
    const industrySubtype = ["provider", "operator", "admin"].includes(persona) ? persona : null;
    const currentPersona = industrySubtype ? "industry" : persona;
    state.client = null;
    state.demo = true;
    state.demoPersona = persona;
    state.discoveryFilter = "for_you";
    state.socialView = "home";
    state.businessView = "overview";
    state.current = { id: `demo-${persona}`, persona: currentPersona, industry_subtype: industrySubtype, onboarding_status: "completed", is_current: true };
    state.profile = persona === "creator" ? demoProfile("demo-sofia") : { id: "demo-reviewer", username: "demo_reviewer", display_name: "Demo Reviewer", avatar_url: "app-icon-512.png", role: persona === "admin" ? "admin" : "user", account_status: "active", onboarding_completed: true };
    state.player = currentPersona === "player" ? { user_id: state.profile.id, favorite_games: ["Blackjack", "Roulette"], preferred_languages: ["English"], onboarding_completed: true } : null;
    state.creator = currentPersona === "creator" ? { ...demoCreators[0], onboarding_completed: true } : null;
    state.industry = currentPersona === "industry" ? { user_id: state.profile.id, subtype: industrySubtype, company_name: "Demo Company", job_title: "Industry reviewer", work_email: "demo@example.com", interests, access_status: "not_requested", onboarding_completed: true } : null;
    refreshDemoData();
  }

  function enterDemo(persona) {
    setupDemo(persona, true);
    if (setProductHash(["demo", persona])) return;
    routeHome();
  }

  function renderDemoEntry() {
    shell().innerHTML = `${top("LC", "Choose the product you want to explore")}
      <div class="lc-product-entry lc-v4-entry">
        <section class="lc-v4-entry-hero"><span class="lc-v3-kicker">LIVE CASINO THROUGH PEOPLE</span><h1>One network.<br>Two purpose-built products.</h1><p>Players and creators meet in a consumer social app. Operators, providers and moderators work in a separate business back office.</p></section>
        <section class="lc-v4-entry-family lc-v4-entry-social"><div><span>SOCIAL APP</span><h2>Follow the person.<br>Return when they are Live.</h2><p>Media-first discovery, creator profiles, activity, schedules and licensed-operator handoff.</p></div><div class="lc-v4-entry-actions"><button class="lc-product-btn" type="button" data-lc-demo-persona="player">ENTER AS PLAYER</button><button class="lc-product-btn secondary" type="button" data-lc-demo-persona="creator">ENTER AS CREATOR</button></div></section>
        <section class="lc-v4-entry-family lc-v4-entry-business"><div><span>BUSINESS BACK OFFICE</span><h2>Manage the creator-led path to Live.</h2><p>Configuration, creator operations, campaigns, integrations, safety and observed evidence. No invented performance claims.</p></div><div class="lc-v4-entry-actions"><button class="lc-product-btn" type="button" data-lc-demo-persona="operator">OPERATOR CONSOLE</button><button class="lc-product-btn secondary" type="button" data-lc-demo-persona="provider">PROVIDER CONSOLE</button><button class="lc-product-chip" type="button" data-lc-demo-persona="admin">ADMIN CONTROL</button></div></section>
        <section class="lc-v4-boundary-note"><b>LC does not operate the casino.</b><span>Gameplay, wallet, deposits, withdrawals, KYC/AML, wagering, settlement and responsible-gaming operations stay with licensed operator/provider infrastructure.</span></section>
      </div>`;
  }

  function renderPersonaChoice() {
    shell().innerHTML = `${top("How will you use LC App?", "Choose a product experience. This is not a security role.")}
      <div class="lc-product-stack">
        <section class="lc-product-card lc-product-hero"><span class="lc-product-label">Product persona</span><h1>Start with your role in Live Casino.</h1><p>You can add another experience later without changing account permissions.</p></section>
        <section class="lc-product-grid">
          <button class="lc-product-choice" type="button" data-lc-persona="player"><b>Player</b><span>Discover creators, follow sessions and return to live tables.</span></button>
          <button class="lc-product-choice" type="button" data-lc-persona="creator"><b>Creator / Dealer</b><span>Build a public profile, post updates and publish session schedules.</span></button>
          <button class="lc-product-choice" type="button" data-lc-persona="industry"><b>Industry</b><span>Evaluate the operator/provider fit and request access.</span></button>
        </section>
      </div>`;
  }

  function renderIndustrySubtype() {
    shell().innerHTML = `${top("Industry experience", "Select company context.")}
      <div class="lc-product-stack">
        <section class="lc-product-card"><h2>What type of company are you evaluating from?</h2><p>This is an unverified product context, not account approval.</p></section>
        <section class="lc-product-grid">
          ${["operator", "provider", "aggregator", "other"].map((item) => `<button class="lc-product-choice" type="button" data-lc-industry="${item}"><b>${safe(item.replace(/^./, (m) => m.toUpperCase()))}</b><span>${item === "provider" ? "Game distribution through creators and live tables." : item === "operator" ? "Player discovery, follow and handoff journey." : "Integration and distribution evaluation."}</span></button>`).join("")}
        </section>
      </div>`;
  }

  function renderPlayerOnboarding() {
    const selectedGames = state.player?.favorite_games || [];
    const selectedLanguages = state.player?.preferred_languages || [];
    shell().innerHTML = `${top("Welcome", "Build your creator-first Live Casino feed")}
      <form class="lc-product-stack lc-product-form lc-v3-onboarding" data-lc-form="player">
        <section class="lc-v3-onboarding-hero">
<span class="lc-v3-kicker">PLAYER SETUP · 1 MINUTE</span>
<h1>Who do you want to come back for?</h1>
<p>LC uses your game and language preferences to rank creators. You can change these later.</p>
<div class="lc-v3-progress"><span></span><span></span><span></span></div>
        </section>
        <section class="lc-product-card lc-v3-preference-card">
<div class="lc-product-section-head"><div><span class="lc-v3-step">01</span><h2>Games you actually play</h2></div><span>${selectedGames.length ? `${selectedGames.length} selected` : "Choose at least one"}</span></div>
<p>Used only for creator discovery ranking. It does not change gameplay or casino access.</p>
<div class="lc-v3-choice-wrap">${checks("games", games, selectedGames)}</div>
        </section>
        <section class="lc-product-card lc-v3-preference-card">
<div class="lc-product-section-head"><div><span class="lc-v3-step">02</span><h2>Languages you prefer</h2></div><span>${selectedLanguages.length ? `${selectedLanguages.length} selected` : "Choose at least one"}</span></div>
<p>Helps surface creators you can comfortably follow across sessions.</p>
<div class="lc-v3-choice-wrap">${checks("languages", languages, selectedLanguages)}</div>
        </section>
        <section class="lc-v3-value-strip"><div><b>Discover people</b><span>Not anonymous tables</span></div><div><b>Follow creators</b><span>Keep the relationship</span></div><div><b>Return when Live</b><span>Build continuity</span></div></section>
        <button class="lc-product-btn lc-v3-primary-wide" type="submit">BUILD MY DISCOVER FEED</button>
        <span class="lc-product-note lc-v3-center-note">No wallet, wagering, KYC or deposits are handled by LC App.</span>
      </form>`;
  }

  function renderCreatorOnboarding() {
    const c = state.creator || {};
    shell().innerHTML = `${top("Creator setup", "Dealer identity becomes followable.")}
      <form class="lc-product-stack lc-product-form" data-lc-form="creator">
        <section class="lc-product-card lc-product-hero"><span class="lc-product-label">Creator / Dealer</span><h1>From dealer to creator.</h1><p>Create a public profile, publish sessions and let players follow your live presence.</p></section>
        <section class="lc-product-card"><h2>Identity</h2><input class="lc-product-input" name="headline" maxlength="120" placeholder="Headline" value="${safe(c.headline || "Live Casino creator")}"><textarea class="lc-product-textarea" name="bio" maxlength="280" placeholder="Short bio">${safe(state.profile.bio || "")}</textarea></section>
        <section class="lc-product-card"><h2>Games</h2>${checks("games", games, c.games)}</section>
        <section class="lc-product-card"><h2>Languages</h2>${checks("languages", languages, c.languages || state.profile.languages)}</section>
        <section class="lc-product-card"><h2>Affiliation</h2><select class="lc-product-select" name="affiliation_type"><option value="unlisted">Not listed</option><option value="independent">Independent</option><option value="operator">Operator</option><option value="studio">Studio</option><option value="provider">Provider</option></select><input class="lc-product-input" name="affiliation_name" maxlength="120" placeholder="Company, studio or provider (optional)" value="${safe(c.affiliation_name || "")}"><span class="lc-product-note">Affiliation is user claimed and unverified until reviewed.</span></section>
        <section class="lc-product-card"><h2>Preview</h2><div class="lc-product-row"><img src="${safe(avatar(state.profile))}" alt=""><div class="lc-product-row-main"><b>${safe(profileName(state.profile))}</b><span>${safe(c.headline || "Live Casino creator")} · Unverified affiliation</span></div></div></section>
        <button class="lc-product-btn" type="submit">CREATE CREATOR PROFILE</button>
      </form>`;
    const select = q('[name="affiliation_type"]');
    if (select) select.value = c.affiliation_type || "unlisted";
  }

  function creatorCard(item) {
    const p = item.profile;
    const c = item.creator;
    const next = item.sessions[0];
    const post = item.posts[0];
    const following = state.follows.has(p.id);
    return `<section class="lc-product-cinema compact" data-creator-id="${safe(p.id)}">
      <img src="${safe(visualImage(p))}" alt="">
      <div class="lc-product-cinema-copy">
        <span class="lc-product-label">${safe(sessionStatusLabel(next))}</span>
        <h1>${safe(profileName(p))}</h1>
        <p>${safe(c.headline || "Live Casino creator")} · ${safe((c.games || []).join(", ") || "Live Casino")}</p>
        <div class="lc-product-actions"><button class="lc-product-btn secondary ${following ? "active" : ""}" type="button" data-lc-follow="${safe(p.id)}">${following ? "Following" : "Follow"}</button><button class="lc-product-btn secondary" type="button" data-lc-open-creator="${safe(p.id)}">Open</button>${next ? `<button class="lc-product-btn" type="button" data-lc-live="${safe(next.id)}">${next.status === "live" ? "Watch live" : "View schedule"}</button>` : ""}</div>
        <span class="lc-product-note">${safe(c.affiliation_name || "Affiliation")} · ${safe(c.affiliation_verification_status || "unverified")}. No operator/provider integration implied.</span>
      </div>
    </section>`;
  }

  function creatorLiveAlertControl(id) {
    if (!state.follows.has(id)) return "";
    const enabled = state.creatorLiveAlerts.get(id) !== false;
    const globallyPaused = !state.liveSignalsEnabled;
    const available = state.demo || (state.returnSignalsAvailable && state.creatorLiveAlertsAvailable);
    const label = globallyPaused ? "Live alerts paused globally" : enabled ? "Mute Live alerts" : "Enable Live alerts";
    return `<button class="lc-product-chip ${enabled && !globallyPaused ? "active" : ""}" type="button" data-lc-creator-live-alerts="${safe(id)}" ${available && !globallyPaused ? "" : "disabled"}>${safe(label)}</button>`;
  }

  function compactCreatorRows(items, emptyText) {
    if (!items.length) return `<div class="lc-product-empty">${safe(emptyText)}</div>`;
    return items.map((item) => {
      const next = item.sessions[0];
      const reason = creatorRecommendationReasons(item).slice(0, 2).join(" · ");
      return `<div class="lc-product-row"><img src="${safe(avatar(item.profile))}" alt=""><span class="lc-product-status-dot ${next?.status === "live" ? "live" : ""}"></span><div class="lc-product-row-main"><b>${safe(profileName(item.profile))}</b><span>${safe(reason || sessionStatusLabel(next))} · ${safe((item.creator.games || []).join(", ") || "Live Casino")}</span></div><button class="lc-product-chip" type="button" data-lc-open-creator="${safe(item.profile.id)}">Open</button></div>`;
    }).join("");
  }

  function notificationText(row) {
    if (row.text) return row.text;
    if (row.type === "creator_live") {
      const creator = state.creators.find((item) => item.profile.id === row.creator_id);
      return creator ? `${profileName(creator.profile)} is live now.` : "A Creator you follow is live now.";
    }
    if (row.type === "new_follower") return "New follower on your creator profile.";
    if (row.type === "post_like") return "Someone reacted to your content.";
    if (row.type === "comment") return "New comment on your content.";
    if (row.type === "comment_reply") return "New reply in a creator conversation.";
    return "Product activity updated.";
  }

  function renderNotifications(emptyText = "No notifications yet. Follow creators, react to content or save sessions.") {
    const unread = state.notifications.filter((item) => !item.read_at).length;
    return `<section class="lc-product-card"><div class="lc-product-section-head"><h2>Notifications</h2><span>${state.notifications.length ? `${unread} unread` : "Empty"}</span></div>${unread ? `<div class="lc-product-actions"><button class="lc-product-chip" type="button" data-lc-notifications-read>Mark all read</button></div>` : ""}${state.notifications.length ? state.notifications.map((n) => `<div class="lc-product-row ${n.read_at ? "" : "unread"}"><div class="lc-product-row-main"><b>${safe(notificationText(n))}</b><span>${safe(new Date(n.created_at).toLocaleString())}</span></div><button class="lc-product-chip" type="button" data-lc-notification="${safe(n.id)}">Open</button></div>`).join("") : `<div class="lc-product-empty">${safe(emptyText)}</div>`}</section>`;
  }

  async function markNotificationsRead(ids) {
    const unread = state.notifications.filter((item) => !item.read_at && (!ids || ids.includes(item.id)));
    if (!unread.length) return;
    const now = new Date().toISOString();
    if (!state.demo) {
      const ordinaryIds = unread.filter((item) => item.source !== "return_signal").map((item) => item.id);
      const returnIds = unread.filter((item) => item.source === "return_signal").map((item) => item.id);
      const updates = [];
      if (ordinaryIds.length) updates.push(state.client.from("notifications").update({ read_at: now }).in("id", ordinaryIds));
      if (returnIds.length) updates.push(state.client.from("return_signals").update({ read_at: now }).in("id", returnIds));
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;
    }
    unread.forEach((item) => { item.read_at = now; });
  }

  async function openNotification(id) {
    const notification = state.notifications.find((item) => item.id === id);
    if (!notification) return;
    await markNotificationsRead([id]);
    const session = findSessionEntry(notification.target_id);
    if (notification.source === "return_signal" && session) {
      void trackProductEvent("notification_response", {
        creatorId: notification.creator_id || session.entry.profile.id,
        sessionId: session.session.id,
        metadata: { notification_type: notification.type || "creator_live" }
      });
    }
    if (session) return renderLive(notification.target_id);
    if (state.creators.some((item) => item.profile.id === notification.target_id)) return renderCreatorDetail(notification.target_id);
    routeHome();
  }

  function suggestedCreators() {
    const query = state.search.trim().toLowerCase();
    const base = !query ? state.creators : state.creators.filter((item) => {
      const text = [profileName(item.profile), item.profile.username, item.profile.bio, item.creator.headline, ...(item.creator.games || []), ...(item.creator.languages || [])].join(" ").toLowerCase();
      return text.includes(query);
    });
    const filtered = base.filter((item) => {
      const status = item.sessions[0]?.status;
      if (state.discoveryFilter === "live") return status === "live";
      if (state.discoveryFilter === "following") return state.follows.has(item.profile.id);
      if (state.discoveryFilter === "upcoming") return status === "scheduled";
      return true;
    });
    return [...filtered].sort((a, b) => creatorDiscoveryScore(b) - creatorDiscoveryScore(a) || profileName(a.profile).localeCompare(profileName(b.profile)));
  }

  function creatorDiscoveryScore(item) {
    const gamePrefs = new Set(state.player?.favorite_games || []);
    const languagePrefs = new Set(state.player?.preferred_languages || []);
    const session = item.sessions[0];
    let score = 0;
    if (session?.status === "live") score += 80;
    if (state.follows.has(item.profile.id)) score += 60;
    if (session && state.reminders.has(session.id)) score += 45;
    score += Math.min(2, (item.creator.games || []).filter((value) => gamePrefs.has(value)).length) * 30;
    score += Math.min(2, (item.creator.languages || []).filter((value) => languagePrefs.has(value)).length) * 15;
    if (session?.status === "scheduled") score += 10;
    return score;
  }

  function creatorRecommendationReasons(item) {
    const gamePrefs = new Set(state.player?.favorite_games || []);
    const languagePrefs = new Set(state.player?.preferred_languages || []);
    const session = item.sessions[0];
    const matchedGame = (item.creator.games || []).find((value) => gamePrefs.has(value));
    const matchedLanguage = (item.creator.languages || []).find((value) => languagePrefs.has(value));
    return [
      session?.status === "live" ? "Live now" : null,
      state.follows.has(item.profile.id) ? "Following" : null,
      session && state.reminders.has(session.id) ? "Reminder set" : null,
      matchedGame ? `Matches ${matchedGame}` : null,
      matchedLanguage ? matchedLanguage : null,
      session?.status === "scheduled" ? "Starting soon" : null
    ].filter(Boolean);
  }

  function savedScheduleEntries() {
    return state.creators.flatMap((entry) => entry.sessions
      .filter((session) => session.status === "scheduled" && new Date(session.starts_at).getTime() > Date.now() && state.reminders.has(session.id))
      .map((session) => ({ entry, session })))
      .sort((a, b) => new Date(a.session.starts_at) - new Date(b.session.starts_at));
  }

  function renderSavedSchedule() {
    const saved = savedScheduleEntries();
    return `<section class="lc-product-card"><div class="lc-product-section-head"><h2>My schedule</h2><span>${saved.length ? `${saved.length} saved` : "Return plan"}</span></div>${saved.length ? saved.map(({ entry, session }) => `<div class="lc-product-row"><img src="${safe(avatar(entry.profile))}" alt=""><div class="lc-product-row-main"><b>${safe(profileName(entry.profile))} · ${safe(session.game)}</b><span>${safe(sessionLine(session))} · ${safe(session.operator_name || "Operator to be confirmed")}</span></div><button class="lc-product-chip active" type="button" data-lc-open-creator="${safe(entry.profile.id)}">Open</button></div>`).join("") : `<div class="lc-product-empty">Save a Creator's upcoming session to build your return plan. LC currently provides in-app schedule context; push, email and SMS are not enabled.</div>`}</section>`;
  }

  function socialFeedEntries() {
    const ranked = suggestedCreators();
    const entries = ranked.flatMap((item) => {
      const session = item.sessions[0] || null;
      const posts = item.posts.length ? item.posts.slice(0, 2) : [];
      if (!posts.length && session) return [{ item, session, post: null }];
      return posts.map((post, index) => ({ item, session: index === 0 ? session : null, post }));
    });
    return entries.sort((a, b) => {
      const aLive = a.session?.status === "live" ? 1 : 0;
      const bLive = b.session?.status === "live" ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      return new Date(b.post?.created_at || b.session?.starts_at || 0) - new Date(a.post?.created_at || a.session?.starts_at || 0);
    });
  }

  function renderSocialPost({ item, session, post }, index) {
    const creatorId = item.profile.id;
    const following = state.follows.has(creatorId);
    const liked = Boolean(post && demoStore.likes.has(post.id));
    const comments = post ? demoStore.comments.filter((comment) => comment.post_id === post.id).length : 0;
    const isLive = session?.status === "live";
    const reminderSet = Boolean(session && state.reminders.has(session.id));
    const mediaAlt = `${profileName(item.profile)} at a Live Casino table`;
    return `<article class="lc-v4-feed-post" data-lc-feed-position="${index + 1}">
      <header class="lc-v4-feed-author">
        <button class="lc-v4-feed-avatar" type="button" data-lc-open-creator="${safe(creatorId)}"><img src="${safe(avatar(item.profile))}" alt=""></button>
        <button class="lc-v4-feed-identity" type="button" data-lc-open-creator="${safe(creatorId)}"><b>${safe(profileName(item.profile))}</b><span>${safe(item.creator.headline || (item.creator.games || []).join(" · ") || "Live Casino creator")}</span></button>
        <button class="lc-product-chip ${following ? "active" : ""}" type="button" data-lc-follow="${safe(creatorId)}">${following ? "Following" : "Follow"}</button>
      </header>
      <button class="lc-v4-feed-media" type="button" ${session ? `data-lc-live="${safe(session.id)}"` : `data-lc-open-creator="${safe(creatorId)}"`} aria-label="${session ? `${isLive ? "Open Live" : "Open upcoming session"} with ${safe(profileName(item.profile))}` : `Open ${safe(profileName(item.profile))}'s profile`}">
        <img src="${safe(visualImage(item.profile))}" alt="${safe(mediaAlt)}">
        <span class="lc-v4-feed-gradient"></span>
        <span class="lc-v3-live-pill ${isLive ? "is-live" : ""}">${safe(sessionStatusLabel(session))}</span>
        ${session ? `<span class="lc-v4-feed-session"><b>${safe(session.game)}</b><small>${safe(isLive ? session.title || "Live now" : new Date(session.starts_at).toLocaleString())}</small></span>` : ""}
      </button>
      <div class="lc-v4-feed-actions">
        <div>
          ${post ? `<button class="lc-v4-icon-action ${liked ? "active" : ""}" type="button" data-lc-like="${safe(post.id)}" aria-label="Like post"><span aria-hidden="true">${liked ? "♥" : "♡"}</span><small>${liked ? "Liked" : "Like"}</small></button>` : ""}
          <button class="lc-v4-icon-action" type="button" data-lc-open-creator="${safe(creatorId)}" aria-label="Open creator profile"><span aria-hidden="true">◎</span><small>Profile</small></button>
        </div>
        ${session ? (isLive
          ? `<button class="lc-product-btn lc-v4-feed-cta" type="button" data-lc-live="${safe(session.id)}">PLAY WITH ${safe(profileName(item.profile)).toUpperCase()}</button>`
          : `<button class="lc-product-chip ${reminderSet ? "active" : ""}" type="button" data-lc-reminder="${safe(session.id)}">${reminderSet ? "REMINDER SET" : "REMIND ME"}</button>`) : ""}
      </div>
      <div class="lc-v4-feed-caption"><b>${safe(profileName(item.profile))}</b><p>${safe(post?.body || item.profile.bio || "Follow this creator to see their next Live session.")}</p><time datetime="${safe(post?.created_at || session?.starts_at || "")}">${safe(new Date(post?.created_at || session?.starts_at || Date.now()).toLocaleString())}</time></div>
      ${post ? `<form class="lc-v4-feed-comment" data-lc-form="comment" data-post-id="${safe(post.id)}"><label class="sr-only" for="comment-${safe(post.id)}">Comment on ${safe(profileName(item.profile))}'s post</label><input id="comment-${safe(post.id)}" class="lc-product-input" name="body" maxlength="500" placeholder="Add a comment…"><button type="submit">Post</button>${comments ? `<span>${comments} demo comment${comments === 1 ? "" : "s"}</span>` : ""}</form>` : ""}
    </article>`;
  }

  function renderPlayerHome() {
    const creators = suggestedCreators();
    const liveCreators = creators.filter((item) => item.sessions[0]?.status === "live");
    const feed = socialFeedEntries();
    const unread = state.notifications.filter((item) => !item.read_at).length;
    shell().innerHTML = `${top("Home", unread ? `${unread} new signal${unread === 1 ? "" : "s"}` : "Live Casino through people")}
      <div class="lc-product-stack lc-v4-social-home">
        <div class="sr-only" aria-label="LC core loop"><span>Discover</span><span>Creator</span><span>Follow</span><span>Live</span><span>Return</span></div>
        <section class="lc-v4-live-rail" aria-label="Creators Live now">
          <button class="lc-v4-live-orb lc-v4-explore-orb" type="button" data-lc-product="explore"><span>+</span><small>Explore</small></button>
          ${liveCreators.slice(0, 8).map((item) => `<button class="lc-v4-live-orb" type="button" data-lc-live="${safe(item.sessions[0].id)}"><span><img src="${safe(avatar(item.profile))}" alt=""><i>LIVE</i></span><small>${safe(profileName(item.profile).split(" ")[0])}</small></button>`).join("")}
        </section>
        <div class="lc-v4-home-switch"><button class="${state.discoveryFilter === "for_you" ? "active" : ""}" type="button" data-lc-home-filter="for_you">For you</button><button class="${state.discoveryFilter === "following" ? "active" : ""}" type="button" data-lc-home-filter="following">Following</button></div>
        <section class="lc-v4-social-feed" aria-label="Creator feed">
          ${feed.length ? feed.map(renderSocialPost).join("") : `<div class="lc-v4-feed-empty"><span>YOUR FEED</span><h1>Find people worth returning for.</h1><p>Explore verified, public Creator profiles and follow the people you want to see Live.</p><button class="lc-product-btn" type="button" data-lc-product="explore">EXPLORE CREATORS</button></div>`}
        </section>
        <section class="lc-v4-feed-boundary"><b>LC connects you to people, not funds.</b><span>Gameplay and all regulated casino operations stay with the licensed operator.</span></section>
      </div>${tabs("home")}`;
    feed.slice(0, 20).forEach(({ item }, index) => void trackProductEvent("creator_impression", { creatorId: item.profile.id, dedupeKey: `home-feed:${state.discoveryFilter}:${item.profile.id}:${index}`, metadata: { surface: "creator_feed", position: index + 1, filter: state.discoveryFilter, recommendation_reasons: creatorRecommendationReasons(item).slice(0, 4), experience: "social_home_feed" } }));
  }

  function renderSocialExplore() {
    const creators = suggestedCreators();
    const filters = { for_you: "For you", live: "Live", following: "Following", upcoming: "Soon" };
    shell().innerHTML = `${top("Explore", "Find the person behind the table.")}
      <div class="lc-product-stack lc-v4-explore">
        <form class="lc-v4-explore-search" data-lc-form="search"><input class="lc-product-input" name="search" maxlength="80" aria-label="Search creators, games or languages" placeholder="Search creators, games or languages" value="${safe(state.search)}"><button class="lc-product-btn" type="submit">SEARCH</button>${state.search ? `<button class="lc-product-chip" type="button" data-lc-clear-search>Clear</button>` : ""}</form>
        <div class="lc-v4-filter-row">${Object.entries(filters).map(([value, label]) => `<button class="lc-product-chip ${state.discoveryFilter === value ? "active" : ""}" type="button" data-lc-discovery-filter="${value}">${label}</button>`).join("")}</div>
        <section class="lc-v4-explore-grid">${creators.length ? creators.map((item) => {
          const session = item.sessions[0];
          const following = state.follows.has(item.profile.id);
          return `<article class="lc-v4-person-card"><button type="button" class="lc-v4-person-media" data-lc-open-creator="${safe(item.profile.id)}"><img src="${safe(visualImage(item.profile))}" alt=""><span class="lc-v3-live-pill ${session?.status === "live" ? "is-live" : ""}">${safe(sessionStatusLabel(session))}</span></button><div class="lc-v4-person-copy"><div><b>${safe(profileName(item.profile))}</b><span>${safe((item.creator.games || []).slice(0, 2).join(" · ") || "Live Casino")}</span></div><button class="lc-product-chip ${following ? "active" : ""}" type="button" data-lc-follow="${safe(item.profile.id)}">${following ? "Following" : "Follow"}</button></div></article>`;
        }).join("") : `<div class="lc-product-empty"><h2>No creators found</h2><p>Try another name, game, language or feed filter.</p></div>`}</section>
      </div>${tabs("explore")}`;
    creators.slice(0, 20).forEach((item, index) => void trackProductEvent("creator_impression", { creatorId: item.profile.id, dedupeKey: `explore:${state.discoveryFilter}:${item.profile.id}`, metadata: { surface: "explore", position: index + 1, filter: state.discoveryFilter } }));
  }

  function renderSocialActivity() {
    const unread = state.notifications.filter((item) => !item.read_at).length;
    shell().innerHTML = `${top("Activity", unread ? `${unread} unread` : "You're caught up")}
      <div class="lc-product-stack lc-v4-activity" data-lc-activity>
        <section class="lc-v4-activity-head"><div><span class="lc-v3-kicker">YOUR RETURN LOOP</span><h1>Signals from people you follow</h1><p>Live alerts, schedule reminders and social activity stay together.</p></div>${unread ? `<button class="lc-product-chip" type="button" data-lc-notifications-read>Mark all read</button>` : ""}</section>
        ${renderNotifications("No activity yet. Follow creators or save a session and LC will keep the relationship connected.")}
        <p class="lc-product-note">In-app only. No email, SMS or push delivery is implied.</p>
        ${renderSavedSchedule()}
      </div>${tabs("activity")}`;
  }

  function renderSocialCreate() {
    if (state.current?.persona === "creator" && state.creator?.onboarding_completed) return renderCreatorHome();
    shell().innerHTML = `${top("Create", "Creator tools live inside the social app")}
      <div class="lc-product-stack lc-v4-create-gateway">
        <section class="lc-v4-create-hero"><div><span class="lc-v3-kicker">CREATOR MODE</span><h1>Turn a table presence into a followable identity.</h1><p>Publish content, schedule your next session and tell followers when you are Live.</p></div><button class="lc-product-btn" type="button" data-lc-persona="creator">OPEN CREATOR TOOLS</button></section>
        <section class="lc-v4-create-options"><article><span>01</span><h2>Share</h2><p>Post a short update around your work and next Live moment.</p></article><article><span>02</span><h2>Schedule</h2><p>Give followers a specific reason and time to return.</p></article><article><span>03</span><h2>Go Live</h2><p>Signal followers only after verification and public-session checks pass.</p></article></section>
        <p class="lc-product-note">Creator verification and affiliation approval remain server-controlled. Opening Creator tools never grants approval.</p>
      </div>${tabs("create")}`;
  }

  function renderCreatorHome() {
    const c = state.creator;
    const publication = creatorPublication();
    const reviewCopy = creatorReviewCopy(publication.verification);
    const publicAction = publication.approved
      ? `<button class="lc-product-btn ${publication.published ? "secondary" : ""}" type="button" data-lc-creator-profile-status="${publication.published ? "draft" : "published"}">${publication.published ? "MAKE PROFILE PRIVATE" : "PUBLISH PROFILE"}</button>`
      : "";
    shell().innerHTML = `${top("Create", "Creator studio")}
      <div class="lc-product-stack lc-v4-creator-studio">
        <section class="lc-v4-studio-profile"><img src="${safe(visualImage(state.profile))}" alt=""><div><span class="lc-v3-kicker">CREATOR STUDIO</span><h1>${safe(profileName(state.profile))}</h1><p>${safe(c.headline || "Live Casino creator")}</p><div class="lc-v4-studio-badges"><span>${safe(publication.verification)}</span><span>${publication.published ? "Public profile" : "Private profile"}</span></div></div><button class="lc-product-chip" type="button" data-lc-product="profile">View profile</button></section>
        <section class="lc-v4-studio-summary"><article><b>${state.posts.length}</b><span>Posts</span></article><article><b>${state.sessions.filter((item) => item.status === "scheduled").length}</b><span>Upcoming</span></article><article><b>${state.sessions.filter((item) => item.status === "live").length}</b><span>Live now</span></article><article><b>To be validated</b><span>Return impact</span></article></section>
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>Publication</h2><span>${safe(reviewCopy[0])}</span></div><p>${safe(reviewCopy[1])}</p><div class="lc-product-actions">${publicAction}</div><span class="lc-product-note">Verification is server-controlled. Publishing changes visibility only after approval; it never grants verification.</span></section>
        ${publication.publicReady ? `<section class="lc-product-card"><h2>Create post</h2><p>Share with followers</p><form class="lc-product-form" data-lc-form="post"><textarea class="lc-product-textarea" name="body" maxlength="2000" placeholder="What should your followers know?"></textarea><button class="lc-product-btn" type="submit">SHARE POST</button></form></section>` : `<section class="lc-product-card"><div class="lc-product-section-head"><h2>Creator content</h2><span>Private until approved</span></div><p>Publishing becomes available after server-controlled verification and profile publication.</p><span class="lc-product-note">LC does not expose unverified Creator posts as public content.</span></section>`}
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>Schedule a Live session</h2><span>Build a return moment</span></div><form class="lc-product-form lc-v4-session-form" data-lc-form="session"><input class="lc-product-input" name="title" maxlength="120" placeholder="Session title" value="Live table session"><select class="lc-product-select" name="game">${games.map((g) => `<option>${safe(g)}</option>`).join("")}</select><input class="lc-product-input" name="operator_name" maxlength="120" placeholder="Operator or studio (user claimed / optional)"><input class="lc-product-input" name="starts_at" type="datetime-local" required><button class="lc-product-btn" type="submit">${publication.publicReady ? "ADD TO SCHEDULE" : "SAVE PRIVATE SESSION"}</button></form><span class="lc-product-note">${publication.publicReady ? "Eligible followers can save this session. Operator/provider context remains user claimed unless verified by partner integration." : "This session stays private until verification and publication are complete."}</span></section>
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>Sessions</h2><span>${publication.publicReady ? "Public control" : "Private workspace"}</span></div>${state.sessions.length ? state.sessions.map((s) => `<div class="lc-product-row"><div class="lc-product-row-main"><b>${safe(s.game)} · ${safe(s.title || "Live session")}</b><span>${safe(s.operator_name || "Operator to be confirmed")} · ${safe(sessionLine(s))} · ${safe(s.visibility || "private")}</span><div class="lc-product-actions">${publication.publicReady && s.status !== "cancelled" && s.status !== "completed" ? `<button class="lc-product-chip" type="button" data-lc-session-visibility="${s.visibility === "public" ? "private" : "public"}" data-lc-session-id="${safe(s.id)}">${s.visibility === "public" ? "Make private" : "Publish"}</button>` : ""}${s.visibility === "public" && s.status === "scheduled" ? `<button class="lc-product-chip" type="button" data-lc-session-status="live" data-lc-session-id="${safe(s.id)}">Go live</button>` : ""}${s.status === "live" ? `<button class="lc-product-chip" type="button" data-lc-session-status="completed" data-lc-session-id="${safe(s.id)}">End session</button>` : ""}${["scheduled", "live"].includes(s.status) ? `<button class="lc-product-chip" type="button" data-lc-session-status="cancelled" data-lc-session-id="${safe(s.id)}">Cancel</button>` : ""}</div></div></div>`).join("") : `<div class="lc-product-empty">No sessions yet. Save your next Live table; it stays private until you are ready and approved to publish.</div>`}</section>
        <section class="lc-product-card"><h2>Posts</h2>${state.posts.length ? state.posts.map((p) => `<div class="lc-product-row"><div class="lc-product-row-main"><b>${new Date(p.created_at).toLocaleString()}</b><span>${safe(p.body)}</span></div></div>`).join("") : `<div class="lc-product-empty">No posts yet. Share a short table update for followers.</div>`}</section>
        ${renderNotifications("No audience notifications yet. Followers, reactions and comments will appear here.")}
      </div>${tabs("create")}`;
    const dt = q('[name="starts_at"]');
    if (dt) {
      dt.min = localDateTimeInput(new Date(Date.now() + 300000));
      if (!dt.value) dt.value = localDateTimeInput(new Date(Date.now() + 86400000));
    }
  }

  function renderIndustryOnboarding() {
    const subtype = state.current?.industry_subtype || "operator";
    shell().innerHTML = `${top(`${subtype} setup`, "Industry profile")}
      <form class="lc-product-stack lc-product-form" data-lc-form="industry">
        <section class="lc-product-card lc-product-hero"><span class="lc-product-label">Industry</span><h1>${subtype === "provider" ? "Distribution through people." : "Evaluate the Live Casino social layer."}</h1><p>Registration does not mean company verification, partner approval or active integration.</p></section>
        <section class="lc-product-card"><input class="lc-product-input" name="company_name" maxlength="120" required placeholder="Company"><input class="lc-product-input" name="job_title" maxlength="120" required placeholder="Job title"><input class="lc-product-input" name="work_email" maxlength="254" required placeholder="Work email"><input class="lc-product-input" name="website_url" maxlength="300" placeholder="Website (optional)"></section>
        <section class="lc-product-card"><h2>Interests</h2>${checks("interests", interests, state.industry?.interests)}</section>
        <button class="lc-product-btn" type="submit">OPEN INDUSTRY VIEW</button>
      </form>`;
  }

  function renderPilotMeasurementBrief(subtype) {
    if (!state.pilotBriefsAvailable && !state.demo) {
      return `<section class="lc-product-card"><div class="lc-product-section-head"><h2>Pilot measurement brief</h2><span>Not available</span></div><p>The planning workspace will become available after its additive database migration is applied.</p><span class="lc-product-note">No product event collection or operator integration is implied.</span></section>`;
    }
    const brief = state.pilotBriefs.find((row) => row.industry_subtype === subtype);
    if (brief && brief.status !== "draft") {
      const hypothesis = PILOT_HYPOTHESES.find(([value]) => value === brief.primary_hypothesis)?.[1] || brief.primary_hypothesis;
      const labels = (brief.observed_events || []).map((value) => PILOT_EVENTS.find(([eventName]) => eventName === value)?.[1] || value);
      return `<section class="lc-product-card"><div class="lc-product-section-head"><h2>Pilot measurement brief</h2><span>${safe(brief.status)}</span></div><h3>${safe(hypothesis)}</h3><p>${safe(brief.attribution_window_days)}-day attribution window · ${safe(labels.join(" · "))}</p><span class="lc-product-note">Submitted for review. This records a measurement plan, not validated performance, partner approval or production readiness.</span></section>`;
    }
    const selected = new Set(brief?.observed_events || ["creator_impression", "creator_profile_open", "creator_follow", "live_session_open", "handoff_intent", "handoff_return"]);
    return `<form class="lc-product-card lc-product-form" data-lc-form="pilot-brief">
      <div class="lc-product-section-head"><h2>Pilot measurement brief</h2><span>${brief ? "Draft saved" : "To be validated"}</span></div>
      <p>Define what a first pilot should learn before discussing commercial outcomes.</p>
      <select class="lc-product-select" name="primary_hypothesis">${PILOT_HYPOTHESES.map(([value, label]) => `<option value="${safe(value)}" ${brief?.primary_hypothesis === value ? "selected" : ""}>${safe(label)}</option>`).join("")}</select>
      <label class="lc-product-note" for="pilot-window">Attribution window (1–30 days)</label>
      <input class="lc-product-input" id="pilot-window" name="attribution_window_days" type="number" min="1" max="30" required value="${safe(brief?.attribution_window_days || 7)}">
      <h3>Observed LC events</h3>
      <div class="lc-product-actions">${PILOT_EVENTS.map(([value, label]) => `<label class="lc-product-chip ${selected.has(value) ? "active" : ""}"><input style="display:none" type="checkbox" name="observed_events" value="${safe(value)}" ${selected.has(value) ? "checked" : ""}>${safe(label)}</label>`).join("")}</div>
      <select class="lc-product-select" name="feed_readiness"><option value="not_available">Live feed: not available</option><option value="documentation_available" ${brief?.feed_readiness === "documentation_available" ? "selected" : ""}>Live feed: documentation available</option><option value="sandbox_available" ${brief?.feed_readiness === "sandbox_available" ? "selected" : ""}>Live feed: sandbox available</option></select>
      <select class="lc-product-select" name="handoff_readiness"><option value="not_available">Operator handoff: not available</option><option value="conceptual" ${brief?.handoff_readiness === "conceptual" ? "selected" : ""}>Operator handoff: conceptual URL flow</option><option value="sandbox_available" ${brief?.handoff_readiness === "sandbox_available" ? "selected" : ""}>Operator handoff: sandbox available</option></select>
      <textarea class="lc-product-textarea" name="notes" maxlength="1000" placeholder="Constraints, consent, market rules or data availability (optional)">${safe(brief?.notes || "")}</textarea>
      <div class="lc-product-actions"><button class="lc-product-btn secondary" type="submit" name="pilot_action" value="draft">SAVE DRAFT</button><button class="lc-product-btn" type="submit" name="pilot_action" value="submit">SUBMIT FOR REVIEW</button></div>
      <span class="lc-product-note">Readiness is self-reported and unverified. LC stores app-owned funnel events only; gameplay, wallet, KYC/AML, wagering and settlement remain outside LC.</span>
    </form>`;
  }

  function renderIndustryHome(view = state.businessView) {
    const subtype = state.industry?.subtype || state.current?.industry_subtype || "operator";
    const request = state.accessRequests.find((row) => row.industry_subtype === subtype);
    const provider = subtype === "provider";
    const isAdmin = subtype === "admin" || ["admin", "moderator"].includes(state.profile?.role);
    const sessions = state.creators.flatMap((item) => item.sessions.map((session) => ({ item, session })));
    const status = safe(request?.status || state.industry?.access_status || (isAdmin ? "privileged role required" : "not requested"));
    const creatorRows = state.creators.slice(0, 12).map((item) => `<tr><td><span class="lc-v4-table-person"><img src="${safe(avatar(item.profile))}" alt=""><b>${safe(profileName(item.profile))}</b></span></td><td>${safe(item.creator.verification_status || "unverified")}</td><td>${safe(item.creator.profile_status || "private")}</td><td>${safe(item.sessions[0] ? sessionStatusLabel(item.sessions[0]) : "No session")}</td></tr>`).join("");
    const liveRows = sessions.slice(0, 12).map(({ item, session }) => `<tr><td>${safe(profileName(item.profile))}</td><td>${safe(session.game)}</td><td>${safe(session.status)}</td><td>${safe(session.operator_name || "Not mapped")}</td><td>${safe(session.visibility || "private")}</td></tr>`).join("");
    const views = {
      overview: `<section class="lc-v4-business-hero"><div><span>${safe(subtype.toUpperCase())} WORKSPACE</span><h1>Creator-led Live Casino operations</h1><p>Configure and measure the path from creator discovery to licensed operator handoff without moving gameplay or funds into LC.</p></div><span class="lc-v4-status">Access · ${status}</span></section><section class="lc-v4-business-kpis"><article><b>${state.creators.length}</b><span>Visible creators</span></article><article><b>${sessions.filter(({ session }) => session.status === "live").length}</b><span>Live sessions</span></article><article><b>Not available</b><span>Connected adapters</span></article><article><b>To be validated</b><span>Return impact</span></article></section><section class="lc-product-card"><div class="lc-product-section-head"><h2>Operating model</h2><span>Confirmed boundary</span></div><div class="lc-product-flow"><span>Creator</span><span>Audience</span><span>Live intent</span><span>Licensed handoff</span><span>Return</span></div><p>Gameplay, wallet, KYC/AML, wagering, settlement and responsible-gaming operations remain with licensed operator/provider infrastructure.</p></section>`,
      creators: `<section class="lc-v4-business-title"><div><span>SUPPLY</span><h1>Creators</h1><p>Review discoverable creator identity and mapping readiness.</p></div><button class="lc-product-chip" type="button" disabled>Bulk actions · Not available</button></section><section class="lc-product-card lc-v4-table-wrap"><table class="lc-v4-table"><thead><tr><th>Creator</th><th>Verification</th><th>Publication</th><th>Next state</th></tr></thead><tbody>${creatorRows || `<tr><td colspan="4">No eligible creator records available.</td></tr>`}</tbody></table></section>`,
      campaigns: `<section class="lc-v4-business-title"><div><span>ACQUISITION</span><h1>Campaigns</h1><p>Define campaign source and creator context before measurement begins.</p></div><button class="lc-product-btn" type="button" disabled>NEW CAMPAIGN</button></section><section class="lc-v4-empty-workspace"><h2>No campaign configured</h2><p>Campaign configuration requires an approved operator context and measurement plan. No ROI or acquisition uplift is claimed.</p><span>To be validated</span></section>`,
      live: `<section class="lc-v4-business-title"><div><span>OPERATIONS</span><h1>Live</h1><p>Monitor normalized creator-session state without controlling gameplay.</p></div><span class="lc-v4-status">${sessions.filter(({ session }) => session.status === "live").length} Live</span></section><section class="lc-product-card lc-v4-table-wrap"><table class="lc-v4-table"><thead><tr><th>Creator</th><th>Game</th><th>Status</th><th>Operator mapping</th><th>Visibility</th></tr></thead><tbody>${liveRows || `<tr><td colspan="5">No session data available.</td></tr>`}</tbody></table></section>`,
      performance: `<section class="lc-v4-business-title"><div><span>EVIDENCE</span><h1>Performance</h1><p>App-owned observed events only. CAC, retention, GGR and ROI remain To be validated.</p></div></section>${renderPilotMeasurementBrief(subtype)}<section class="lc-product-card"><div class="lc-product-section-head"><h2>Attribution contract</h2><span>Observed events</span></div><div class="lc-product-flow"><span>Impression</span><span>Profile</span><span>Follow</span><span>Live</span><span>Handoff</span><span>Return</span></div></section>`,
      integrations: `<section class="lc-v4-business-title"><div><span>CONFIGURATION</span><h1>Integrations</h1><p>Provider-neutral contracts keep external adapters outside core product logic.</p></div><span class="lc-v4-status">No live connection</span></section><section class="lc-v4-integration-grid"><article><b>Catalog & tables</b><span>Not configured</span><p>Normalized ingestion contract; official API docs required.</p></article><article><b>Creator mapping</b><span>Not configured</span><p>External dealer identity ↔ LC creator mapping.</p></article><article><b>Launch session</b><span>Sandbox unavailable</span><p>Server-side, tenant-scoped adapter and credentials required.</p></article><article><b>Webhooks</b><span>Not configured</span><p>Signature verification, idempotency and replay protection required.</p></article></section>`,
      safety: `<section class="lc-v4-business-title"><div><span>TRUST & SAFETY</span><h1>${isAdmin ? "Moderation control" : "Safety"}</h1><p>Reports, account states and creator controls remain role- and tenant-scoped.</p></div><span class="lc-v4-status">Fail closed</span></section><section class="lc-v4-safety-grid"><article><h2>Reports</h2><b>Private queue</b><p>Report ownership and moderation visibility are isolated by policy.</p></article><article><h2>Account status</h2><b>No client escalation</b><p>Suspended accounts are denied; users cannot approve themselves.</p></article><article><h2>Audit</h2><b>${isAdmin ? "Privileged visibility" : "Restricted"}</b><p>Administrative actions require authorized backend roles.</p></article></section>`,
      settings: `<section class="lc-v4-business-title"><div><span>WORKSPACE</span><h1>Settings</h1><p>Organization, environment and access configuration.</p></div></section><section class="lc-product-card"><div class="lc-product-section-head"><h2>Organization</h2><span>${status}</span></div><p>${safe(state.industry?.company_name || (state.demo ? "Illustrative organization" : "Company profile not completed"))}</p>${isAdmin ? `<span class="lc-product-note">Admin permissions come from the protected account role, never this product view.</span>` : `<button class="lc-product-btn" type="button" data-lc-request-access="${safe(subtype)}">REQUEST PARTNERSHIP ACCESS</button><span class="lc-product-note">Submission cannot self-approve access or configure production integration.</span>`}</section>`
    };
    const selected = Object.prototype.hasOwnProperty.call(views, view) ? view : "overview";
    state.businessView = selected;
    shell().dataset.lcBusinessView = selected;
    shell().innerHTML = `${top(isAdmin ? "LC Control" : provider ? "Provider Back Office" : "Operator Back Office", selected.charAt(0).toUpperCase() + selected.slice(1))}<div class="lc-product-stack lc-v4-business-workspace">${views[selected]}</div>`;
  }

  function renderCreatorDetail(id) {
    const item = state.creators.find((entry) => entry.profile.id === id);
    if (!item) return renderMissing("Creator unavailable", "This creator is not available in the current context.", "Back to Discover");
    state.selectedCreator = id;
    void trackProductEvent("creator_profile_open", { creatorId: id, dedupeKey: `profile:${id}` });
    const next = item.sessions[0];
    const isLive = next?.status === "live";
    const following = state.follows.has(item.profile.id);
    const gamesLabel = (item.creator.games || []).join(" · ") || "Live Casino";
    const languageLabel = (item.creator.languages || item.profile.languages || []).join(" · ") || "Language not listed";
    shell().innerHTML = `${top(profileName(item.profile), isLive ? "Live now" : "Creator profile")}
      <div class="lc-product-stack lc-v3-creator-profile">
        <section class="lc-v3-profile-hero">
<img class="lc-v3-profile-cover" src="${safe(visualImage(item.profile))}" alt=""><div class="lc-v3-featured-shade"></div>
<div class="lc-v3-profile-status"><span class="lc-v3-live-pill ${isLive ? "is-live" : ""}">${safe(sessionStatusLabel(next))}</span></div>
<div class="lc-v3-profile-copy"><h1>${safe(profileName(item.profile))}</h1><p>${safe(item.creator.headline || "Live Casino creator")}</p><div class="lc-v3-meta-line"><span>${safe(gamesLabel)}</span><span>${safe(languageLabel)}</span>${item.profile.country ? `<span>${safe(item.profile.country)}</span>` : ""}</div></div>
        </section>
        <section class="lc-v3-profile-actions"><button class="lc-product-btn ${following ? "secondary active" : ""}" type="button" data-lc-follow="${safe(item.profile.id)}">${following ? "FOLLOWING" : "FOLLOW"}</button>${creatorLiveAlertControl(item.profile.id)}${next ? `<button class="lc-product-btn" type="button" data-lc-live="${safe(next.id)}">${isLive ? `PLAY WITH ${safe(profileName(item.profile)).toUpperCase()}` : "VIEW NEXT SESSION"}</button>` : ""}</section>

        <section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">ABOUT</span><h2>Why follow ${safe(profileName(item.profile))}</h2></div></div><p class="lc-v3-body-copy">${safe(item.profile.bio || item.creator.headline || "Follow this creator to keep their identity, schedule and Live status connected across sessions.")}</p><div class="lc-v3-identity-strip"><span>${safe(item.creator.affiliation_name || "Affiliation not listed")}</span><span>${safe(item.creator.affiliation_verification_status || "unverified")}</span></div></section>

        ${next ? `<section class="lc-v3-next-session"><div><span class="lc-v3-kicker">${isLive ? "LIVE SESSION" : "NEXT SESSION"}</span><h2>${safe(next.game)} · ${safe(next.title || "Live session")}</h2><p>${safe(next.operator_name || "Operator to be confirmed")} · ${safe(sessionLine(next))}</p></div><div class="lc-product-actions">${isLive ? `<button class="lc-product-btn" type="button" data-lc-live="${safe(next.id)}">OPEN LIVE</button>` : `<button class="lc-product-btn ${state.reminders.has(next.id) ? "secondary" : ""}" type="button" data-lc-reminder="${safe(next.id)}">${state.reminders.has(next.id) ? "REMINDER SET" : "REMIND ME"}</button>`}</div></section>` : `<section class="lc-product-card lc-product-empty"><h2>No session scheduled</h2><p>Follow this creator to keep them in your feed when a new session appears.</p></section>`}

        ${item.posts.length ? `<section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">CONTENT</span><h2>Recent updates</h2></div><span>${item.posts.length}</span></div><div class="lc-v3-content-grid">${item.posts.slice(0,3).map((p, index) => `<article class="lc-v3-content-card ${index === 0 ? "featured" : ""}"><img src="${safe(visualImage(item.profile))}" alt=""><div><small>${safe(new Date(p.created_at).toLocaleString())}</small><p>${safe(p.body)}</p></div></article>`).join("")}</div></section>` : ""}

        ${item.sessions.length > 1 ? `<section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">SCHEDULE</span><h2>Upcoming</h2></div></div>${item.sessions.slice(1).map((s) => `<div class="lc-v3-session-row"><div><b>${safe(s.game)} · ${safe(s.title || "Live session")}</b><span>${safe(sessionLine(s))}</span></div>${s.status === "scheduled" ? `<button class="lc-product-chip ${state.reminders.has(s.id) ? "active" : ""}" type="button" data-lc-reminder="${safe(s.id)}">${state.reminders.has(s.id) ? "Saved" : "Remind me"}</button>` : `<button class="lc-product-chip" type="button" data-lc-live="${safe(s.id)}">Open</button>`}</div>`).join("")}</section>` : ""}

        ${!state.demo ? `<section class="lc-v3-safety-footer"><button type="button" data-lc-creator-safety="report" data-lc-creator-id="${safe(id)}">Report</button><span>·</span><button type="button" data-lc-creator-safety="block" data-lc-creator-id="${safe(id)}">Block</button></section>` : ""}
      </div>${tabs("explore")}`;
  }

  function renderCreatorSafety(id, mode) {
    const item = state.creators.find((entry) => entry.profile.id === id);
    if (!item) return renderMissing("Creator unavailable", "This Creator is no longer available in discovery.", "Back to Discover");
    const name = profileName(item.profile);
    const report = mode === "report";
    shell().innerHTML = `${top(report ? "Report Creator" : "Block Creator", "Safety control")}
      <div class="lc-product-stack">
        <section class="lc-product-card"><div class="lc-product-row"><img src="${safe(avatar(item.profile))}" alt=""><div class="lc-product-row-main"><b>${safe(name)}</b><span>${safe(item.profile.username ? "@" + item.profile.username : "Creator profile")}</span></div></div></section>
        ${report ? `<form class="lc-product-card lc-product-form" data-lc-form="creator-report" data-lc-creator-id="${safe(id)}"><h2>Why are you reporting this profile?</h2><select class="lc-product-select" name="reason">${reportReasons.map(([value, label]) => `<option value="${safe(value)}">${safe(label)}</option>`).join("")}</select><textarea class="lc-product-textarea" name="description" maxlength="500" placeholder="Optional context for the moderation team"></textarea><span class="lc-product-note">Your report is private. Submission does not automatically remove or penalize the profile.</span><div class="lc-product-actions"><button class="lc-product-btn" type="submit">SUBMIT REPORT</button><button class="lc-product-chip" type="button" data-lc-open-creator="${safe(id)}">Cancel</button></div></form>` : `<section class="lc-product-card"><h2>Remove ${safe(name)} from your experience?</h2><p>You will no longer see this Creator in LC discovery. New follow interactions between your accounts will be denied while the block is active.</p><span class="lc-product-note">Blocking is private and can be reversed from Account → Safety.</span><div class="lc-product-actions"><button class="lc-product-btn" type="button" data-lc-confirm-block="${safe(id)}">BLOCK CREATOR</button><button class="lc-product-chip" type="button" data-lc-open-creator="${safe(id)}">Cancel</button></div></section>`}
      </div>${tabs("explore")}`;
  }

  function renderBlockedCreators() {
    shell().innerHTML = `${top("Blocked Creators", "Account safety")}
      <div class="lc-product-stack">
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>Blocked profiles</h2><span>${state.blockedIds.size}</span></div><p>Blocked Creators are removed from discovery and cannot start new follow interactions with your account.</p></section>
        <section class="lc-product-card">${state.blockedProfiles.length ? state.blockedProfiles.map((profile) => `<div class="lc-product-row"><img src="${safe(avatar(profile))}" alt=""><div class="lc-product-row-main"><b>${safe(profileName(profile))}</b><span>${safe(profile.username ? "@" + profile.username : "Blocked profile")}</span></div><button class="lc-product-chip" type="button" data-lc-unblock="${safe(profile.id)}">Unblock</button></div>`).join("") : `<div class="lc-product-empty">No blocked Creators.</div>`}</section>
        <button class="lc-product-btn secondary" type="button" data-lc-product="account">BACK TO ACCOUNT</button>
      </div>${tabs("profile")}`;
  }

  function renderLive(sessionId) {
    const found = findSessionEntry(sessionId);
    const item = found?.entry;
    const session = found?.session;
    if (!item || !session) return renderMissing("Session unavailable", "This Live context is no longer available.", "Back to Discover");
    state.selectedCreator = item.profile.id;
    state.selectedSession = session.id;
    void trackProductEvent("live_session_open", { creatorId: item.profile.id, sessionId: session.id, dedupeKey: `live:${session.id}` });
    const isLive = session.status === "live";
    const following = state.follows.has(item.profile.id);
    shell().innerHTML = `${top(isLive ? "Live now" : "Upcoming", profileName(item.profile))}
      <div class="lc-product-stack lc-v3-live-screen">
        <section class="lc-v3-live-stage">
<img src="${safe(visualImage(item.profile))}" alt=""><div class="lc-v3-featured-shade"></div>
<div class="lc-v3-live-stage-top"><span class="lc-v3-live-pill ${isLive ? "is-live" : ""}">${safe(sessionStatusLabel(session))}</span><span>${safe(session.game)}</span></div>
<div class="lc-v3-live-stage-copy"><span class="lc-v3-kicker">${safe(session.operator_name || "Operator to be confirmed")}</span><h1>${safe(profileName(item.profile))}</h1><p>${safe(session.title || "Live table session")} · ${safe(new Date(session.starts_at).toLocaleString())}</p></div>
        </section>
        <section class="lc-v3-live-cta">
${isLive ? `<button class="lc-product-btn lc-v3-primary-wide" type="button" data-lc-product="handoff">CONTINUE TO PLAY WITH ${safe(profileName(item.profile)).toUpperCase()}</button>` : `<button class="lc-product-btn lc-v3-primary-wide ${state.reminders.has(session.id) ? "secondary" : ""}" type="button" data-lc-reminder="${safe(session.id)}">${state.reminders.has(session.id) ? "REMINDER SET" : "REMIND ME WHEN IT STARTS"}</button>`}
<button class="lc-product-btn secondary ${following ? "active" : ""}" type="button" data-lc-follow="${safe(item.profile.id)}">${following ? "FOLLOWING" : "FOLLOW CREATOR"}</button>
        </section>
        <section class="lc-v3-context-card"><span class="lc-v3-kicker">WHY THIS SCREEN EXISTS</span><h2>Keep the person, not just the table.</h2><p>LC connects creator identity, follow state, schedule and Live intent. The licensed operator remains responsible for gameplay and the regulated transaction.</p><div class="lc-v3-boundary-grid"><div><b>LC keeps</b><span>Creator · Follow · Schedule · Return context</span></div><div><b>Operator keeps</b><span>Game · Wallet · KYC/AML · Wagering · Settlement</span></div></div></section>
        <button class="lc-v3-text-link" type="button" data-lc-open-creator="${safe(item.profile.id)}">View ${safe(profileName(item.profile))}'s profile</button>
      </div>${tabs("explore")}`;
  }

  function renderHandoff(sessionId = state.selectedSession) {
    const found = findSessionEntry(sessionId);
    if (!found) return renderMissing("Handoff unavailable", "The selected table context is not available.", "Back to Discover");
    const { entry, session } = found;
    if (session.status !== "live") return renderMissing("Session not Live", "Operator handoff becomes available when this Creator session is Live.", "Back to Discover");
    state.selectedCreator = entry.profile.id;
    state.selectedSession = session.id;
    void trackProductEvent("handoff_intent", { creatorId: entry.profile.id, sessionId: session.id, confidence: "direct", dedupeKey: `handoff:${session.id}` });
    shell().innerHTML = `${top("Continue to operator", `${session.game} with ${profileName(entry.profile)}`)}
      <div class="lc-product-stack lc-v3-handoff">
        <section class="lc-v3-handoff-hero"><img src="${safe(visualImage(entry.profile))}" alt=""><div class="lc-v3-featured-shade"></div><div class="lc-v3-handoff-copy"><span class="lc-v3-live-pill is-live">LIVE</span><h1>You are leaving LC App to play.</h1><p>${safe(profileName(entry.profile))} · ${safe(session.game)} · ${safe(session.operator_name || "Operator to be confirmed")}</p></div></section>
        <section class="lc-v3-handoff-boundary"><div class="lc-v3-boundary-icon">LC</div><div><b>LC creates and measures the handoff intent.</b><span>Gameplay, money movement, KYC/AML and responsible-gaming controls stay with the licensed operator.</span></div></section>
        <section class="lc-v3-handoff-actions"><button class="lc-product-btn lc-v3-primary-wide" type="button" data-lc-return-live="${safe(session.id)}">SIMULATE OPERATOR RETURN</button><button class="lc-product-btn secondary" type="button" data-lc-open-creator="${safe(entry.profile.id)}">BACK TO CREATOR</button><span class="lc-product-note">${state.demo ? "Demo flow only." : "Conceptual handoff only."} No production operator integration is claimed.</span></section>
        <section class="lc-v3-context-card"><span class="lc-v3-kicker">RETURN LOOP</span><h2>The game session can end. The creator relationship does not have to.</h2><p>When the player returns, LC can preserve who drove the intent and reconnect the player with the same creator, follow state and future schedule.</p></section>
      </div>${tabs("explore")}`;
  }

  function renderMissing(title, body, action) {
    shell().innerHTML = `${top(title, "Product state")}
      <div class="lc-product-stack">
        <section class="lc-product-card lc-product-empty"><h2>${safe(title)}</h2><p>${safe(body)}</p><div class="lc-product-actions"><button class="lc-product-btn" type="button" data-lc-product="discover">${safe(action || "Back to Discover")}</button></div></section>
      </div>${tabs("explore")}`;
  }

  function renderAccount() {
    const persona = state.current?.persona || "none";
    shell().innerHTML = `${top("Profile", "Your LC App experience")}
      <div class="lc-product-stack lc-v3-account">
        <section class="lc-v3-account-hero"><img src="${safe(avatar(state.profile))}" alt=""><div><span class="lc-v3-kicker">ACCOUNT</span><h1>${safe(profileName(state.profile))}</h1><p>${safe(state.profile.username ? "@" + state.profile.username : "LC App user")} · ${safe(persona)}</p></div></section>
        <section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">EXPERIENCE</span><h2>Switch perspective</h2></div></div><p class="lc-v3-body-copy">Product personas change what you see. They never change your security role.</p><div class="lc-v3-persona-switch"><button class="lc-product-chip ${persona === "player" ? "active" : ""}" type="button" data-lc-persona="player">Player</button><button class="lc-product-chip ${persona === "creator" ? "active" : ""}" type="button" data-lc-persona="creator">Creator</button><button class="lc-product-chip ${persona === "industry" ? "active" : ""}" type="button" data-lc-persona="industry">Industry</button></div></section>
        ${persona === "player" && state.player ? `<section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">DISCOVERY PREFERENCES</span><h2>Your feed signals</h2></div></div><div class="lc-v3-account-pref"><div><b>Games</b><span>${safe((state.player.favorite_games || []).join(" · ") || "Not set")}</span></div><div><b>Languages</b><span>${safe((state.player.preferred_languages || []).join(" · ") || "Not set")}</span></div></div></section>` : ""}
        ${state.demo ? "" : `<section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">LIVE SIGNALS</span><h2>Creator return alerts</h2></div><span>${state.returnSignalsAvailable ? (state.liveSignalsEnabled ? "On" : "Muted") : "Backend pending"}</span></div><p class="lc-v3-body-copy">In-app signals only when a followed, eligible Creator becomes Live.</p><button class="lc-product-chip ${state.liveSignalsEnabled ? "active" : ""}" type="button" data-lc-live-signals ${state.returnSignalsAvailable ? "" : "disabled"}>${state.liveSignalsEnabled ? "MUTE LIVE SIGNALS" : "ENABLE LIVE SIGNALS"}</button></section>`}
        ${state.demo ? "" : `<section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">SAFETY & PRIVACY</span><h2>Account controls</h2></div></div><div class="lc-v3-settings-list"><button type="button" data-lc-blocked-list><span><b>Blocked creators</b><small>${state.blockedIds.size} blocked</small></span><i>›</i></button><button type="button" data-auth-route="profile"><span><b>Profile, password & deletion</b><small>Secure account settings</small></span><i>›</i></button></div></section>`}
        <section class="lc-v3-section"><div class="lc-v3-section-head"><div><span class="lc-v3-kicker">SECURITY</span><h2>Account boundary</h2></div><span>${safe(state.profile.role || "user")}</span></div><p class="lc-v3-body-copy">Security role is separate from Player, Creator and Industry product experiences.</p></section>
        <section class="lc-v3-signout"><button class="lc-product-btn secondary" type="button" ${state.demo ? "data-lc-demo-exit" : "data-auth-route=\"logout\""}>${state.demo ? "BACK TO OPENING" : "SIGN OUT"}</button></section>
      </div>${tabs("profile")}`;
  }

  async function toggleLiveSignals() {
    if (!state.returnSignalsAvailable) return;
    const enabled = !state.liveSignalsEnabled;
    const { error } = await state.client.from("return_signal_preferences").upsert({
      user_id: state.profile.id,
      creator_live_enabled: enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) throw error;
    state.liveSignalsEnabled = enabled;
  }

  function routeHome() {
    if (!state.current) return renderPersonaChoice();
    if (state.current.persona === "player" && !state.player?.onboarding_completed) return renderPlayerOnboarding();
    if (state.current.persona === "creator" && !state.creator?.onboarding_completed) return renderCreatorOnboarding();
    if (["player", "creator"].includes(state.current.persona)) {
      if (state.socialView === "explore") return renderSocialExplore();
      if (state.socialView === "create") return renderSocialCreate();
      if (state.socialView === "activity") return renderSocialActivity();
      if (state.socialView === "profile") return renderAccount();
      return renderPlayerHome();
    }
    if (state.current.persona === "industry") return state.industry?.onboarding_completed ? renderIndustryHome(state.businessView) : renderIndustryOnboarding();
    return renderPersonaChoice();
  }

  async function savePlayer(form) {
    const favorite_games = values(form, "games");
    const preferred_languages = values(form, "languages");
    if (!favorite_games.length || !preferred_languages.length) throw new Error("validation");
    if (state.demo) {
      state.player = { user_id: state.profile.id, favorite_games, preferred_languages, onboarding_completed: true };
      return;
    }
    const { error } = await state.client.from("player_preferences").upsert({
      user_id: state.profile.id,
      favorite_games,
      preferred_languages,
      onboarding_completed: true
    }, { onConflict: "user_id" });
    if (error) throw error;
    await completeCurrentPersona();
  }

  async function saveCreator(form) {
    const data = new FormData(form);
    const headline = String(data.get("headline") || "").trim().slice(0, 120);
    const bio = String(data.get("bio") || "").trim().slice(0, 280);
    const selectedGames = values(form, "games");
    const selectedLanguages = values(form, "languages");
    if (!headline || !selectedGames.length || !selectedLanguages.length) throw new Error("validation");
    if (state.demo) {
      state.creator = { ...state.creator, headline, games: selectedGames, languages: selectedLanguages, affiliation_type: String(data.get("affiliation_type") || "unlisted"), affiliation_name: String(data.get("affiliation_name") || "").trim().slice(0, 120) || null, profile_status: "published", onboarding_completed: true };
      return;
    }
    if (bio && bio !== state.profile.bio) {
      const { error: bioError } = await state.client.from("profiles").update({ bio }).eq("id", state.profile.id);
      if (bioError) throw bioError;
    }
    const affiliationType = String(data.get("affiliation_type") || "unlisted");
    const currentVerification = state.creator?.verification_status || "not_requested";
    const currentAffiliationVerification = state.creator?.affiliation_verification_status || "unverified";
    const verificationStatus = currentVerification === "not_requested" ? "submitted" : currentVerification;
    const affiliationVerificationStatus = affiliationType !== "unlisted" && currentAffiliationVerification === "unverified"
      ? "submitted"
      : currentAffiliationVerification;
    const creatorApproved = verificationStatus === "verified";
    const { error } = await state.client.from("creator_profiles").upsert({
      user_id: state.profile.id,
      headline,
      games: selectedGames,
      languages: selectedLanguages,
      affiliation_type: affiliationType,
      affiliation_name: String(data.get("affiliation_name") || "").trim().slice(0, 120) || null,
      verification_status: verificationStatus,
      affiliation_verification_status: affiliationVerificationStatus,
      profile_status: creatorApproved ? "published" : "draft",
      onboarding_completed: true
    }, { onConflict: "user_id" });
    if (error) throw error;
    await completeCurrentPersona();
  }

  async function saveIndustry(form) {
    const data = new FormData(form);
    const subtype = state.current?.industry_subtype || "operator";
    const payload = {
      user_id: state.profile.id,
      subtype,
      company_name: String(data.get("company_name") || "").trim().slice(0, 120),
      job_title: String(data.get("job_title") || "").trim().slice(0, 120),
      work_email: String(data.get("work_email") || "").trim().slice(0, 254),
      website_url: String(data.get("website_url") || "").trim().slice(0, 300) || null,
      interests: values(form, "interests"),
      onboarding_completed: true
    };
    if (!payload.company_name || !payload.job_title || !payload.work_email.includes("@")) throw new Error("validation");
    if (state.demo) {
      state.industry = { ...state.industry, ...payload, onboarding_completed: true };
      return;
    }
    const { error } = await state.client.from("industry_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    await completeCurrentPersona();
  }

  async function savePilotBrief(form, shouldSubmit = false) {
    const data = new FormData(form);
    const subtype = state.industry?.subtype || state.current?.industry_subtype || "operator";
    const hypothesis = String(data.get("primary_hypothesis") || "");
    const observedEvents = values(form, "observed_events");
    const attributionWindowDays = Number(data.get("attribution_window_days"));
    const feedReadiness = String(data.get("feed_readiness") || "not_available");
    const handoffReadiness = String(data.get("handoff_readiness") || "not_available");
    const existing = state.pilotBriefs.find((row) => row.industry_subtype === subtype);
    if (!PILOT_HYPOTHESES.some(([value]) => value === hypothesis)
      || !observedEvents.length
      || observedEvents.some((value) => !PILOT_EVENTS.some(([eventName]) => eventName === value))
      || !Number.isInteger(attributionWindowDays)
      || attributionWindowDays < 1
      || attributionWindowDays > 30
      || !["not_available", "documentation_available", "sandbox_available"].includes(feedReadiness)
      || !["not_available", "conceptual", "sandbox_available"].includes(handoffReadiness)
      || (existing && existing.status !== "draft")) throw new Error("validation");
    const payload = {
      user_id: state.profile.id,
      industry_subtype: subtype,
      primary_hypothesis: hypothesis,
      attribution_window_days: attributionWindowDays,
      observed_events: observedEvents,
      feed_readiness: feedReadiness,
      handoff_readiness: handoffReadiness,
      notes: String(data.get("notes") || "").trim().slice(0, 1000) || null,
      status: "draft"
    };
    if (state.demo) {
      const row = { ...existing, ...payload, id: existing?.id || `demo-pilot-${Date.now()}`, status: shouldSubmit ? "submitted" : "draft", updated_at: new Date().toISOString() };
      demoStore.pilotBriefs = [...demoStore.pilotBriefs.filter((item) => item.industry_subtype !== subtype), row];
      state.pilotBriefs = [...demoStore.pilotBriefs];
      return;
    }
    let id = existing?.id;
    if (existing) {
      const { error } = await state.client.from("pilot_measurement_briefs").update(payload).eq("id", existing.id).eq("user_id", state.profile.id).eq("status", "draft");
      if (error) throw error;
    } else {
      const { data: created, error } = await state.client.from("pilot_measurement_briefs").insert(payload).select("id").single();
      if (error) throw error;
      id = created.id;
    }
    if (shouldSubmit) {
      const { error } = await state.client.from("pilot_measurement_briefs").update({ status: "submitted" }).eq("id", id).eq("user_id", state.profile.id).eq("status", "draft");
      if (error) throw error;
    }
  }

  async function createPost(form) {
    const body = String(new FormData(form).get("body") || "").trim();
    if (!body) throw new Error("validation");
    if (state.demo) {
      demoStore.posts.unshift({ id: `demo-post-${Date.now()}`, author_id: state.profile.id, body, created_at: new Date().toISOString(), status: "active", deleted_at: null });
      return;
    }
    if (!creatorPublication().publicReady) throw new Error("not_verified");
    const { error } = await state.client.from("posts").insert({ author_id: state.profile.id, body, status: "active" });
    if (error) throw error;
    await loadOwnCreatorData();
  }

  async function createSession(form) {
    const data = new FormData(form);
    const starts = String(data.get("starts_at") || "");
    if (!starts || !Number.isFinite(new Date(starts).getTime()) || new Date(starts).getTime() <= Date.now()) throw new Error("validation");
    if (state.demo) {
      demoStore.sessions.unshift({
        id: `demo-session-${Date.now()}`,
        creator_id: state.profile.id,
        title: String(data.get("title") || "").trim().slice(0, 120) || "Live session",
        game: String(data.get("game") || "Blackjack"),
        operator_name: String(data.get("operator_name") || "").trim().slice(0, 120) || "Demo Casino",
        starts_at: new Date(starts).toISOString(),
        status: "scheduled",
        visibility: "public",
        provenance: "illustrative_demo_data"
      });
      return;
    }
    const { publicReady } = creatorPublication();
    const { error } = await state.client.from("creator_sessions").insert({
      creator_id: state.profile.id,
      title: String(data.get("title") || "").trim().slice(0, 120) || "Live session",
      game: String(data.get("game") || "Blackjack"),
      operator_name: String(data.get("operator_name") || "").trim().slice(0, 120) || null,
      starts_at: new Date(starts).toISOString(),
      status: "scheduled",
      visibility: publicReady ? "public" : "private",
      provenance: "user_generated"
    });
    if (error) throw error;
    await loadOwnCreatorData();
  }

  async function submitCreatorReport(form) {
    const data = new FormData(form);
    const targetId = form.dataset.lcCreatorId;
    const reason = String(data.get("reason") || "other");
    if (!targetId || !reportReasons.some(([value]) => value === reason)) throw new Error("validation");
    const { error } = await state.client.from("reports").insert({
      reporter_id: state.profile.id,
      target_type: "profile",
      target_id: targetId,
      reason,
      description: String(data.get("description") || "").trim().slice(0, 500) || null
    });
    if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
  }

  async function blockCreator(id) {
    if (!id || id === state.profile.id) throw new Error("validation");
    const { error } = await state.client.from("user_blocks").insert({ blocker_id: state.profile.id, blocked_id: id });
    if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
    state.selectedCreator = null;
    await loadState();
    await loadCreators();
  }

  async function unblockCreator(id) {
    const { error } = await state.client.from("user_blocks").delete().eq("blocker_id", state.profile.id).eq("blocked_id", id);
    if (error) throw error;
    await loadState();
    if (state.current?.persona === "player") await loadCreators();
  }

  async function setCreatorProfileStatus(profileStatus) {
    if (!state.creator || !["draft", "published"].includes(profileStatus)) throw new Error("validation");
    if (profileStatus === "published" && state.creator.verification_status !== "verified") throw new Error("not_verified");
    const { error } = await state.client.from("creator_profiles").update({ profile_status: profileStatus }).eq("user_id", state.profile.id);
    if (error) throw error;
    if (profileStatus === "draft") {
      const { error: sessionsError } = await state.client.from("creator_sessions").update({ visibility: "private" }).eq("creator_id", state.profile.id).eq("provenance", "user_generated").eq("visibility", "public");
      if (sessionsError) throw sessionsError;
    }
    await loadState();
  }

  async function updateCreatorSession(id, changes) {
    const session = state.sessions.find((row) => row.id === id);
    if (!session || session.provenance !== "user_generated") throw new Error("validation");
    const allowedTransitions = {
      scheduled: new Set(["scheduled", "live", "cancelled"]),
      live: new Set(["live", "completed", "cancelled"]),
      completed: new Set(["completed"]),
      cancelled: new Set(["cancelled"])
    };
    if (changes.status && !allowedTransitions[session.status]?.has(changes.status)) throw new Error("invalid_transition");
    if (changes.status === "live" && state.sessions.some((row) => row.id !== id && row.status === "live")) throw new Error("already_live");
    if (changes.visibility === "public" && !creatorPublication().publicReady) throw new Error("not_verified");
    if (changes.status === "live" && session.visibility !== "public") throw new Error("publish_first");
    const nextChanges = ["completed", "cancelled"].includes(changes.status)
      ? { ...changes, visibility: "private" }
      : changes;
    const { error } = await state.client.from("creator_sessions").update(nextChanges).eq("id", id).eq("creator_id", state.profile.id);
    if (error) throw error;
    await loadOwnCreatorData();
  }

  async function toggleFollow(id) {
    const wasFollowing = state.follows.has(id);
    const liveAlertsWereEnabled = state.creatorLiveAlerts.get(id) !== false;
    if (wasFollowing) {
      state.follows.delete(id);
      state.creatorLiveAlerts.delete(id);
      if (state.demo) {
        demoStore.follows.delete(id);
        demoStore.creatorLiveAlerts.delete(id);
        return;
      }
      const { error } = await state.client.from("follows").delete().eq("follower_id", state.profile.id).eq("following_id", id);
      if (error) {
        state.follows.add(id);
        state.creatorLiveAlerts.set(id, liveAlertsWereEnabled);
        throw error;
      }
    } else {
      state.follows.add(id);
      state.creatorLiveAlerts.set(id, true);
      if (state.demo) {
        demoStore.follows.add(id);
        demoStore.creatorLiveAlerts.set(id, true);
        return;
      }
      const { error } = await state.client.from("follows").insert({ follower_id: state.profile.id, following_id: id });
      if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) {
        state.follows.delete(id);
        state.creatorLiveAlerts.delete(id);
        throw error;
      }
    }
    void trackProductEvent("creator_follow", { creatorId: id, metadata: { action: state.follows.has(id) ? "follow" : "unfollow" } });
  }

  async function toggleCreatorLiveAlerts(id) {
    if (!state.follows.has(id) || !state.liveSignalsEnabled) throw new Error("not_eligible");
    const enabled = state.creatorLiveAlerts.get(id) === false;
    if (state.demo) {
      state.creatorLiveAlerts.set(id, enabled);
      demoStore.creatorLiveAlerts.set(id, enabled);
      return;
    }
    if (!state.returnSignalsAvailable || !state.creatorLiveAlertsAvailable) throw new Error("not_available");
    const { error } = await state.client.rpc("set_creator_live_alert_preference", { p_creator_id: id, p_enabled: enabled });
    if (error) throw error;
    state.creatorLiveAlerts.set(id, enabled);
    await loadReturnSignals();
  }

  async function toggleReminder(id) {
    const wasSet = state.reminders.has(id);
    const found = findSessionEntry(id);
    if (!wasSet && (!found || found.session.status !== "scheduled" || new Date(found.session.starts_at).getTime() <= Date.now())) throw new Error("not_eligible");
    if (wasSet) {
      state.reminders.delete(id);
      if (state.demo) {
        demoStore.reminders.delete(id);
        return;
      }
      const { error } = await state.client.from("player_session_reminders").delete().eq("user_id", state.profile.id).eq("session_id", id);
      if (error) {
        state.reminders.add(id);
        throw error;
      }
    } else {
      state.reminders.add(id);
      if (state.demo) {
        demoStore.reminders.add(id);
        return;
      }
      const { error } = await state.client.from("player_session_reminders").insert({ user_id: state.profile.id, session_id: id });
      if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) {
        state.reminders.delete(id);
        throw error;
      }
    }
    void trackProductEvent("schedule_reminder", { creatorId: found?.entry.profile.id, sessionId: id, metadata: { action: state.reminders.has(id) ? "set" : "remove" } });
  }

  async function likePost(id) {
    if (state.demo) {
      demoStore.likes.add(id);
      toast("Demo reaction saved");
      return;
    }
    const { error } = await state.client.from("post_likes").insert({ post_id: id, user_id: state.profile.id });
    if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
    toast("Reaction saved");
  }

  async function commentPost(form) {
    const body = String(new FormData(form).get("body") || "").trim();
    const postId = form.dataset.postId;
    if (!body || !postId) throw new Error("validation");
    if (state.demo) {
      demoStore.comments.push({ post_id: postId, body, created_at: new Date().toISOString() });
      form.reset();
      toast("Demo comment saved");
      return;
    }
    const { error } = await state.client.from("comments").insert({ post_id: postId, author_id: state.profile.id, body, status: "active" });
    if (error) throw error;
    form.reset();
    toast("Comment saved");
  }

  async function requestAccess(subtype) {
    if (state.demo) {
      demoStore.requests.add(subtype);
      state.accessRequests = [...demoStore.requests].map((industry_subtype) => ({ industry_subtype, status: "submitted", created_at: new Date().toISOString() }));
      toast("Demo request saved");
      return;
    }
    const { error } = await state.client.from("partnership_access_requests").insert({
      user_id: state.profile.id,
      industry_subtype: subtype,
      status: "submitted"
    });
    if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
    toast("Request submitted");
  }

  async function handleSubmit(event) {
    const form = event.target.closest("[data-lc-form]");
    if (!form || state.busy) return;
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    setBusy(button, true);
    try {
      const type = form.dataset.lcForm;
      if (type === "player") await savePlayer(form);
      if (type === "creator") await saveCreator(form);
      if (type === "industry") await saveIndustry(form);
      if (type === "pilot-brief") await savePilotBrief(form, event.submitter?.value === "submit");
      if (type === "post") await createPost(form);
      if (type === "session") await createSession(form);
      if (type === "creator-report") {
        await submitCreatorReport(form);
        await loadState();
        routeHome();
        toast("Report submitted privately");
        return;
      }
      if (type === "comment") await commentPost(form);
      if (type === "search") {
        state.search = String(new FormData(form).get("search") || "").trim().slice(0, 80);
        void trackProductEvent("discovery_search", { metadata: { has_query: Boolean(state.search), result_count: suggestedCreators().length } });
        state.socialView = "explore";
        renderSocialExplore();
        return;
      }
      if (state.demo) {
        refreshDemoData();
        routeHome();
        toast("Demo action saved");
        return;
      }
      await loadState();
      routeHome();
      toast("Saved");
    } catch (error) {
      toast(error.message === "validation" ? "Check the required fields." : err(error));
    } finally {
      setBusy(button, false);
    }
  }

  async function navigateProduct(value) {
    if (["overview", "creators", "campaigns", "live", "performance", "integrations", "safety", "settings"].includes(value)) {
      state.businessView = value;
      return renderIndustryHome(value);
    }
    if (["profile", "account"].includes(value)) {
      state.socialView = "profile";
      return renderAccount();
    }
    if (["explore", "discover"].includes(value)) {
      await loadCreators();
      state.socialView = "explore";
      return renderSocialExplore();
    }
    if (["create", "creator"].includes(value)) {
      state.socialView = "create";
      return renderSocialCreate();
    }
    if (value === "activity") {
      state.socialView = "activity";
      return renderSocialActivity();
    }
    if (value === "home") {
      state.socialView = "home";
      return renderPlayerHome();
    }
    return routeHome();
  }

  async function handleClick(event) {
    const target = event.target;
    const persona = target.closest("[data-lc-persona]");
    const industry = target.closest("[data-lc-industry]");
    const nav = target.closest("[data-lc-product]");
    const openCreator = target.closest("[data-lc-open-creator]");
    const live = target.closest("[data-lc-live]");
    const follow = target.closest("[data-lc-follow]");
    const creatorLiveAlerts = target.closest("[data-lc-creator-live-alerts]");
    const reminder = target.closest("[data-lc-reminder]");
    const like = target.closest("[data-lc-like]");
    const access = target.closest("[data-lc-request-access]");
    const demoPersona = target.closest("[data-lc-demo-persona]");
    const demoExit = target.closest("[data-lc-demo-exit]");
    const demoReset = target.closest("[data-lc-demo-reset]");
    const demoSwitch = target.closest("[data-lc-demo-switch]");
    const returnLive = target.closest("[data-lc-return-live]");
    const clearSearch = target.closest("[data-lc-clear-search]");
    const retry = target.closest("[data-lc-retry]");
    const notification = target.closest("[data-lc-notification]");
    const notificationsRead = target.closest("[data-lc-notifications-read]");
    const creatorProfileStatus = target.closest("[data-lc-creator-profile-status]");
    const sessionVisibility = target.closest("[data-lc-session-visibility]");
    const sessionStatus = target.closest("[data-lc-session-status]");
    const creatorSafety = target.closest("[data-lc-creator-safety]");
    const confirmBlock = target.closest("[data-lc-confirm-block]");
    const blockedList = target.closest("[data-lc-blocked-list]");
    const unblock = target.closest("[data-lc-unblock]");
    const liveSignals = target.closest("[data-lc-live-signals]");
    const discoveryFilter = target.closest("[data-lc-discovery-filter]");\n    const homeFilter = target.closest("[data-lc-home-filter]");\n    const businessView = target.closest("[data-lc-business-view]");\n    try {\n      if (homeFilter) {\n        event.preventDefault();\n        const value = homeFilter.dataset.lcHomeFilter;\n        if (!["for_you", "following"].includes(value)) return;\n        state.discoveryFilter = value;\n        state.socialView = "home";\n        void trackProductEvent("discovery_search", { metadata: { interaction: "home_filter", filter: value, result_count: suggestedCreators().length } });\n        renderPlayerHome();\n        return;\n      }\n      if (businessView) {
        event.preventDefault();
        state.businessView = businessView.dataset.lcBusinessView;
        renderIndustryHome(state.businessView);
        return;
      }
      if (discoveryFilter) {
        event.preventDefault();
        const value = discoveryFilter.dataset.lcDiscoveryFilter;
        if (!["for_you", "live", "following", "upcoming"].includes(value)) return;
        state.discoveryFilter = value;
        void trackProductEvent("discovery_search", { metadata: { interaction: "filter", filter: value, result_count: suggestedCreators().length } });
        state.socialView = "explore";
        renderSocialExplore();
        return;
      }
      if (liveSignals) {
        event.preventDefault();
        await toggleLiveSignals();
        renderAccount();
        toast(state.liveSignalsEnabled ? "Live signals enabled" : "Live signals muted");
        return;
      }
      if (creatorSafety) {
        event.preventDefault();
        return renderCreatorSafety(creatorSafety.dataset.lcCreatorId, creatorSafety.dataset.lcCreatorSafety);
      }
      if (confirmBlock) {
        event.preventDefault();
        await blockCreator(confirmBlock.dataset.lcConfirmBlock);
        renderPlayerHome();
        toast("Creator blocked");
        return;
      }
      if (blockedList) {
        event.preventDefault();
        return renderBlockedCreators();
      }
      if (unblock) {
        event.preventDefault();
        await unblockCreator(unblock.dataset.lcUnblock);
        renderBlockedCreators();
        toast("Creator unblocked");
        return;
      }
      if (creatorProfileStatus) {
        event.preventDefault();
        await setCreatorProfileStatus(creatorProfileStatus.dataset.lcCreatorProfileStatus);
        renderCreatorHome();
        toast(state.creator.profile_status === "published" ? "Creator profile published" : "Creator profile is private");
        return;
      }
      if (sessionVisibility) {
        event.preventDefault();
        await updateCreatorSession(sessionVisibility.dataset.lcSessionId, { visibility: sessionVisibility.dataset.lcSessionVisibility });
        renderCreatorHome();
        toast(sessionVisibility.dataset.lcSessionVisibility === "public" ? "Session published" : "Session is private");
        return;
      }
      if (sessionStatus) {
        event.preventDefault();
        await updateCreatorSession(sessionStatus.dataset.lcSessionId, { status: sessionStatus.dataset.lcSessionStatus });
        renderCreatorHome();
        toast(sessionStatus.dataset.lcSessionStatus === "live" ? "Session is live" : "Session updated");
        return;
      }
      if (retry) {
        event.preventDefault();
        return retryLoad(retry);
      }
      if (notification) {
        event.preventDefault();
        return openNotification(notification.dataset.lcNotification);
      }
      if (notificationsRead) {
        event.preventDefault();
        await markNotificationsRead();
        routeHome();
        return;
      }
      if (demoPersona) {
        event.preventDefault();
        return enterDemo(demoPersona.dataset.lcDemoPersona);
      }
      if (demoExit) {
        event.preventDefault();
        clear();
        resetDemoStore();
        if (window.location.hash !== "#/product") window.location.hash = "#/product";
        return renderDemoEntry();
      }
      if (demoSwitch && state.demo) {
        event.preventDefault();
        return renderDemoEntry();
      }
      if (demoReset && state.demo) {
        event.preventDefault();
        const personaValue = state.demoPersona || "player";
        setupDemo(personaValue, true);
        if (setProductHash(["demo", personaValue])) return;
        routeHome();
        toast("Demo reset");
        return;
      }
      if (persona) {
        event.preventDefault();
        const value = persona.dataset.lcPersona;
        if (state.demo) {
          if (value === "industry") return renderIndustrySubtype();
          return enterDemo(value);
        }
        if (value === "industry") return renderIndustrySubtype();
        await setCurrentPersona(value);
        return routeHome();
      }
      if (industry) {
        event.preventDefault();
        if (state.demo) return enterDemo(industry.dataset.lcIndustry);
        await setCurrentPersona("industry", industry.dataset.lcIndustry);
        return routeHome();
      }
      if (nav) {
        event.preventDefault();
        const value = nav.dataset.lcProduct;
        if (["profile", "account"].includes(value)) {
          state.socialView = "profile";
          return renderAccount();
        }
        if (["explore", "discover"].includes(value)) {
          await loadCreators();
          state.socialView = "explore";
          return renderSocialExplore();
        }
        if (["create", "creator"].includes(value)) {
          state.socialView = "create";
          return renderSocialCreate();
        }
        if (value === "activity") {
          state.socialView = "activity";
          return renderSocialActivity();
        }
        if (value === "home") {
          state.socialView = "home";
          return renderPlayerHome();
        }
        if (value === "handoff") {
          if (state.demo && state.selectedSession && setProductHash(["demo", state.demoPersona, "handoff", state.selectedSession])) return;
          return renderHandoff();
        }
        return routeHome();
      }
      if (clearSearch) {
        event.preventDefault();
        state.search = "";
        await loadCreators();
        state.socialView = "explore";
        return renderSocialExplore();
      }
      if (openCreator) {
        const id = openCreator.dataset.lcOpenCreator;
        if (state.demo && setProductHash(["demo", state.demoPersona, "creator", id])) return;
        return renderCreatorDetail(id);
      }
      if (live) {
        const id = live.dataset.lcLive;
        if (state.demo && setProductHash(["demo", state.demoPersona, "live", id])) return;
        return renderLive(id);
      }
      if (returnLive) {
        const id = returnLive.dataset.lcReturnLive;
        const found = findSessionEntry(id);
        void trackProductEvent("handoff_return", { creatorId: found?.entry.profile.id, sessionId: id, confidence: "direct" });
        if (state.demo) {
          if (found) addDemoNotification(`Returned from operator context to ${profileName(found.entry.profile)}. Follow, content and next session stayed connected.`, id);
        }
        if (state.demo && setProductHash(["demo", state.demoPersona, "live", id])) return;
        return renderLive(id);
      }
      if (follow) {
        await toggleFollow(follow.dataset.lcFollow);
        await loadCreators();
        return state.selectedCreator ? renderCreatorDetail(state.selectedCreator) : renderPlayerHome();
      }
      if (creatorLiveAlerts) {
        event.preventDefault();
        const id = creatorLiveAlerts.dataset.lcCreatorLiveAlerts;
        await toggleCreatorLiveAlerts(id);
        renderCreatorDetail(id);
        toast(state.creatorLiveAlerts.get(id) === false ? "Live alerts muted for this Creator" : "Live alerts enabled for this Creator");
        return;
      }
      if (reminder) {
        await toggleReminder(reminder.dataset.lcReminder);
        await loadCreators();
        return state.selectedCreator ? renderCreatorDetail(state.selectedCreator) : renderPlayerHome();
      }
      if (like) return likePost(like.dataset.lcLike);
      if (access) {
        await requestAccess(access.dataset.lcRequestAccess);
        if (state.demo) {
          refreshDemoData();
          return renderIndustryHome();
        }
        await loadState();
        return renderIndustryHome();
      }
    } catch (error) {
      toast(err(error));
      await loadState().catch(() => {});
      routeHome();
    }
  }

  async function mount({ client, profile, target = "product" }) {
    state.demo = false;
    state.demoPersona = null;
    state.client = client;
    state.profile = profile;
    state.discoveryFilter = "for_you";
    state.socialView = "home";
    state.businessView = "overview";
    state.ready = true;
    renderLoading();
    try {
      await loadState();
      state.loadError = null;
      renderProductTarget(productParts(target));
      void trackProductEvent("product_open", { dedupeKey: "product_open" });
    } catch (error) {
      renderLoadError(error);
    }
  }

  function clear() {
    state.client = null;
    state.discoveryFilter = "for_you";
    state.socialView = "home";
    state.businessView = "overview";
    state.profile = null;
    state.demo = false;
    state.demoPersona = null;
    state.personas = [];
    state.current = null;
    state.player = null;
    state.creator = null;
    state.industry = null;
    state.sessions = [];
    state.creators = [];
    state.posts = [];
    state.follows = new Set();
    state.creatorLiveAlerts = new Map();
    state.reminders = new Set();
    state.notifications = [];
    state.returnSignalsAvailable = true;
    state.creatorLiveAlertsAvailable = true;
    state.liveSignalsEnabled = true;
    state.accessRequests = [];
    state.blockedIds = new Set();
    state.blockedProfiles = [];
    state.search = "";
    state.loadError = null;
    state.retrying = false;
    state.analyticsAvailable = true;
    state.eventDedupe = new Set();
    hide();
  }

  function mountDemoEntry() {
    state.ready = true;
    const parts = productParts();
    if (parts[0] === "demo" && validDemoPersonas.has(parts[1])) {
      const preserveState = state.demo && state.demoPersona === parts[1];
      if (!preserveState) clear();
      setupDemo(parts[1], !preserveState);
      return renderProductTarget(parts.slice(2));
    }
    clear();
    renderDemoEntry();
  }

  function renderProductTarget(parts = []) {
    if (parts[0] === "creator" && parts[1]) return renderCreatorDetail(decodeURIComponent(parts[1]));
    if (parts[0] === "live" && parts[1]) return renderLive(decodeURIComponent(parts[1]));
    if (parts[0] === "handoff" && parts[1]) return renderHandoff(decodeURIComponent(parts[1]));
    if (parts[0] && !["demo"].includes(parts[0])) return renderMissing("Route not found", "This product link is not available.", "Back to Discover");
    return routeHome();
  }

  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("click", handleClick, true);
  window.addEventListener("offline", syncConnectivity);
  window.addEventListener("online", () => {
    syncConnectivity();
    if (state.loadError) retryLoad(null, true);
  });
  window.LCAppProduct = { mount, mountDemoEntry, clear, navigate: navigateProduct };
})();
