import { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/constants";

export function GoldLine({ w = "60px", mt = "1rem", mb = "1.5rem" }) {
  return (
    <div
      style={{
        width: w,
        height: "1px",
        background: `linear-gradient(90deg, ${COLORS.gold}, transparent)`,
        marginTop: mt,
        marginBottom: mb,
      }}
    />
  );
}

export function Tag({ children }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: COLORS.gold,
      }}
    >
      {children}
    </span>
  );
}

export function Stars({ count }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "3px",
        marginBottom: "10px",
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          style={{
            color: COLORS.gold,
            fontSize: "13px",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return undefined;

    const rect = element.getBoundingClientRect();

    if (rect.top < window.innerHeight * 0.95) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

export function Reveal({ children, delay = 0 }) {
  const [ref, visible] = useReveal();

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity var(--transition-slow) ${delay}s, transform var(--transition-slow) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 0",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: `2px solid ${COLORS.border}`,
          borderTop: `2px solid ${COLORS.gold}`,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
