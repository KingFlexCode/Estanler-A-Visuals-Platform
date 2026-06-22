import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) { setError("Email and password required."); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/admin");
  };

  const inputStyle = {
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    padding: "14px 16px", color: COLORS.white,
    fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.9rem",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "380px", padding: "2rem" }}>
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "1.5rem", color: COLORS.white, letterSpacing: "0.04em",
          }}>Estanler A</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: "9px", letterSpacing: "0.22em", color: COLORS.gold,
            textTransform: "uppercase",
          }}>Visuals · Admin</div>
          <div style={{
            width: "40px", height: "1px",
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
            margin: "1rem auto 0",
          }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = COLORS.gold}
            onBlur={e => e.target.style.borderColor = COLORS.border}
          />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = COLORS.gold}
            onBlur={e => e.target.style.borderColor = COLORS.border}
          />

          {error && (
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.82rem",
              color: "#e05c5c",
            }}>{error}</div>
          )}

          <button onClick={handleLogin} disabled={loading} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
            color: COLORS.bg, background: loading ? "#a08040" : COLORS.gold,
            border: "none", padding: "15px", cursor: loading ? "not-allowed" : "pointer",
            width: "100%", transition: "background 0.2s", marginTop: "0.5rem",
          }}>{loading ? "Signing in..." : "Sign In"}</button>
        </div>
      </div>
    </div>
  );
}
