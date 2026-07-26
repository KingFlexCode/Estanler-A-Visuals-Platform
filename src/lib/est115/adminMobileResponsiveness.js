const ADMIN_ROUTE_CLASSES = [
  "est115-admin-route",
  "est115-admin-dashboard",
  "est115-admin-portfolio",
  "est115-admin-galleries",
];

function currentRouteClass() {
  const { pathname } = window.location;
  if (pathname === "/admin") return "est115-admin-dashboard";
  if (pathname === "/admin/portfolio") return "est115-admin-portfolio";
  if (pathname === "/admin/galleries") return "est115-admin-galleries";
  return pathname.startsWith("/admin/") ? "est115-admin-route" : "";
}

function directChildren(element) {
  return element ? [...element.children] : [];
}

function markModalLayouts(root) {
  if (!root) return;

  root.querySelectorAll("div").forEach((element) => {
    if (element.style.position !== "fixed") return;
    if (!element.style.inset || !element.style.inset.startsWith("0")) return;

    element.classList.add("est115-admin-modal-overlay");
    const panel = element.firstElementChild;
    if (!panel) return;

    panel.classList.add("est115-admin-modal-panel");
    panel.firstElementChild?.classList.add("est115-admin-modal-header");
    const lastChild = panel.lastElementChild;
    if (lastChild?.style.display === "flex" && lastChild.style.borderTop) {
      lastChild.classList.add("est115-admin-modal-footer");
    }

    panel.querySelectorAll("div").forEach((child) => {
      const columns = child.style.gridTemplateColumns || "";
      if (columns.includes("repeat(2") || columns.includes("repeat(3")) {
        child.classList.add("est115-responsive-form-grid");
      }
      if (columns.includes("minmax(90px")) {
        child.classList.add("est115-upload-queue-row");
      }
      if (child.style.display === "flex" && child.style.borderTop) {
        child.classList.add("est115-admin-modal-actions");
      }
    });
  });
}

function markDashboard(root) {
  root?.querySelector(".admin-dashboard-shell")?.classList.add("est115-admin-main");
}

function markPortfolio(root) {
  const layout = root?.querySelector(".portfolio-manager-layout");
  if (!layout) return;

  const main = layout.closest("main");
  main?.classList.add("est115-admin-main", "est115-portfolio-main");

  const header = main?.firstElementChild;
  header?.classList.add("est115-page-header", "est115-portfolio-header");
  const headerActions = header?.lastElementChild;
  if (headerActions?.querySelector("button")) {
    headerActions.classList.add("est115-page-actions");
  }

  const [controlPanel, galleryPanel, previewPanel] = directChildren(layout);
  controlPanel?.classList.add("est115-portfolio-control-panel");
  galleryPanel?.classList.add("est115-portfolio-gallery-panel");
  previewPanel?.classList.add("est115-portfolio-preview-panel");

  if (galleryPanel) {
    const galleryChildren = directChildren(galleryPanel);
    galleryChildren[0]?.classList.add("est115-portfolio-filters");
    galleryChildren[1]?.classList.add("est115-portfolio-bulk-toolbar");

    galleryPanel.querySelectorAll("div").forEach((element) => {
      const columns = element.style.gridTemplateColumns || "";
      if (columns.includes("auto-fill") && columns.includes("135px")) {
        element.classList.add("est115-portfolio-card-grid");
      }
    });
  }

  root.querySelectorAll(".portfolio-left-panel, .portfolio-preview-panel").forEach((panel) => {
    panel.querySelectorAll("div").forEach((element) => {
      if ((element.style.gridTemplateColumns || "").includes("110px 1fr")) {
        element.classList.add("est115-metadata-row");
      }
    });
  });

  root.querySelectorAll(".featured-arranger-grid").forEach((grid) => {
    grid.classList.add("est115-featured-grid");
  });
}

function markGalleries(root) {
  const main = root?.querySelector("main");
  if (!main) return;

  main.classList.add("est115-admin-main", "est115-galleries-main");
  const header = main.firstElementChild;
  header?.classList.add("est115-page-header", "est115-galleries-header");

  const headerAction = header?.querySelector("button");
  headerAction?.classList.add("est115-page-primary-action");

  const cards = [...main.querySelectorAll("article")];
  if (cards.length) cards[0].parentElement?.classList.add("est115-gallery-card-grid");

  cards.forEach((card) => {
    card.classList.add("est115-gallery-card");
    const [body, actions] = directChildren(card);
    body?.classList.add("est115-gallery-card-body");
    actions?.classList.add("est115-gallery-card-actions");
    body?.firstElementChild?.classList.add("est115-gallery-card-meta");
  });
}

