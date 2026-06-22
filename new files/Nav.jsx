import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../lib/constants";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  const links = [
    { label: "Work",     to: "/work" },
    { label: "Services", to: "/services" },
    { label: "About",    to: "/about" },
    { label: "Shop",     to: "/shop" },
  ];

  const isActive = (to) => location.pathname === to;
  const isHome = location.pathname === "/";

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled || !isHome ? "rgba(10,10,10,0.95)" : "transparent",
        borderBottom: scrolled || !isHome ? `1px solid ${COLORS.border}` : "1px solid transparent",
        backdropFilter: scrolled || !isHome ? "blur(12px)" : "none",
        transition: "all 0.4s ease",
        padding: "0 clamp(1.5rem, 5vw, 4rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "64px",
      }}>
        {/* Wordmark */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "16px", color: COLORS.white, letterSpacing: "0.04em", lineHeight: 1.1,
          }}>Estanler A</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "9px", letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase",
          }}>Visuals</div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {links.map(link => (
            <Link key={link.to} to={link.to} style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "12px",
              letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none",
              color: isActive(link.to) ? COLORS.gold : COLORS.muted,
              transition: "color 0.25s",
            }}
              onMouseEnter={e => e.target.style.color = COLORS.white}
              onMouseLeave={e => e.target.style.color = isActive(link.to) ? COLORS.gold : COLORS.muted}
            >{link.label}</Link>
          ))}
          <Link to="/book" style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.bg, background: COLORS.gold,
            padding: "9px 20px", textDecoration: "none",
            transition: "background 0.25s",
          }}
            onMouseEnter={e => e.target.style.background = COLORS.goldDeep}
            onMouseLeave={e => e.target.style.background = COLORS.gold}
          >Book</Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(p => !p)} style={{
          display: "none",
          background: "none", border: "none", cursor: "pointer",
          flexDirection: "column", gap: "5px", padding: "4px",
        }} className="hamburger">
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: "22px", height: "1.5px", background: COLORS.white,
              transition: "all 0.3s ease",
              transform: menuOpen
                ? i === 0 ? "rotate(45deg) translate(4.5px, 4.5px)"
                : i === 1 ? "opacity: 0"
                : "rotate(-45deg) translate(4.5px, -4.5px)"
                : "none",
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(10,10,10,0.98)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "2rem", paddingTop: "64px",
        }}>
          {[...links, { label: "Book", to: "/book" }].map(link => (
            <Link key={link.to} to={link.to} style={{
              fontFamily: "'Playfair Display', serif", fontSize: "2rem",
              color: isActive(link.to) ? COLORS.gold : COLORS.white,
              textDecoration: "none", letterSpacing: "0.05em",
            }}>{link.label}</Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .hamburger { display: flex !important; }
          nav > div:not(.hamburger) { display: none !important; }
        }
      `}</style>
    </>
  );
}
