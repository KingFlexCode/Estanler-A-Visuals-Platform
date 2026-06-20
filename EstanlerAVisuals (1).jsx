import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

// ─── Brand tokens ──────────────────────────────────────────────────
const COLORS = {
  bg: "#0A0A0A",
  white: "#FFFFFF",
  gold: "#C8A96B",
  goldDeep: "#D4AF37",
  muted: "rgba(255,255,255,0.45)",
  border: "rgba(200,169,107,0.18)",
};

const BASE = "https://kkimcezmyiqtfjdczeii.supabase.co/storage/v1/object/public/Portfolio";

const WORK_ITEMS = [
  { id: 1,  category: "portrait",   aspect: "4/5",  label: "Editorial Portraits",     img: `${BASE}/potraits/EACP1142.jpg` },
  { id: 2,  category: "portrait",   aspect: "3/4",  label: "Studio Session",          img: `${BASE}/potraits/EACP1245.jpg` },
  { id: 3,  category: "portrait",   aspect: "4/5",  label: "Creative Portraits",      img: `${BASE}/potraits/EACP1703-Edit.jpg` },
  { id: 4,  category: "engagement", aspect: "3/4",  label: "Des Engagement Session",  img: `${BASE}/engadgements/Engagement%20Samples.jpg` },
  { id: 5,  category: "portrait",   aspect: "4/5",  label: "Portrait Series",         img: `${BASE}/potraits/EACP1809-Edit.jpg` },
  { id: 6,  category: "portrait",   aspect: "3/4",  label: "Natural Light Portraits", img: `${BASE}/potraits/EACP1856-Enhanced-NR.jpg` },
  { id: 7,  category: "birthday",   aspect: "4/5",  label: "Iris 30th Birthday",      img: `${BASE}/birthdays/Iris%2030th%27s%20Birthday%20Portrait...` },
  { id: 8,  category: "portrait",   aspect: "1/1",  label: "Fashion Portraits",       img: `${BASE}/potraits/EACP2037-Edit.jpg` },
  { id: 9,  category: "engagement", aspect: "4/5",  label: "Destiny Engagement",      img: `${BASE}/engadgements/Destiny%20Engagement%20Misc%20...` },
  { id: 10, category: "portrait",   aspect: "3/4",  label: "Portrait Edit",           img: `${BASE}/potraits/EACP1964-Edit.jpg` },
  { id: 11, category: "portrait",   aspect: "4/5",  label: "Portrait Collection",     img: `${BASE}/potraits/EACP2080-Edit.jpg` },
  { id: 12, category: "portrait",   aspect: "3/4",  label: "Portrait Series II",      img: `${BASE}/potraits/EACP1737-Edit.jpg` },
];

const WORK_FILTERS = ["All", "Portrait", "Engagement", "Birthday", "Wedding"];

const services = [
  { id: "weddings",      label: "Weddings",          icon: "💍", desc: "Full-day documentary coverage with cinematic editing." },
  { id: "quinceaneras", label: "Quinceañeras",       icon: "👑", desc: "Cultural celebrations captured with elegance and joy." },
  { id: "portraits",    label: "Portraits",          icon: "🎞️", desc: "Editorial portraiture for individuals and artists." },
  { id: "engagements",  label: "Engagements",        icon: "✨", desc: "Intimate sessions that tell your love story." },
  { id: "family",       label: "Family Sessions",    icon: "🌿", desc: "Lifestyle family photography, natural and relaxed." },
  { id: "commercial",   label: "Commercial",         icon: "📷", desc: "Product, brand, and corporate imagery." },
  { id: "music",        label: "Music Artists",      icon: "🎵", desc: "Artist branding, EPKs, and album art." },
  { id: "film",         label: "Film Production",    icon: "🎬", desc: "Music videos, short films, commercial productions." },
];

