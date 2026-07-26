function injectAdminMobileNavigationStyles() {
  if (document.getElementById("est115-admin-mobile-navigation-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-admin-mobile-navigation-styles";
  style.textContent = `
    .est115-admin-menu-toggle {
      display: none;
    }

    @media (max-width: 700px) {
      html.est115-admin-route .admin-platform-nav__inner {
        display: block !important;
        padding: 0.75rem 1rem !important;
      }

      html.est115-admin-route .admin-platform-nav__brand-row {
        align-items: center !important;
        display: grid !important;
        flex-direction: initial !important;
        gap: 0.75rem !important;
        grid-template-columns: minmax(0, 1fr) 44px;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav__brand {
        min-width: 0;
        width: fit-content !important;
      }

      html.est115-admin-route .est115-admin-menu-toggle {
        align-items: center;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.18);
        color: #fff;
        cursor: pointer;
        display: grid;
        height: 44px;
        justify-items: center;
        padding: 11px 10px;
        width: 44px;
      }

      html.est115-admin-route .est115-admin-menu-toggle__line {
        background: currentColor;
        display: block;
        height: 1px;
        transform-origin: center;
        transition: transform 180ms ease, opacity 180ms ease;
        width: 20px;
      }

      html.est115-admin-route .admin-platform-nav__links {
        border-top: 1px solid rgba(255,255,255,0.12);
        display: none !important;
        gap: 0.35rem !important;
        grid-column: 1 / -1;
        grid-template-columns: minmax(0, 1fr);
        margin: 0.75rem 0 0 !important;
        overflow: visible !important;
        padding: 0.75rem 0 0 !important;
        width: 100% !important;
      }

      html.est115-admin-route .admin-platform-nav.is-mobile-open .admin-platform-nav__links {
        display: grid !important;
      }

      html.est115-admin-route .admin-platform-nav__link {
        align-items: center;
        justify-content: flex-start;
        min-height: 44px;
        min-width: 0;
        padding: 11px 12px !important;
        text-align: left;
        white-space: normal !important;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav__actions {
        border-top: 1px solid rgba(255,255,255,0.12) !important;
        display: none !important;
        gap: 0.5rem !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 0.75rem;
        padding-top: 0.75rem !important;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav.is-mobile-open .admin-platform-nav__actions {
        display: grid !important;
      }

      html.est115-admin-route .admin-platform-nav__utility,
      html.est115-admin-route .admin-platform-nav__button {
        align-items: center;
        border: 1px solid rgba(255,255,255,0.16);
        display: inline-flex;
        justify-content: center;
        min-height: 44px;
        padding: 10px !important;
        text-align: center;
        width: 100%;
      }

      html.est115-admin-route .admin-platform-nav.is-mobile-open .est115-admin-menu-toggle__line:nth-child(1) {
        transform: translateY(6px) rotate(45deg);
      }

      html.est115-admin-route .admin-platform-nav.is-mobile-open .est115-admin-menu-toggle__line:nth-child(2) {
        opacity: 0;
      }

      html.est115-admin-route .admin-platform-nav.is-mobile-open .est115-admin-menu-toggle__line:nth-child(3) {
        transform: translateY(-6px) rotate(-45deg);
      }
    }

    @media (max-width: 380px) {
      html.est115-admin-route .admin-platform-nav__actions {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  document.head.appendChild(style);
}

function closeMobileMenu(nav) {
  if (!nav) return;
  nav.classList.remove("is-mobile-open");
  const toggle = nav.querySelector(".est115-admin-menu-toggle");
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.setAttribute("aria-label", "Open admin navigation");
}

function ensureMobileMenu() {
  const nav = document.querySelector(".admin-platform-nav");
  if (!nav) return;

  const brandRow = nav.querySelector(".admin-platform-nav__brand-row");
  const links = nav.querySelector(".admin-platform-nav__links");
  if (!brandRow || !links) return;

  links.id = "admin-mobile-navigation-links";

  let toggle = nav.querySelector(".est115-admin-menu-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "est115-admin-menu-toggle";
    toggle.setAttribute("aria-controls", links.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open admin navigation");
    toggle.innerHTML = `
      <span class="est115-admin-menu-toggle__line" aria-hidden="true"></span>
      <span class="est115-admin-menu-toggle__line" aria-hidden="true"></span>
      <span class="est115-admin-menu-toggle__line" aria-hidden="true"></span>
    `;

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-mobile-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute(
        "aria-label",
        open ? "Close admin navigation" : "Open admin navigation",
      );
    });

    brandRow.insertBefore(toggle, links);
  }

  if (nav.dataset.est115MobileMenuBound === "true") return;
  nav.dataset.est115MobileMenuBound = "true";

  nav.addEventListener("click", (event) => {
    if (event.target.closest(".admin-platform-nav__link")) closeMobileMenu(nav);
  });
}

export function installAdminMobileNavigation() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminMobileNavigationInstalled) return;

  window.__est115AdminMobileNavigationInstalled = true;
  injectAdminMobileNavigationStyles();

  let frame = 0;
  const scheduleEnsure = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(ensureMobileMenu);
  };

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMobileMenu(document.querySelector(".admin-platform-nav"));
  });

  document.addEventListener("click", (event) => {
    const nav = document.querySelector(".admin-platform-nav.is-mobile-open");
    if (nav && !nav.contains(event.target)) closeMobileMenu(nav);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      closeMobileMenu(document.querySelector(".admin-platform-nav"));
    }
    scheduleEnsure();
  });

  window.addEventListener("popstate", () => {
    closeMobileMenu(document.querySelector(".admin-platform-nav"));
    scheduleEnsure();
  });

  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });

  scheduleEnsure();
}
