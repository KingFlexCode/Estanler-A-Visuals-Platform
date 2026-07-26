function injectCompactDashboardStyles() {
  if (document.getElementById("est115-admin-dashboard-compact-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-admin-dashboard-compact-styles";
  style.textContent = `
    @media (max-width: 700px) {
      html.est115-admin-dashboard .admin-dashboard-hero {
        margin-bottom: 1rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-kicker {
        font-size: 8px !important;
        letter-spacing: 0.13em !important;
        margin-bottom: 0.35rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-title {
        font-size: 1.8rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-copy {
        font-size: 0.8rem !important;
        line-height: 1.5 !important;
        margin-top: 0.55rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        margin-bottom: 1.5rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-card {
        display: flex !important;
        flex-direction: column;
        justify-content: center;
        min-height: 0 !important;
        padding: 0.8rem 0.75rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-card__eyebrow {
        font-size: 7px !important;
        letter-spacing: 0.12em !important;
      }

      html.est115-admin-dashboard .admin-dashboard-card__value {
        font-size: 1.85rem !important;
        margin: 0.55rem 0 0.3rem !important;
      }

      html.est115-admin-dashboard .admin-dashboard-card__label {
        font-size: 0.67rem !important;
        letter-spacing: 0.055em !important;
        line-height: 1.3;
      }

      html.est115-admin-dashboard .admin-dashboard-card__meta {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

export function installAdminDashboardCompactOverview() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminDashboardCompactOverviewInstalled) return;

  window.__est115AdminDashboardCompactOverviewInstalled = true;
  injectCompactDashboardStyles();
}
