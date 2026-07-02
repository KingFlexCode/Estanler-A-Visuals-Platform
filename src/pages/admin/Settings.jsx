import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const font = "'Inter', sans-serif";
const heading = "'Playfair Display', serif";

const adminColors = {
  bg: COLORS.bgDark || COLORS.bg,
  surface: COLORS.surfaceDark || "#060606",
  border: COLORS.borderDark || COLORS.border,
  muted: COLORS.mutedDark || COLORS.muted,
  text: COLORS.white,
};

const inputStyle = {
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${adminColors.border}`,
  boxSizing: "border-box",
  color: adminColors.text,
  fontFamily: font,
  fontSize: 13,
  outline: "none",
  padding: "12px 14px",
  width: "100%",
};

const buttonBase = {
  border: `1px solid ${adminColors.border}`,
  cursor: "pointer",
  fontFamily: font,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  padding: "12px 16px",
  textTransform: "uppercase",
};

function FieldLabel({ children }) {
  return (
    <span
      style={{
        color: adminColors.muted,
        display: "block",
        fontFamily: font,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: "0.14em",
        marginBottom: 7,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Notice({ type = "success", children }) {
  if (!children) return null;

  const success = type === "success";

  return (
    <div
      style={{
        border: `1px solid ${success ? "rgba(74,222,128,0.32)" : "rgba(224,92,92,0.35)"}`,
        color: success ? "#9af0b8" : "#ff8b8b",
        fontFamily: font,
        fontSize: 13,
        lineHeight: 1.6,
        marginBottom: "1rem",
        padding: "12px 14px",
      }}
    >
      {children}
    </div>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section
      style={{
        background: adminColors.surface,
        border: `1px solid ${adminColors.border}`,
        padding: "clamp(1.25rem, 4vw, 2rem)",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            color: adminColors.text,
            fontFamily: heading,
            fontSize: "1.45rem",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: adminColors.muted,
            fontFamily: font,
            fontSize: 13,
            lineHeight: 1.7,
            margin: "0.65rem 0 0",
            maxWidth: 620,
          }}
        >
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    async function loadUser() {
      setLoadingUser(true);
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setEmailError(error.message || "Admin account could not be loaded.");
      }

      setUser(data?.user || null);
      setEmail(data?.user?.email || "");
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  async function handleEmailUpdate(event) {
    event.preventDefault();
    setEmailNotice("");
    setEmailError("");

    const nextEmail = email.trim();

    if (!nextEmail) {
      setEmailError("Enter a valid email address.");
      return;
    }

    if (nextEmail === user?.email) {
      setEmailError("This email already matches the current admin account email.");
      return;
    }

    setSavingEmail(true);
    const { data, error } = await supabase.auth.updateUser({ email: nextEmail });
    setSavingEmail(false);

    if (error) {
      setEmailError(error.message || "Email could not be updated.");
      return;
    }

    setUser(data?.user || user);
    setEmailNotice("Email update requested. If confirmation is required, check the new email inbox to complete the change.");
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setPasswordNotice("");
    setPasswordError("");

    const nextPassword = passwordForm.password.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!nextPassword || !confirmPassword) {
      setPasswordError("Enter and confirm the new password.");
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError("Password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message || "Password could not be updated.");
      return;
    }

    setPasswordForm({ password: "", confirmPassword: "" });
    setPasswordNotice("Password updated successfully.");
  }

  return (
    <div style={{ minHeight: "100vh", background: adminColors.bg }}>
      <AdminNav onSignOut={handleSignOut} />
      <main className="admin-settings-shell">
        <div className="admin-settings-header">
          <div className="admin-settings-kicker">Admin Settings</div>
          <h1 className="admin-settings-title">Login Credentials</h1>
          <p className="admin-settings-copy">
            Manage the admin email and password through Supabase Auth. Passwords are never stored in app tables or shown after submission.
          </p>
        </div>

        <div className="admin-settings-grid">
          <SettingsCard
            title="Account Email"
            description="Update the email address used to sign into the admin platform. Depending on Supabase settings, the new email may need confirmation before it becomes active."
          >
            <Notice type="success">{emailNotice}</Notice>
            <Notice type="error">{emailError}</Notice>
            <form onSubmit={handleEmailUpdate} style={{ display: "grid", gap: "1rem" }}>
              <label>
                <FieldLabel>Current Email</FieldLabel>
                <input value={loadingUser ? "Loading..." : user?.email || "Unavailable"} readOnly style={{ ...inputStyle, opacity: 0.72 }} />
              </label>

              <label>
                <FieldLabel>New Email</FieldLabel>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@email.com"
                  autoComplete="email"
                  style={inputStyle}
                />
              </label>

              <button
                type="submit"
                disabled={savingEmail || loadingUser}
                style={{
                  ...buttonBase,
                  background: COLORS.gold,
                  borderColor: COLORS.gold,
                  color: adminColors.bg,
                  opacity: savingEmail || loadingUser ? 0.55 : 1,
                }}
              >
                {savingEmail ? "Saving..." : "Update Email"}
              </button>
            </form>
          </SettingsCard>

          <SettingsCard
            title="Password"
            description="Set a new admin password. The new password must be confirmed before it is sent to Supabase Auth."
          >
            <Notice type="success">{passwordNotice}</Notice>
            <Notice type="error">{passwordError}</Notice>
            <form onSubmit={handlePasswordUpdate} style={{ display: "grid", gap: "1rem" }}>
              <label>
                <FieldLabel>New Password</FieldLabel>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>

              <label>
                <FieldLabel>Confirm New Password</FieldLabel>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>

              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  ...buttonBase,
                  background: COLORS.gold,
                  borderColor: COLORS.gold,
                  color: adminColors.bg,
                  opacity: savingPassword ? 0.55 : 1,
                }}
              >
                {savingPassword ? "Saving..." : "Update Password"}
              </button>
            </form>
          </SettingsCard>
        </div>
      </main>

      <style>{`
        .admin-settings-shell {
          padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem) 3rem;
        }

        .admin-settings-header {
          margin-bottom: 2rem;
          max-width: 760px;
        }

        .admin-settings-kicker {
          color: ${COLORS.gold};
          font-family: ${font};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          margin-bottom: 0.55rem;
          text-transform: uppercase;
        }

        .admin-settings-title {
          color: ${adminColors.text};
          font-family: ${heading};
          font-size: clamp(2rem, 5vw, 3.25rem);
          line-height: 1;
          margin: 0;
        }

        .admin-settings-copy {
          color: ${adminColors.muted};
          font-family: ${font};
          font-size: 0.92rem;
          line-height: 1.7;
          margin: 0.9rem 0 0;
        }

        .admin-settings-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        @media (max-width: 860px) {
          .admin-settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
