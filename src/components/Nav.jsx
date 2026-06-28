import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../lib/constants";

const LIGHT_PAGES = ["/work", "/services", "/about", "/book", "/shop"];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isLight = LIGHT_PAGES.some((page) =>
    location.pathname.startsWith(page),
  );
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

  const navBg = isLight
    ? scrolled
      ? "rgba(250,248,245,0.96)"
      : "rgba(250,248,245,0.98)"
    : scrolled || !isHome
      ? "rgba(10,10,10,0.95)"
      : "transparent";

  const navBorder = isLight
    ? `1px solid ${COLORS.border}`
    : scrolled || !isHome
      ? `1px solid ${COLORS.borderDark}`
      : "1px solid transparent";

  const textColor = isLight ? COLORS.text : COLORS.white;
  const mutedColor = isLight ? COLORS.muted : COLORS.mutedDark;

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: navBg,
          borderBottom: navBorder,
          backdropFilter: "blur(12px)",
          transition: "all 0.3s ease",
          padding: "0 clamp(1.5rem, 5vw, 4rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        <Link to="/" onClick={closeMenu} style={{ textDecoration: "none" }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "16px",
              color: textColor,
              letterSpacing: "0.04em",
              lineHeight: 1.1,
              transition: "color 0.3s",
            }}
          >
            Estanler A
          </div>

          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "9px",
              letterSpacing: "0.22em",
              color: COLORS.gold,
              textTransform: "uppercase",
            }}
          >
            Visuals
          </div>
        </Link>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: isActive(link.to) ? COLORS.gold : mutedColor,
                transition: "color 0.25s",
              }}
              onMouseEnter={(event) => {
                event.target.style.color = isLight ? COLORS.text : COLORS.white;
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
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              color: mutedColor,
              transition: "color 0.25s",
            }}
            onMouseEnter={(event) => {
              event.target.style.color = isLight ? COLORS.text : COLORS.white;
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
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.bgDark,
              background: COLORS.gold,
              padding: "9px 20px",
              textDecoration: "none",
              transition: "background 0.25s",
            }}
            onMouseEnter={(event) => {
              event.target.style.background = COLORS.goldDeep;
            }}
            onMouseLeave={(event) => {
              event.target.style.background = COLORS.gold;
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
            background: "none",
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
                transition: "all 0.3s ease",
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
            background: isLight
              ? "rgba(250,248,245,0.99)"
              : "rgba(10,10,10,0.99)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.5rem",
            paddingTop: "64px",
          }}
        >
          {[...links, { label: "Book", to: "/book" }].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
                color: isActive(link.to)
                  ? COLORS.gold
                  : isLight
                    ? COLORS.text
                    : COLORS.white,
                textDecoration: "none",
                letterSpacing: "0.05em",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
