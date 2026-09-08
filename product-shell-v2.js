(() => {
  "use strict";

  const CSS_ID = "lcProductV2Css";
  const RAIL_ID = "lcProductV2Rail";
  const LOAD_ID = "lcProductV2Loading";
  const PRODUCT_SELECTOR = "#lcProductShell";
  const NAV_ITEMS = [
    ["home", "⌂", "Discover"],
    ["discover", "◎", "Creators"],
    ["creator", "+", "Create"],
    ["account", "◉", "Profile"]
  ];

  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = "product-shell-v2.css?v=1";
    document.head.appendChild(link);
  }

  function productRoot() {
    return document.querySelector(PRODUCT_SELECTOR);
  }

  function isProductRoute() {
    return /^#\/product(?:\/|$)/.test(window.location.hash || "#/product");
  }

  function currentRoute() {
    const parts = String(window.location.hash || "#/product")
      .replace(/^#\/?/, "")
      .split("?")[0]
      .split("/")
      .filter(Boolean);
    return parts[0] === "product" ? parts.slice(1) : [];
  }

  function currentPersonaLabel() {
    const chip = productRoot()?.querySelector(".lc-product-top [data-lc-product='account']");
    const raw = String(chip?.textContent || "").trim().toLowerCase();
    if (raw === "industry") return "Industry";
    if (raw === "creator") return "Creator";
    if (raw === "player") return "Player";
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Workspace";
  }

  function activeNav() {
    const route = currentRoute();
    if (route[0] === "creator") return "discover";
    if (route[0] === "live") return "discover";
    if (route[0] === "handoff") return "discover";
    const title = productRoot()?.querySelector(".lc-product-brand strong")?.textContent?.toLowerCase() || "";
    if (/account|profile|settings|safety|privacy/.test(title)) return "account";
    if (/creator home|create|session|content/.test(title) && currentPersonaLabel() === "Creator") return "creator";
    if (/discover|creator/.test(title)) return "discover";
    return "home";
  }

  function ensureRail() {
    const root = productRoot();
    if (!root || !isProductRoute()) return;
    root.dataset.lcV2Layout = "workspace";
    let rail = document.getElementById(RAIL_ID);
    if (!rail) {
      rail = document.createElement("aside");
      rail.id = RAIL_ID;
      rail.className = "lc-v2-rail";
      rail.setAttribute("aria-label", "LC App workspace navigation");
      rail.innerHTML = `
        <div class="lc-v2-rail-brand">
          <span class="lc-v2-mark" aria-hidden="true">LC</span>
          <div><strong>LC App</strong><span>Live Casino through people</span></div>
        </div>
        <nav class="lc-v2-rail-nav" aria-label="Primary workspace"></nav>
        <div class="lc-v2-rail-foot">
          <div class="lc-v2-network" data-lc-v2-network>Online</div>
          <div class="lc-v2-boundary">Discovery, creator identity and return live in LC. Gameplay, funds, KYC/AML and settlement stay with licensed operator/provider infrastructure.</div>
        </div>`;
      root.prepend(rail);
    }
    const nav = rail.querySelector(".lc-v2-rail-nav");
    if (nav && !nav.children.length) {
      NAV_ITEMS.forEach(([id, icon, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.lcProduct = id;
        button.innerHTML = `<span class="lc-v2-rail-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
        nav.appendChild(button);
      });
    }
    rail.querySelectorAll("[data-lc-product]").forEach((button) => {
      const active = button.dataset.lcProduct === activeNav();
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const network = rail.querySelector("[data-lc-v2-network]");
    if (network) {
      network.textContent = navigator.onLine ? `${currentPersonaLabel()} · Online` : `${currentPersonaLabel()} · Offline`;
      network.classList.toggle("offline", !navigator.onLine);
    }
  }

  function ensureLoadingBar() {
    if (document.getElementById(LOAD_ID)) return;
    const bar = document.createElement("div");
    bar.id = LOAD_ID;
    bar.className = "lc-v2-loading-bar";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }

  function normalizeNavigationCopy(root) {
    root.querySelectorAll(".lc-product-tabs button").forEach((button) => {
      const value = button.dataset.lcProduct;
      if (value === "home" && /industry/i.test(button.textContent || "")) return;
      if (value === "home" && /creator/i.test(button.textContent || "")) return;
      if (value === "home") button.textContent = "Discover";
      if (value === "discover") button.textContent = "Creators";
      if (value === "creator") button.textContent = "Create";
      if (value === "account") button.textContent = "Profile";
      const active = button.classList.contains("active");
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function improveSemantics(root) {
    root.setAttribute("role", "main");
    root.setAttribute("aria-label", "LC App product workspace");

    root.querySelectorAll("img").forEach((img) => {
      if (!img.hasAttribute("loading")) img.loading = "lazy";
      if (!img.hasAttribute("decoding")) img.decoding = "async";
      if (!img.getAttribute("alt")) {
        const card = img.closest(".lc-product-row,.lc-product-cinema,.lc-product-media-tile");
        const name = card?.querySelector("h1,h2,h3,b,strong")?.textContent?.trim();
        img.alt = name ? `${name} visual` : "LC App creator visual";
      }
    });

    root.querySelectorAll("button").forEach((button) => {
      if (!button.getAttribute("aria-label") && !String(button.textContent || "").trim()) {
        button.setAttribute("aria-label", "LC App action");
      }
    });

    const labelledFieldIds = new Set(Array.from(root.querySelectorAll("label[for]"), (label) => label.htmlFor).filter(Boolean));
    root.querySelectorAll("input,select,textarea").forEach((field) => {
      if (field.getAttribute("aria-label") || (field.id && labelledFieldIds.has(field.id))) return;
      const placeholder = field.getAttribute("placeholder");
      const name = field.getAttribute("name");
      if (placeholder || name) field.setAttribute("aria-label", placeholder || name.replace(/[_-]+/g, " "));
    });

    root.querySelectorAll(".lc-product-demo-banner").forEach((banner) => {
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-label", "Illustrative preview mode");
    });

    root.querySelectorAll(".lc-product-empty").forEach((empty) => {
      if (!empty.getAttribute("role")) empty.setAttribute("role", "status");
    });
  }

  function syncBusyState(root) {
    const busy = Boolean(root.querySelector("button:disabled:not(.lc-product-tabs button),[aria-busy='true']"));
    document.documentElement.classList.toggle("lc-v2-busy", busy);
  }

  function upgrade() {
    ensureCss();
    ensureLoadingBar();
    document.documentElement.classList.toggle("lc-product-v2", isProductRoute());
    const root = productRoot();
    if (!root || !isProductRoute()) return;
    ensureRail();
    normalizeNavigationCopy(root);
    improveSemantics(root);
    syncBusyState(root);
  }

  let raf = 0;
  const scheduleUpgrade = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(upgrade);
  };

  const observer = new MutationObserver(scheduleUpgrade);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "disabled", "aria-hidden"] });

  window.addEventListener("hashchange", scheduleUpgrade);
  window.addEventListener("online", scheduleUpgrade);
  window.addEventListener("offline", scheduleUpgrade);
  window.addEventListener("pageshow", scheduleUpgrade);
  document.addEventListener("DOMContentLoaded", scheduleUpgrade, { once: true });
  scheduleUpgrade();
})();
