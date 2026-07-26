const EDITOR_ROUTE_PATTERN = /^\/admin\/galleries\/[^/]+\/?$/;

function isGalleryEditorRoute() {
  return EDITOR_ROUTE_PATTERN.test(window.location.pathname);
}

function directChildren(element) {
  return element ? [...element.children] : [];
}

function updateToolsToggle(sidebar) {
  const toggle = sidebar?.querySelector(":scope > .est115-gallery-editor-tools-toggle");
  if (!toggle) return;

  const collapsed = sidebar.classList.contains("is-tools-collapsed");
  toggle.textContent = collapsed ? "Show Gallery Tools" : "Hide Gallery Tools";
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function ensureToolsToggle(sidebar, tabs, panel) {
  if (!sidebar || !tabs || !panel) return;

  panel.id = "est115-gallery-editor-tools-panel";

  let toggle = sidebar.querySelector(":scope > .est115-gallery-editor-tools-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "est115-gallery-editor-tools-toggle";
    toggle.setAttribute("aria-controls", panel.id);
    tabs.insertAdjacentElement("afterend", toggle);
  }

  toggle.classList.remove("est115-gallery-editor-sidebar-panel");

  if (sidebar.dataset.est115ToolsInitialized !== "true") {
    sidebar.dataset.est115ToolsInitialized = "true";
    sidebar.classList.add("is-tools-collapsed");
  }

  if (sidebar.dataset.est115ToolsBound !== "true") {
    sidebar.dataset.est115ToolsBound = "true";

    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("is-tools-collapsed");
      updateToolsToggle(sidebar);
    });

    tabs.addEventListener("click", (event) => {
      if (!event.target.closest("button")) return;
      sidebar.classList.remove("is-tools-collapsed");
      window.requestAnimationFrame(() => updateToolsToggle(sidebar));
    });
  }

  updateToolsToggle(sidebar);
}

function markEditorModals(editorRoot) {
  editorRoot?.querySelectorAll("div").forEach((element) => {
    if (element.style.position !== "fixed") return;
    if (!element.style.inset || !element.style.inset.startsWith("0")) return;

    element.classList.add("est115-gallery-editor-modal-overlay");
    const panel = element.firstElementChild;
    if (!panel) return;

    panel.classList.add("est115-gallery-editor-modal-panel");
    panel.firstElementChild?.classList.add("est115-gallery-editor-modal-header");

    panel.querySelectorAll("div").forEach((child) => {
      const columns = child.style.gridTemplateColumns || "";
      if (columns.includes("minmax(0, 1.2fr)") || columns.includes("repeat(2")) {
        child.classList.add("est115-gallery-editor-modal-grid");
      }
      if (child.style.display === "flex" && child.style.justifyContent === "flex-end") {
        child.classList.add("est115-gallery-editor-modal-actions");
      }
    });
  });
}

function markSidebarLayouts(panel) {
  panel?.querySelectorAll("div, nav").forEach((element) => {
    const columns = element.style.gridTemplateColumns || "";

    if (columns.includes("96px") && columns.includes("minmax")) {
      element.classList.add("est115-gallery-editor-design-layout");
      element.firstElementChild?.classList.add("est115-gallery-editor-design-tabs");
    }
    if (columns === "1fr auto") {
      element.classList.add("est115-gallery-editor-inline-form");
    }
    if (columns === "1fr 1fr" || columns.includes("repeat(2")) {
      element.classList.add("est115-gallery-editor-two-column-control");
    }
  });
}

function markWorkspace(main) {
  if (!main) return;

  main.classList.add("est115-gallery-editor-main");

  const heading = directChildren(main).find((element) => element.querySelector?.("h2"));
  if (heading) {
    heading.classList.add("est115-gallery-editor-workspace-heading");
    heading.lastElementChild?.classList.add("est115-gallery-editor-workspace-toolbar");
  }

  main.querySelectorAll("div").forEach((element) => {
    const columns = element.style.gridTemplateColumns || "";
    if (columns.includes("auto-fill") && columns.includes("minmax")) {
      element.classList.add("est115-gallery-editor-photo-grid");
    }
    if (element.style.position === "absolute" && element.style.width === "290px") {
      element.classList.add("est115-gallery-editor-toolbar-menu");
    }
  });

  main.querySelectorAll("article").forEach((article) => {
    const columns = article.style.gridTemplateColumns || "";
    if (columns.includes("56px") && columns.includes("86px")) {
      article.classList.add("est115-gallery-editor-list-item");
      article.parentElement?.classList.add("est115-gallery-editor-list");
      article.classList.remove("est115-gallery-editor-photo-card");
    } else {
      article.classList.add("est115-gallery-editor-photo-card");
      article.classList.remove("est115-gallery-editor-list-item");
    }
  });
}

