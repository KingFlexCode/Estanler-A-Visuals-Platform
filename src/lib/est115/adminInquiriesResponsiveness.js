function isInquiriesRoute() {
  return window.location.pathname === "/admin/inquiries";
}

function directChildren(element) {
  return element ? [...element.children] : [];
}

function classifyInquiriesPage() {
  const html = document.documentElement;
  html.classList.toggle("est115-admin-inquiries", isInquiriesRoute());
  if (!isInquiriesRoute()) return;

  const root = document.getElementById("root");
  const nav = root?.querySelector(".admin-platform-nav");
  const page = nav?.nextElementSibling;
  if (!page) return;

  page.classList.add("est115-inquiries-main");

  const header = page.firstElementChild;
  header?.classList.add("est115-inquiries-header");

  const filters = directChildren(header).find(
    (element) => element.querySelectorAll(":scope > button").length >= 5,
  );
  filters?.classList.add("est115-inquiries-filters");

  const content = directChildren(page).find(
    (element) => element.style.display === "grid",
  );
  if (!content) return;

  content.classList.add("est115-inquiries-layout");
  const [list, detail] = directChildren(content);
  list?.classList.add("est115-inquiries-list");
  detail?.classList.add("est115-inquiries-detail");

  directChildren(list).forEach((item) => {
    if (item.style.cursor === "pointer") {
      item.classList.add("est115-inquiry-item");
      item.firstElementChild?.classList.add("est115-inquiry-item-heading");
      item.lastElementChild?.classList.add("est115-inquiry-item-meta");
    }
  });

  if (detail) {
    const detailChildren = directChildren(detail);
    detailChildren[0]?.classList.add("est115-inquiry-detail-heading");
    detailChildren[1]?.classList.add("est115-inquiry-status-actions");
    detailChildren.at(-1)?.classList.add("est115-inquiry-reply-actions");
  }
}

function injectInquiriesStyles() {
  if (document.getElementById("est115-admin-inquiries-styles")) return;

  const style = document.createElement("style");
  style.id = "est115-admin-inquiries-styles";
  style.textContent = `
    html.est115-admin-inquiries .est115-inquiries-main,
    html.est115-admin-inquiries .est115-inquiries-layout,
    html.est115-admin-inquiries .est115-inquiries-list,
    html.est115-admin-inquiries .est115-inquiries-detail,
    html.est115-admin-inquiries .est115-inquiry-item,
    html.est115-admin-inquiries .est115-inquiry-item-heading,
    html.est115-admin-inquiries .est115-inquiry-item-meta {
      max-width: 100%;
      min-width: 0;
    }

    html.est115-admin-inquiries .est115-inquiry-item *,
    html.est115-admin-inquiries .est115-inquiries-detail * {
      min-width: 0;
    }

    html.est115-admin-inquiries .est115-inquiry-item span,
    html.est115-admin-inquiries .est115-inquiries-detail a,
    html.est115-admin-inquiries .est115-inquiries-detail div {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    @media (max-width: 900px) {
      html.est115-admin-inquiries .est115-inquiries-main {
        overflow-x: hidden;
        padding: 1.5rem 1rem 2rem !important;
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiries-header {
        align-items: stretch !important;
        flex-direction: column;
        margin-bottom: 1.25rem !important;
      }

      html.est115-admin-inquiries .est115-inquiries-header > h1 {
        margin: 0;
      }

      html.est115-admin-inquiries .est115-inquiries-filters {
        display: grid !important;
        gap: 0.5rem !important;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiries-filters > button {
        min-height: 44px;
        min-width: 0;
        padding: 8px !important;
        white-space: normal;
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiries-layout {
        background: transparent !important;
        gap: 1px !important;
        grid-template-columns: minmax(0, 1fr) !important;
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiries-detail {
        max-height: none !important;
        order: -1;
        overflow: visible !important;
        padding: 1.25rem !important;
        position: static !important;
        top: auto !important;
      }

      html.est115-admin-inquiries .est115-inquiry-item {
        padding: 1rem !important;
      }

      html.est115-admin-inquiries .est115-inquiry-item-heading,
      html.est115-admin-inquiries .est115-inquiry-detail-heading {
        align-items: flex-start !important;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      html.est115-admin-inquiries .est115-inquiry-item-heading > div,
      html.est115-admin-inquiries .est115-inquiry-detail-heading > div {
        flex: 1 1 180px;
      }

      html.est115-admin-inquiries .est115-inquiry-item-meta {
        gap: 0.45rem 0.8rem !important;
      }

      html.est115-admin-inquiries .est115-inquiry-status-actions {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      html.est115-admin-inquiries .est115-inquiry-status-actions > button {
        min-height: 44px;
        padding: 8px !important;
        white-space: normal;
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiry-reply-actions {
        width: 100%;
      }

      html.est115-admin-inquiries .est115-inquiry-reply-actions > a {
        align-items: center;
        display: flex !important;
        justify-content: center;
        min-height: 44px;
        text-align: center;
        width: 100%;
      }
    }

    @media (max-width: 460px) {
      html.est115-admin-inquiries .est115-inquiries-filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      html.est115-admin-inquiries .est115-inquiry-status-actions {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  document.head.appendChild(style);
}

export function installAdminInquiriesResponsiveness() {
  if (typeof window === "undefined") return;
  if (window.__est115AdminInquiriesResponsivenessInstalled) return;

  window.__est115AdminInquiriesResponsivenessInstalled = true;
  injectInquiriesStyles();

  let frame = 0;
  const scheduleClassification = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(classifyInquiriesPage);
  };

  document.addEventListener(
    "click",
    (event) => {
      const item = event.target.closest?.(".est115-inquiry-item");
      if (!item || window.innerWidth > 900) return;

      window.setTimeout(() => {
        const detail = document.querySelector(".est115-inquiries-detail");
        detail?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    },
    true,
  );

  window.addEventListener("popstate", scheduleClassification);
  window.addEventListener("resize", scheduleClassification);

  const observer = new MutationObserver(scheduleClassification);
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });

  scheduleClassification();
}
