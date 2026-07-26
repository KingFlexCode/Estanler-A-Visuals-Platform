const VIEWER_SEARCH_FRAMES = 30;

function isPublicGalleryRoute() {
  return /^\/gallery\/[^/]+/.test(window.location.pathname);
}

function isViewerOpeningInteraction(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('button[title="Play slideshow"]')) return true;
  if (target.closest("button")) return false;
  return Boolean(target.closest("main#gallery-sections article"));
}

function findViewer() {
  return (
    [...document.querySelectorAll('div[data-est114-lightbox="true"]')].find(
      (element) => element.querySelector("img"),
    ) || null
  );
}

function injectViewerChromeStyles() {
  if (document.getElementById("est114-reference-viewer-chrome")) return;

  const style = document.createElement("style");
  style.id = "est114-reference-viewer-chrome";
  style.textContent = `
    div[data-est114-lightbox="true"] {
      --est114-top-bar-height: calc(48px + env(safe-area-inset-top));
      --est114-bottom-bar-height: calc(38px + env(safe-area-inset-bottom));
      background: #1d1d1d !important;
    }

    div[data-est114-lightbox="true"] > :first-child {
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      left: 0 !important;
      height: var(--est114-top-bar-height) !important;
      box-sizing: border-box !important;
      padding: env(safe-area-inset-top) 0 0 !important;
      background: #1d1d1d !important;
      pointer-events: none !important;
      z-index: 10 !important;
    }

    div[data-est114-lightbox="true"] > :first-child > :first-child {
      position: fixed !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      height: var(--est114-bottom-bar-height) !important;
      max-width: none !important;
      box-sizing: border-box !important;
      display: grid !important;
      place-items: center !important;
      padding: 0 max(3rem, env(safe-area-inset-right)) env(safe-area-inset-bottom)
        max(3rem, env(safe-area-inset-left)) !important;
      background: #1d1d1d !important;
      opacity: 1 !important;
      transform: none !important;
      pointer-events: none !important;
      z-index: 12 !important;
    }

    div[data-est114-lightbox="true"] > :first-child > :first-child > :first-child {
      display: none !important;
    }

    div[data-est114-lightbox="true"] > :first-child > :first-child > :last-child {
      max-width: min(70vw, 720px) !important;
      overflow: hidden !important;
      color: rgba(255, 255, 255, 0.72) !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      font-weight: 400 !important;
      letter-spacing: 0.01em !important;
      line-height: 1 !important;
      text-align: center !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="back"] {
      position: absolute !important;
      top: env(safe-area-inset-top) !important;
      left: max(0.5rem, env(safe-area-inset-left)) !important;
      width: 42px !important;
      height: 48px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      display: grid !important;
      place-items: center !important;
      background: transparent !important;
      color: rgba(255, 255, 255, 0.72) !important;
      font-size: 0 !important;
      line-height: 1 !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      transform: none !important;
      z-index: 14 !important;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="back"]::before {
      content: "←";
      font-family: Arial, sans-serif;
      font-size: 22px;
      font-weight: 300;
    }

    div[data-est114-lightbox="true"] > :nth-child(2) {
      position: absolute !important;
      top: var(--est114-top-bar-height) !important;
      right: 0 !important;
      bottom: var(--est114-bottom-bar-height) !important;
      left: 0 !important;
      box-sizing: border-box !important;
      display: grid !important;
      place-items: center !important;
      min-height: 0 !important;
      padding: 0 clamp(2.75rem, 5vw, 5.25rem) !important;
      overflow: hidden !important;
      background: #1d1d1d !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(2) > img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      margin: 0 !important;
      object-fit: contain !important;
      object-position: 50% 50% !important;
      align-self: center !important;
      justify-self: center !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(2) > button {
      width: 44px !important;
      height: 64px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: rgba(255, 255, 255, 0.78) !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      font-size: 2.3rem !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(3) {
      position: absolute !important;
      top: 0 !important;
      right: max(0.5rem, env(safe-area-inset-right)) !important;
      bottom: auto !important;
      left: auto !important;
      height: var(--est114-top-bar-height) !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 0.1rem !important;
      padding: env(safe-area-inset-top) 0 0 !important;
      background: transparent !important;
      opacity: 1 !important;
      transform: none !important;
      pointer-events: auto !important;
      z-index: 13 !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(3) > button {
      width: 40px !important;
      height: 48px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      display: grid !important;
      place-items: center !important;
      background: transparent !important;
      color: rgba(255, 255, 255, 0.72) !important;
      font-size: 0 !important;
      line-height: 1 !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(3) > button::before {
      font-family: Arial, sans-serif;
      font-size: 21px;
      font-weight: 300;
      line-height: 1;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="favorite"]::before {
      content: "♡";
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="favorite"][data-est114-active="true"]::before {
      content: "♥";
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="download"]::before {
      content: "⇩";
      font-size: 23px;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="share"]::before {
      content: "↗";
      font-size: 22px;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="play"]::before {
      content: "▷";
      font-size: 24px;
    }

    div[data-est114-lightbox="true"] button[data-est114-chrome-action="play"][data-est114-active="true"]::before {
      content: "Ⅱ";
      font-size: 18px;
    }

    @media (max-width: 700px) {
      div[data-est114-lightbox="true"] {
        --est114-top-bar-height: calc(46px + env(safe-area-inset-top));
        --est114-bottom-bar-height: calc(36px + env(safe-area-inset-bottom));
      }

      div[data-est114-lightbox="true"] > :nth-child(2) {
        padding-right: 0 !important;
        padding-left: 0 !important;
      }

      div[data-est114-lightbox="true"] > :nth-child(3) > button {
        width: 38px !important;
        height: 46px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function classifyButton(button) {
  const text = button.textContent?.trim() || "";
  const title = button.getAttribute("title")?.toLowerCase() || "";

  if (text === "♥" || text === "♡" || title.includes("favorite")) return "favorite";
  if (text.toLowerCase().includes("download") || title.includes("download")) return "download";
  if (text.toLowerCase().includes("share") || title.includes("share")) return "share";
  if (["play", "pause"].includes(text.toLowerCase()) || title.includes("slideshow")) return "play";
  return "";
}

function decorateViewer(overlay) {
  if (!overlay?.isConnected) return;

  const [header, , footer] = overlay.children;
  if (!header || !footer) return;

  const backButton =
    [...header.querySelectorAll("button")].find(
      (button) =>
        button.dataset.est114ChromeAction === "back" ||
        button.textContent?.trim() === "×",
    ) || null;

  if (backButton) {
    backButton.dataset.est114ChromeAction = "back";
    backButton.setAttribute("aria-label", "Back to gallery");
    backButton.setAttribute("title", "Back to gallery");
  }

  const actions = new Map();
  [...footer.querySelectorAll("button")].forEach((button) => {
    const action = button.dataset.est114ChromeAction || classifyButton(button);
    if (!action) return;

    button.dataset.est114ChromeAction = action;
    actions.set(action, button);

    if (action === "favorite") {
      button.dataset.est114Active = String(button.textContent?.trim() === "♥");
      button.setAttribute("aria-label", "Favorite photo");
      button.setAttribute("title", "Favorite photo");
    }

    if (action === "download") {
      button.setAttribute("aria-label", "Download photo");
      button.setAttribute("title", "Download photo");
    }

    if (action === "share") {
      button.setAttribute("aria-label", "Share photo");
      button.setAttribute("title", "Share photo");
    }

    if (action === "play") {
      const playing = button.textContent?.trim().toLowerCase() === "pause";
      button.dataset.est114Active = String(playing);
      button.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow");
      button.setAttribute("title", playing ? "Pause slideshow" : "Play slideshow");
    }
  });

  const desiredButtons = ["favorite", "download", "share", "play"]
    .map((action) => actions.get(action))
    .filter(Boolean);
  const currentButtons = [...footer.querySelectorAll("button")].filter((button) =>
    desiredButtons.includes(button),
  );
  const orderChanged = desiredButtons.some(
    (button, index) => currentButtons[index] !== button,
  );

  if (orderChanged) desiredButtons.forEach((button) => footer.appendChild(button));
}

export function installPublicGalleryViewerChrome() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryViewerChromeInstalled) return;

  window.__est114PublicGalleryViewerChromeInstalled = true;
  injectViewerChromeStyles();

  let activeOverlay = null;
  let viewerObserver = null;
  let searchFrame = null;
  let remainingFrames = 0;
  let decorating = false;

  const refreshChrome = () => {
    if (!activeOverlay?.isConnected || decorating) return;
    decorating = true;
    decorateViewer(activeOverlay);
    decorating = false;
  };

  const activate = (overlay) => {
    if (!overlay || overlay === activeOverlay) {
      refreshChrome();
      return;
    }

    viewerObserver?.disconnect();
    activeOverlay = overlay;
    decorateViewer(activeOverlay);

    viewerObserver = new MutationObserver(() => {
      window.requestAnimationFrame(refreshChrome);
    });
    viewerObserver.observe(activeOverlay, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  };

  const searchForViewer = () => {
    searchFrame = null;
    const overlay = findViewer();
    if (overlay) {
      activate(overlay);
      return;
    }

    remainingFrames -= 1;
    if (remainingFrames > 0) {
      searchFrame = window.requestAnimationFrame(searchForViewer);
    }
  };

  const scheduleSearch = () => {
    window.cancelAnimationFrame(searchFrame);
    remainingFrames = VIEWER_SEARCH_FRAMES;
    searchFrame = window.requestAnimationFrame(searchForViewer);
  };

  document.addEventListener(
    "click",
    (event) => {
      if (!isPublicGalleryRoute()) return;

      if (activeOverlay?.contains(event.target)) {
        window.setTimeout(refreshChrome, 0);
        return;
      }

      if (isViewerOpeningInteraction(event.target)) scheduleSearch();
    },
    true,
  );

  const existingViewer = findViewer();
  if (existingViewer) activate(existingViewer);
}
