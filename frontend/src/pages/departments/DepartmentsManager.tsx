import { useEffect, useState } from "react";
import api from "../../api/client";

interface Department {
  id: string;
  companyId: string;
  companyName: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface Company {
  id: string;
  code: string;
  name: string;
}

export default function DepartmentsManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyId: "", code: "", name: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
    api.get("/companies").then(r => setCompanies(r.data || []));
  }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const r = await api.get("/departments");
      setDepartments(r.data?.data || r.data || []);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ companyId: companies[0]?.id || "", code: "", name: "", isActive: true });
    setError("");
    setShowModal(true);
  }

  function openEdit(d: Department) {
    setEditingId(d.id);
    setForm({ companyId: d.companyId, code: d.code, name: d.name, isActive: d.isActive });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.companyId) { setError("Please select a company."); return; }
    if (!form.name.trim()) { setError("Department name is required."); return; }
    if (!form.code.trim()) { setError("Department code is required."); return; }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.put(`/departments/${editingId}`, form);
      } else {
        await api.post("/departments", form);
      }
      setShowModal(false);
      await loadDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(d: Department) {
    if (!confirm(`Deactivate department "${d.name}"? This cannot be undone from here.`)) return;
    try {
      await api.delete(`/departments/${d.id}`);
      await loadDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not deactivate department.");
    }
  }

  const filtered = departments.filter(d =>
    (!companyFilter || d.companyId === companyFilter) &&
    (!search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "32px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "Hanken Grotesk", fontSize: "24px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
            Department Management
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Manage departments across all companies.</p>
        </div>
        <button onClick={openCreate} style={{
          padding: "10px 20px", borderRadius: "4px", fontSize: "14px", fontWeight: 600,
          cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
        }}>+ Add Department</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          style={{ ...inputStyle, maxWidth: "280px" }}
        />
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "220px" }}>
          <option value="">All Companies</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #E2E8F0" }}>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Department Name</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No departments found.</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace" }}>{d.code}</td>
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.companyName}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                    background: d.isActive ? "#ECFDF5" : "#FEF2F2",
                    color: d.isActive ? "#10B981" : "#DC2626"
                  }}>
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => openEdit(d)} style={linkBtnStyle}>Edit</button>
                  <button onClick={() => handleDeactivate(d)} style={{ ...linkBtnStyle, color: "#E11D48", marginLeft: "12px" }}>
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }}>
          <div style={{ background: "white", borderRadius: "8px", padding: "24px", width: "420px" }}>
            <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "18px", fontWeight: 600, color: "#0b1c30", marginBottom: "16px" }}>
              {editingId ? "Edit Department" : "Add Department"}
            </h2>

            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px",
                padding: "10px 14px", marginBottom: "16px", color: "#DC2626", fontSize: "13px"
              }}>{error}</div>
            )}

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Company <span style={{ color: "#E11D48" }}>*</span></label>
              <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} style={inputStyle}>
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Department Code <span style={{ color: "#E11D48" }}>*</span></label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. FIN, PROC, IT" style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace" }} />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Department Name <span style={{ color: "#E11D48" }}>*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Finance" style={inputStyle} />
            </div>

            {editingId && (
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  style={{ accentColor: "#1a2b4b" }} />
                <label style={{ fontSize: "13px", color: "#64748b" }}>Active</label>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", background: "white", border: "1px solid #E2E8F0", color: "#64748b"
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "8px 20px", borderRadius: "4px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
              }}>{saving ? "Saving..." : editingId ? "Save Changes" : "Create Department"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "#44474e", marginBottom: "6px", letterSpacing: "0.02em"
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: "4px",
  border: "1px solid #E2E8F0", fontSize: "14px", color: "#0b1c30",
  background: "white", outline: "none", boxSizing: "border-box" as const,
  fontFamily: "Inter, sans-serif"
};

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 16px", fontSize: "12px",
  fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase"
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: "14px", color: "#0b1c30"
};

const linkBtnStyle: React.CSSProperties = {
  border: "none", background: "none", color: "#0051d5",
  fontSize: "13px", fontWeight: 500, cursor: "pointer", padding: 0
};
