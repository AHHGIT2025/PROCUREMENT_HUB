import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"ALL" | "ACTIVE">("ALL");
  const [search, setSearch]       = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  useEffect(() => {
    loadWorkflows();
    api.get("/companies").then(r => setCompanies(r.data?.data ?? r.data ?? []));
  }, []);

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

  async function deleteWorkflow(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/workflows/${id}`);
      loadWorkflows();
    } catch (err) {
      console.error(err);
    }
  }

  function companyLabel(companyId: string | null) {
    if (!companyId) return "All Companies";
    const c = companies.find((c: any) => c.id === companyId);
    return c ? `${c.code} — ${c.name}` : "Specific Company";
  }

  function scopeDisplay(wf: any) {
    if (wf.scopeType === "Multiple" && wf.companyIds?.length > 0) {
      const codes: string[] = wf.companyIds
        .map((cid: string) => companies.find((c: any) => c.id === cid)?.code)
        .filter(Boolean);
      const shown = codes.slice(0, 2).join(", ");
      const extra = codes.length > 2 ? ` +${codes.length - 2} more` : "";
      return {
        icon: "🏘️",
        text: `${codes.length} Companies (${shown}${extra})`,
        full: codes.join(", "),
        bg: "#EFF6FF", color: "#1D4ED8"
      };
    }
    if (wf.companyId) {
      const label = companyLabel(wf.companyId);
      return { icon: "🏢", text: label, full: label, bg: "#FFFBEB", color: "#92400E" };
    }
    return { icon: "🌐", text: "All Companies", full: "All Companies", bg: "#eff4ff", color: "#1a2b4b" };
  }

  const filtered = workflows
    .filter(w => filter !== "ACTIVE" || w.isActive)
    .filter(w => !companyFilter || (companyFilter === "GLOBAL"
      ? (!w.companyId && w.scopeType !== "Multiple")
      : (w.companyId === companyFilter || (w.scopeType === "Multiple" && w.companyIds?.includes(companyFilter)))))
    .filter(w =>
      !search ||
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.code?.toLowerCase().includes(search.toLowerCase()) ||
      w.description?.toLowerCase().includes(search.toLowerCase()) ||
      w.conditions?.some((c: any) => c.value?.toLowerCase().includes(search.toLowerCase()))
    );

  const stats = {
    active: workflows.filter(w => w.isActive).length,
    draft:  workflows.filter(w => !w.isActive).length,
    total:  workflows.length,
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "32px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", letterSpacing: "0.05em" }}>
            Admin Panel › Workflow Management
          </div>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "28px", fontWeight: 600, color: "#0b1c30", margin: 0 }}>
            Workflow Management
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            Configure approval routes based on company, item category, and business rules.
          </p>
        </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Active Rules", value: stats.active, icon: "✅" },
          { label: "Inactive Rules", value: stats.draft, icon: "⏸️" },
          { label: "Total Rules", value: stats.total, icon: "📋" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px",
            boxShadow: "0 1px 3px rgba(26,43,75,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{stat.label}</div>
              <span style={{ fontSize: "18px" }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#0b1c30", margin: "8px 0 0" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
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
                }}>{f}</button>
              ))}
            </div>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "12px", color: "#44474e" }}
            >
              <option value="">All Scopes</option>
              <option value="GLOBAL">Global Only</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rule name, code, category…"
              style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "12px", minWidth: "220px" }}
            />
          </div>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Showing {filtered.length} of {workflows.length} rules
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚙️</div>
            <div style={{ fontWeight: 500 }}>
              {workflows.length === 0 ? "No workflow rules configured" : "No rules match your filters"}
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              {workflows.length === 0 ? "Create your first workflow rule to get started" : "Try clearing the search or scope filter"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#F1F5F9" }}>
                {["Rule Name", "Scope", "Condition", "Approval Route", "Priority", "Status", "Actions"].map(h => (
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
              {filtered.map((wf) => (
                <tr key={wf.id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "#0b1c30", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {wf.name || <span style={{ color: "#DC2626", fontStyle: "italic" }}>(Unnamed rule)</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
  <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{wf.code || "—"}</span>
  {wf.isDefault && <span>· Default fallback rule</span>}
  {(wf.conditions?.length ?? 0) > 1 && wf.conditionMatchLogic === "ALL" && (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: "#FEE2E2", color: "#DC2626",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em",
      padding: "2px 8px", borderRadius: "4px",
      flexShrink: 0, whiteSpace: "nowrap"
    }}>
    🔗  COMBO
    </span>
  )}
</div>
                    {wf.description && (
                      <div style={{
                        fontSize: "12px", color: "#94a3b8", marginTop: "3px",
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                      }}>
                        {wf.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    {(() => {
                      const s = scopeDisplay(wf);
                      return (
                        <span title={s.full} style={{
                          display: "inline-block",
                          maxWidth: "100%",
                          background: s.bg,
                          color: s.color,
                          fontSize: "11px", fontWeight: 600,
                          padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.03em",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          boxSizing: "border-box", cursor: "default"
                        }}>
                          {s.icon} {s.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{
                    padding: "14px 16px", fontSize: "13px", color: "#44474e", verticalAlign: "top",
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                  }} title={wf.conditions?.length > 0 ? wf.conditions.map((c: any) => `${c.field} = ${c.value}`).join(" AND ") : ""}>
                    {wf.conditions?.length > 0
                      ? wf.conditions.map((c: any) => `${c.field} = ${c.value}`).join(" AND ")
                      : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No conditions (fallback)</span>
                    }
                  </td>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {(wf.steps ?? []).slice(0, 4).map((_: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#1a2b4b", flexShrink: 0 }} />
                          {i < Math.min(wf.steps.length, 4) - 1 && (
                            <div style={{ width: "12px", height: "1px", background: "#E2E8F0" }} />
                          )}
                        </div>
                      ))}
                      <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "2px", whiteSpace: "nowrap" }}>
                        {wf.steps?.length || 0} step{(wf.steps?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap",
                      color: wf.priority >= 10 ? "#E11D48" : wf.priority >= 5 ? "#F59E0B" : "#10B981"
                    }}>
                      {wf.priority >= 10 ? "CRITICAL" : wf.priority >= 8 ? "HIGH" : wf.priority >= 5 ? "MEDIUM" : "LOW"} ({wf.priority})
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                      letterSpacing: "0.05em", whiteSpace: "nowrap",
                      background: wf.isActive ? "#ECFDF5" : "#F1F5F9",
                      color: wf.isActive ? "#10B981" : "#64748b"
                    }}>
                      {wf.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                        title="Edit workflow"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "30px", height: "30px", borderRadius: "6px", fontSize: "14px",
                          cursor: "pointer", flexShrink: 0,
                          background: "white", border: "1px solid #E2E8F0", color: "#1a2b4b"
                        }}
                      >✏️</button>
                      <button
                        onClick={() => deleteWorkflow(wf.id, wf.name)}
                        title="Delete workflow"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "30px", height: "30px", borderRadius: "6px", fontSize: "14px",
                          cursor: "pointer", flexShrink: 0,
                          background: "white", border: "1px solid #ffdad6", color: "#E11D48"
                        }}
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