const packages = [
  {
    name: "Essential",
    price: "$850",
    features: ["4-hour session", "200+ edited images", "Online gallery", "Digital downloads"],
    highlight: false,
  },
  {
    name: "Signature",
    price: "$1,450",
    features: ["8-hour session", "400+ edited images", "Online gallery", "Print credit $150", "USB keepsake"],
    highlight: true,
  },
  {
    name: "Cinematic",
    price: "$2,200",
    features: ["Full day coverage", "600+ edited images", "Highlight reel", "Premium album", "Engagement session"],
    highlight: false,
  },
];

const testimonials = [
  {
    name: "Sofia M.",
    session: "Quinceañera",
    text: "Estanler captured every emotion of my daughter's quinceañera. The photos are absolutely breathtaking — we cry every time we look at them.",
    stars: 5,
  },
  {
    name: "Marcus & Jade",
    session: "Wedding",
    text: "From the first consultation to the final gallery delivery, everything was seamless. The cinematic quality of our wedding photos exceeded every expectation.",
    stars: 5,
  },
  {
    name: "Destiny R.",
    session: "Music Artist",
    text: "My EPK shots completely transformed my brand. Every image looks like it belongs in a magazine. Booking again for my next project.",
    stars: 5,
  },
];

// ─── Utility components ─────────────────────────────────────────────

function GoldLine({ w = "60px", mt = "1rem", mb = "1.5rem" }) {
  return (
    <div style={{
      width: w, height: "1px",
      background: `linear-gradient(90deg, ${COLORS.gold}, transparent)`,
      marginTop: mt, marginBottom: mb,
    }} />
  );
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
      color: COLORS.gold, fontFamily: "'Inter', sans-serif", fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

function Stars({ count }) {
  return (
    <div style={{ display: "flex", gap: "3px", marginBottom: "10px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: COLORS.gold, fontSize: "13px" }}>★</span>
      ))}
    </div>
  );
}

