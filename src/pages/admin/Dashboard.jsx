import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";

const adminColors = {
  bg: COLORS.bgDark || "#0A0A0A",
  surface: COLORS.surfaceDark || "#060606",
  surfaceHover: "#0d0d0d",
  border: COLORS.borderDark || COLORS.border,
  muted: COLORS.mutedDark || "rgba(255,255,255,0.45)",
  text: COLORS.white,
};

const adminFont = "'Inter', sans-serif";
const adminHeading = "'Playfair Display', serif";

const navLinks = [
  { label: "Dashboard", to: "/admin", match: (path) => path === "/admin" },
  { label: "Portfolio", to: "/admin/portfolio", match: (path) => path.startsWith("/admin/portfolio") },
  { label: "Galleries", to: "/admin/galleries", match: (path) => path.startsWith("/admin/galleries") },
  { label: "Inquiries", to: "/admin/inquiries", match: (path) => path.startsWith("/admin/inquiries") },
];

function AdminNav({ onSignOut }) {
  const location = useLocation();

  return (
    <nav className="admin-platform-nav">
      <div className="admin-platform-nav__inner">
        <div className="admin-platform-nav__brand-row">
          <Link to="/admin" className="admin-platform-nav__brand" aria-label="Admin dashboard">
            <span className="admin-platform-nav__brand-main">Estanler A</span>
            <span className="admin-platform-nav__brand-kicker">Admin</span>
          </Link>

          <div className="admin-platform-nav__links" aria-label="Admin navigation">
            {navLinks.map((link) => {
              const active = link.match(location.pathname);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`admin-platform-nav__link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="admin-platform-nav__actions">
          <Link to="/" target="_blank" className="admin-platform-nav__utility">
            View Site ↗
          </Link>
          <button type="button" onClick={onSignOut} className="admin-platform-nav__utility admin-platform-nav__button">
            Sign Out
          </button>
        </div>
      </div>

      <style>{`
        .admin-platform-nav {
          background: ${adminColors.surface};
          border-bottom: 1px solid ${adminColors.border};
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .admin-platform-nav__inner {
          align-items: center;
          display: flex;
          gap: 1.25rem;
          justify-content: space-between;
          min-height: 56px;
          padding: 0 2rem;
        }

        .admin-platform-nav__brand-row {
          align-items: center;
          display: flex;
          gap: clamp(1rem, 3vw, 2rem);
          min-width: 0;
        }

        .admin-platform-nav__brand {
          align-items: baseline;
          display: inline-flex;
          flex: 0 0 auto;
          gap: 8px;
          text-decoration: none;
        }

        .admin-platform-nav__brand-main {
          color: ${adminColors.text};
          font-family: ${adminHeading};
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
        }

        .admin-platform-nav__brand-kicker {
          color: ${COLORS.gold};
          font-family: ${adminFont};
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .admin-platform-nav__links {
          align-items: center;
          display: flex;
          gap: 0.25rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .admin-platform-nav__links::-webkit-scrollbar {
          display: none;
        }

        .admin-platform-nav__link,
        .admin-platform-nav__utility {
          color: ${adminColors.muted};
          font-family: ${adminFont};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-decoration: none;
          text-transform: uppercase;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }

        .admin-platform-nav__link {
          border: 1px solid transparent;
          padding: 9px 11px;
        }

        .admin-platform-nav__link:hover,
        .admin-platform-nav__utility:hover {
          color: ${adminColors.text};
        }

        .admin-platform-nav__link.is-active {
          background: rgba(200, 169, 107, 0.1);
          border-color: rgba(200, 169, 107, 0.42);
          color: ${COLORS.gold};
        }

        .admin-platform-nav__actions {
          align-items: center;
          display: flex;
          flex: 0 0 auto;
          gap: 1rem;
        }

        .admin-platform-nav__button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        @media (max-width: 840px) {
          .admin-platform-nav__inner {
            align-items: stretch;
            flex-direction: column;
            gap: 0.85rem;
            padding: 0.9rem 1rem;
          }

          .admin-platform-nav__brand-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.85rem;
          }

          .admin-platform-nav__links {
            width: 100%;
          }

          .admin-platform-nav__link {
            padding: 8px 10px;
          }

          .admin-platform-nav__actions {
            border-top: 1px solid ${adminColors.border};
            justify-content: space-between;
            padding-top: 0.75rem;
            width: 100%;
          }
        }
      `}</style>
    </nav>
  );
}

export { AdminNav };

function CountCard({ card, loading }) {
  const displayValue = loading ? "—" : card.value;
  const empty = !loading && !card.unavailable && Number(card.value) === 0;

  return (
    <Link to={card.to} className="admin-dashboard-card" aria-label={card.label}>
      <div className="admin-dashboard-card__eyebrow">{card.kicker}</div>
      <div className="admin-dashboard-card__value" style={{ color: card.color }}>
        {card.unavailable ? "—" : displayValue}
      </div>
      <div className="admin-dashboard-card__label">{card.label}</div>
      <div className="admin-dashboard-card__meta">
        {loading ? "Loading count..." : card.unavailable ? "Count unavailable" : empty ? card.emptyText : card.meta}
      </div>
    </Link>
  );
}

function QuickAction({ to, target, title, description, variant = "secondary" }) {
  return (
    <Link
      to={to}
      target={target}
      className={`admin-quick-action ${variant === "primary" ? "is-primary" : ""}`}
    >
      <span>{title}</span>
      <small>{description}</small>
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    portfolioImages: 0,
    featuredImages: 0,
    clientGalleries: 0,
    newInquiries: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      setStatsError("");

      const requests = await Promise.allSettled([
        supabase.from("portfolio_images").select("*", { count: "exact", head: true }),
        supabase.from("portfolio_images").select("*", { count: "exact", head: true }).eq("featured", true),
        supabase.from("client_galleries").select("*", { count: "exact", head: true }),
        supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
      ]);

      const [portfolioResult, featuredResult, galleriesResult, inquiriesResult] = requests;
      const results = requests.map((result) => (result.status === "fulfilled" ? result.value : { count: 0, error: result.reason }));
      const errors = results.map((result) => result.error).filter(Boolean);

      setStats({
        portfolioImages: portfolioResult.status === "fulfilled" ? portfolioResult.value.count || 0 : 0,
        featuredImages: featuredResult.status === "fulfilled" ? featuredResult.value.count || 0 : 0,
        clientGalleries: galleriesResult.status === "fulfilled" ? galleriesResult.value.count || 0 : 0,
        newInquiries: inquiriesResult.status === "fulfilled" ? inquiriesResult.value.count || 0 : 0,
      });

      if (errors.length > 0) {
        setStatsError("Some dashboard counts could not load. Refresh the page or check Supabase if this continues.");
      }

      setLoadingStats(false);
    }

    fetchStats();
  }, []);

  const hasStats = Object.values(stats).some((value) => Number(value) > 0);
  const statCards = [
    {
      kicker: "Portfolio",
      label: "Portfolio Images",
      value: stats.portfolioImages,
      to: "/admin/portfolio",
      color: COLORS.gold,
      meta: "Total visible and managed image records",
      emptyText: "No portfolio images yet",
      unavailable: Boolean(statsError && !loadingStats),
    },
    {
      kicker: "Portfolio",
      label: "Featured Images",
      value: stats.featuredImages,
      to: "/admin/portfolio",
      color: adminColors.text,
      meta: "Images marked for homepage and highlights",
      emptyText: "No featured images selected",
      unavailable: Boolean(statsError && !loadingStats),
    },
    {
      kicker: "Clients",
      label: "Client Galleries",
      value: stats.clientGalleries,
      to: "/admin/galleries",
      color: "#60a5fa",
      meta: "Total client gallery collections",
      emptyText: "No client galleries yet",
      unavailable: Boolean(statsError && !loadingStats),
    },
    {
      kicker: "Leads",
      label: "New Inquiries",
      value: stats.newInquiries,
      to: "/admin/inquiries",
      color: "#4ade80",
      meta: "New inquiries waiting for review",
      emptyText: "No new inquiries",
      unavailable: Boolean(statsError && !loadingStats),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: adminColors.bg }}>
      <AdminNav onSignOut={handleSignOut} />
      <main className="admin-dashboard-shell">
        <section className="admin-dashboard-hero">
          <div>
            <div className="admin-dashboard-kicker">Platform Overview</div>
            <h1 className="admin-dashboard-title">Dashboard</h1>
            <p className="admin-dashboard-copy">
              A central place to monitor portfolio content, client galleries, and new booking activity.
            </p>
          </div>
          <Link to="/" target="_blank" className="admin-dashboard-view-site">
            View Public Site ↗
          </Link>
        </section>

        {statsError && <div className="admin-dashboard-alert">{statsError}</div>}

        <section className="admin-dashboard-grid" aria-label="Admin dashboard counts">
          {statCards.map((card) => (
            <CountCard key={card.label} card={card} loading={loadingStats} />
          ))}
        </section>

        {!loadingStats && !statsError && !hasStats && (
          <div className="admin-dashboard-empty">
            No platform activity yet. Add portfolio images, create a client gallery, or wait for new inquiries to come in.
          </div>
        )}

        <section className="admin-dashboard-actions" aria-label="Quick actions">
          <div>
            <div className="admin-dashboard-kicker">Quick Actions</div>
            <h2 className="admin-dashboard-section-title">Start from here</h2>
          </div>
          <div className="admin-dashboard-action-grid">
            <QuickAction
              to="/admin/galleries"
              title="New Gallery"
              description="Open the client gallery workspace"
              variant="primary"
            />
            <QuickAction
              to="/admin/portfolio"
              title="Upload Portfolio Images"
              description="Manage public gallery images"
            />
            <QuickAction
              to="/"
              target="_blank"
              title="View Site"
              description="Open the public website"
            />
          </div>
        </section>
      </main>

      <style>{`
        .admin-dashboard-shell {
          padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem) 3rem;
        }

        .admin-dashboard-hero {
          align-items: flex-start;
          display: flex;
          gap: 1rem;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .admin-dashboard-kicker {
          color: ${COLORS.gold};
          font-family: ${adminFont};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          margin-bottom: 0.55rem;
          text-transform: uppercase;
        }

        .admin-dashboard-title {
          color: ${adminColors.text};
          font-family: ${adminHeading};
          font-size: clamp(2rem, 5vw, 3.25rem);
          line-height: 1;
          margin: 0;
        }

        .admin-dashboard-copy {
          color: ${adminColors.muted};
          font-family: ${adminFont};
          font-size: 0.92rem;
          line-height: 1.7;
          margin: 0.9rem 0 0;
          max-width: 620px;
        }

        .admin-dashboard-view-site {
          border: 1px solid ${adminColors.border};
          color: ${COLORS.gold};
          flex: 0 0 auto;
          font-family: ${adminFont};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          padding: 12px 16px;
          text-decoration: none;
          text-transform: uppercase;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .admin-dashboard-view-site:hover {
          background: rgba(200, 169, 107, 0.1);
          color: ${adminColors.text};
        }

        .admin-dashboard-alert,
        .admin-dashboard-empty {
          border: 1px solid rgba(224, 92, 92, 0.35);
          color: #ff8b8b;
          font-family: ${adminFont};
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 1rem;
          padding: 12px 14px;
        }

        .admin-dashboard-empty {
          border-color: ${adminColors.border};
          color: ${adminColors.muted};
          margin-top: -1.5rem;
          margin-bottom: 2.5rem;
        }

        .admin-dashboard-grid {
          background: ${adminColors.border};
          display: grid;
          gap: 1px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 3rem;
        }

        .admin-dashboard-card {
          background: ${adminColors.surface};
          min-height: 190px;
          padding: clamp(1.25rem, 3vw, 2rem);
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .admin-dashboard-card:hover {
          background: ${adminColors.surfaceHover};
          transform: translateY(-2px);
        }

        .admin-dashboard-card__eyebrow,
        .admin-dashboard-card__label,
        .admin-dashboard-card__meta {
          font-family: ${adminFont};
        }

        .admin-dashboard-card__eyebrow {
          color: ${COLORS.gold};
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .admin-dashboard-card__value {
          font-family: ${adminHeading};
          font-size: clamp(2.3rem, 5vw, 3.2rem);
          font-weight: 700;
          line-height: 1;
          margin: 1.25rem 0 0.65rem;
        }

        .admin-dashboard-card__label {
          color: ${adminColors.text};
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-dashboard-card__meta {
          color: ${adminColors.muted};
          font-size: 0.76rem;
          line-height: 1.55;
          margin-top: 0.7rem;
        }

        .admin-dashboard-actions {
          border-top: 1px solid ${adminColors.border};
          padding-top: 2rem;
        }

        .admin-dashboard-section-title {
          color: ${adminColors.text};
          font-family: ${adminHeading};
          font-size: 1.5rem;
          margin: 0 0 1.25rem;
        }

        .admin-dashboard-action-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .admin-quick-action {
          background: transparent;
          border: 1px solid ${adminColors.border};
          color: ${adminColors.text};
          display: block;
          padding: 1.15rem 1.25rem;
          text-decoration: none;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        .admin-quick-action:hover {
          background: ${adminColors.surfaceHover};
          border-color: rgba(200, 169, 107, 0.5);
          transform: translateY(-2px);
        }

        .admin-quick-action.is-primary {
          background: ${COLORS.gold};
          border-color: ${COLORS.gold};
          color: ${adminColors.bg};
        }

        .admin-quick-action span,
        .admin-quick-action small {
          display: block;
          font-family: ${adminFont};
        }

        .admin-quick-action span {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .admin-quick-action small {
          color: inherit;
          font-size: 0.78rem;
          line-height: 1.55;
          margin-top: 0.55rem;
          opacity: 0.72;
        }

        @media (max-width: 1050px) {
          .admin-dashboard-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .admin-dashboard-hero {
            flex-direction: column;
          }

          .admin-dashboard-view-site {
            width: fit-content;
          }

          .admin-dashboard-grid,
          .admin-dashboard-action-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
