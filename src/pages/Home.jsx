import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import { GoldLine, Reveal, Spinner, Tag } from "../components/UI";
import { BASE, COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";

const testimonials = [
  {
    name: "Sofia M.",
    session: "Quinceañera",
    stars: 5,
    text: "Estanler captured every emotion of my daughter's quinceañera. The photos are absolutely breathtaking — we cry every time we look at them.",
  },
  {
    name: "Marcus & Jade",
    session: "Wedding",
    stars: 5,
    text: "From the first consultation to the final gallery delivery, everything was seamless. The cinematic quality of our wedding photos exceeded every expectation.",
  },
  {
    name: "Destiny R.",
    session: "Music Artist",
    stars: 5,
    text: "My EPK shots completely transformed my brand. Every image looks like it belongs in a magazine. Booking again for my next project.",
  },
];

const HERO_PHOTOS = [
  `${BASE}/Portraits/EACP1856-Enhanced-NR.jpg`,
  `${BASE}/Engadgements/Des%20Engadgement%20Pictures-114.jpg`,
  `${BASE}/Portraits/EACP1809-Edit.jpg`,
];

function buildPublicUrl(path) {
  if (!path) return "";
  return `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function mapPortfolioRow(image) {
  return {
    id: image.id,
    category: image.category,
    aspect: image.aspect_ratio || "4 / 5",
    label: image.title || image.file_name,
    img: buildPublicUrl(image.thumbnail_path || image.original_path),
    fullImg: buildPublicUrl(image.original_path),
    objectPosition: `${image.object_position_x ?? 50}% ${
      image.object_position_y ?? 50
    }%`,
    zoom: Number(image.zoom || 1),
  };
}

function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [bg, setBg] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 120);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBg((previousIndex) => (previousIndex + 1) % HERO_PHOTOS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        minHeight: "600px",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: COLORS.bg,
      }}
    >
      {HERO_PHOTOS.map((src, index) => (
        <div
          key={src}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            opacity: bg === index ? (loaded ? 0.6 : 0) : 0,
            transition: "opacity 1.4s ease",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.2) 60%, rgba(10,10,10,0.1) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: `linear-gradient(to bottom, transparent, ${COLORS.gold}, transparent)`,
          opacity: loaded ? 1 : 0,
          transition: "opacity 1.2s ease 0.5s",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(1.5rem, 6vw, 5rem) clamp(3rem, 8vh, 5rem)",
          maxWidth: "760px",
        }}
      >
        <div
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.9s ease 0.2s",
          }}
        >
          <Tag>Photography · Film · Visual Storytelling</Tag>
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
            lineHeight: 1.05,
            color: COLORS.white,
            margin: "1rem 0",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.9s ease 0.35s",
          }}
        >
          Every Frame
          <br />
          <span style={{ color: COLORS.gold }}>Tells Your Story</span>
        </h1>

        <GoldLine />

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
            color: COLORS.muted,
            lineHeight: 1.75,
            maxWidth: "480px",
            margin: "0 0 2rem",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.9s ease 0.5s",
          }}
        >
          Premium photography and film production based in New York. Weddings,
          quinceañeras, portraits, music videos, and commercial work — crafted
          with cinematic precision.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.9s ease 0.65s",
          }}
        >
          <Link
            to="/work"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.bg,
              background: COLORS.gold,
              padding: "14px 32px",
              textDecoration: "none",
            }}
          >
            View Work
          </Link>

          <Link
            to="/book"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.gold,
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              padding: "14px 32px",
              textDecoration: "none",
            }}
          >
            Book a Session
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "clamp(1.5rem, 5vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          opacity: loaded ? 0.5 : 0,
          transition: "opacity 1.2s ease 1.2s",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLORS.muted,
            writingMode: "vertical-rl",
          }}
        >
          Scroll
        </div>

        <div
          style={{
            width: "1px",
            height: "40px",
            background: `linear-gradient(to bottom, ${COLORS.gold}, transparent)`,
          }}
        />
      </div>
    </section>
  );
}

function FeaturedWork() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("is_visible", true)
        .eq("featured", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error loading featured portfolio images:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data || []).map(mapPortfolioRow));
      setLoading(false);
    }

    fetchFeatured();
  }, []);

  return (
    <section
      style={{
        background: COLORS.bg,
        padding: "6rem clamp(1.5rem, 5vw, 4rem)",
      }}
    >
      <Reveal>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "3rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <Tag>Selected Work</Tag>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: COLORS.white,
                margin: "0.5rem 0 0",
              }}
            >
              Recent Sessions
            </h2>
          </div>

          <Link
            to="/work"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: COLORS.gold,
              textDecoration: "none",
              borderBottom: `1px solid ${COLORS.border}`,
              paddingBottom: "2px",
            }}
          >
            View All Work →
          </Link>
        </div>
      </Reveal>

      {loading ? (
        <Spinner />
      ) : (
        <div style={{ columns: "3 240px", columnGap: "10px" }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                breakInside: "avoid",
                marginBottom: "10px",
                aspectRatio: item.aspect,
                background: "#111",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onMouseEnter={(event) => {
                const overlay = event.currentTarget.querySelector(".ov");
                const image = event.currentTarget.querySelector(".gi");

                if (overlay) overlay.style.opacity = "1";
                if (image) {
                  image.style.transform = `scale(${(item.zoom || 1) * 1.05})`;
                }
              }}
              onMouseLeave={(event) => {
                const overlay = event.currentTarget.querySelector(".ov");
                const image = event.currentTarget.querySelector(".gi");

                if (overlay) overlay.style.opacity = "0";
                if (image) {
                  image.style.transform = `scale(${item.zoom || 1})`;
                }
              }}
            >
              <img
                className="gi"
                src={item.img}
                alt={item.label}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: item.objectPosition || "50% 50%",
                  display: "block",
                  transition: "transform 0.5s ease",
                  transform: `scale(${item.zoom || 1})`,
                }}
                onError={(event) => {
                  event.currentTarget.parentElement.style.display = "none";
                }}
              />

              <div
                className="ov"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "1rem",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "0.95rem",
                      color: COLORS.white,
                      marginBottom: "3px",
                    }}
                  >
                    {item.label}
                  </div>

                  <Tag>{item.category}</Tag>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ServicesPreview() {
  const services = [
    { icon: "💍", label: "Weddings" },
    { icon: "👑", label: "Quinceañeras" },
    { icon: "🎞️", label: "Portraits" },
    { icon: "🎬", label: "Film Production" },
    { icon: "🎵", label: "Music Artists" },
    { icon: "📷", label: "Commercial" },
  ];

  return (
    <section
      style={{
        background: COLORS.surface,
        padding: "6rem clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      <Reveal>
        <Tag>What I Do</Tag>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: COLORS.white,
            margin: "0.5rem 0 3rem",
          }}
        >
          Services
        </h2>
      </Reveal>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1px",
          background: COLORS.border,
          marginBottom: "3rem",
        }}
      >
        {services.map((service, index) => (
          <Reveal key={service.label} delay={index * 0.05}>
            <div
              style={{ background: COLORS.surface, padding: "1.75rem 1.5rem" }}
            >
              <div style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
                {service.icon}
              </div>

              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: COLORS.white,
                }}
              >
                {service.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <Link
          to="/services"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: COLORS.gold,
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            padding: "14px 40px",
            textDecoration: "none",
          }}
        >
          View All Services
        </Link>
      </div>
    </section>
  );
}

function BookCTA() {
  return (
    <section
      style={{
        background: COLORS.bg,
        padding: "7rem clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${COLORS.border}`,
        textAlign: "center",
      }}
    >
      <Reveal>
        <Tag>Ready to Begin</Tag>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            color: COLORS.white,
            margin: "1rem auto",
            maxWidth: "600px",
            lineHeight: 1.15,
          }}
        >
          Let's Create Something
          <br />
          <span style={{ color: COLORS.gold }}>Extraordinary</span>
        </h2>

        <GoldLine w="60px" mt="1.5rem" mb="1.5rem" />

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "1rem",
            color: COLORS.muted,
            maxWidth: "440px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.75,
          }}
        >
          Every great image starts with a conversation. Tell me about your
          vision and I'll bring it to life.
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
            padding: "16px 48px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Request a Quote
        </Link>
      </Reveal>
    </section>
  );
}

