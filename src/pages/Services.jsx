import { Link } from "react-router-dom";
import { COLORS } from "../lib/constants";
import { Tag, GoldLine, Reveal } from "../components/UI";
import Footer from "../components/Footer";

const services = [
  {
    id: "weddings",
    icon: "💍",
    label: "Weddings",
    desc: "Full-day documentary coverage with cinematic editing. From intimate elopements to grand celebrations — every detail captured with intention.",
    includes: [
      "Ceremony coverage",
      "Reception coverage",
      "Getting ready",
      "Portraits",
      "Online gallery",
      "Highlight reel available",
    ],
  },
  {
    id: "engagements",
    icon: "✨",
    label: "Engagements",
    desc: "Intimate sessions that tell your love story. Perfect standalone or as a complement to wedding coverage.",
    includes: [
      "1-2 hour session",
      "Location of choice",
      "Online gallery",
      "Print-ready files",
    ],
  },
  {
    id: "portraits",
    icon: "🎞️",
    label: "Portraits",
    desc: "Editorial portraiture for individuals, couples, and families. Natural light or studio — crafted to reflect who you truly are.",
    includes: [
      "1-4 hour sessions",
      "Multiple looks",
      "Location or studio",
      "Online gallery",
      "Retouched images",
      "Print-ready files",
    ],
  },
  {
    id: "birthday-celebrations",
    icon: "🎂",
    label: "Birthday Celebrations",
    desc: "Milestone birthdays captured with style and joy, preserving the moments, details, and memories that make the celebration unforgettable.",
    includes: [
      "Event coverage",
      "Decor and detail shots",
      "Cake cutting",
      "Candid moments",
      "Family and guest portraits",
      "Online gallery",
    ],
  },
  {
    id: "family",
    icon: "🧑‍🧑‍🧒‍🧒",
    label: "Family Sessions",
    desc: "Lifestyle family photography — natural, relaxed, and authentic. Documenting your family as it is right now.",
    includes: [
      "1-2 hour session",
      "Lifestyle approach",
      "Online gallery",
      "Print-ready files",
    ],
  },
  {
    id: "music",
    icon: "🎵",
    label: "Music Artists",
    desc: "Artist branding, EPKs, and album art. Visuals that define your brand and connect with your audience.",
    includes: [
      "EPK photography",
      "Album artwork",
      "Social content",
      "Press photos",
      "Online delivery",
    ],
  },
  {
    id: "commercial",
    icon: "📷",
    label: "Commercial",
    desc: "Product, brand, and corporate imagery. Clean, professional visuals that elevate your brand.",
    includes: [
      "Product photography",
      "Brand campaigns",
      "Corporate headshots",
      "Event coverage",
      "Commercial licensing",
    ],
  },
  {
    id: "film",
    icon: "🎬",
    label: "Film Production",
    desc: "Music videos, short films, and commercial productions. Full cinematic production from concept to final cut.",
    includes: [
      "Concept development",
      "Full production crew",
      "Cinematography",
      "Color grading",
      "Post-production",
      "Final delivery",
    ],
  },
];

export default function Services() {
  return (
    <div
      style={{ background: COLORS.bg, minHeight: "100vh", paddingTop: "64px" }}
    >
      <div style={{ padding: "4rem clamp(1.5rem, 5vw, 4rem)" }}>
        <Reveal>
          <Tag>What I Offer</Tag>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              color: COLORS.white,
              margin: "0.75rem 0",
            }}
          >
            Services
          </h1>
          <GoldLine mb="1rem" />
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: COLORS.muted,
              maxWidth: "560px",
              lineHeight: 1.8,
              marginBottom: "4rem",
            }}
          >
            Every project is unique. Pricing is based on your specific needs —
            fill out the booking form and I'll put together a custom quote for
            you.
          </p>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            background: COLORS.border,
          }}
        >
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.04}>
              <div
                style={{
                  background: COLORS.bg,
                  padding: "2rem",
                  height: "450px",
                  margin: "5px",
                  transition: "background 0.25s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#0d0d0d")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = COLORS.bg)
                }
              >
                <div style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
                  {s.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 600,
                    fontSize: "1.2rem",
                    color: COLORS.white,
                    marginBottom: "0.75rem",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.88rem",
                    color: COLORS.muted,
                    lineHeight: 1.75,
                    marginBottom: "1.5rem",
                    height: "100px",
                  }}
                >
                  {s.desc}
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${COLORS.border}`,
                    paddingTop: "1.25rem",
                  }}
                >
                  {s.includes.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.82rem",
                        color: COLORS.muted,
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ color: COLORS.gold, fontSize: "8px" }}>
                        ◆
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal>
          <div
            style={{
              textAlign: "center",
              marginTop: "5rem",
              padding: "4rem 2rem",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Tag>Ready to Book?</Tag>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                color: COLORS.white,
                margin: "1rem 0",
              }}
            >
              Let's Discuss Your Project
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.95rem",
                color: COLORS.muted,
                maxWidth: "440px",
                margin: "0 auto 2rem",
                lineHeight: 1.75,
              }}
            >
              Fill out the booking form with your event details and I'll send
              you a custom quote within 24 hours.
            </p>
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
                padding: "14px 40px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Request a Quote
            </Link>
          </div>
        </Reveal>
      </div>
      <Footer />
    </div>
  );
}
