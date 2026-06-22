import { useState } from "react";
import { supabase } from "../lib/supabase";
import { COLORS } from "../lib/constants";
import { Tag, GoldLine, Reveal } from "../components/UI";
import Footer from "../components/Footer";

const services = [
  "Wedding", "Quinceañera", "Engagement Session", "Portrait Session",
  "Family Session", "Music Artist / EPK", "Music Video", "Commercial Photography",
  "Commercial Film", "Short Film", "Other",
];

const budgetRanges = [
  "Under $500", "$500 - $1,000", "$1,000 - $2,500",
  "$2,500 - $5,000", "$5,000 - $10,000", "$10,000+", "Not sure yet",
];

const coverageHours = [
  "1-2 hours", "3-4 hours", "5-6 hours",
  "7-8 hours", "Full day (8+ hours)", "Multi-day", "Not sure yet",
];

const inputStyle = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  padding: "14px 16px",
  color: COLORS.white,
  fontFamily: "'Inter', sans-serif",
  fontWeight: 300, fontSize: "0.9rem",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle = {
  fontFamily: "'Inter', sans-serif", fontWeight: 400,
  fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
  color: COLORS.muted, marginBottom: "6px", display: "block",
};

const selectStyle = {
  ...inputStyle,
  background: COLORS.surface,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
};

export default function Book() {
  const [form, setForm] = useState({
    name: "", email: "", service: "",
    event_date: "", event_location: "",
    guest_count: "", coverage_hours: "",
    budget_range: "", vision: "", referral: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.service) {
      setError("Please fill in your name, email, and service type.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from("inquiries").insert([{
      name: form.name,
      email: form.email,
      service: form.service,
      message: `
EVENT DATE: ${form.event_date || "TBD"}
LOCATION: ${form.event_location || "TBD"}
GUEST COUNT: ${form.guest_count || "N/A"}
COVERAGE HOURS: ${form.coverage_hours || "TBD"}
BUDGET RANGE: ${form.budget_range || "Not specified"}
HOW THEY HEARD: ${form.referral || "Not specified"}

VISION:
${form.vision || "No details provided"}
      `.trim(),
    }]);
    setLoading(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{
        background: COLORS.bg, minHeight: "100vh", paddingTop: "64px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>✓</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: "2rem",
            color: COLORS.gold, marginBottom: "1rem",
          }}>Request Received</div>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.95rem", color: COLORS.muted, lineHeight: 1.8,
          }}>
            Thank you for reaching out. I'll review your details and get back to you
            within 24 hours with availability and a custom quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", paddingTop: "64px" }}>
      <div style={{ padding: "4rem clamp(1.5rem, 5vw, 4rem)", maxWidth: "860px", margin: "0 auto" }}>
        <Reveal>
          <Tag>Get in Touch</Tag>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "clamp(2.5rem, 5vw, 4rem)", color: COLORS.white, margin: "0.75rem 0",
          }}>Request a Quote</h1>
          <GoldLine mb="1rem" />
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.95rem", color: COLORS.muted, maxWidth: "520px",
            lineHeight: 1.8, marginBottom: "3rem",
          }}>
            Every session is different — tell me about your vision and I'll put together
            a custom quote that fits your needs and budget. No obligation.
          </p>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Contact info */}
          <Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Your Name *</label>
                <input style={inputStyle} placeholder="Full name" value={form.name}
                  onChange={e => set("name", e.target.value)}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input style={inputStyle} type="email" placeholder="your@email.com" value={form.email}
                  onChange={e => set("email", e.target.value)}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              </div>
            </div>
          </Reveal>

          {/* Service */}
          <Reveal delay={0.05}>
            <label style={labelStyle}>Type of Service *</label>
            <div style={{ position: "relative" }}>
              <select style={selectStyle} value={form.service} onChange={e => set("service", e.target.value)}>
                <option value="" disabled>Select a service</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{
                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                color: COLORS.muted, pointerEvents: "none", fontSize: "0.8rem",
              }}>▾</div>
            </div>
          </Reveal>

          {/* Event details */}
          <Reveal delay={0.08}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Event Date</label>
                <input style={inputStyle} type="date" value={form.event_date}
                  onChange={e => set("event_date", e.target.value)}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              </div>
              <div>
                <label style={labelStyle}>Event Location / City</label>
                <input style={inputStyle} placeholder="New York, NY" value={form.event_location}
                  onChange={e => set("event_location", e.target.value)}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              </div>
            </div>
          </Reveal>

          {/* Guest count + coverage */}
          <Reveal delay={0.1}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Estimated Guest Count</label>
                <input style={inputStyle} placeholder="e.g. 150" value={form.guest_count}
                  onChange={e => set("guest_count", e.target.value)}
                  onFocus={e => e.target.style.borderColor = COLORS.gold}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
              </div>
              <div>
                <label style={labelStyle}>Hours of Coverage Needed</label>
                <div style={{ position: "relative" }}>
                  <select style={selectStyle} value={form.coverage_hours} onChange={e => set("coverage_hours", e.target.value)}>
                    <option value="" disabled>Select hours</option>
                    {coverageHours.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div style={{
                    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                    color: COLORS.muted, pointerEvents: "none", fontSize: "0.8rem",
                  }}>▾</div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Budget */}
          <Reveal delay={0.12}>
            <label style={labelStyle}>Budget Range</label>
            <div style={{ position: "relative" }}>
              <select style={selectStyle} value={form.budget_range} onChange={e => set("budget_range", e.target.value)}>
                <option value="" disabled>Select a range</option>
                {budgetRanges.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div style={{
                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                color: COLORS.muted, pointerEvents: "none", fontSize: "0.8rem",
              }}>▾</div>
            </div>
          </Reveal>

          {/* Vision */}
          <Reveal delay={0.14}>
            <label style={labelStyle}>Tell Me About Your Vision</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={5}
              placeholder="Describe your event, the vibe you're going for, any specific shots you have in mind, or anything else I should know..."
              value={form.vision}
              onChange={e => set("vision", e.target.value)}
              onFocus={e => e.target.style.borderColor = COLORS.gold}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </Reveal>

          {/* Referral */}
          <Reveal delay={0.16}>
            <label style={labelStyle}>How Did You Hear About Me?</label>
            <input style={inputStyle} placeholder="Instagram, Google, referral, etc." value={form.referral}
              onChange={e => set("referral", e.target.value)}
              onFocus={e => e.target.style.borderColor = COLORS.gold}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </Reveal>

          {error && (
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.85rem",
              color: "#e05c5c", padding: "4px 0",
            }}>{error}</div>
          )}

          <Reveal delay={0.18}>
            <button onClick={handleSubmit} disabled={loading} style={{
              fontFamily: "'Inter', sans-serif", fontSize: "11px",
              letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
              color: COLORS.bg, background: loading ? "#a08040" : COLORS.gold,
              border: "none", padding: "18px", cursor: loading ? "not-allowed" : "pointer",
              width: "100%", transition: "background 0.2s",
            }}
              onMouseEnter={e => { if (!loading) e.target.style.background = COLORS.goldDeep; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = COLORS.gold; }}
            >{loading ? "Sending..." : "Submit Request"}</button>
          </Reveal>

          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "0.78rem", color: COLORS.muted, opacity: 0.6,
            textAlign: "center",
          }}>
            I typically respond within 24 hours. Fields marked * are required.
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
