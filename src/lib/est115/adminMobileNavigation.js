function injectAdminMobileNavigationStyles() {
  if (document.getElementById("est115-admin-mobile-navigation-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-admin-mobile-navigation-styles";
  style.textContent = `
    @media (max-width: 700px) {
      html.est115-admin-route .admin-platform-nav__links {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        scroll-padding-inline: 0 !important;
      }

      html.est115-admin-route .admin-platform-nav__link {
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 0;
        min-height: 44px;
        padding: 10px 8px !important;
        text-align: center;
        white-space: normal !important;
      }

      html.est115-admin-route .admin-platform-nav__link:last-child {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 380px) {
      html.est115-admin-route .admin-platform-nav__link {
        font-size: 10px !important;
        letter-spacing: 0.07em !important;
      }
    }
  `;

  document.head.appendChild(style);
}

export function installAdminMobileNavigation() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminMobileNavigationInstalled) return;

  window.__est115AdminMobileNavigationInstalled = true;
  injectAdminMobileNavigationStyles();
}
