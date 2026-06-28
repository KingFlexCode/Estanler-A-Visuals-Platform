import { Link } from "react-router-dom";
import { COLORS, BASE } from "../lib/constants";
import { Tag, GoldLine, Reveal } from "../components/UI";
import Footer from "../components/Footer";
import aboutPhoto from "../assets/my_about_picture.png";

export default function About() {
  return (
    <div
      style={{ background: COLORS.bg, minHeight: "100vh", paddingTop: "64px" }}
    >
      <div
        style={{
          padding: "4rem clamp(1.5rem, 5vw, 4rem)",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* Hero split */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
            marginBottom: "6rem",
          }}
        >
          <Reveal>
            <div
              style={{
                aspectRatio: "3/4",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <img
                src={aboutPhoto}
                alt="Estanler Aleman, photographer and visual storyteller"
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.parentElement.style.background = "#111";
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "1.5rem",
                  left: "1.5rem",
                  width: "40px",
                  height: "40px",
                  borderTop: `1px solid ${COLORS.gold}`,
                  borderLeft: `1px solid ${COLORS.gold}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "1.5rem",
                  right: "1.5rem",
                  width: "40px",
                  height: "40px",
                  borderBottom: `1px solid ${COLORS.gold}`,
                  borderRight: `1px solid ${COLORS.gold}`,
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <Tag>About</Tag>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: COLORS.white,
                margin: "0.75rem 0",
              }}
            >
              Estanler A
            </h1>
            <GoldLine />
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.95rem",
                color: COLORS.muted,
                lineHeight: 1.9,
                marginBottom: "1.25rem",
              }}
            >
              A visual storyteller with over a decade of experience capturing
              life's most meaningful moments. Based in New York, serving clients
              across the tri-state area and beyond.
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.95rem",
                color: COLORS.muted,
                lineHeight: 1.9,
                marginBottom: "2.5rem",
              }}
            >
              From cinematic weddings and vibrant quinceañeras to editorial
              artist branding and commercial productions — every project
              receives the same commitment to craft, light, and authentic
              emotion.
            </p>

            <div
              style={{ display: "flex", gap: "2.5rem", marginBottom: "2.5rem" }}
            >
              {[
                ["15+", "Years"],
                ["100+", "Sessions"],
                ["20+", "Films"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 700,
                      fontSize: "2rem",
                      color: COLORS.gold,
                    }}
                  >
                    {n}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.75rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: COLORS.muted,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/book"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: COLORS.bg,
                background: COLORS.gold,
                padding: "13px 32px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Work With Me
            </Link>
          </Reveal>
        </div>

        {/* Equipment */}
        <Reveal>
          <div
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: "4rem",
              marginBottom: "4rem",
            }}
          >
            <Tag>Equipment</Tag>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "1.8rem",
                color: COLORS.white,
                margin: "0.75rem 0 2rem",
              }}
            >
              The Kit
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1px",
                background: COLORS.border,
              }}
            >
              {[
                {
                  cat: "Camera Bodies",
                  items: ["Sony Alpha Series", "Sony A7 IV", "Sony FX3"],
                },
                {
                  cat: "Lenses",
                  items: [
                    "Zeiss Batis 85mm",
                    "Sony G-Master 24-70mm",
                    "Sony 135mm f/1.8",
                  ],
                },
                {
                  cat: "Lighting",
                  items: ["Profoto B10 Plus", "Godox AD600", "Aputure 300D"],
                },
                {
                  cat: "Post Production",
                  items: [
                    "Adobe Lightroom",
                    "Adobe Premiere",
                    "DaVinci Resolve",
                  ],
                },
              ].map((g) => (
                <div
                  key={g.cat}
                  style={{ background: COLORS.bg, padding: "1.75rem" }}
                >
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: "10px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: COLORS.gold,
                      marginBottom: "1rem",
                    }}
                  >
                    {g.cat}
                  </div>
                  {g.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.85rem",
                        color: COLORS.muted,
                        padding: "4px 0",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Connect */}
        <Reveal>
          <div
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: "4rem",
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://instagram.com/EstanlerAVisuals"
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: COLORS.gold,
                textDecoration: "none",
                borderBottom: `1px solid ${COLORS.border}`,
                paddingBottom: "2px",
              }}
            >
              @EstanlerAVisuals ↗
            </a>
            <a
              href="mailto:estanleraleman@gmail.com"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: COLORS.muted,
                textDecoration: "none",
                borderBottom: `1px solid ${COLORS.border}`,
                paddingBottom: "2px",
              }}
            >
              estanleraleman@gmail.com
            </a>
          </div>
        </Reveal>
      </div>
      <Footer />
    </div>
  );
}