// ─── Scroll-reveal hook ─────────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useFadeIn();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────
function Nav({ scrolled, activeSection, onNav }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ["Work", "Services", "About", "Blog", "Contact"];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(10,10,10,0.92)" : "transparent",
      borderBottom: scrolled ? `1px solid ${COLORS.border}` : "1px solid transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      transition: "all 0.4s ease",
      padding: "0 clamp(1.5rem, 5vw, 4rem)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "64px",
    }}>
      {/* Wordmark */}
      <button onClick={() => onNav("hero")} style={{
        background: "none", border: "none", cursor: "pointer", padding: 0,
        textAlign: "left",
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "16px", color: COLORS.white, letterSpacing: "0.04em", lineHeight: 1.1,
        }}>
          Estanler A
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "9px", letterSpacing: "0.22em", color: COLORS.gold,
          textTransform: "uppercase",
        }}>
          Visuals
        </div>
      </button>

      {/* Desktop links */}
      <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
        {links.map(link => (
          <button key={link} onClick={() => onNav(link.toLowerCase())} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "12px",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: activeSection === link.toLowerCase() ? COLORS.gold : COLORS.muted,
            transition: "color 0.25s",
          }}>
            {link}
          </button>
        ))}
        <button onClick={() => onNav("contact")} style={{
          fontFamily: "'Inter', sans-serif", fontSize: "11px",
          letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
          color: COLORS.bg, background: COLORS.gold,
          border: "none", padding: "9px 20px", cursor: "pointer",
          transition: "background 0.25s",
        }}>
          Book Now
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────
function Hero({ onNav }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  const heroPhotos = [
    `${BASE}/potraits/EACP1245.jpg`,
    `${BASE}/engadgements/Engagement%20Samples.jpg`,
    `${BASE}/potraits/EACP1856-Enhanced-NR.jpg`,
  ];
  const [bg, setBg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBg(p => (p + 1) % heroPhotos.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="hero" style={{
      position: "relative", height: "100vh", minHeight: "600px",
      display: "flex", alignItems: "flex-end", overflow: "hidden",
      background: COLORS.bg,
    }}>
      {/* Background images with crossfade */}
      {heroPhotos.map((src, i) => (
        <div key={src} style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: "cover", backgroundPosition: "center 30%",
          opacity: bg === i ? (loaded ? 0.55 : 0) : 0,
          transition: "opacity 1.4s ease",
        }} />
      ))}

      {/* Cinematic overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.3) 50%, rgba(10,10,10,0.15) 100%)",
      }} />

      {/* Left gold bar accent */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
        background: `linear-gradient(to bottom, transparent, ${COLORS.gold}, transparent)`,
        opacity: loaded ? 1 : 0, transition: "opacity 1.2s ease 0.5s",
      }} />

      {/* Hero content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "0 clamp(1.5rem, 6vw, 5rem) clamp(3rem, 8vh, 5rem)",
        maxWidth: "760px",
      }}>
        <div style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.9s ease 0.2s",
        }}>
          <Tag>Photography · Film · Visual Storytelling</Tag>
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 1.05,
          color: COLORS.white, margin: "1rem 0",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.9s ease 0.35s",
        }}>
          Every Frame<br />
          <span style={{ color: COLORS.gold }}>Tells Your Story</span>
        </h1>

        <GoldLine />

        <p style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", color: COLORS.muted,
          lineHeight: 1.75, maxWidth: "480px", margin: "0 0 2rem",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.9s ease 0.5s",
        }}>
          Premium photography and film production based in New York.
          Weddings, quinceañeras, portraits, music videos, and commercial work
          — crafted with cinematic precision.
        </p>

        <div style={{
          display: "flex", gap: "1rem", flexWrap: "wrap",
          opacity: loaded ? 1 : 0, transition: "opacity 0.9s ease 0.65s",
        }}>
          <button onClick={() => onNav("work")} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.bg, background: COLORS.gold,
            border: "none", padding: "14px 32px", cursor: "pointer",
          }}>
            View Work
          </button>
          <button onClick={() => onNav("contact")} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.gold, background: "transparent",
            border: `1px solid ${COLORS.border}`, padding: "14px 32px", cursor: "pointer",
          }}>
            Book a Session
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: "absolute", bottom: "2rem", right: "clamp(1.5rem, 5vw, 4rem)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        opacity: loaded ? 0.5 : 0, transition: "opacity 1.2s ease 1.2s",
      }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: "9px",
          letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted,
          writingMode: "vertical-rl",
        }}>
          Scroll
        </div>
        <div style={{
          width: "1px", height: "40px",
          background: `linear-gradient(to bottom, ${COLORS.gold}, transparent)`,
        }} />
      </div>
    </section>
  );
}

// ─── Portfolio / Work ───────────────────────────────────────────────

function WorkGrid({ onNav }) {
  const [filter, setFilter] = useState("All");
  const [ref, visible] = useFadeIn(0.1);

  const filtered = filter === "All"
    ? WORK_ITEMS
    : WORK_ITEMS.filter(w => w.category === filter.toLowerCase());

  return (
    <section id="work" style={{ background: COLORS.bg, padding: "7rem clamp(1.5rem, 5vw, 4rem)" }}>
      <FadeIn>
        <Tag>Portfolio</Tag>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "clamp(2rem, 4vw, 3rem)", color: COLORS.white,
          margin: "0.75rem 0",
        }}>
          Selected Work
        </h2>
        <GoldLine mb="2rem" />
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.1}>
        <div style={{
          display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "3rem",
        }}>
          {WORK_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: "'Inter', sans-serif", fontSize: "10px",
              letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 400,
              color: filter === f ? COLORS.bg : COLORS.muted,
              background: filter === f ? COLORS.gold : "transparent",
              border: `1px solid ${filter === f ? COLORS.gold : COLORS.border}`,
              padding: "6px 16px", cursor: "pointer", transition: "all 0.2s",
            }}>
              {f}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Masonry-style grid */}
      <div ref={ref} style={{
        columns: "3 240px", columnGap: "12px",
        opacity: visible ? 1 : 0, transition: "opacity 0.6s ease",
      }}>
        {filtered.map((item, i) => (
          <div key={item.id} style={{
            breakInside: "avoid", marginBottom: "12px",
            aspectRatio: item.aspect, background: "#0a0a0a",
            position: "relative", overflow: "hidden", cursor: "pointer",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.97)",
            transition: `all 0.5s ease ${i * 0.06}s`,
          }}
            onMouseEnter={e => {
              e.currentTarget.querySelector(".overlay").style.opacity = "1";
              e.currentTarget.querySelector(".thumb-img").style.transform = "scale(1.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.querySelector(".overlay").style.opacity = "0";
              e.currentTarget.querySelector(".thumb-img").style.transform = "scale(1)";
            }}
          >
            <img
              className="thumb-img"
              src={item.img}
              alt={item.label}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", display: "block",
                transition: "transform 0.5s ease",
              }}
            />

            {/* Hover overlay */}
            <div className="overlay" style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)",
              display: "flex", alignItems: "flex-end", padding: "1.25rem",
              opacity: 0, transition: "opacity 0.35s ease",
            }}>
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontWeight: 400,
                  fontSize: "1rem", color: COLORS.white, marginBottom: "4px",
                }}>
                  {item.label}
                </div>
                <Tag>{item.category}</Tag>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FadeIn delay={0.3}>
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <button onClick={() => onNav("work")} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.gold, background: "transparent",
            border: `1px solid ${COLORS.border}`, padding: "14px 40px", cursor: "pointer",
          }}>
            View Full Portfolio
          </button>
        </div>
      </FadeIn>
    </section>
  );
}

