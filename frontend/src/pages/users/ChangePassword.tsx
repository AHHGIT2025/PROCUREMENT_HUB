// FILE: src/pages/users/ChangePassword.tsx
// Self-service page so a logged-in user can change their own password
// (current password + new password + confirm). Calls
// POST /api/users/change-password. Each field has a show/hide (eye icon)
// toggle so the person can verify exactly what they typed before
// submitting — masked fields hide typos in special characters otherwise.

import { useState } from "react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #E2E8F0", padding: "9px 40px 9px 12px",
  borderRadius: "4px", marginTop: "6px", fontSize: "14px",
  fontFamily: "Inter, sans-serif", outline: "none",
  boxSizing: "border-box", color: "#0b1c30", background: "white"
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: 600, color: "#44474e", letterSpacing: "0.02em"
};

const eyeButtonStyle: React.CSSProperties = {
  position: "absolute", right: "10px", top: "50%", transform: "translateY(calc(-50% + 3px))",
  background: "none", border: "none", cursor: "pointer",
  color: "#94a3b8", display: "flex", alignItems: "center", padding: "2px"
};

// FIXED — this was previously defined INSIDE the ChangePassword component
// function body. That meant a brand-new PasswordField function (and
// therefore a brand-new <input> element identity) was created on every
// single render — which happens on every keystroke, since typing updates
// `form` state. React then unmounted/remounted the underlying DOM input
// each time, which dropped keyboard focus after every character — the
// exact "only clicking works" symptom reported. Hoisting it out here to
// module scope means the same input element persists across renders, so
// typing continuously (and the eye-icon toggle) both work normally.
function PasswordField({
  name, label, value, show, onToggleShow, onChange,
}: {
  name: string; label: string; value: string; show: boolean;
  onToggleShow: () => void; onChange: (e: any) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label} *</label>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={onChange}
          style={inputStyle}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        />
        <button type="button" onClick={onToggleShow} style={eyeButtonStyle} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  // Independent show/hide toggle per field
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/users/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "32px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            Account › Change Password
          </div>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "24px", fontWeight: 600, color: "#0b1c30", margin: 0 }}>
            Change Password
          </h1>
        </div>

        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>

          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>✅</div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#0b1c30", margin: "0 0 6px" }}>
                Password changed successfully
              </p>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>
                Use your new password the next time you log in.
              </p>
              <button type="button" onClick={() => navigate("/dashboard")}
                style={{
                  padding: "10px 24px", borderRadius: "4px", fontSize: "14px",
                  fontWeight: 600, cursor: "pointer", background: "#1a2b4b",
                  color: "white", border: "none"
                }}>
                Back to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                <PasswordField
                  name="currentPassword"
                  label="Current Password"
                  value={form.currentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent(s => !s)}
                  onChange={handleChange}
                />

                <PasswordField
                  name="newPassword"
                  label="New Password"
                  value={form.newPassword}
                  show={showNew}
                  onToggleShow={() => setShowNew(s => !s)}
                  onChange={handleChange}
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm New Password"
                  value={form.confirmPassword}
                  show={showConfirm}
                  onToggleShow={() => setShowConfirm(s => !s)}
                  onChange={handleChange}
                />

                {error && (
                  <div style={{
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: "4px", padding: "10px 12px",
                    fontSize: "13px", color: "#B91C1C"
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "6px" }}>
                  <button type="button" onClick={() => navigate(-1)}
                    style={{
                      padding: "10px 20px", borderRadius: "4px", fontSize: "14px",
                      fontWeight: 500, cursor: "pointer", background: "white",
                      border: "1px solid #E2E8F0", color: "#64748b"
                    }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    style={{
                      padding: "10px 24px", borderRadius: "4px", fontSize: "14px",
                      fontWeight: 600, cursor: "pointer", background: "#1a2b4b",
                      color: "white", border: "none", opacity: loading ? 0.7 : 1
                    }}>
                    {loading ? "Changing..." : "Change Password"}
                  </button>
                </div>

              </div>
            </form>
          )}

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>
    </div>
  );
}