function findSidebarParts(sidebar) {
  const children = directChildren(sidebar);
  const injectedToggle = sidebar?.querySelector(":scope > .est115-gallery-editor-tools-toggle");

  const cover =
    sidebar?.querySelector(":scope > .est115-gallery-editor-cover") ||
    children.find((element) => element.tagName === "BUTTON" && element.style.aspectRatio);

  const tabs =
    sidebar?.querySelector(":scope > .est115-gallery-editor-tabs") ||
    children.find((element) =>
      (element.style.gridTemplateColumns || "").includes("repeat(4"),
    );

  const panel =
    sidebar?.querySelector(":scope > .est115-gallery-editor-sidebar-panel") ||
    children.find(
      (element) =>
        element !== cover &&
        element !== tabs &&
        element !== injectedToggle &&
        (element.style.flex === "1" || element.style.overflowY === "auto"),
    ) ||
    children.find(
      (element) =>
        element !== cover && element !== tabs && element !== injectedToggle,
    );

  return { cover, tabs, panel };
}

function classifyGalleryEditor() {
  const html = document.documentElement;
  const active = isGalleryEditorRoute();
  html.classList.toggle("est115-gallery-editor", active);
  if (!active) return;

  const root = document.getElementById("root");
  const nav = root?.querySelector(".admin-platform-nav");
  const editorRoot = nav?.parentElement;
  const header = nav?.nextElementSibling;
  const workspace = header?.nextElementSibling;
  if (!editorRoot || !header || !workspace) return;

  editorRoot.classList.add("est115-gallery-editor-root");
  header.classList.add("est115-gallery-editor-header");

  const [headerIdentity, headerActions] = directChildren(header);
  headerIdentity?.classList.add("est115-gallery-editor-header-identity");
  headerActions?.classList.add("est115-gallery-editor-header-actions");

  workspace.classList.add("est115-gallery-editor-workspace");
  const [sidebar, main] = directChildren(workspace);
  sidebar?.classList.add("est115-gallery-editor-sidebar");

  const { cover, tabs, panel } = findSidebarParts(sidebar);
  cover?.classList.add("est115-gallery-editor-cover");
  tabs?.classList.add("est115-gallery-editor-tabs");
  panel?.classList.add("est115-gallery-editor-sidebar-panel");

  ensureToolsToggle(sidebar, tabs, panel);
  markSidebarLayouts(panel);
  markWorkspace(main);
  markEditorModals(editorRoot);
}

