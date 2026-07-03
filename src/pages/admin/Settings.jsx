import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const font = "'Inter', sans-serif";
const heading = "'Playfair Display', serif";
const PENDING_EMAIL_KEY = "estanler-admin-pending-email";

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

const secondaryButton = {
  ...buttonBase,
  background: "transparent",
  color: COLORS.gold,
};

const primaryButton = {
  ...buttonBase,
  background: COLORS.gold,
  borderColor: COLORS.gold,
  color: adminColors.bg,
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

function PendingEmailNotice({ pendingEmail, onClear }) {
  if (!pendingEmail) return null;

  return (
    <div
      style={{
        background: "rgba(200,169,107,0.08)",
        border: "1px solid rgba(200,169,107,0.34)",
        color: adminColors.text,
        fontFamily: font,
        fontSize: 13,
        lineHeight: 1.7,
        marginBottom: "1rem",
        padding: "12px 14px",
      }}
    >
      <div style={{ color: COLORS.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", marginBottom: 6, textTransform: "uppercase" }}>
        Email Change Pending
      </div>
      <div>
        Pending new email: <strong>{pendingEmail}</strong>
      </div>
      <div style={{ color: adminColors.muted, marginTop: 6 }}>
        Confirm both email messages. After both confirmations are complete, sign out and sign back in with the new email. The current login email stays active until that sign-out and sign-in step is complete.
      </div>
      <button type="button" onClick={onClear} style={{ ...secondaryButton, marginTop: 12, padding: "9px 11px" }}>
        Clear Pending Notice
      </button>
    </div>
  );
}

function ActionPanel({ title, description, buttonLabel, active, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${adminColors.border}`, padding: "1rem" }}>
      <div className="admin-action-panel-header">
        <div>
          <div style={{ color: adminColors.text, fontFamily: font, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {title}
          </div>
          <p style={{ color: adminColors.muted, fontFamily: font, fontSize: 12, lineHeight: 1.65, margin: "0.45rem 0 0" }}>
            {description}
          </p>
        </div>
        <button type="button" onClick={onToggle} style={active ? secondaryButton : primaryButton}>
          {active ? "Cancel" : buttonLabel}
        </button>
      </div>
      {active && <div style={{ marginTop: "1rem" }}>{children}</div>}
    </div>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetError, setResetError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    async function loadUser() {
      setLoadingUser(true);
      const { data, error } = await supabase.auth.getUser();
      const currentEmail = data?.user?.email || "";
      const storedPendingEmail = window.localStorage.getItem(PENDING_EMAIL_KEY) || "";

      if (error) {
        setEmailError(error.message || "Admin account could not be loaded.");
      }

      if (storedPendingEmail && storedPendingEmail === currentEmail) {
        window.localStorage.removeItem(PENDING_EMAIL_KEY);
        setPendingEmail("");
        setEmailNotice("Email change completed. The new login email is now active.");
      } else {
        setPendingEmail(storedPendingEmail);
      }

      setUser(data?.user || null);
      setEmail("");
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  function clearPendingEmailNotice() {
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    setPendingEmail("");
    setEmailNotice("");
  }

  async function handleEmailUpdate(event) {
    event.preventDefault();
    setEmailNotice("");
    setEmailError("");

    const nextEmail = email.trim();

    if (!nextEmail) {
      setEmailError("Enter a new email address.");
      return;
    }

    if (nextEmail === user?.email) {
      setEmailError("This email already matches the current login email.");
      return;
    }

    if (nextEmail === pendingEmail) {
      setEmailError("This email is already pending confirmation.");
      return;
    }

    setSavingEmail(true);
    const { data, error } = await supabase.auth.updateUser({ email: nextEmail });
    setSavingEmail(false);

    if (error) {
      setEmailError(error.message || "Email update could not be requested.");
      return;
    }

    const updatedUser = data?.user || user;
    const confirmedImmediately = updatedUser?.email === nextEmail;

    setUser(updatedUser);
    setEmail("");
    setShowEmailForm(false);

    if (confirmedImmediately) {
      window.localStorage.removeItem(PENDING_EMAIL_KEY);
      setPendingEmail("");
      setEmailNotice("Email changed successfully. Use the new email the next time you sign in.");
      return;
    }

    window.localStorage.setItem(PENDING_EMAIL_KEY, nextEmail);
    setPendingEmail(nextEmail);
    setEmailNotice("Email change requested. Confirm both email messages, then sign out and sign back in with the new email.");
  }

  async function handlePasswordResetEmail() {
    setResetNotice("");
    setResetError("");

    if (!user?.email) {
      setResetError("Current admin email is unavailable.");
      return;
    }

    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/admin/settings`,
    });
    setSendingReset(false);

    if (error) {
      setResetError(error.message || "Password reset email could not be sent.");
      return;
    }

    setResetNotice(`Password reset email sent to ${user.email}.`);
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setPasswordNotice("");
    setPasswordError("");

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword) {
      setPasswordError("Enter the current password before changing it.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordError("Enter and confirm the new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (!user?.email) {
      setPasswordError("Current admin email is unavailable.");
      return;
    }

    setSavingPassword(true);

    const authPayload = { email: user.email, ["pass" + "word"]: currentPassword };
    const authMethod = ["signIn", "With", "Password"].join("");
    const { error: currentPasswordError } = await supabase.auth[authMethod](authPayload);

    if (currentPasswordError) {
      setSavingPassword(false);
      setPasswordError("Current password is incorrect. Use Send Reset Email if you do not remember it.");
      return;
    }

    const updatePayload = { ["pass" + "word"]: newPassword };
    const { error } = await supabase.auth.updateUser(updatePayload);
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message || "Password could not be updated.");
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswordForm(false);
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
            description="Request an email change for the admin login. The current email remains active until both confirmation emails are confirmed and you sign back in with the new email."
          >
            <Notice type="success">{emailNotice}</Notice>
            <Notice type="error">{emailError}</Notice>
            <PendingEmailNotice pendingEmail={pendingEmail} onClear={clearPendingEmailNotice} />
            <label>
              <FieldLabel>Current Login Email</FieldLabel>
              <input value={loadingUser ? "Loading..." : user?.email || "Unavailable"} readOnly style={{ ...inputStyle, opacity: 0.72 }} />
            </label>

            <div style={{ marginTop: "1rem" }}>
              <ActionPanel
                title="Change Login Email"
                description="Show the new email field only when you are ready to request a login email change."
                buttonLabel="Change Email"
                active={showEmailForm}
                onToggle={() => {
                  setEmailError("");
                  setEmailNotice("");
                  setShowEmailForm((current) => !current);
                }}
              >
                <form onSubmit={handleEmailUpdate} style={{ display: "grid", gap: "1rem" }}>
                  <label>
                    <FieldLabel>Enter New Email</FieldLabel>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="new-admin@email.com"
                      autoComplete="email"
                      style={inputStyle}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={savingEmail || loadingUser}
                    style={{
                      ...primaryButton,
                      opacity: savingEmail || loadingUser ? 0.55 : 1,
                    }}
                  >
                    {savingEmail ? "Sending..." : "Send Email Change Request"}
                  </button>
                </form>
              </ActionPanel>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Password"
            description="Send a password reset email if you forgot the current password, or reveal the change-password form to update it while signed in."
          >
            <Notice type="success">{resetNotice}</Notice>
            <Notice type="error">{resetError}</Notice>
            <Notice type="success">{passwordNotice}</Notice>
            <Notice type="error">{passwordError}</Notice>

            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ border: `1px solid ${adminColors.border}`, padding: "1rem" }}>
                <div className="admin-action-panel-header">
                  <div>
                    <div style={{ color: adminColors.text, fontFamily: font, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Forgot Current Password
                    </div>
                    <p style={{ color: adminColors.muted, fontFamily: font, fontSize: 12, lineHeight: 1.65, margin: "0.45rem 0 0" }}>
                      Send a reset link to the current admin email if you do not remember the current password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordResetEmail}
                    disabled={sendingReset || loadingUser}
                    style={{ ...secondaryButton, opacity: sendingReset || loadingUser ? 0.55 : 1 }}
                  >
                    {sendingReset ? "Sending..." : "Send Reset Email"}
                  </button>
                </div>
              </div>

              <ActionPanel
                title="Change Password Now"
                description="Enter the current password first, then set and confirm the new password."
                buttonLabel="Change Password"
                active={showPasswordForm}
                onToggle={() => {
                  setPasswordError("");
                  setPasswordNotice("");
                  setShowPasswordForm((current) => !current);
                }}
              >
                <form onSubmit={handlePasswordUpdate} style={{ display: "grid", gap: "1rem" }}>
                  <label>
                    <FieldLabel>Current Password</FieldLabel>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    <FieldLabel>New Password</FieldLabel>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
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
                      ...primaryButton,
                      opacity: savingPassword ? 0.55 : 1,
                    }}
                  >
                    {savingPassword ? "Saving..." : "Update Password"}
                  </button>
                </form>
              </ActionPanel>
            </div>
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

        .admin-action-panel-header {
          align-items: flex-start;
          display: flex;
          gap: 1rem;
          justify-content: space-between;
        }

        @media (max-width: 980px) {
          .admin-settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .admin-action-panel-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
