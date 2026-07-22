// ===== FILE: src/pages/users/EditUser.tsx =====
import { useEffect, useState } from "react";
import api from "../../api/client";
import { useNavigate, useParams } from "react-router-dom";

export default function EditUser() {
  const navigate    = useNavigate();
  const { id }      = useParams<{ id: string }>();

  const [form, setForm] = useState({
    employeeCode:         "",
    fullName:             "",
    email:                "",
    companyId:            "",
    departmentId:         "",
    roleName:             "",
    managerId:            "",
    subManagerId:         "",
    additionalCompanyIds: [] as string[],
    password:             "", // ✅ NEW — optional, blank = leave unchanged
  });

  const [companies,   setCompanies]   = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles,       setRoles]       = useState<any[]>([]);
  const [users,       setUsers]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [reportSearch,      setReportSearch]      = useState("");
  const [subReportSearch,   setSubReportSearch]   = useState("");
  const [showReportDropdown,setShowReportDropdown]= useState(false);
  const [showSubDropdown,   setShowSubDropdown]   = useState(false);
  const [showPassword,      setShowPassword]      = useState(false); // ✅ NEW

  // ── Load base data ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/companies"),
      api.get("/roles"),
      api.get("/users"),
    ]).then(([cr, rr, ur]) => {
      setCompanies(cr.data?.data ?? cr.data ?? []);
      setRoles(rr.data?.data ?? rr.data ?? []);
      setUsers(ur.data?.data ?? ur.data ?? []);
    });
  }, []);

  // ── Load user data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    api.get(`/users/${id}`)
      .then(r => {
        const u = r.data?.data ?? r.data;
        setForm({
          employeeCode:         u.employeeCode         ?? "",
          fullName:             u.fullName             ?? "",
          email:                u.email                ?? "",
          companyId:            u.companyId            ?? "",
          departmentId:         u.departmentId         ?? "",
          roleName:             u.roleName ?? u.role   ?? "",
          managerId:            u.managerId            ?? "",
          subManagerId:         u.subManagerId         ?? "",
          additionalCompanyIds: u.additionalCompanyIds ?? [],
          password:             "", // ✅ NEW — always starts blank; typing a value here is what triggers a reset
        });
        // Pre-fill manager search
        if (u.managerName) setReportSearch(u.managerName);
        if (u.subManagerName) setSubReportSearch(u.subManagerName);
      })
      .catch(() => showToast("Failed to load user", "error"))
      .finally(() => setPageLoading(false));
  }, [id]);

  // ── Load departments on company change ──────────────────────────────────
  useEffect(() => {
    if (form.companyId) {
      api.get(`/departments/by-company/${form.companyId}`)
        .then(r => setDepartments(r.data?.data ?? r.data ?? []));
    } else {
      setDepartments([]);
    }
  }, [form.companyId]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "companyId") {
      setForm({ ...form, companyId: value, departmentId: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddCompany = (id: string) => {
    if (!id || form.additionalCompanyIds.includes(id)) return;
    setForm({ ...form, additionalCompanyIds: [...form.additionalCompanyIds, id] });
  };

  const handleRemoveCompany = (cid: string) => {
    setForm({ ...form, additionalCompanyIds: form.additionalCompanyIds.filter(x => x !== cid) });
  };

  const filteredReportUsers = users.filter(u =>
    u.id !== id && (
      (u.fullName     || "").toLowerCase().includes(reportSearch.toLowerCase()) ||
      (u.employeeCode || "").toLowerCase().includes(reportSearch.toLowerCase())
    )
  );

  const filteredSubUsers = users.filter(u =>
    u.id !== id && (
      (u.fullName     || "").toLowerCase().includes(subReportSearch.toLowerCase()) ||
      (u.employeeCode || "").toLowerCase().includes(subReportSearch.toLowerCase())
    )
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/users/${id}`, {
        ...form,
        departmentId: form.departmentId  || null,
        managerId:    form.managerId     || null,
        subManagerId: form.subManagerId  || null,
        // ✅ NEW — only send password if the admin actually typed something;
        // blank means "leave the existing password unchanged" (backend
        // already treats blank/whitespace as no-op, this is just explicit).
        password: form.password.trim() || null,
      });
      showToast("✅ User updated successfully", "success");
      setTimeout(() => navigate("/users"), 1500);
    } catch (err: any) {
      showToast(err.response?.data?.message || "❌ Error updating user", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #E2E8F0", padding: "9px 12px",
    borderRadius: "4px", marginTop: "6px", fontSize: "14px",
    fontFamily: "Inter, sans-serif", outline: "none",
    boxSizing: "border-box", color: "#0b1c30", background: "white"
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px", fontWeight: 600, color: "#44474e", letterSpacing: "0.02em"
  };

  if (pageLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading user...
    </div>
  );

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px", fontFamily: "Inter, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          padding: "12px 20px", borderRadius: "12px", color: "white",
          background: toast.type === "success" ? "#16a34a" : "#dc2626",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: "14px", fontWeight: 500
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <button
            onClick={() => navigate("/users")}
            style={{
              background: "none", border: "1px solid #E2E8F0", borderRadius: "8px",
              padding: "6px 12px", cursor: "pointer", fontSize: "13px", color: "#64748b"
            }}>
            ← Back
          </button>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0b1c30", margin: 0 }}>
            Edit User
          </h1>
        </div>
        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
          Update user details, role, reporting structure and company access.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          background: "white", border: "1px solid #E2E8F0",
          borderRadius: "12px", padding: "28px", marginBottom: "20px"
        }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0b1c30", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            Basic Information
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            <div>
              <label style={labelStyle}>Employee Code</label>
              <input name="employeeCode" value={form.employeeCode}
                onChange={handleChange} style={inputStyle} placeholder="e.g. S001" />
            </div>

            <div>
              <label style={labelStyle}>Full Name <span style={{ color: "#E11D48" }}>*</span></label>
              <input name="fullName" value={form.fullName} required
                onChange={handleChange} style={inputStyle} placeholder="Full name" />
            </div>

            <div>
              <label style={labelStyle}>Email (Login Username) <span style={{ color: "#E11D48" }}>*</span></label>
              <input name="email" type="email" value={form.email} required
                onChange={handleChange} style={inputStyle} placeholder="email@company.com" />
            </div>

            {/* ✅ NEW — optional password reset, admin-only page so this is safe here */}
            <div>
              <label style={labelStyle}>New Password <span style={{ color: "#94a3b8", fontWeight: 400 }}>(leave blank to keep current)</span></label>
              <div style={{ position: "relative" }}>
                <input name="password" type={showPassword ? "text" : "password"} value={form.password}
                  onChange={handleChange} style={{ ...inputStyle, paddingRight: "70px" }}
                  placeholder="Enter new password to reset" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: "absolute", right: "8px", top: "50%", transform: "translateY(calc(-50% + 3px))",
                    background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "12px", fontWeight: 500
                  }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Role <span style={{ color: "#E11D48" }}>*</span></label>
              <select name="roleName" value={form.roleName} required
                onChange={handleChange} style={inputStyle}>
                <option value="">Select Role…</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Primary Company <span style={{ color: "#E11D48" }}>*</span></label>
              <select name="companyId" value={form.companyId} required
                onChange={handleChange} style={inputStyle}>
                <option value="">Select Company…</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Department</label>
              <select name="departmentId" value={form.departmentId}
                onChange={handleChange} style={inputStyle}
                disabled={!form.companyId}>
                <option value="">Select Department…</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Reporting Structure */}
        <div style={{
          background: "white", border: "1px solid #E2E8F0",
          borderRadius: "12px", padding: "28px", marginBottom: "20px"
        }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0b1c30", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            Reporting Structure
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* Reporting To (Manager) */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Reporting To (Manager)</label>
              <input
                value={reportSearch}
                placeholder="Search by name or employee code..."
                onFocus={() => setShowReportDropdown(true)}
                onBlur={() => setTimeout(() => setShowReportDropdown(false), 200)}
                onChange={e => {
                  setReportSearch(e.target.value);
                  if (!e.target.value) setForm({ ...form, managerId: "" });
                }}
                style={inputStyle}
              />
              {showReportDropdown && reportSearch && filteredReportUsers.length > 0 && (
                <div style={{
                  position: "absolute", width: "100%", background: "white",
                  border: "1px solid #E2E8F0", borderRadius: "4px",
                  maxHeight: "180px", overflowY: "auto", zIndex: 10,
                  boxShadow: "0 4px 12px rgba(26,43,75,0.1)"
                }}>
                  {filteredReportUsers.slice(0, 10).map((u: any) => (
                    <div key={u.id}
                      onMouseDown={() => {
                        setForm({ ...form, managerId: u.id });
                        setReportSearch(`${u.employeeCode} - ${u.fullName}`);
                        setShowReportDropdown(false);
                      }}
                      style={{
                        padding: "10px 12px", cursor: "pointer",
                        fontSize: "13px", borderBottom: "1px solid #f1f5f9"
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#eff4ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    >
                      <span style={{ fontWeight: 500 }}>{u.employeeCode}</span>
                      <span style={{ color: "#64748b" }}> — {u.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
              {form.managerId && (
                <div style={{
                  marginTop: "6px", padding: "6px 10px", background: "#ECFDF5",
                  borderRadius: "4px", fontSize: "12px", color: "#10B981",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>✓ Manager selected</span>
                  <button type="button"
                    onClick={() => { setForm({ ...form, managerId: "" }); setReportSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "12px" }}>
                    ✕ Clear
                  </button>
                </div>
              )}
            </div>

            {/* Sub Manager */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Sub Manager</label>
              <input
                value={subReportSearch}
                placeholder="Search by name or employee code..."
                onFocus={() => setShowSubDropdown(true)}
                onBlur={() => setTimeout(() => setShowSubDropdown(false), 200)}
                onChange={e => {
                  setSubReportSearch(e.target.value);
                  if (!e.target.value) setForm({ ...form, subManagerId: "" });
                }}
                style={inputStyle}
              />
              {showSubDropdown && subReportSearch && filteredSubUsers.length > 0 && (
                <div style={{
                  position: "absolute", width: "100%", background: "white",
                  border: "1px solid #E2E8F0", borderRadius: "4px",
                  maxHeight: "180px", overflowY: "auto", zIndex: 10,
                  boxShadow: "0 4px 12px rgba(26,43,75,0.1)"
                }}>
                  {filteredSubUsers.slice(0, 10).map((u: any) => (
                    <div key={u.id}
                      onMouseDown={() => {
                        setForm({ ...form, subManagerId: u.id });
                        setSubReportSearch(`${u.employeeCode} - ${u.fullName}`);
                        setShowSubDropdown(false);
                      }}
                      style={{
                        padding: "10px 12px", cursor: "pointer",
                        fontSize: "13px", borderBottom: "1px solid #f1f5f9"
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#eff4ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    >
                      <span style={{ fontWeight: 500 }}>{u.employeeCode}</span>
                      <span style={{ color: "#64748b" }}> — {u.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
              {form.subManagerId && (
                <div style={{
                  marginTop: "6px", padding: "6px 10px", background: "#ECFDF5",
                  borderRadius: "4px", fontSize: "12px", color: "#10B981",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>✓ Sub Manager selected</span>
                  <button type="button"
                    onClick={() => { setForm({ ...form, subManagerId: "" }); setSubReportSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "12px" }}>
                    ✕ Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Companies */}
        <div style={{
          background: "white", border: "1px solid #E2E8F0",
          borderRadius: "12px", padding: "28px", marginBottom: "20px"
        }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0b1c30", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            Additional Company Access
          </h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              onChange={e => { handleAddCompany(e.target.value); e.target.value = ""; }}
              style={{ ...inputStyle, width: "auto", marginTop: 0 }}>
              <option value="">+ Add company access…</option>
              {companies
                .filter(c => c.id !== form.companyId && !form.additionalCompanyIds.includes(c.id))
                .map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
            </select>

            {form.additionalCompanyIds.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {form.additionalCompanyIds.map(cid => {
                  const co = companies.find((c: any) => c.id === cid);
                  return co ? (
                    <span key={cid} style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px",
                      padding: "4px 10px", borderRadius: "999px", fontWeight: 500
                    }}>
                      {co.code} — {co.name}
                      <button type="button" onClick={() => handleRemoveCompany(cid)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: "14px" }}>
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => navigate("/users")}
            style={{
              padding: "10px 24px", borderRadius: "8px", fontSize: "14px",
              fontWeight: 500, cursor: "pointer", background: "white",
              border: "1px solid #E2E8F0", color: "#64748b"
            }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            style={{
              padding: "10px 24px", borderRadius: "8px", fontSize: "14px",
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#93C5FD" : "#1a2b4b", color: "white", border: "none"
            }}>
            {loading ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>

      </form>
    </div>
  );
}
