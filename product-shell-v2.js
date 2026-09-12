(() => {
  "use strict";

  const CSS_ID = "lcProductV2Css";
  const V4_CSS_ID = "lcProductV4Css";
  const SOCIAL_FEED_CSS_ID = "lcSocialFeedV4Css";
  const CREATOR_STUDIO_CSS_ID = "lcCreatorStudioV4Css";
  const SOCIAL_ACCOUNT_CSS_ID = "lcSocialAccountV4Css";
  const SOCIAL_JOURNEY_CSS_ID = "lcSocialJourneyV4Css";
  const BUSINESS_CONSOLE_CSS_ID = "lcBusinessConsoleV4Css";
  const RAIL_ID = "lcProductV2Rail";
  const LOAD_ID = "lcProductV2Loading";
  const ROUTE_STATUS_ID = "lcProductRouteStatus";
  const PRODUCT_SELECTOR = "#lcProductShell";

  const SOCIAL_NAV = [
    ["home", "⌂", "Home"],
    ["explore", "◎", "Explore"],
    ["create", "+", "Create"],
    ["activity", "♡", "Activity"],
    ["profile", "◉", "Profile"]
  ];

  const BUSINESS_NAV = [
    ["overview", "▦", "Overview"],
    ["creators", "◎", "Creators"],
    ["campaigns", "◈", "Campaigns"],
    ["live", "●", "Live"],
    ["performance", "↗", "Performance"],
    ["integrations", "◇", "Integrations"],
    ["safety", "◉", "Safety"],
    ["settings", "⚙", "Settings"]
  ];

  function ensureCss() {
    let link = document.getElementById(CSS_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!/product-shell-v2\.css\?v=5$/.test(link.href)) link.href = "product-shell-v2.css?v=5";

    let v4 = document.getElementById(V4_CSS_ID);
    if (!v4) {
      v4 = document.createElement("link");
      v4.id = V4_CSS_ID;
      v4.rel = "stylesheet";
      document.head.appendChild(v4);
    }
    if (!/product-shell-v4\.css\?v=4$/.test(v4.href)) v4.href = "product-shell-v4.css?v=4";

    let socialFeed = document.getElementById(SOCIAL_FEED_CSS_ID);
    if (!socialFeed) {
      socialFeed = document.createElement("link");
      socialFeed.id = SOCIAL_FEED_CSS_ID;
      socialFeed.rel = "stylesheet";
      document.head.appendChild(socialFeed);
    }
    if (!/social-feed-v4\.css\?v=1$/.test(socialFeed.href)) socialFeed.href = "social-feed-v4.css?v=1";

    let creatorStudio = document.getElementById(CREATOR_STUDIO_CSS_ID);
    if (!creatorStudio) {
      creatorStudio = document.createElement("link");
      creatorStudio.id = CREATOR_STUDIO_CSS_ID;
      creatorStudio.rel = "stylesheet";
      document.head.appendChild(creatorStudio);
    }
    if (!/creator-studio-v4\.css\?v=1$/.test(creatorStudio.href)) creatorStudio.href = "creator-studio-v4.css?v=1";

    let socialAccount = document.getElementById(SOCIAL_ACCOUNT_CSS_ID);
    if (!socialAccount) {
      socialAccount = document.createElement("link");
      socialAccount.id = SOCIAL_ACCOUNT_CSS_ID;
      socialAccount.rel = "stylesheet";
      document.head.appendChild(socialAccount);
    }
    if (!/social-account-v4\.css\?v=2$/.test(socialAccount.href)) socialAccount.href = "social-account-v4.css?v=2";

    let socialJourney = document.getElementById(SOCIAL_JOURNEY_CSS_ID);
    if (!socialJourney) {
      socialJourney = document.createElement("link");
      socialJourney.id = SOCIAL_JOURNEY_CSS_ID;
      socialJourney.rel = "stylesheet";
      document.head.appendChild(socialJourney);
    }
    if (!/social-journey-v4\.css\?v=1$/.test(socialJourney.href)) socialJourney.href = "social-journey-v4.css?v=1";

    let businessConsole = document.getElementById(BUSINESS_CONSOLE_CSS_ID);
    if (!businessConsole) {
      businessConsole = document.createElement("link");
      businessConsole.id = BUSINESS_CONSOLE_CSS_ID;
      businessConsole.rel = "stylesheet";
      document.head.appendChild(businessConsole);
    }
    if (!/business-console-v4\.css\?v=2$/.test(businessConsole.href)) businessConsole.href = "business-console-v4.css?v=2";
  }

  const productRoot = () => document.querySelector(PRODUCT_SELECTOR);
  const isProductRoute = () => /^#\/product(?:\/|$)/.test(window.location.hash || "#/product");

  function currentRoute() {
    const parts = String(window.location.hash || "#/product").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
    return parts[0] === "product" ? parts.slice(1) : [];
  }

  function currentPersonaLabel() {
    const root = productRoot();
    const routePersona = currentRoute()[0] === "demo" ? currentRoute()[1] : "";
    if (["player", "creator", "operator", "provider", "admin"].includes(routePersona)) {
      return routePersona.charAt(0).toUpperCase() + routePersona.slice(1);
    }
    const chip = root?.querySelector(".lc-product-top [data-lc-product='profile'],.lc-product-top [data-lc-product='account']");
    const raw = String(chip?.textContent || "").trim().toLowerCase();
    if (["industry", "operator"].includes(raw)) return "Operator";
    if (raw === "provider") return "Provider";
    if (raw === "admin") return "Admin";
    if (raw === "creator") return "Creator";
    if (raw === "player") return "Player";
    if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
    const explicit = String(root?.dataset?.lcPersona || "").trim().toLowerCase();
    if (["player", "creator", "operator", "provider", "admin", "industry"].includes(explicit)) {
      return explicit === "industry" ? "Operator" : explicit.charAt(0).toUpperCase() + explicit.slice(1);
    }
    return "Player";
  }

  function productFamily() {
    const persona = currentPersonaLabel().toLowerCase();
    return ["operator", "provider", "admin", "industry"].includes(persona) ? "business" : "social";
  }

  function activeNav() {
    const root = productRoot();
    if (productFamily() === "business" && root?.dataset?.lcBusinessView) return root.dataset.lcBusinessView;
    if (productFamily() === "social" && root?.dataset?.lcSocialView) return root.dataset.lcSocialView;
    const route = currentRoute();
    const title = productRoot()?.querySelector(".lc-product-brand strong")?.textContent?.toLowerCase() || "";
    if (/account|profile|settings|safety|privacy/.test(title)) return "account";
    if (/notification|activity|signal/.test(title)) return "activity";
    if (["creator", "live", "handoff"].includes(route[0]) && productFamily() === "social") return "discover";
    if (/creator home|create|session|content/.test(title) && currentPersonaLabel() === "Creator") return "creator";
    if (/discover|explore|creator/.test(title)) return "discover";
    return "home";
  }

  function syncRouteState(root) {
    const route = currentRoute();
    const persona = currentPersonaLabel().toLowerCase();
    const family = productFamily();
    const routeKey = route.length ? route.join("-") : "home";
    root.dataset.lcRoute = routeKey;
    root.dataset.lcPersona = persona;
    root.dataset.lcFamily = family;
    document.documentElement.dataset.lcRoute = routeKey;
    document.documentElement.dataset.lcPersona = persona;
    document.documentElement.dataset.lcFamily = family;
    document.documentElement.classList.toggle("lc-v4-social", family === "social");
    document.documentElement.classList.toggle("lc-v4-business", family === "business");
  }

  function buildNavButton([id, icon, label], family = "social") {
    const button = document.createElement("button");
    button.type = "button";
    if (family === "business") button.dataset.lcBusinessView = id;
    else button.dataset.lcProduct = id;
    button.innerHTML = `<span class="lc-v2-rail-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
    return button;
  }

  function syncRail() {
    const root = productRoot();
    if (!root || !isProductRoute()) return;
    const family = productFamily();
    root.dataset.lcV2Layout = family === "business" ? "workspace" : "social";

    let rail = document.getElementById(RAIL_ID);
    if (family === "social") {
      rail?.remove();
      return;
    }

    if (!rail) {
      rail = document.createElement("aside");
      rail.id = RAIL_ID;
      rail.className = "lc-v2-rail lc-v4-business-rail";
      rail.setAttribute("aria-label", "LC App business navigation");
      rail.innerHTML = `
        <div class="lc-v2-rail-brand">
          <span class="lc-v2-mark" aria-hidden="true">LC</span>
          <div><strong>LC Business</strong><span>Operator & provider back office</span></div>
        </div>
        <nav class="lc-v2-rail-nav" aria-label="Business workspace"></nav>
        <div class="lc-v2-rail-foot">
          <div class="lc-v2-network" data-lc-v2-network>Online</div>
          <div class="lc-v2-boundary">LC manages discovery, creator relationships, configuration and observed attribution. Gameplay, funds, KYC/AML and settlement stay with licensed operator/provider infrastructure.</div>
        </div>`;
      root.prepend(rail);
    }

    const nav = rail.querySelector(".lc-v2-rail-nav");
    if (nav) {
      const expectedIds = BUSINESS_NAV.map(([id]) => id);
      const currentButtons = Array.from(nav.querySelectorAll(":scope > button[data-lc-business-view]"));
      const currentIds = currentButtons.map((button) => button.dataset.lcBusinessView);
      const structureMatches = currentIds.length === expectedIds.length
        && currentIds.every((id, index) => id === expectedIds[index]);
      if (!structureMatches) {
        nav.replaceChildren(...BUSINESS_NAV.map((item) => buildNavButton(item, "business")));
      }
      nav.querySelectorAll("[data-lc-business-view]").forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          void window.LCAppProduct?.navigate?.(button.dataset.lcBusinessView);
        };
        const active = button.dataset.lcBusinessView === activeNav();
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    }

    const network = rail.querySelector("[data-lc-v2-network]");
    if (network) {
      network.textContent = navigator.onLine ? `${currentPersonaLabel()} · Online` : `${currentPersonaLabel()} · Offline`;
      network.classList.toggle("offline", !navigator.onLine);
    }
  }

  function syncSocialTabs(root) {
    if (productFamily() !== "social") return;
    const tabs = root.querySelector(".lc-product-tabs");
    if (!tabs) return;
    const active = activeNav();
    const expectedIds = SOCIAL_NAV.map(([id]) => id);
    let buttons = Array.from(tabs.querySelectorAll(":scope > button[data-lc-product]"));
    const currentIds = buttons.map((button) => button.dataset.lcProduct);
    const structureMatches = currentIds.length === expectedIds.length
      && currentIds.every((id, index) => id === expectedIds[index]);
    if (!structureMatches) {
      tabs.replaceChildren(...SOCIAL_NAV.map((item) => buildNavButton(item, "social")));
      buttons = Array.from(tabs.querySelectorAll(":scope > button[data-lc-product]"));
    }

    buttons.forEach((button) => {
      const id = button.dataset.lcProduct;
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        void window.LCAppProduct?.navigate?.(id);
      };
      button.classList.toggle("active", active === id);
      if (active === id) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    tabs.setAttribute("aria-label", "Social app navigation");
  }

  function syncDemoSwitch(root) {
    root.querySelectorAll("[data-lc-demo-switch]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (window.location.hash !== "#/product") window.location.hash = "#/product";
        else window.LCAppProduct?.mountDemoEntry?.();
      };
    });
  }

  function handleDemoSwitch(event) {
    const button = event.target.closest?.("[data-lc-demo-switch]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.location.hash !== "#/product") {
      window.location.hash = "#/product";
      window.location.reload();
    } else {
      window.LCAppProduct?.mountDemoEntry?.();
    }
  }

  function primeDemoPersonaRoute(event) {
    const button = event.target.closest?.("[data-lc-demo-persona]");
    if (!button) return;
    const persona = button.dataset.lcDemoPersona;
    if (!["player", "creator", "operator", "provider", "admin"].includes(persona)) return;
    const next = `#/product/demo/${persona}`;
    if (window.location.hash !== next) window.location.hash = next;
  }

  function ensureLoadingBar() {
    if (document.getElementById(LOAD_ID)) return;
    const bar = document.createElement("div");
    bar.id = LOAD_ID;
    bar.className = "lc-v2-loading-bar";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }

  function ensureRouteStatus() {
    if (document.getElementById(ROUTE_STATUS_ID)) return;
    const status = document.createElement("div");
    status.id = ROUTE_STATUS_ID;
    status.className = "sr-only";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    document.body.appendChild(status);
  }

  let lastRouteAnnouncement = "";
  function announceRoute(root) {
    const heading = root.querySelector("h1,h2")?.textContent?.trim();
    const label = heading || root.querySelector(".lc-product-brand strong")?.textContent?.trim() || "LC App";
    const announcement = `${productFamily() === "business" ? "Business back office" : "Social app"}: ${label}`;
    if (announcement === lastRouteAnnouncement) return;
    lastRouteAnnouncement = announcement;
    const status = document.getElementById(ROUTE_STATUS_ID);
    if (status) status.textContent = announcement;
  }

  function improveSemantics(root) {
    root.setAttribute("role", "main");
    root.setAttribute("aria-label", productFamily() === "business" ? "LC App business back office" : "LC App social experience");

    root.querySelectorAll("img").forEach((img) => {
      if (!img.hasAttribute("loading")) img.loading = "lazy";
      if (!img.hasAttribute("decoding")) img.decoding = "async";
      if (!img.getAttribute("alt")) {
        const card = img.closest(".lc-product-row,.lc-product-cinema,.lc-product-media-tile,.lc-v3-live-card,.lc-v3-creator-row");
        const name = card?.querySelector("h1,h2,h3,b,strong")?.textContent?.trim();
        img.alt = name ? `${name} visual` : "LC App creator visual";
      }
    });

    root.querySelectorAll("button").forEach((button) => {
      if (!button.getAttribute("aria-label") && !String(button.textContent || "").trim()) button.setAttribute("aria-label", "LC App action");
      if (button.disabled) button.setAttribute("aria-disabled", "true");
      else button.removeAttribute("aria-disabled");
    });

    const labelledFieldIds = new Set(Array.from(root.querySelectorAll("label[for]"), label => label.htmlFor).filter(Boolean));
    root.querySelectorAll("input,select,textarea").forEach((field) => {
      if (!field.getAttribute("autocomplete") && field.tagName === "INPUT") field.setAttribute("autocomplete", "off");
      if (field.getAttribute("aria-label") || (field.id && labelledFieldIds.has(field.id))) return;
      const placeholder = field.getAttribute("placeholder");
      const name = field.getAttribute("name");
      if (placeholder || name) field.setAttribute("aria-label", placeholder || name.replace(/[_-]+/g, " "));
    });

    root.querySelectorAll(".lc-product-demo-banner").forEach((banner) => {
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-label", "Illustrative preview mode");
    });
    root.querySelectorAll(".lc-product-connectivity").forEach((banner) => {
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
    });
    root.querySelectorAll(".lc-product-empty").forEach((empty) => {
      if (!empty.getAttribute("role")) empty.setAttribute("role", "status");
    });
  }

  function syncBusyState(root) {
    const busy = root.getAttribute("aria-busy") === "true" || Boolean(root.querySelector("[aria-busy='true'],[data-lc-busy='true']"));
    document.documentElement.classList.toggle("lc-v2-busy", busy);
  }

  function syncScrollState() {
    const root = productRoot();
    if (!root) return;
    root.dataset.lcScrolled = root.scrollTop > 10 ? "true" : "false";
  }

  function upgrade() {
    ensureCss();
    ensureLoadingBar();
    ensureRouteStatus();
    document.documentElement.classList.toggle("lc-product-v2", isProductRoute());
    const root = productRoot();
    if (!root || !isProductRoute()) return;
    syncRouteState(root);
    syncRail();
    syncSocialTabs(root);
    syncDemoSwitch(root);
    improveSemantics(root);
    syncBusyState(root);
    syncScrollState();
    announceRoute(root);
  }

  let raf = 0;
  const scheduleUpgrade = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(upgrade);
  };

  const observer = new MutationObserver(scheduleUpgrade);
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class","hidden","disabled","aria-hidden"] });

  window.addEventListener("click", handleDemoSwitch, true);
  window.addEventListener("click", primeDemoPersonaRoute, true);
  document.addEventListener("scroll", (event) => {
    if (event.target === productRoot()) requestAnimationFrame(syncScrollState);
  }, true);
  window.addEventListener("hashchange", () => {
    const root = productRoot();
    if (root) root.scrollTo({ top:0, behavior:"auto" });
    scheduleUpgrade();
  });
  window.addEventListener("online", scheduleUpgrade);
  window.addEventListener("offline", scheduleUpgrade);
  window.addEventListener("pageshow", scheduleUpgrade);
  window.addEventListener("resize", scheduleUpgrade, { passive:true });
  document.addEventListener("DOMContentLoaded", scheduleUpgrade, { once:true });
  scheduleUpgrade();
})();