function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((previousIndex) => (previousIndex + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      style={{
        background: COLORS.surface,
        padding: "6rem clamp(1.5rem, 5vw, 4rem)",
        borderTop: `1px solid ${COLORS.border}`,
        textAlign: "center",
      }}
    >
      <Reveal>
        <Tag>Client Stories</Tag>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
            color: COLORS.white,
            margin: "0.75rem auto 3rem",
            maxWidth: "500px",
          }}
        >
          What Clients Say
        </h2>
      </Reveal>

      <div style={{ maxWidth: "620px", margin: "0 auto", minHeight: "180px" }}>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.name}
            style={{ display: active === index ? "block" : "none" }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: COLORS.white,
                lineHeight: 1.8,
                marginBottom: "1.5rem",
              }}
            >
              "{testimonial.text}"
            </div>

            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: "0.9rem",
                color: COLORS.gold,
                marginBottom: "3px",
              }}
            >
              {testimonial.name}
            </div>

            <Tag>{testimonial.session}</Tag>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginTop: "2.5rem",
        }}
      >
        {testimonials.map((testimonial, index) => (
          <button
            key={testimonial.name}
            type="button"
            onClick={() => setActive(index)}
            style={{
              width: index === active ? "24px" : "6px",
              height: "6px",
              background: index === active ? COLORS.gold : COLORS.border,
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div style={{ background: COLORS.bg }}>
      <Hero />
      <FeaturedWork />
      <ServicesPreview />
      <BookCTA />
      <Testimonials />
      <Footer />
    </div>
  );
}
