import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";
import { AdminNav } from "./Dashboard";
import { Spinner } from "../../components/UI";

const STATUS_COLORS = {
  new:       { bg: "rgba(74,222,128,0.1)", color: "#4ade80", label: "New" },
  contacted: { bg: "rgba(200,169,107,0.1)", color: COLORS.gold, label: "Contacted" },
  booked:    { bg: "rgba(96,165,250,0.1)", color: "#60a5fa", label: "Booked" },
  completed: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Completed" },
  closed:    { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Closed" },
};

export default function Inquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("inquiries")
        .select("*").order("created_at", { ascending: false });
      setInquiries(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const updateStatus = async (id, status) => {
    await supabase.from("inquiries").update({ status }).eq("id", id);
    setInquiries(p => p.map(i => i.id === id ? { ...i, status } : i));
    if (selected?.id === id) setSelected(p => ({ ...p, status }));
  };

  const filtered = filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <AdminNav onSignOut={handleSignOut} />
      <div style={{ padding: "2.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "1.8rem", color: COLORS.white,
          }}>Inquiries</h1>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[["all", "All"], ...Object.entries(STATUS_COLORS).map(([k, v]) => [k, v.label])].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "10px",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: filter === val ? COLORS.bg : COLORS.muted,
                background: filter === val ? COLORS.gold : "transparent",
                border: `1px solid ${filter === val ? COLORS.gold : COLORS.border}`,
                padding: "6px 14px", cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {loading && <Spinner />}

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "1px", background: COLORS.border }}>
            {/* List */}
            <div style={{ background: COLORS.bg }}>
              {filtered.length === 0 && (
                <div style={{ padding: "3rem", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "0.88rem", color: COLORS.muted }}>
                  No inquiries found.
                </div>
              )}
              {filtered.map(inq => {
                const s = STATUS_COLORS[inq.status] || STATUS_COLORS.new;
                return (
                  <div key={inq.id}
                    onClick={() => setSelected(selected?.id === inq.id ? null : inq)}
                    style={{
                      padding: "1.25rem 1.5rem", cursor: "pointer",
                      borderBottom: `1px solid ${COLORS.border}`,
                      background: selected?.id === inq.id ? "#0d0d0d" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (selected?.id !== inq.id) e.currentTarget.style.background = "#0a0a0a"; }}
                    onMouseLeave={e => { if (selected?.id !== inq.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "0.95rem", color: COLORS.white }}>
                        {inq.name}
                      </div>
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: "9px",
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        color: s.color, background: s.bg,
                        padding: "3px 8px", flexShrink: 0,
                      }}>{s.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: COLORS.muted }}>{inq.email}</span>
                      {inq.service && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: COLORS.gold }}>{inq.service}</span>}
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: COLORS.muted, opacity: 0.5 }}>{formatDate(inq.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{ background: "#060606", padding: "2rem", position: "sticky", top: "56px", maxHeight: "calc(100vh - 56px)", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.2rem", color: COLORS.white, marginBottom: "4px" }}>
                      {selected.name}
                    </div>
                    <a href={`mailto:${selected.email}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: COLORS.gold, textDecoration: "none" }}>
                      {selected.email}
                    </a>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                  {Object.entries(STATUS_COLORS).map(([val, s]) => (
                    <button key={val} onClick={() => updateStatus(selected.id, val)} style={{
                      fontFamily: "'Inter', sans-serif", fontSize: "9px",
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: selected.status === val ? COLORS.bg : s.color,
                      background: selected.status === val ? s.color : "transparent",
                      border: `1px solid ${s.color}`,
                      padding: "5px 10px", cursor: "pointer",
                    }}>{s.label}</button>
                  ))}
                </div>

                {selected.service && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, marginBottom: "4px" }}>Service</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: COLORS.white }}>{selected.service}</div>
                  </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, marginBottom: "4px" }}>Received</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: COLORS.white }}>{formatDate(selected.created_at)}</div>
                </div>

                {selected.message && (
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, marginBottom: "8px" }}>Details</div>
                    <div style={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 300,
                      fontSize: "0.85rem", color: COLORS.muted, lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                      background: COLORS.bg, padding: "1rem",
                      border: `1px solid ${COLORS.border}`,
                    }}>{selected.message}</div>
                  </div>
                )}

                <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
                  <a href={`mailto:${selected.email}`} style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "11px",
                    letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
                    color: COLORS.bg, background: COLORS.gold,
                    padding: "11px 20px", textDecoration: "none", display: "inline-block",
                  }}>Reply via Email</a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