// ─── Services ───────────────────────────────────────────────────────
function Services() {
  return (
    <section id="services" style={{
      background: "#060606", padding: "7rem clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <FadeIn>
        <Tag>What We Do</Tag>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "clamp(2rem, 4vw, 3rem)", color: COLORS.white,
          margin: "0.75rem 0",
        }}>
          Services
        </h2>
        <GoldLine mb="3rem" />
      </FadeIn>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "1px", background: COLORS.border,
      }}>
        {services.map((s, i) => (
          <FadeIn key={s.id} delay={i * 0.05}>
            <div style={{
              background: "#060606", padding: "2rem 1.75rem",
              cursor: "pointer", transition: "background 0.25s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#0f0e0b"}
              onMouseLeave={e => e.currentTarget.style.background = "#060606"}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontWeight: 600,
                fontSize: "1.05rem", color: COLORS.white, marginBottom: "0.6rem",
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 300,
                fontSize: "0.85rem", color: COLORS.muted, lineHeight: 1.65,
              }}>
                {s.desc}
              </div>
              <div style={{
                marginTop: "1.25rem",
                fontFamily: "'Inter', sans-serif", fontSize: "10px",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: COLORS.gold,
              }}>
                Learn more →
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────
function Pricing({ onNav }) {
  return (
    <section id="pricing" style={{
      background: COLORS.bg, padding: "7rem clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <FadeIn>
        <Tag>Packages</Tag>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "clamp(2rem, 4vw, 3rem)", color: COLORS.white,
          margin: "0.75rem 0",
        }}>
          Investment
        </h2>
        <GoldLine mb="0.75rem" />
        <p style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "0.95rem", color: COLORS.muted, maxWidth: "480px",
          marginBottom: "3.5rem", lineHeight: 1.7,
        }}>
          Custom packages available. All sessions include a personal consultation
          and private online gallery.
        </p>
      </FadeIn>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1px", background: COLORS.border,
      }}>
        {packages.map((pkg, i) => (
          <FadeIn key={pkg.name} delay={i * 0.1}>
            <div style={{
              background: pkg.highlight ? "#100e09" : "#0A0A0A",
              padding: "2.5rem 2rem", position: "relative",
            }}>
              {pkg.highlight && (
                <div style={{
                  position: "absolute", top: "1.25rem", right: "1.25rem",
                  fontFamily: "'Inter', sans-serif", fontSize: "9px",
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  color: COLORS.bg, background: COLORS.gold,
                  padding: "4px 10px",
                }}>
                  Most Popular
                </div>
              )}
              <div style={{
                fontFamily: "'Playfair Display', serif", fontWeight: 600,
                fontSize: "1.2rem", color: COLORS.white, marginBottom: "0.5rem",
              }}>
                {pkg.name}
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontWeight: 700,
                fontSize: "2.5rem", color: pkg.highlight ? COLORS.gold : COLORS.white,
                marginBottom: "1.5rem",
              }}>
                {pkg.price}
              </div>
              <div style={{
                width: "100%", height: "1px",
                background: COLORS.border, marginBottom: "1.5rem",
              }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
                {pkg.features.map(f => (
                  <li key={f} style={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 300,
                    fontSize: "0.87rem", color: COLORS.muted,
                    padding: "6px 0",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                    <span style={{ color: COLORS.gold, fontSize: "10px" }}>◆</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => onNav("contact")} style={{
                width: "100%",
                fontFamily: "'Inter', sans-serif", fontSize: "11px",
                letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
                color: pkg.highlight ? COLORS.bg : COLORS.gold,
                background: pkg.highlight ? COLORS.gold : "transparent",
                border: `1px solid ${pkg.highlight ? COLORS.gold : COLORS.border}`,
                padding: "12px", cursor: "pointer", transition: "all 0.2s",
              }}>
                Book {pkg.name}
              </button>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.35}>
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
          color: COLORS.muted, textAlign: "center", marginTop: "2rem",
          opacity: 0.6,
        }}>
          Starting prices listed. Final package pricing depends on date, location, and coverage needs.
        </p>
      </FadeIn>
    </section>
  );
}