function injectGalleryEditorStyles() {
  if (document.getElementById("est115-gallery-editor-responsive-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-gallery-editor-responsive-styles";
  style.textContent = `
    html.est115-gallery-editor,
    html.est115-gallery-editor body,
    html.est115-gallery-editor #root,
    html.est115-gallery-editor .est115-gallery-editor-root {
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
    }

    html.est115-gallery-editor .est115-gallery-editor-root *,
    html.est115-gallery-editor .est115-gallery-editor-root *::before,
    html.est115-gallery-editor .est115-gallery-editor-root *::after {
      box-sizing: border-box;
    }

    .est115-gallery-editor-tools-toggle {
      display: none;
    }

    html.est115-gallery-editor .est115-gallery-editor-header,
    html.est115-gallery-editor .est115-gallery-editor-header-identity,
    html.est115-gallery-editor .est115-gallery-editor-header-actions,
    html.est115-gallery-editor .est115-gallery-editor-workspace,
    html.est115-gallery-editor .est115-gallery-editor-sidebar,
    html.est115-gallery-editor .est115-gallery-editor-main,
    html.est115-gallery-editor .est115-gallery-editor-workspace-heading,
    html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar,
    html.est115-gallery-editor .est115-gallery-editor-photo-grid,
    html.est115-gallery-editor .est115-gallery-editor-list,
    html.est115-gallery-editor .est115-gallery-editor-list-item,
    html.est115-gallery-editor .est115-gallery-editor-modal-panel {
      max-width: 100%;
      min-width: 0;
    }

    @media (max-width: 980px) {
      html.est115-gallery-editor .est115-gallery-editor-root {
        height: auto !important;
        min-height: 100dvh;
        overflow: visible !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-header {
        align-items: stretch !important;
        flex-direction: column;
        gap: 0.9rem !important;
        height: auto !important;
        padding: 1rem !important;
        position: static !important;
        top: auto !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-header-identity {
        align-items: flex-start !important;
        flex-wrap: wrap;
        gap: 0.75rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-header-identity > div {
        flex: 1 1 180px;
        min-width: 0;
      }

      html.est115-gallery-editor .est115-gallery-editor-header-actions {
        display: grid !important;
        gap: 0.55rem !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-header-actions > button,
      html.est115-gallery-editor .est115-gallery-editor-header-identity > button {
        align-items: center;
        justify-content: center;
        min-height: 44px;
        white-space: normal;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        height: auto !important;
        overflow: visible !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-sidebar {
        border-bottom: 1px solid rgba(255,255,255,0.12);
        border-right: none !important;
        height: auto !important;
        overflow: visible !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-cover {
        display: none !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-tabs {
        position: relative;
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-tabs > button {
        min-height: 58px;
        padding: 0.55rem 0.25rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-tools-toggle {
        align-items: center;
        background: rgba(255,255,255,0.035);
        border: 0;
        border-bottom: 1px solid rgba(255,255,255,0.12);
        color: #c8a96b;
        cursor: pointer;
        display: flex;
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 900;
        justify-content: center;
        letter-spacing: 0.12em;
        min-height: 44px;
        padding: 10px 12px;
        text-transform: uppercase;
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-sidebar.is-tools-collapsed .est115-gallery-editor-sidebar-panel {
        display: none !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-sidebar-panel {
        max-height: min(62dvh, 620px);
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        padding: 1rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-design-layout {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-design-tabs {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      html.est115-gallery-editor .est115-gallery-editor-design-tabs > button {
        min-height: 58px;
      }

      html.est115-gallery-editor .est115-gallery-editor-main {
        height: auto !important;
        min-height: 55dvh;
        overflow: visible !important;
        padding: 1.25rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-heading {
        align-items: stretch !important;
        flex-direction: column;
        gap: 1rem !important;
        margin-bottom: 1.1rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-heading h2 {
        font-size: 1.35rem !important;
        overflow-wrap: anywhere;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar {
        display: grid !important;
        gap: 0.4rem !important;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar > button,
      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar > div > button {
        align-items: center;
        display: inline-flex;
        justify-content: center;
        min-height: 44px;
        padding: 8px !important;
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar > span {
        display: none !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-toolbar-menu {
        max-width: calc(100vw - 2rem) !important;
        width: min(290px, calc(100vw - 2rem)) !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-photo-grid {
        gap: 0.75rem !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        justify-content: stretch !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-photo-card {
        min-width: 0;
        padding: 0.45rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-photo-card > div:first-of-type {
        aspect-ratio: 4 / 3;
        height: auto !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item {
        gap: 0.65rem !important;
        grid-template-columns: 72px minmax(0, 1fr) !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :first-child {
        display: none !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :nth-child(2) {
        grid-column: 1;
        grid-row: 1 / span 2;
        height: 54px !important;
        width: 72px !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :nth-child(3) {
        grid-column: 2;
        grid-row: 1;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :nth-child(4) {
        grid-column: 2;
        grid-row: 2;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :nth-child(5) {
        display: grid !important;
        gap: 0.4rem !important;
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        justify-content: stretch !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-list-item > :nth-child(5) > button {
        min-height: 40px;
        width: 100%;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-overlay {
        align-items: flex-start !important;
        overflow: hidden;
        padding: 0.6rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-panel {
        max-height: calc(100dvh - 1.2rem) !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        width: 100% !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-header {
        padding: 1rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        padding: 1rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-actions {
        align-items: stretch !important;
        flex-direction: column !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-modal-actions > button,
      html.est115-gallery-editor .est115-gallery-editor-modal-actions > a {
        min-height: 44px;
        width: 100%;
      }
    }

    @media (max-width: 700px) {
      html.est115-gallery-editor .est115-gallery-editor-header {
        padding: 0.85rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-header-actions > button:last-child {
        grid-column: 1 / -1;
      }

      html.est115-gallery-editor .est115-gallery-editor-main {
        padding: 1rem 0.8rem 1.5rem !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-photo-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-inline-form,
      html.est115-gallery-editor .est115-gallery-editor-two-column-control {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html.est115-gallery-editor .est115-gallery-editor-sidebar-panel input,
      html.est115-gallery-editor .est115-gallery-editor-sidebar-panel select,
      html.est115-gallery-editor .est115-gallery-editor-sidebar-panel textarea,
      html.est115-gallery-editor .est115-gallery-editor-sidebar-panel button {
        max-width: 100%;
      }
    }

    @media (max-width: 430px) {
      html.est115-gallery-editor .est115-gallery-editor-header-actions {
        grid-template-columns: minmax(0, 1fr);
      }

      html.est115-gallery-editor .est115-gallery-editor-header-actions > button:last-child {
        grid-column: auto;
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      html.est115-gallery-editor .est115-gallery-editor-workspace-toolbar > button:last-child {
        grid-column: span 2;
      }

      html.est115-gallery-editor .est115-gallery-editor-design-tabs {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (hover: none) and (pointer: coarse) {
      html.est115-gallery-editor .est115-gallery-editor-photo-card,
      html.est115-gallery-editor .est115-gallery-editor-list-item {
        cursor: pointer !important;
      }

      html.est115-gallery-editor button,
      html.est115-gallery-editor input,
      html.est115-gallery-editor select,
      html.est115-gallery-editor textarea {
        touch-action: manipulation;
      }
    }
  `;

  document.head.appendChild(style);
}

export function installAdminGalleryEditorResponsiveness() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminGalleryEditorResponsivenessInstalled) return;

  window.__est115AdminGalleryEditorResponsivenessInstalled = true;
  injectGalleryEditorStyles();

  let frame = 0;
  const scheduleClassification = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(classifyGalleryEditor);
  };

  window.addEventListener("popstate", scheduleClassification);
  window.addEventListener("resize", scheduleClassification);

  const observer = new MutationObserver(scheduleClassification);
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });

  scheduleClassification();
}
