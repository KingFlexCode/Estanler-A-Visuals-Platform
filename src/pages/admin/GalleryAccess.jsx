import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Spinner } from "../../components/UI";
import { COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const pageStyle = { minHeight: "100vh", background: COLORS.bg, color: COLORS.white };
const shellFont = "'Inter', sans-serif";
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.035)",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  padding: "10px 12px",
  fontFamily: shellFont,
  fontSize: 13,
  outline: "none",
};
const buttonStyle = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  cursor: "pointer",
  padding: "10px 12px",
  fontFamily: shellFont,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
const primaryButtonStyle = { ...buttonStyle, background: COLORS.gold, border: "none", color: COLORS.bg };
const passwordMask = "••••••••••";

function FieldLabel({ children }) {
  return <span style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontFamily: shellFont, fontSize: 10, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase" }}>{children}</span>;
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ ...buttonStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", textAlign: "left", textTransform: "none", letterSpacing: 0, padding: "1rem" }}>
      <span>
        <strong style={{ color: COLORS.white, display: "block", fontSize: 14 }}>{title}</strong>
        <span style={{ color: COLORS.muted, display: "block", fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>{description}</span>
      </span>
      <span style={{ width: 46, height: 24, borderRadius: 999, background: checked ? COLORS.gold : "rgba(255,255,255,0.12)", position: "relative", flex: "0 0 auto" }}>
        <span style={{ position: "absolute", top: 4, left: checked ? 25 : 4, width: 16, height: 16, borderRadius: "50%", background: checked ? COLORS.bg : COLORS.white, transition: "left 0.18s ease" }} />
      </span>
    </button>
  );
}

function PasswordInput({ value, onChange, visible, onToggle, locked }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible && !locked ? "text" : "password"}
        value={locked ? passwordMask : value}
        readOnly={locked}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter new gallery password"
        style={{ ...inputStyle, paddingRight: locked ? 12 : 52, color: locked ? COLORS.muted : COLORS.white, cursor: locked ? "not-allowed" : "text" }}
      />
      {!locked && <button
        type="button"
        onClick={onToggle}
        title={visible ? "Hide password" : "Show password"}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: COLORS.gold,
          cursor: "pointer",
          fontSize: 17,
          height: 32,
          width: 32,
        }}
      >
        {visible ? "◉" : "◌"}
      </button>}
    </div>
  );
}

function formatLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function GalleryAccess() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState(null);
  const [password, setPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadGallery();
  }, [galleryId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadGallery() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("client_galleries")
      .select("*")
      .eq("id", galleryId)
      .single();
    if (loadError) {
      setError(loadError.message);
      setGallery(null);
    } else {
      setGallery(data);
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  function setField(key, value) {
    setGallery((current) => ({ ...current, [key]: value }));
  }

  async function saveAccessSettings() {
    if (!gallery?.id) return;
    setSaving(true);
    setError("");
    setNotice("");

    const hasExistingPassword = Boolean(gallery.access_password_hash);
    const expiresAt = gallery.expires_at ? new Date(gallery.expires_at).toISOString() : null;
    const accessMode = gallery.access_mode || "public";
    const cleanPassword = password.trim();

    if (accessMode === "password" && !hasExistingPassword && !cleanPassword) {
      setSaving(false);
      setError("Enter a password before saving password-protected access.");
      return;
    }

    if (accessMode === "password" && changingPassword && !cleanPassword) {
      setSaving(false);
      setError("Enter the new password before saving the password change.");
      return;
    }

    const payload = {
      access_mode: accessMode,
      expires_at: expiresAt,
      allow_downloads: gallery.allow_downloads !== false,
      allow_favorites: gallery.allow_favorites !== false,
      allow_sharing: gallery.allow_sharing !== false,
      watermark_mode: gallery.watermark_mode || "off",
      watermark_text: (gallery.watermark_text || "").trim() || null,
    };

    const { data, error: updateError } = await supabase
      .from("client_galleries")
      .update(payload)
      .eq("id", gallery.id)
      .select("*")
      .single();

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    let nextGallery = data;
    if (accessMode === "password" && cleanPassword && (!hasExistingPassword || changingPassword)) {
      const { data: passwordData, error: passwordError } = await supabase.rpc("set_client_gallery_password", {
        p_gallery_id: gallery.id,
        p_password: cleanPassword,
      });
      if (passwordError) {
        setSaving(false);
        setError(passwordError.message);
        return;
      }
      nextGallery = passwordData;
      setPassword("");
      setChangingPassword(false);
      setShowPassword(false);
    }

    if (accessMode !== "password") {
      await supabase.rpc("set_client_gallery_password", {
        p_gallery_id: gallery.id,
        p_password: "",
      });
      setPassword("");
      setChangingPassword(false);
      setShowPassword(false);
    }

    setGallery(nextGallery);
    setSaving(false);
    setNotice("Gallery access settings saved.");
  }

  async function clearPassword() {
    if (!gallery?.id) return;
    const confirmed = window.confirm("Clear this gallery password? Anyone with the gallery link may lose password access rules until you set a new password.");
    if (!confirmed) return;

    setSaving(true);
    setError("");
    const { data, error: clearError } = await supabase.rpc("set_client_gallery_password", {
      p_gallery_id: gallery.id,
      p_password: "",
    });
    setSaving(false);
    if (clearError) {
      setError(clearError.message);
      return;
    }
    setGallery(data);
    setPassword("");
    setChangingPassword(false);
    setShowPassword(false);
    setNotice("Gallery password cleared.");
  }

  if (loading) return <div style={{ ...pageStyle, display: "grid", placeItems: "center" }}><Spinner /></div>;

  if (!gallery) {
    return (
      <div style={pageStyle}>
        <AdminNav onSignOut={handleSignOut} />
        <main style={{ padding: "2rem clamp(1rem, 3vw, 3rem)" }}>
          <p style={{ color: "#ff8b8b", fontFamily: shellFont }}>{error || "Gallery not found."}</p>
          <Link to="/admin/galleries" style={{ color: COLORS.gold, fontFamily: shellFont }}>Back to galleries</Link>
        </main>
      </div>
    );
  }

  const publicUrl = gallery.slug ? `${window.location.origin}/gallery/${gallery.slug}` : "Save the gallery slug first.";
  const hasExistingPassword = Boolean(gallery.access_password_hash);
  const passwordInputLocked = hasExistingPassword && !changingPassword;

  return (
    <div style={pageStyle}>
      <AdminNav onSignOut={handleSignOut} />
      <main style={{ padding: "2rem clamp(1rem, 3vw, 3rem)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ color: COLORS.gold, fontFamily: shellFont, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>EST-73 Access Controls</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 1, margin: "0.35rem 0 0" }}>{gallery.title}</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link to={`/admin/galleries/${gallery.id}`} style={{ ...buttonStyle, textDecoration: "none" }}>Back to Workspace</Link>
            <button type="button" onClick={() => window.open(`/gallery/${gallery.slug}`, "_blank", "noopener,noreferrer")} style={buttonStyle}>Open Gallery</button>
          </div>
        </div>

        {error && <div style={{ border: "1px solid rgba(255,139,139,0.45)", color: "#ff8b8b", fontFamily: shellFont, marginBottom: "1rem", padding: "0.85rem" }}>{error}</div>}
        {notice && <div style={{ border: `1px solid ${COLORS.gold}`, color: COLORS.gold, fontFamily: shellFont, marginBottom: "1rem", padding: "0.85rem" }}>{notice}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)", gap: "1rem", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem" }}>
              <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 1rem" }}>Privacy</h2>
              <label>
                <FieldLabel>Access Mode</FieldLabel>
                <select value={gallery.access_mode || "public"} onChange={(event) => setField("access_mode", event.target.value)} style={inputStyle}>
                  <option value="public">Public</option>
                  <option value="password">Password Protected</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
              <p style={{ color: COLORS.muted, fontFamily: shellFont, fontSize: 12, lineHeight: 1.7, margin: "0.85rem 0 0" }}>Public galleries open with the link. Password-protected galleries require a password. Hidden galleries stay unavailable publicly even if published.</p>
            </div>

            {gallery.access_mode === "password" && <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem" }}>
              <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 1rem" }}>Password</h2>
              <label>
                <FieldLabel>{hasExistingPassword ? (changingPassword ? "New Password" : "Password Set") : "Set Password"}</FieldLabel>
                <PasswordInput value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} locked={passwordInputLocked} />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.85rem", flexWrap: "wrap" }}>
                {hasExistingPassword && !changingPassword && <button type="button" onClick={() => { setChangingPassword(true); setPassword(""); setShowPassword(false); }} disabled={saving} style={{ ...buttonStyle, color: COLORS.gold }}>Change Password</button>}
                {hasExistingPassword && changingPassword && <button type="button" onClick={() => { setChangingPassword(false); setPassword(""); setShowPassword(false); setError(""); }} disabled={saving} style={buttonStyle}>Cancel Change</button>}
                <button type="button" onClick={clearPassword} disabled={saving || !hasExistingPassword} style={{ ...buttonStyle, color: "#ffb4b4", borderColor: "rgba(255,180,180,0.45)", opacity: saving || !hasExistingPassword ? 0.55 : 1 }}>Clear Password</button>
                {hasExistingPassword && !changingPassword && <span style={{ color: COLORS.gold, fontFamily: shellFont, fontSize: 12 }}>A password is currently active.</span>}
                {hasExistingPassword && changingPassword && <span style={{ color: COLORS.gold, fontFamily: shellFont, fontSize: 12 }}>Enter a new password, then save to replace the current one.</span>}
              </div>
              <p style={{ color: COLORS.muted, fontFamily: shellFont, fontSize: 12, lineHeight: 1.7, margin: "0.85rem 0 0" }}>The password is hashed in Supabase. When a password already exists, the field is locked so it cannot be changed by accident.</p>
            </div>}

            <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem" }}>
              <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 1rem" }}>Expiration</h2>
              <label>
                <FieldLabel>Expires At</FieldLabel>
                <input type="datetime-local" value={formatLocalDateTime(gallery.expires_at)} onChange={(event) => setField("expires_at", event.target.value ? new Date(event.target.value).toISOString() : null)} style={inputStyle} />
              </label>
              <button type="button" onClick={() => setField("expires_at", null)} style={{ ...buttonStyle, marginTop: "0.85rem" }}>Clear Expiration</button>
            </div>

            <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem", display: "grid", gap: 8 }}>
              <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 0.25rem" }}>Delivery Controls</h2>
              <ToggleRow title="Allow downloads" description="Controls the gallery ZIP download, grid downloads, and lightbox downloads." checked={gallery.allow_downloads !== false} onChange={(value) => setField("allow_downloads", value)} />
              <ToggleRow title="Allow favorites" description="Controls local client favorite hearts in the gallery and lightbox." checked={gallery.allow_favorites !== false} onChange={(value) => setField("allow_favorites", value)} />
              <ToggleRow title="Allow sharing" description="Controls share buttons and the share modal." checked={gallery.allow_sharing !== false} onChange={(value) => setField("allow_sharing", value)} />
            </div>

            <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem", display: "grid", gap: "1rem" }}>
              <div>
                <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 0.35rem" }}>Watermark</h2>
                <p style={{ color: COLORS.muted, fontFamily: shellFont, fontSize: 12, lineHeight: 1.7, margin: 0 }}>Adds a visible overlay on public gallery photos. This discourages screenshots and unauthorized sharing, but it does not replace private storage or signed URLs.</p>
              </div>
              <label>
                <FieldLabel>Watermark Mode</FieldLabel>
                <select value={gallery.watermark_mode || "off"} onChange={(event) => setField("watermark_mode", event.target.value)} style={inputStyle}>
                  <option value="off">Off</option>
                  <option value="subtle">Subtle</option>
                  <option value="strong">Strong</option>
                </select>
              </label>
              <label>
                <FieldLabel>Watermark Text</FieldLabel>
                <input value={gallery.watermark_text || ""} onChange={(event) => setField("watermark_text", event.target.value)} placeholder="Estanler Aleman Photography" style={inputStyle} />
              </label>
            </div>

            <button type="button" onClick={saveAccessSettings} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Access Settings"}</button>
          </div>

          <aside style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "1rem", position: "sticky", top: 90 }}>
            <h2 style={{ fontFamily: shellFont, fontSize: 16, margin: "0 0 1rem" }}>Current Delivery State</h2>
            <div style={{ display: "grid", gap: 10, color: COLORS.muted, fontFamily: shellFont, fontSize: 13, lineHeight: 1.6 }}>
              <div><strong style={{ color: COLORS.white }}>Status:</strong> {gallery.status}</div>
              <div><strong style={{ color: COLORS.white }}>Access:</strong> {gallery.access_mode || "public"}</div>
              <div><strong style={{ color: COLORS.white }}>Password:</strong> {hasExistingPassword ? "Set" : "Not set"}</div>
              <div><strong style={{ color: COLORS.white }}>Expires:</strong> {gallery.expires_at ? new Date(gallery.expires_at).toLocaleString() : "No expiration"}</div>
              <div><strong style={{ color: COLORS.white }}>Downloads:</strong> {gallery.allow_downloads !== false ? "On" : "Off"}</div>
              <div><strong style={{ color: COLORS.white }}>Favorites:</strong> {gallery.allow_favorites !== false ? "On" : "Off"}</div>
              <div><strong style={{ color: COLORS.white }}>Sharing:</strong> {gallery.allow_sharing !== false ? "On" : "Off"}</div>
              <div><strong style={{ color: COLORS.white }}>Watermark:</strong> {gallery.watermark_mode || "off"}</div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <FieldLabel>Share Link</FieldLabel>
              <input value={publicUrl} readOnly style={inputStyle} />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