// ─── About ──────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" style={{
      background: "#060606", padding: "7rem clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "4rem", alignItems: "center",
        maxWidth: "1100px", margin: "0 auto",
      }}>
        <FadeIn>
          <div style={{ aspectRatio: "3/4", position: "relative", overflow: "hidden" }}>
            <img
              src={`${BASE}/potraits/EACP1253.jpg`}
              alt="Estanler A — Photographer"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", top: "1.5rem", left: "1.5rem",
              width: "40px", height: "40px",
              borderTop: `1px solid ${COLORS.gold}`, borderLeft: `1px solid ${COLORS.gold}`,
            }} />
            <div style={{
              position: "absolute", bottom: "1.5rem", right: "1.5rem",
              width: "40px", height: "40px",
              borderBottom: `1px solid ${COLORS.gold}`, borderRight: `1px solid ${COLORS.gold}`,
            }} />
          </div>
        </FadeIn>

        {/* Right: bio */}
        <FadeIn delay={0.15}>
          <Tag>About</Tag>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "clamp(2rem, 3.5vw, 2.8rem)", color: COLORS.white,
            margin: "0.75rem 0",
          }}>
            Estanler A
          </h2>
          <GoldLine />

          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.95rem", color: COLORS.muted, lineHeight: 1.85,
            marginBottom: "1.25rem",
          }}>
            A visual storyteller with over a decade of experience capturing life's
            most meaningful moments. Based in New York, serving clients across the
            tri-state area and beyond.
          </p>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.95rem", color: COLORS.muted, lineHeight: 1.85,
            marginBottom: "2.5rem",
          }}>
            From cinematic weddings and vibrant quinceañeras to editorial artist
            branding and commercial productions — every project receives the same
            commitment to craft, light, and authentic emotion.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "2.5rem", marginBottom: "2.5rem" }}>
            {[["10+", "Years"], ["800+", "Sessions"], ["50+", "Films"]].map(([n, l]) => (
              <div key={l}>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontWeight: 700,
                  fontSize: "2rem", color: COLORS.gold,
                }}>
                  {n}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 300,
                  fontSize: "0.75rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: COLORS.muted,
                }}>
                  {l}
                </div>
              </div>
            ))}
          </div>

          {/* Gear list */}
          <div style={{
            borderTop: `1px solid ${COLORS.border}`, paddingTop: "1.5rem",
          }}>
            <Tag>Equipment</Tag>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 300,
              fontSize: "0.82rem", color: COLORS.muted, lineHeight: 2,
              marginTop: "0.5rem",
            }}>
              Sony Alpha Series · Zeiss & G-Master Glass · DJI Cinema<br />
              Profoto Lighting · Adobe Creative Suite
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────
function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="testimonials" style={{
      background: COLORS.bg, padding: "7rem clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${COLORS.border}`, textAlign: "center",
    }}>
      <FadeIn>
        <Tag>Client Stories</Tag>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: "clamp(2rem, 4vw, 3rem)", color: COLORS.white,
          margin: "0.75rem auto 0.5rem", maxWidth: "600px",
        }}>
          What Clients Say
        </h2>
        <div style={{
          width: "60px", height: "1px",
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          margin: "0 auto 3.5rem",
        }} />
      </FadeIn>

      <div style={{ maxWidth: "660px", margin: "0 auto" }}>
        {testimonials.map((t, i) => (
          <div key={t.name} style={{
            opacity: active === i ? 1 : 0,
            position: active === i ? "relative" : "absolute",
            transition: "opacity 0.7s ease",
          }}>
            {active === i && (
              <FadeIn>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontStyle: "italic",
                  fontSize: "clamp(1.05rem, 2vw, 1.3rem)", color: COLORS.white,
                  lineHeight: 1.75, marginBottom: "2rem",
                }}>
                  "{t.text}"
                </div>
                <Stars count={t.stars} />
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 500,
                  fontSize: "0.9rem", color: COLORS.gold, marginBottom: "3px",
                }}>
                  {t.name}
                </div>
                <Tag>{t.session}</Tag>
              </FadeIn>
            )}
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "3rem" }}>
        {testimonials.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            width: i === active ? "24px" : "6px", height: "6px",
            background: i === active ? COLORS.gold : COLORS.border,
            border: "none", cursor: "pointer",
            transition: "all 0.3s ease", padding: 0,
          }} />
        ))}
      </div>
    </section>
  );
}