function classifyAdminDom() {
  const html = document.documentElement;
  const routeClass = currentRouteClass();

  ADMIN_ROUTE_CLASSES.forEach((className) => html.classList.remove(className));
  if (!routeClass) return;

  html.classList.add("est115-admin-route");
  if (routeClass !== "est115-admin-route") html.classList.add(routeClass);

  const root = document.getElementById("root");
  if (!root) return;

  if (routeClass === "est115-admin-dashboard") markDashboard(root);
  if (routeClass === "est115-admin-portfolio") markPortfolio(root);
  if (routeClass === "est115-admin-galleries") markGalleries(root);
  if (routeClass !== "est115-admin-route") markModalLayouts(root);
}

function injectResponsiveStyles() {
  if (document.getElementById("est115-admin-responsive-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-admin-responsive-styles";
  style.textContent = `
    html.est115-admin-route,
    html.est115-admin-route body,
    html.est115-admin-route #root {
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
      overflow-x: clip;
    }

    html.est115-admin-route *,
    html.est115-admin-route *::before,
    html.est115-admin-route *::after {
      box-sizing: border-box;
    }

    html.est115-admin-route .admin-platform-nav,
    html.est115-admin-route .admin-platform-nav__inner,
    html.est115-admin-route .admin-platform-nav__brand-row,
    html.est115-admin-route .admin-platform-nav__links,
    html.est115-admin-route .admin-platform-nav__actions,
    html.est115-admin-route .est115-admin-main,
    html.est115-admin-route .portfolio-manager-layout,
    html.est115-admin-route .portfolio-manager-layout > *,
    html.est115-admin-route .est115-gallery-card-grid,
    html.est115-admin-route .est115-gallery-card {
      min-width: 0;
      max-width: 100%;
    }

    html.est115-admin-route .est115-admin-modal-overlay {
      overflow: hidden !important;
      overscroll-behavior: contain;
    }

    html.est115-admin-route .est115-admin-modal-panel {
      max-width: 100% !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain;
    }

    @media (max-width: 920px) {
      html.est115-admin-route .admin-platform-nav__inner {
        gap: 0.75rem !important;
        padding: 0.75rem !important;
      }

      html.est115-admin-route .admin-platform-nav__brand-row {
        gap: 0.7rem !important;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav__links {
        margin: 0 -0.15rem;
        padding: 0 0.15rem 0.15rem;
        scroll-padding-inline: 0.15rem;
        -webkit-overflow-scrolling: touch;
      }

      html.est115-admin-route .admin-platform-nav__link,
      html.est115-admin-route .admin-platform-nav__utility,
      html.est115-admin-route .admin-platform-nav__button {
        align-items: center;
        display: inline-flex;
        min-height: 44px;
      }

      html.est115-admin-route .admin-platform-nav__actions {
        align-items: center !important;
        gap: 0.75rem !important;
      }

      html.est115-admin-route .est115-portfolio-main,
      html.est115-admin-route .est115-galleries-main {
        padding: 1.25rem 1rem 2rem !important;
      }

      html.est115-admin-route .portfolio-manager-layout {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-admin-route .est115-portfolio-gallery-panel {
        order: 1;
      }

      html.est115-admin-route .portfolio-left-panel,
      html.est115-admin-route .est115-portfolio-control-panel {
        order: 2;
      }

      html.est115-admin-route .portfolio-preview-panel,
      html.est115-admin-route .est115-portfolio-preview-panel {
        order: 3;
      }

      html.est115-admin-route .portfolio-left-panel,
      html.est115-admin-route .portfolio-preview-panel {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        position: static !important;
        width: 100%;
      }

      html.est115-admin-route .est115-portfolio-card-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important;
      }

      html.est115-admin-route .est115-featured-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      html.est115-admin-route .est115-gallery-card-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)) !important;
      }
    }

    @media (max-width: 700px) {
      html.est115-admin-route .admin-platform-nav__brand {
        justify-content: space-between;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav__links {
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav__actions {
        flex-wrap: wrap;
      }

      html.est115-admin-route .admin-dashboard-shell {
        padding: 1.1rem 0.85rem 2rem !important;
      }

      html.est115-admin-route .admin-dashboard-hero {
        margin-bottom: 1.35rem !important;
      }

      html.est115-admin-route .admin-dashboard-grid,
      html.est115-admin-route .admin-dashboard-action-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        margin-bottom: 2rem;
      }

      html.est115-admin-route .admin-dashboard-card {
        min-height: 0 !important;
        padding: 1.15rem !important;
      }

      html.est115-admin-route .admin-quick-action {
        min-height: 72px;
        padding: 1rem !important;
      }

      html.est115-admin-route .est115-page-header {
        align-items: stretch !important;
        flex-direction: column !important;
        gap: 1rem !important;
      }

      html.est115-admin-route .est115-page-actions {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
      }

      html.est115-admin-route .est115-page-actions > button,
      html.est115-admin-route .est115-page-primary-action {
        justify-content: center;
        min-height: 44px;
        width: 100%;
      }

      html.est115-admin-route .est115-portfolio-filters {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      html.est115-admin-route .est115-portfolio-filters > button,
      html.est115-admin-route .est115-portfolio-bulk-toolbar button {
        min-height: 44px;
        white-space: normal;
      }

      html.est115-admin-route .est115-portfolio-bulk-toolbar {
        align-items: stretch !important;
        flex-direction: column;
      }

      html.est115-admin-route .est115-portfolio-bulk-toolbar > div:last-child {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
      }

      html.est115-admin-route .est115-portfolio-gallery-panel,
      html.est115-admin-route .portfolio-left-panel,
      html.est115-admin-route .portfolio-preview-panel {
        padding: 0.85rem !important;
      }

      html.est115-admin-route .est115-gallery-card {
        min-height: 0 !important;
      }

      html.est115-admin-route .est115-gallery-card-body {
        padding: 1.1rem !important;
      }

      html.est115-admin-route .est115-gallery-card-meta {
        align-items: flex-start !important;
        flex-direction: column;
        gap: 0.65rem !important;
      }

      html.est115-admin-route .est115-gallery-card-meta > span {
        text-align: left !important;
      }

      html.est115-admin-route .est115-gallery-card-actions {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      html.est115-admin-route .est115-gallery-card-actions > button {
        min-height: 44px;
        white-space: normal !important;
      }

      html.est115-admin-route .est115-gallery-card-actions > button:last-child {
        grid-column: 1 / -1;
      }

      html.est115-admin-route .est115-admin-modal-overlay {
        align-items: flex-start !important;
        padding: 0.6rem !important;
      }

      html.est115-admin-route .est115-admin-modal-panel {
        max-height: calc(100dvh - 1.2rem) !important;
        width: 100% !important;
        overflow-y: auto !important;
      }

      html.est115-admin-route .est115-admin-modal-header,
      html.est115-admin-route .est115-admin-modal-footer,
      html.est115-admin-route .est115-admin-modal-panel > div {
        padding-right: 1rem !important;
        padding-left: 1rem !important;
      }

      html.est115-admin-route .est115-responsive-form-grid,
      html.est115-admin-route .est115-upload-queue-row {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-admin-route .est115-upload-queue-row > span:last-child {
        text-align: left !important;
      }

      html.est115-admin-route .est115-admin-modal-actions,
      html.est115-admin-route .est115-admin-modal-footer {
        align-items: stretch !important;
        flex-direction: column !important;
      }

      html.est115-admin-route .est115-admin-modal-actions > button,
      html.est115-admin-route .est115-admin-modal-footer > button {
        min-height: 44px;
        width: 100%;
      }

      html.est115-admin-route .est115-metadata-row {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-admin-route .est115-metadata-row > * {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }

    @media (max-width: 460px) {
      html.est115-admin-route .admin-platform-nav__brand-main {
        font-size: 13px !important;
      }

      html.est115-admin-route .admin-platform-nav__link {
        padding: 8px 9px !important;
      }

      html.est115-admin-route .est115-page-actions,
      html.est115-admin-route .est115-portfolio-filters,
      html.est115-admin-route .est115-portfolio-bulk-toolbar > div:last-child,
      html.est115-admin-route .est115-gallery-card-actions,
      html.est115-admin-route .est115-featured-grid {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-admin-route .est115-portfolio-card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }

      html.est115-admin-route .portfolio-manager-layout {
        gap: 0.8rem !important;
      }

      html.est115-admin-route .est115-gallery-card-actions > button:last-child {
        grid-column: auto;
      }
    }

    @media (hover: none) and (pointer: coarse) {
      html.est115-admin-route button,
      html.est115-admin-route a,
      html.est115-admin-route input,
      html.est115-admin-route select,
      html.est115-admin-route textarea {
        touch-action: manipulation;
      }

      html.est115-admin-route .admin-dashboard-card:hover,
      html.est115-admin-route .admin-quick-action:hover {
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installAdminMobileResponsiveness() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminMobileResponsivenessInstalled) return;

  window.__est115AdminMobileResponsivenessInstalled = true;
  injectResponsiveStyles();

  let frame = 0;
  const scheduleClassification = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(classifyAdminDom);
  };

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    const result = originalPushState(...args);
    scheduleClassification();
    return result;
  };

  window.history.replaceState = (...args) => {
    const result = originalReplaceState(...args);
    scheduleClassification();
    return result;
  };

  window.addEventListener("popstate", scheduleClassification);
  window.addEventListener("resize", scheduleClassification);

  const observer = new MutationObserver(scheduleClassification);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  scheduleClassification();
}
