import { Link } from "react-router-dom";
import { COLORS } from "../lib/constants";

export default function Footer() {
  return (
    <footer style={{
      background: "#040404", borderTop: `1px solid ${COLORS.border}`,
      padding: "3rem clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: "2rem", marginBottom: "3rem",
      }}>
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "1.4rem", color: COLORS.white, letterSpacing: "0.04em",
          }}>Estanler A</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "9px", letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase",
          }}>Visuals</div>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.8rem", color: COLORS.muted, marginTop: "1rem",
            maxWidth: "220px", lineHeight: 1.65,
          }}>
            Photography · Film · Visual Storytelling<br />New York
          </p>
        </div>

        {[
          {
            heading: "Navigate",
            links: [
              { label: "Work",     to: "/work" },
              { label: "Services", to: "/services" },
              { label: "About",    to: "/about" },
              { label: "Shop",     to: "/shop" },
              { label: "Book",     to: "/book" },
            ],
          },
          {
            heading: "Services",
            links: [
              { label: "Weddings",     to: "/services" },
              { label: "Quinceañeras", to: "/services" },
              { label: "Portraits",    to: "/services" },
              { label: "Film",         to: "/services" },
              { label: "Commercial",   to: "/services" },
            ],
          },
        ].map(col => (
          <div key={col.heading}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 500,
              fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
              color: COLORS.gold, marginBottom: "1rem",
            }}>{col.heading}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {col.links.map(l => (
                <Link key={l.label} to={l.to} style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 300,
                  fontSize: "0.85rem", color: COLORS.muted, textDecoration: "none",
                  transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.target.style.color = COLORS.white}
                  onMouseLeave={e => e.target.style.color = COLORS.muted}
                >{l.label}</Link>
              ))}
            </div>
          </div>
        ))}

        <div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 500,
            fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
            color: COLORS.gold, marginBottom: "1rem",
          }}>Connect</div>
          <a href="https://instagram.com/EstanlerAVisuals" target="_blank" rel="noreferrer" style={{
            display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.85rem", color: COLORS.muted, textDecoration: "none",
            marginBottom: "0.6rem", transition: "color 0.2s",
          }}
            onMouseEnter={e => e.target.style.color = COLORS.white}
            onMouseLeave={e => e.target.style.color = COLORS.muted}
          >@EstanlerAVisuals</a>
          <a href="mailto:estanleraleman@gmail.com" style={{
            display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.85rem", color: COLORS.muted, textDecoration: "none",
            transition: "color 0.2s",
          }}
            onMouseEnter={e => e.target.style.color = COLORS.white}
            onMouseLeave={e => e.target.style.color = COLORS.muted}
          >estanleraleman@gmail.com</a>
        </div>
      </div>

      <div style={{
        borderTop: `1px solid ${COLORS.border}`, paddingTop: "1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "0.75rem", color: COLORS.muted, opacity: 0.5,
        }}>© {new Date().getFullYear()} Estanler A Visuals. All rights reserved.</div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "0.75rem", color: COLORS.muted, opacity: 0.5,
        }}>Privacy · Terms</div>
      </div>
    </footer>
  );
}
