import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../lib/constants";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Gallery", to: "/work" },
    { label: "Services", to: "/services" },
    { label: "About", to: "/about" },
    { label: "Shop", to: "/shop" },
  ];

  const isActive = (to) => location.pathname === to;
  const closeMenu = () => setMenuOpen(false);

  const navBg =
    isHome && !scrolled ? "rgba(27, 38, 50, 0.72)" : "rgba(27, 38, 50, 0.96)";

  const navBorder =
    isHome && !scrolled
      ? "1px solid rgba(201, 193, 177, 0.12)"
      : `1px solid ${COLORS.border}`;

  const textColor = COLORS.text;
  const mutedColor = COLORS.muted;

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: "var(--nav-height)",
          background: navBg,
          borderBottom: navBorder,
          backdropFilter: "blur(14px)",
          transition: "all var(--transition-base)",
          padding: "0 var(--page-x)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          to="/"
          onClick={closeMenu}
          aria-label="Go to homepage"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "16px",
              color: textColor,
              letterSpacing: "0.04em",
              lineHeight: 1.1,
              transition: "color var(--transition-fast)",
            }}
          >
            Estanler A
          </div>

          <div
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: "9px",
              letterSpacing: "0.22em",
              color: COLORS.gold,
              textTransform: "uppercase",
            }}
          >
            Visuals
          </div>
        </Link>

        <div
          className="desktop-nav"
          style={{ display: "flex", gap: "2rem", alignItems: "center" }}
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: "12px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: isActive(link.to) ? COLORS.gold : mutedColor,
                transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(event) => {
                event.target.style.color = COLORS.text;
              }}
              onMouseLeave={(event) => {
                event.target.style.color = isActive(link.to)
                  ? COLORS.gold
                  : mutedColor;
              }}
            >
              {link.label}
            </Link>
          ))}

          <Link
            to="/admin/login"
            onClick={closeMenu}
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              color: mutedColor,
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(event) => {
              event.target.style.color = COLORS.text;
            }}
            onMouseLeave={(event) => {
              event.target.style.color = mutedColor;
            }}
          >
            Owner Login
          </Link>

          <Link
            to="/book"
            onClick={closeMenu}
            className="btn-primary"
            style={{
              padding: "9px 20px",
            }}
          >
            Book
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((previousValue) => !previousValue)}
          className="hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={{
            display: "none",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            flexDirection: "column",
            gap: "5px",
            padding: "4px",
          }}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: "22px",
                height: "1.5px",
                background: textColor,
                transition: "all var(--transition-base)",
                opacity: menuOpen && index === 1 ? 0 : 1,
                transform: menuOpen
                  ? index === 0
                    ? "rotate(45deg) translate(4.5px, 4.5px)"
                    : index === 2
                      ? "rotate(-45deg) translate(4.5px, -4.5px)"
                      : "none"
                  : "none",
              }}
            />
          ))}
        </button>
      </nav>

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background:
              "linear-gradient(135deg, rgba(27, 38, 50, 0.99), rgba(17, 26, 36, 0.99))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.4rem",
            paddingTop: "var(--nav-height)",
          }}
        >
          {[...links, { label: "Book", to: "/book" }].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2rem",
                color: isActive(link.to) ? COLORS.gold : COLORS.text,
                textDecoration: "none",
                letterSpacing: "0.05em",
              }}
            >
              {link.label}
            </Link>
          ))}

          <Link
            to="/admin/login"
            onClick={closeMenu}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: COLORS.muted,
              textDecoration: "none",
              marginTop: "0.5rem",
            }}
          >
            Owner Login
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
          .desktop-nav {
            display: none !important;
          }

          .hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
