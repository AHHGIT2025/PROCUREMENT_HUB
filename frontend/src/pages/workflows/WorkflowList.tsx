import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"ALL" | "ACTIVE" | "CONFLICTS">("ALL");

  useEffect(() => { loadWorkflows(); }, []);

  async function loadWorkflows() {
    try {
      setLoading(true);
      const r = await api.get("/workflows");
      setWorkflows(r.data?.data || r.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    try {
      await api.put(`/workflows/${id}/toggle`);
      loadWorkflows();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Delete this workflow rule?")) return;
    try {
      await api.delete(`/workflows/${id}`);
      loadWorkflows();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = workflows.filter(w => {
    if (filter === "ACTIVE") return w.isActive;
    return true;
  });

  const stats = {
    active:  workflows.filter(w => w.isActive).length,
    draft:   workflows.filter(w => !w.isActive).length,
    total:   workflows.length,
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "32px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", letterSpacing: "0.05em" }}>
            Admin Panel › Workflow Management
          </div>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "28px", fontWeight: 600, color: "#0b1c30", margin: 0 }}>
            Workflow Management
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            Configure approval routes based on company, department, material type, category, value, and business rules.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
              background: "white", border: "1px solid #E2E8F0", color: "#0b1c30"
            }}
          >
            ⚡ Test Workflow Routing
          </button>
          <button
            onClick={() => navigate("/workflows/create")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
              background: "#1a2b4b", color: "white", border: "none"
            }}
          >
            + Create Workflow Rule
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Active Rules", value: stats.active, sub: "+2 this month", icon: "✅", color: "#10B981" },
          { label: "Draft Rules",  value: stats.draft,  sub: "No changes today", icon: "📝", color: "#64748b" },
          { label: "Total Rules",  value: stats.total,  sub: "All companies", icon: "📋", color: "#3B82F6" },
          { label: "Avg Levels",   value: "3.2",        sub: "↑ 0.4 from last year", icon: "📊", color: "#F59E0B" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px",
            boxShadow: "0 1px 3px rgba(26,43,75,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{stat.label}</div>
              <span style={{ fontSize: "18px" }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#0b1c30", margin: "8px 0 4px" }}>{stat.value}</div>
            <div style={{ fontSize: "12px", color: stat.color }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* RULE INVENTORY */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>

        {/* Table Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "Hanken Grotesk", fontSize: "16px", fontWeight: 600, color: "#0b1c30" }}>
              Rule Inventory
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["ALL", "ACTIVE"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 600,
                  cursor: "pointer", border: "none",
                  background: filter === f ? "#1a2b4b" : "transparent",
                  color: filter === f ? "white" : "#64748b",
                  letterSpacing: "0.05em"
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Showing {filtered.length} of {workflows.length} rules
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚙️</div>
            <div style={{ fontWeight: 500 }}>No workflow rules configured</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>Create your first workflow rule to get started</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F1F5F9" }}>
                {["Rule Name", "Applies To", "Category/Condition", "Approval Route", "Priority", "Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: "11px", fontWeight: 600, color: "#64748b",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    borderBottom: "1px solid #E2E8F0"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wf, i) => (
                <tr key={wf.id} style={{
                  borderBottom: "1px solid #E2E8F0",
                  transition: "background 0.1s"
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,99,235,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#0b1c30", fontSize: "14px" }}>{wf.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      {wf.code || "—"} {wf.isDefault ? "· Default Rule" : ""}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: "#eff4ff", color: "#1a2b4b", fontSize: "11px", fontWeight: 600,
                      padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.03em"
                    }}>
                      {wf.companyId ? "Company Specific" : "All Companies"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "13px", color: "#44474e" }}>
                    {wf.conditions?.length > 0
                      ? wf.conditions.map((c: any) => `${c.field} = ${c.value}`).join(", ")
                      : <span style={{ color: "#94a3b8" }}>No conditions (default)</span>
                    }
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {Array.from({ length: Math.min(wf.steps?.length || 3, 4) }).map((_, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{
                            width: "10px", height: "10px", borderRadius: "50%",
                            background: i === 0 ? "#1a2b4b" : "#E2E8F0"
                          }} />
                          {i < Math.min((wf.steps?.length || 3), 4) - 1 && (
                            <div style={{ width: "20px", height: "1px", background: "#E2E8F0" }} />
                          )}
                        </div>
                      ))}
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>
                        {wf.steps?.length || 0} Steps
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
                      color: wf.priority >= 10 ? "#E11D48" : wf.priority >= 5 ? "#F59E0B" : "#10B981"
                    }}>
                      {wf.priority >= 10 ? "HIGH" : wf.priority >= 5 ? "MEDIUM" : "LOW"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                      letterSpacing: "0.05em",
                      background: wf.isActive ? "#ECFDF5" : "#F1F5F9",
                      color: wf.isActive ? "#10B981" : "#64748b"
                    }}>
                      {wf.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                        style={{
                          padding: "6px 14px", borderRadius: "4px", fontSize: "12px",
                          fontWeight: 500, cursor: "pointer",
                          background: "white", border: "1px solid #E2E8F0", color: "#0b1c30"
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWorkflow(wf.id)}
                        style={{
                          padding: "6px 14px", borderRadius: "4px", fontSize: "12px",
                          fontWeight: 500, cursor: "pointer",
                          background: "white", border: "1px solid #ffdad6", color: "#E11D48"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}