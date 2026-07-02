// FILE: src/pages/users/CreateUser.tsx

import { useEffect, useState } from "react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    employeeCode:        "",
    fullName:            "",
    email:               "",
    password:            "",
    companyId:           "",
    departmentId:        "",
    roleName:            "",
    managerId:           "",
    subManagerId:        "",
    additionalCompanyIds: [] as string[]
  });
const seniorRoles = ['CEO', 'System Admin', 'Holding Admin'];
const isSeniorRole = seniorRoles.includes(form.roleName);
  const [companies, setCompanies]     = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles]             = useState<any[]>([]);
  const [users, setUsers]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);

  const [reportSearch, setReportSearch]           = useState("");
  const [subReportSearch, setSubReportSearch]     = useState("");
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown]     = useState(false);

  useEffect(() => {
    api.get("/companies").then(r => setCompanies(r.data));
    api.get("/roles").then(r => setRoles(r.data?.data || r.data || []));
    api.get("/users").then(r => setUsers(r.data));
  }, []);

  // ── Load departments when company changes ─────────────────
  useEffect(() => {
    if (form.companyId) {
      api.get(`/departments/by-company/${form.companyId}`)
        .then(r => setDepartments(r.data));
    } else {
      setDepartments([]);
    }
  }, [form.companyId]);

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

  const handleRemoveCompany = (id: string) => {
    setForm({ ...form, additionalCompanyIds: form.additionalCompanyIds.filter(x => x !== id) });
  };

  const filteredReportUsers = users.filter(u =>
    (u.fullName || "").toLowerCase().includes(reportSearch.toLowerCase()) ||
    (u.employeeCode || "").toLowerCase().includes(reportSearch.toLowerCase())
  );

  const filteredSubUsers = users.filter(u =>
    (u.fullName || "").toLowerCase().includes(subReportSearch.toLowerCase()) ||
    (u.employeeCode || "").toLowerCase().includes(subReportSearch.toLowerCase())
  );

const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users", {
        ...form,
        departmentId: form.departmentId || null,
        managerId:    form.managerId    || null,
        subManagerId: form.subManagerId || null,
      });
   alert("✅ User created successfully");
      navigate("/users");
    } catch (err: any) {
      alert(err.response?.data?.message || "❌ Error creating user");
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

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "32px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            Users › Create User
          </div>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "24px", fontWeight: 600, color: "#0b1c30", margin: 0 }}>
            Create New User
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

            {/* LEFT — Basic Info */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "16px" }}>
                BASIC INFORMATION
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                <div>
                  <label style={labelStyle}>Employee Code *</label>
                  <input name="employeeCode" required placeholder="EMP001"
                    onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input name="fullName" required placeholder="Ahmed Al Hattab"
                    onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input name="email" type="email" required placeholder="ahmed@alhattab.com"
                    onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Password *</label>
                  <input name="password" type="password" required
                    onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Role *</label>
                  <select name="roleName" required onChange={handleChange} style={inputStyle}>
                    <option value="">Select Role</option>
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* RIGHT — Company & Dept */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "16px" }}>
                COMPANY & DEPARTMENT
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                <div>
                  <label style={labelStyle}>Primary Company *</label>
                  <select name="companyId" required onChange={handleChange} style={inputStyle}>
                    <option value="">Select Company</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

             {form.companyId && departments.length === 0 ? (
  <div>
    <label style={labelStyle}>Department</label>
    <div style={{
      ...inputStyle,
      background: "#f8fafc",
      color: "#94a3b8",
      display: "flex",
      alignItems: "center",
      fontStyle: "italic"
    }}>
      Not applicable for this company
    </div>
  </div>
) : (
  <div>
    <label style={labelStyle}>
      Department {departments.length > 0 ? "*" : ""}
    </label>
    <select
      name="departmentId"
      // required={departments.length > 0}
      required={false}
      onChange={handleChange}
      disabled={!form.companyId}
      style={{ ...inputStyle, background: !form.companyId ? "#f8fafc" : "white" }}
    >
      <option value="">
        {form.companyId ? "Select Department" : "Select Company first"}
      </option>
      {departments.map((d: any) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  </div>
)}

                {/* Additional Companies */}
                <div>
                  <label style={labelStyle}>Additional Company Access</label>
                  <select onChange={e => handleAddCompany(e.target.value)}
                    style={inputStyle} value="">
                    <option value="">+ Add Company Access</option>
                    {companies
                      .filter(c => c.id !== form.companyId && !form.additionalCompanyIds.includes(c.id))
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    }
                  </select>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {form.additionalCompanyIds.map(id => {
                      const c = companies.find(x => x.id === id);
                      return (
                        <span key={id} style={{
                          background: "#eff4ff", color: "#1a2b4b",
                          padding: "3px 10px", borderRadius: "999px",
                          fontSize: "12px", fontWeight: 500,
                          display: "flex", alignItems: "center", gap: "6px"
                        }}>
                          {c?.name}
                          <button type="button" onClick={() => handleRemoveCompany(id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px" }}>
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>



 
      {/* BOTTOM — Manager */}
        {!['CEO', 'System Admin', 'Holding Admin'].includes(form.roleName) && (
            <div style={{
              gridColumn: "1 / -1", background: "white",
              border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "16px" }}>
                REPORTING HIERARCHY
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                {/* Manager */}
                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>Manager (Reporting To)</label>
                  <input
                    value={reportSearch}
                    placeholder="Search by name or employee code..."
                    onFocus={() => setShowReportDropdown(true)}
                    onBlur={() => setTimeout(() => setShowReportDropdown(false), 200)}
                    onChange={e => setReportSearch(e.target.value)}
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
                      borderRadius: "4px", fontSize: "12px", color: "#10B981"
                    }}>
                      ✓ Manager selected
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
                    onChange={e => setSubReportSearch(e.target.value)}
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
                      borderRadius: "4px", fontSize: "12px", color: "#10B981"
                    }}>
                      ✓ Sub Manager selected
                    </div>
                  )}
                </div>

              </div>
            </div>
        )}

          </div>
          {/* ACTIONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
            <button type="button" onClick={() => navigate("/users")}
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
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>

        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>
    </div>
  );
}