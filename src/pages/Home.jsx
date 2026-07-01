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

function mapHeroRow(image) {
  const heroPath =
    image.display_path || image.original_path || image.thumbnail_path;

  return {
    id: image.id,
    src: buildPublicUrl(heroPath),
    objectPosition: `${image.object_position_x ?? 50}% ${
      image.object_position_y ?? 15
    }%`,
    zoom: Number(image.zoom || 1),
  };
}

function buildPublicUrl(path) {
  if (!path) return "";
  return `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function mapPortfolioRow(image) {
  const gridPath =
    image.display_path || image.original_path || image.thumbnail_path;

  const previewPath =
    image.original_path || image.display_path || image.thumbnail_path;

  return {
    id: image.id,
    category: image.category,
    aspect: image.aspect_ratio || "4 / 5",
    label: image.title || image.file_name,
    img: buildPublicUrl(gridPath),
    fullImg: buildPublicUrl(previewPath),
    objectPosition: `${image.object_position_x ?? 50}% ${
      image.object_position_y ?? 15
    }%`,
    zoom: Number(image.zoom || 1),
  };
}

function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [heroPhotos, setHeroPhotos] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchHeroPhotos() {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select(
          "id,display_path,original_path,thumbnail_path,object_position_x,object_position_y,zoom,featured,display_order,created_at",
        )
        .eq("is_visible", true)
        .eq("featured", true)
        .neq("category", "unlisted")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Error loading hero portfolio images:", error);
        setHeroPhotos([]);
        return;
      }

      setHeroPhotos((data || []).map(mapHeroRow).filter((item) => item.src));
    }

    fetchHeroPhotos();
  }, []);

  useEffect(() => {
    if (heroPhotos.length <= 1) return undefined;

    const timer = setInterval(() => {
      setBackgroundIndex(
        (previousIndex) => (previousIndex + 1) % heroPhotos.length,
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [heroPhotos.length]);

  useEffect(() => {
    if (backgroundIndex >= heroPhotos.length) {
      setBackgroundIndex(0);
    }
  }, [backgroundIndex, heroPhotos.length]);

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
      {heroPhotos.map((photo, index) => (
        <img
          key={photo.id}
          src={photo.src}
          alt="Featured portfolio background"
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: photo.objectPosition,
            opacity: backgroundIndex === index ? (loaded ? 1 : 0) : 0,
            transform: `scale(${photo.zoom || 1})`,
            transition: "opacity 1.4s ease",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(32deg, rgba(8, 12, 17, 0.96) 0%, rgba(10, 15, 21, 0.88) 24%, rgba(12, 18, 25, 0.58) 50%, rgba(14, 20, 27, 0.24) 76%, rgba(14, 20, 27, 0.08) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 15% 85%, rgba(255, 177, 98, 0.18), transparent 28rem)",
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
          padding: "0 var(--page-x) clamp(3rem, 8vh, 5rem)",
          maxWidth: "780px",
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
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
            lineHeight: 1.05,
            color: COLORS.text,
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
            fontFamily: "var(--font-body)",
            fontWeight: 300,
            fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
            color: COLORS.muted,
            lineHeight: 1.75,
            maxWidth: "500px",
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
          <Link to="/work" className="btn-primary">
            View Work
          </Link>

          <Link to="/book" className="btn-secondary">
            Book a Session
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          right: "var(--page-x)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          opacity: loaded ? 0.62 : 0,
          transition: "opacity 1.2s ease 1.2s",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-body)",
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
        .neq("category", "unlisted")
        .order("featured_order", { ascending: true, nullsFirst: false })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

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
      onContextMenu={(event) => event.preventDefault()}
      style={{
        background: COLORS.bg,
        padding: "6rem var(--page-x)",
        userSelect: "none",
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
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: COLORS.text,
                margin: "0.5rem 0 0",
              }}
            >
              Featured Work
            </h2>

            <p
              style={{
                fontFamily: "var(--font-body)",
                color: COLORS.muted,
                fontSize: "0.95rem",
                lineHeight: 1.7,
                maxWidth: "560px",
                margin: "0.8rem 0 0",
              }}
            >
              A handpicked collection of moments I’m proud to share with you,
              each one captured with care, emotion, and intention.
            </p>
          </div>

          <Link
            to="/work"
            style={{
              fontFamily: "var(--font-body)",
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
      ) : items.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${COLORS.border}`,
            color: COLORS.muted,
            fontFamily: "var(--font-body)",
            fontSize: "0.9rem",
            padding: "3rem 1rem",
            textAlign: "center",
          }}
        >
          No featured images selected yet.
        </div>
      ) : (
        <div
          className="featured-work-grid"
          aria-label="Featured portfolio image grid"
          style={{
            display: "grid",
            gap: 0,
            alignItems: "start",
          }}
        >
          {items.map((item) => (
            <figure
              key={item.id}
              style={{
                margin: 0,
                aspectRatio: item.aspect,
                background: COLORS.surfaceDark,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              <img
                src={item.img}
                alt={item.label}
                loading="lazy"
                decoding="async"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: item.objectPosition || "50% 15%",
                  display: "block",
                  transform: `scale(${item.zoom || 1})`,
                  pointerEvents: "none",
                  userSelect: "none",
                  WebkitUserDrag: "none",
                }}
                onError={(event) => {
                  event.currentTarget.parentElement.style.display = "none";
                }}
              />

              <figcaption
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "1rem",
                  background:
                    "linear-gradient(to top, rgba(27, 38, 50, 0.9), transparent)",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.95rem",
                    color: COLORS.text,
                  }}
                >
                  {item.label}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <style>{`
        .featured-work-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        @media (max-width: 1100px) {
          .featured-work-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .featured-work-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .featured-work-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function BookCTA() {
  return (
    <section
      style={{
        background: COLORS.bg,
        padding: "7rem var(--page-x)",
        borderTop: `1px solid ${COLORS.borderDark}`,
        textAlign: "center",
      }}
    >
      <Reveal>
        <Tag>Ready to Begin</Tag>

        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            color: COLORS.text,
            margin: "1rem auto",
            maxWidth: "620px",
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
            fontFamily: "var(--font-body)",
            fontWeight: 300,
            fontSize: "1rem",
            color: COLORS.muted,
            maxWidth: "460px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.75,
          }}
        >
          Every great image starts with a conversation. Tell me about your
          vision and I'll bring it to life.
        </p>

        <Link to="/book" className="btn-primary">
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
        background: COLORS.surfaceDark,
        padding: "6rem var(--page-x)",
        borderTop: `1px solid ${COLORS.borderDark}`,
        textAlign: "center",
      }}
    >
      <Reveal>
        <Tag>Client Stories</Tag>

        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
            color: COLORS.text,
            margin: "0.75rem auto 3rem",
            maxWidth: "520px",
          }}
        >
          What Clients Say
        </h2>
      </Reveal>

      <div style={{ maxWidth: "640px", margin: "0 auto", minHeight: "180px" }}>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.name}
            style={{ display: active === index ? "block" : "none" }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: COLORS.text,
                lineHeight: 1.8,
                marginBottom: "1.5rem",
              }}
            >
              "{testimonial.text}"
            </div>

            <div
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 600,
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
              transition: "all var(--transition-base)",
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
      <BookCTA />
      <Testimonials />
      <Footer />
    </div>
  );
}