// ─── Contact / CTA ──────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("inquiries")
      .insert([{ name: form.name, email: form.email, service: form.service, message: form.message }]);
    setLoading(false);
    if (error) { setError("Something went wrong. Please try again."); return; }
    setSent(true);
  };

  return (
    <section id="contact" style={{
      background: "#060606", padding: "7rem clamp(1.5rem, 5vw, 4rem)",
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "4rem", maxWidth: "1000px", margin: "0 auto",
      }}>
        {/* Left */}
        <FadeIn>
          <Tag>Get in Touch</Tag>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "clamp(2rem, 3.5vw, 2.8rem)", color: COLORS.white,
            margin: "0.75rem 0",
          }}>
            Start Your Story
          </h2>
          <GoldLine />
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.95rem", color: COLORS.muted, lineHeight: 1.8,
            marginBottom: "2.5rem",
          }}>
            Every great image starts with a conversation.
            Tell us about your vision and we'll build something extraordinary together.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              { icon: "✉", label: "hello@estanleravisuals.com" },
              { icon: "📱", label: "+1 (646) 555-0190" },
              { icon: "📍", label: "New York, NY" },
              { icon: "📸", label: "@estanleravisuals" },
            ].map(c => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px",
                  border: `1px solid ${COLORS.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem", flexShrink: 0,
                }}>
                  {c.icon}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 300,
                  fontSize: "0.88rem", color: COLORS.muted,
                }}>
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Right: form */}
        <FadeIn delay={0.15}>
          {sent ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              justifyContent: "center", height: "100%", gap: "1rem",
            }}>
              <div style={{ fontSize: "2.5rem" }}>✓</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: "1.5rem",
                color: COLORS.gold,
              }}>
                Message received.
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 300,
                fontSize: "0.9rem", color: COLORS.muted, lineHeight: 1.7,
              }}>
                We'll be in touch within 24 hours to discuss your session.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { key: "name",    placeholder: "Your name",       type: "text" },
                { key: "email",   placeholder: "Email address",   type: "email" },
              ].map(f => (
                <input key={f.key} type={f.type} placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    background: "transparent",
                    border: `1px solid ${COLORS.border}`, padding: "14px 16px",
                    color: COLORS.white, fontFamily: "'Inter', sans-serif",
                    fontWeight: 300, fontSize: "0.9rem",
                    outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              ))}

              <select value={form.service}
                onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                style={{
                  background: "#060606",
                  border: `1px solid ${COLORS.border}`, padding: "14px 16px",
                  color: form.service ? COLORS.white : COLORS.muted,
                  fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.9rem",
                  outline: "none", width: "100%", boxSizing: "border-box",
                  cursor: "pointer",
                }}>
                <option value="" disabled>Type of session</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <textarea placeholder="Tell us about your vision..."
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                rows={5}
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`, padding: "14px 16px",
                  color: COLORS.white, fontFamily: "'Inter', sans-serif",
                  fontWeight: 300, fontSize: "0.9rem",
                  outline: "none", resize: "vertical",
                  width: "100%", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = COLORS.gold}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />

              {error && (
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
                  color: "#e05c5c", padding: "10px 0",
                }}>{error}</div>
              )}

              <button onClick={handleSubmit} disabled={loading} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "11px",
                letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
                color: COLORS.bg, background: loading ? "#a08040" : COLORS.gold,
                border: "none", padding: "16px", cursor: loading ? "not-allowed" : "pointer",
                width: "100%", transition: "background 0.2s",
              }}
                onMouseEnter={e => { if (!loading) e.target.style.background = COLORS.goldDeep; }}
                onMouseLeave={e => { if (!loading) e.target.style.background = COLORS.gold; }}
              >{loading ? "Sending..." : "Send Inquiry"}</button>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function Footer({ onNav }) {
  return (
    <footer style={{
      background: "#040404",
      borderTop: `1px solid ${COLORS.border}`,
      padding: "3rem clamp(1.5rem, 5vw, 4rem)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: "2rem",
        marginBottom: "3rem",
      }}>
        {/* Brand */}
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "1.4rem", color: COLORS.white, letterSpacing: "0.04em",
          }}>
            Estanler A
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "9px", letterSpacing: "0.22em", color: COLORS.gold,
            textTransform: "uppercase",
          }}>
            Visuals
          </div>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.8rem", color: COLORS.muted, marginTop: "1rem",
            maxWidth: "220px", lineHeight: 1.65,
          }}>
            Photography · Film · Visual Storytelling<br />
            New York
          </p>
        </div>

        {/* Links */}
        {[
          { heading: "Services", links: ["Weddings", "Quinceañeras", "Portraits", "Commercial", "Film"] },
          { heading: "Company", links: ["About", "Portfolio", "Blog", "Contact"] },
        ].map(col => (
          <div key={col.heading}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 500,
              fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
              color: COLORS.gold, marginBottom: "1rem",
            }}>
              {col.heading}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {col.links.map(l => (
                <button key={l} onClick={() => onNav(l.toLowerCase())} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontWeight: 300,
                  fontSize: "0.85rem", color: COLORS.muted,
                  textAlign: "left", padding: 0, transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.target.style.color = COLORS.white}
                  onMouseLeave={e => e.target.style.color = COLORS.muted}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 500,
            fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
            color: COLORS.gold, marginBottom: "1rem",
          }}>
            Book a Session
          </div>
          <button onClick={() => onNav("contact")} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.bg, background: COLORS.gold,
            border: "none", padding: "12px 24px", cursor: "pointer",
          }}>
            Inquire Now
          </button>
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
        }}>
          © {new Date().getFullYear()} Estanler A Visuals. All rights reserved.
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: "0.75rem", color: COLORS.muted, opacity: 0.5,
        }}>
          Privacy · Terms · Sitemap
        </div>
      </div>
    </footer>
  );
}

// ─── Root App ────────────────────────────────────────────────────────
export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
      const sections = ["hero", "work", "services", "pricing", "about", "contact"];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom > 100) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onNav = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", overflowX: "hidden" }}>
      <Nav scrolled={scrolled} activeSection={activeSection} onNav={onNav} />
      <Hero onNav={onNav} />
      <WorkGrid onNav={onNav} />
      <Services />
      <Pricing onNav={onNav} />
      <About />
      <Testimonials />
      <Contact />
      <Footer onNav={onNav} />
    </div>
  );
}
