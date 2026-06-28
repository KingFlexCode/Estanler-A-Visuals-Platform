import { COLORS } from "../lib/constants";
import { Tag, GoldLine, Reveal } from "../components/UI";
import Footer from "../components/Footer";

const comingSoon = [
  {
    icon: "🎨",
    label: "LUT Packs",
    desc: "Cinematic color grades for your footage. Sony, LOG, and standard profiles.",
  },
  {
    icon: "🖼️",
    label: "Fine Art Prints",
    desc: "Museum-quality prints of selected works. Limited editions, signed.",
  },
  {
    icon: "📦",
    label: "Merch",
    desc: "Branded apparel, mugs, and accessories.",
  },
  {
    icon: "🎬",
    label: "Presets",
    desc: "Lightroom and Capture One presets used in my own workflow.",
  },
];

export default function Shop() {
  return (
    <div
      style={{ background: COLORS.bg, minHeight: "100vh", paddingTop: "64px" }}
    >
      <div style={{ padding: "4rem clamp(1.5rem, 5vw, 4rem)" }}>
        <Reveal>
          <Tag>Coming Soon</Tag>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              color: COLORS.white,
              margin: "0.75rem 0",
            }}
          >
            Shop
          </h1>
          <GoldLine mb="1rem" />
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: COLORS.muted,
              maxWidth: "480px",
              lineHeight: 1.8,
              marginBottom: "4rem",
            }}
          >
            Products are on the way. Follow on Instagram for launch
            announcements.
          </p>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1px",
            background: COLORS.border,
            marginBottom: "4rem",
          }}
        >
          {comingSoon.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.06}>
              <div style={{ background: COLORS.bg, padding: "2.5rem 2rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
                  {item.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: COLORS.white,
                    marginBottom: "0.75rem",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.85rem",
                    color: COLORS.muted,
                    lineHeight: 1.7,
                  }}
                >
                  {item.desc}
                </div>
                <div
                  style={{
                    marginTop: "1.25rem",
                    display: "inline-block",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "9px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: COLORS.bg,
                    background: COLORS.border,
                    padding: "4px 10px",
                  }}
                >
                  Coming Soon
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div
            style={{
              border: `1px solid ${COLORS.border}`,
              padding: "3rem 2rem",
              textAlign: "center",
            }}
          >
            <Tag>Stay Updated</Tag>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "1.8rem",
                color: COLORS.white,
                margin: "1rem 0",
              }}
            >
              Follow for Launch Announcements
            </h2>
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
                color: COLORS.bg,
                background: COLORS.gold,
                padding: "13px 36px",
                textDecoration: "none",
                display: "inline-block",
                marginTop: "1rem",
              }}
            >
              @EstanlerAVisuals
            </a>
          </div>
        </Reveal>
      </div>
      <Footer />
    </div>
  );
}
