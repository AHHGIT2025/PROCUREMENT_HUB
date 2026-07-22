import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";

type Tab = "basic" | "conditions" | "steps" | "preview";

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<string[]>([]);
  const [roles, setRoles]         = useState<any[]>([]);
  const [groups, setGroups]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [form, setForm] = useState({
    name:        "",
    code:        "",
    description: "",
    entityType:  "PURCHASE_REQUEST",
    isDefault:   false,
    priority:    0,
    isActive:    true,
    companyId:   null as string | null,
    // ✅ NEW — Multiple Companies scope support
    scopeType:   "Global" as string,
    companyIds:  [] as string[],
    // ✅ NEW — "ANY" (default, existing behavior): workflow matches if ANY
    // one of its ItemCategory conditions is present in the request.
    // "ALL" (new): workflow matches ONLY if EVERY one of its ItemCategory
    // conditions is present — this is what lets you build a "combo"
    // workflow (e.g. Asset + IT) that only fires when a request genuinely
    // contains items from ALL the listed categories together.
    conditionMatchLogic: "ANY" as "ANY" | "ALL",
  });

  const [conditions, setConditions] = useState<any[]>([]);
  const [steps, setSteps]           = useState<any[]>([]);

  // Base data load — groups/companies/categories are global lookups,
  // roles are NOT fetched here anymore (see company-scoped effect below).
  useEffect(() => {
    api.get("/MaterialGroups").then(r => setGroups(r.data || []));
    api.get("/companies").then(r => setCompanies(r.data || []));
    api.get("/item-categories").then(r => setCategories(r.data?.data ?? r.data ?? []));
    if (isEdit) loadWorkflow();
  }, []);

  // ✅ CHANGE 1 — roles list depends on company scope.
  // - "All Companies" (form.companyId === null) → full active roles list (/roles)
  // - Specific company selected → only roles with an active user assigned
  //   to that company (/roles/by-company/{companyId})
  // Re-fetches whenever companyId changes, so switching scope on Basic Info
  // immediately updates what's selectable on the Steps tab.
  useEffect(() => {
    if (form.companyId) {
      api.get(`/roles/by-company/${form.companyId}`)
        .then(r => setRoles(r.data?.data || r.data || []))
        .catch(() => setRoles([]));
    } else {
      api.get("/roles")
        .then(r => setRoles(r.data?.data || r.data || []))
        .catch(() => setRoles([]));
    }
  }, [form.companyId]);

  // ✅ CHANGE 2 — reconcile already-selected step roles whenever the roles
  // list changes (e.g. after switching company scope). If a step currently
  // points to a roleId that no longer exists in the freshly-loaded roles
  // list, clear it so the form doesn't silently save a stale/invalid role.
  useEffect(() => {
    if (roles.length === 0 && steps.length === 0) return; // nothing to reconcile yet (initial mount)
    setSteps(prev => prev.map(s => {
      if (s.approverType === "ROLE" && s.roleId && !roles.some((r: any) => r.id === s.roleId)) {
        return { ...s, roleId: null, roleName: "" };
      }
      return s;
    }));
  }, [roles]);

  async function loadWorkflow() {
    try {
      const r = await api.get(`/workflows/${id}`);
      const wf = r.data?.data || r.data;
      setForm({
        name:        wf.name,
        code:        wf.code || "",
        description: wf.description || "",
        entityType:  wf.entityType,
        isDefault:   wf.isDefault,
        priority:    wf.priority,
        isActive:    wf.isActive,
        companyId:   wf.companyId,
        scopeType:   wf.scopeType || (wf.companyId ? "Single" : "Global"), // ✅ NEW
        companyIds:  wf.companyIds || [], // ✅ NEW
        conditionMatchLogic: wf.conditionMatchLogic || "ANY", // ✅ NEW
      });
      setConditions(wf.conditions || []);
      setSteps(wf.steps || []);
    } catch (err) {
      console.error(err);
    }
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Rule Name is required.");
    conditions.forEach((c, i) => {
      if (!c.value) errs.push(`Condition ${i + 1}: Please select a value.`);
    });
    if (steps.length === 0) errs.push("At least one approval step is required.");
    steps.forEach((s, i) => {
      if (!s.name.trim()) errs.push(`Step ${i + 1}: Step Name is required.`);
      if ((s.approverType === "ROLE" || s.approverType === "STORE_VERIFICATION") && !s.roleId) errs.push(`Step ${i + 1}: Role is required.`);
    });
    return errs;
  }

  // ✅ FIXED: this is now the ONLY function that persists the workflow to the
  // database. It is only ever called from the "Deploy Workflow" button on the
  // final Preview tab — never from a mid-configuration tab. This prevents a
  // half-finished workflow (e.g. just after clicking "Add Step") from being
  // saved as a real, live workflow rule that then shows up in the workflow list.
  async function save() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      setActiveTab("preview");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    try {
      setSaving(true);
      const payload = { ...form, conditions, steps };
      if (isEdit) {
        await api.put(`/workflows/${id}`, payload);
      } else {
        await api.post("/workflows", payload);
      }
      navigate("/workflows");
    } catch (err: any) {
      setErrors([err.response?.data?.message || "Save failed. Please try again."]);
    } finally {
      setSaving(false);
    }
  }

  function addCondition() {
    setConditions([...conditions, {
      field: "ItemCategory", operator: "EQUALS", value: "", valueType: "STRING"
    }]);
  }

  function updateCondition(i: number, key: string, val: string) {
    const updated = [...conditions];
    updated[i] = { ...updated[i], [key]: val };
    setConditions(updated);
  }

  function removeCondition(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  function addStep() {
    const nextOrder = steps.length > 0
      ? Math.max(...steps.map((s: any) => s.stepOrder)) + 1 : 1;
    setSteps([...steps, {
      stepOrder: nextOrder, name: "", roleName: "", roleId: null,
      approverType: "ROLE", stepType: "SEQUENTIAL", timeoutHours: 48, isRequired: true
    }]);
  }

  function updateStep(i: number, key: string, val: any) {
    const updated = [...steps];
    updated[i] = { ...updated[i], [key]: val };
    setSteps(updated);
  }

  function removeStep(i: number) {
    const updated = steps.filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, stepOrder: idx + 1 })); // re-number after removal
    setSteps(updated);
  }

  // ✅ move a step up or down in the sequence (no drag-and-drop library
  // needed — simple, reliable, works with keyboard/touch too).
  function moveStep(i: number, direction: -1 | 1) {
    const target = i + direction;
    if (target < 0 || target >= steps.length) return;
    const updated = [...steps];
    [updated[i], updated[target]] = [updated[target], updated[i]];
    // Re-number stepOrder to match the new visual sequence
    const renumbered = updated.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    setSteps(renumbered);
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "basic",      label: "Basic Info",     icon: "ℹ️" },
    { key: "conditions", label: "Conditions",     icon: "⚡" },
    { key: "steps",      label: "Approval Route", icon: "🔀" },
    { key: "preview",    label: "Preview & Test", icon: "▶️" },
  ];
  const tabOrder: Tab[] = ["basic", "conditions", "steps", "preview"];

  function goBack() {
    const idx = tabOrder.indexOf(activeTab);
    if (idx > 0) setActiveTab(tabOrder[idx - 1]);
  }
  function goNext() {
    const idx = tabOrder.indexOf(activeTab);
    if (idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
  }

  function renderValueInput(cond: any, i: number) {
    const hasError = !cond.value && errors.length > 0;
    const borderColor = hasError ? "#E11D48" : "#E2E8F0";

    if (cond.field === "ItemCategory") {
      return (
        <select value={cond.value} onChange={e => updateCondition(i, "value", e.target.value)}
          style={{ ...inputStyle, borderColor }}>
          <option value="">— Select Category —</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      );
    }
    if (cond.field === "ItemGroup") {
      return (
        <select value={cond.value} onChange={e => updateCondition(i, "value", e.target.value)}
          style={{ ...inputStyle, borderColor }}>
          <option value="">— Select Group —</option>
          {groups.map((g: any) => (
            <option key={g.id} value={g.name.toUpperCase()}>{g.name}</option>
          ))}
        </select>
      );
    }
    if (cond.field === "Department") {
      return (
        <select value={cond.value} onChange={e => updateCondition(i, "value", e.target.value)}
          style={{ ...inputStyle, borderColor }}>
          <option value="">— Select Department —</option>
          <option value="IT">IT</option>
          <option value="FINANCE">Finance</option>
          <option value="HR">HR</option>
          <option value="OPERATIONS">Operations</option>
          <option value="PROCUREMENT">Procurement</option>
          <option value="ADMINISTRATION">Administration</option>
        </select>
      );
    }
    if (cond.field === "TotalAmount") {
      return (
        <input type="number" value={cond.value}
          onChange={e => updateCondition(i, "value", e.target.value)}
          placeholder="e.g. 10000"
          style={{ ...inputStyle, borderColor }} />
      );
    }
    return (
      <input value={cond.value}
        onChange={e => updateCondition(i, "value", e.target.value)}
        placeholder="Enter value..."
        style={{ ...inputStyle, borderColor }} />
    );
  }

  // ✅ NEW — how many ItemCategory conditions are configured. The
  // ALL/ANY toggle only matters (and is only shown) when there are 2+,
  // since a single category condition behaves identically either way.
  const categoryConditionCount = conditions.filter(c => c.field === "ItemCategory").length;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* TOP BAR — no Save button here anymore, only Cancel + breadcrumb */}
      <div style={{
        background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#64748b" }}>
          <span style={{ cursor: "pointer", color: "#0051d5" }} onClick={() => navigate("/workflows")}>
            Workflow Management
          </span>
          <span>›</span>
          <span style={{ color: "#0b1c30", fontWeight: 500 }}>
            {isEdit ? "Edit Rule" : "Create Workflow Rule"}
          </span>
        </div>
        <button onClick={() => navigate("/workflows")} style={{
          padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
          fontWeight: 500, cursor: "pointer", background: "white",
          border: "1px solid #E2E8F0", color: "#64748b"
        }}>Cancel</button>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px",
          padding: "16px 24px", margin: "16px 32px"
        }}>
          <div style={{ fontWeight: 600, color: "#DC2626", marginBottom: "8px", fontSize: "14px" }}>
            ⚠️ Please fix the following errors:
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {errors.map((e, i) => (
              <li key={i} style={{ color: "#DC2626", fontSize: "13px", marginBottom: "4px" }}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", flex: 1 }}>

        {/* LEFT SIDEBAR */}
        <div style={{
          width: "240px", background: "white", borderRight: "1px solid #E2E8F0",
          padding: "24px 16px", flexShrink: 0
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>
            CONFIGURATION STEPS
          </div>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "6px", marginBottom: "4px",
              border: "none", cursor: "pointer", textAlign: "left", fontSize: "14px",
              background: activeTab === tab.key ? "#eff4ff" : "transparent",
              color: activeTab === tab.key ? "#1a2b4b" : "#44474e",
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
          <div style={{
            marginTop: "16px", padding: "10px 12px", background: "#FFFBEB",
            border: "1px solid #FDE68A", borderRadius: "6px", fontSize: "11px", color: "#92400E"
          }}>
            Nothing is saved until you click <strong>Deploy Workflow</strong> on the final Preview step.
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

          {/* ── BASIC INFO ─────────────────────────────────────────────── */}
          {activeTab === "basic" && (
            <div>
              <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
                Basic Information
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
                Define the identity and scope of this workflow rule.
              </p>
              <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                  <div>
                    <label style={labelStyle}>Rule Name <span style={{ color: "#E11D48" }}>*</span></label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. IT Hardware Requisition - Tier 1"
                      style={{ ...inputStyle, borderColor: !form.name.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }} />
                  </div>

                  <div>
                    <label style={labelStyle}>Rule Code</label>
                    <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. WF-IT-001"
                      style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace" }} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={3} placeholder="Describe the purpose and scope of this workflow..."
                      style={{ ...inputStyle, resize: "vertical" as const }} />
                  </div>

                 <div>
  <label style={labelStyle}>Priority</label>
  <input
    type="number"
    value={form.priority}
    onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
    placeholder="e.g. 10"
    style={inputStyle}
  />
  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
    Higher number = higher priority. Common existing values: Global flows = 5, Company-specific single-category flows = 8–10. Set this combo workflow higher (e.g. 15) so it wins over both.
  </div>
</div>
                  <div>
                    <label style={labelStyle}>Entity Type</label>
                    <select value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} style={inputStyle}>
                      <option value="PURCHASE_REQUEST">Purchase Request</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Company Scope</label>
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <button type="button" onClick={() => setForm({ ...form, companyId: null, scopeType: "Global", companyIds: [] })} style={{
                        padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                        background: form.scopeType === "Global" ? "#1a2b4b" : "white",
                        color: form.scopeType === "Global" ? "white" : "#64748b",
                        border: form.scopeType === "Global" ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
                      }}>🌐 All Companies</button>
                      <button type="button" onClick={() => setForm({ ...form, companyId: companies[0]?.id || "", scopeType: "Single", companyIds: [] })} style={{
                        padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                        background: form.scopeType === "Single" ? "#1a2b4b" : "white",
                        color: form.scopeType === "Single" ? "white" : "#64748b",
                        border: form.scopeType === "Single" ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
                      }}>🏢 Specific Company</button>
                      <button type="button" onClick={() => setForm({ ...form, companyId: null, scopeType: "Multiple" })} style={{
                        padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                        background: form.scopeType === "Multiple" ? "#1a2b4b" : "white",
                        color: form.scopeType === "Multiple" ? "white" : "#64748b",
                        border: form.scopeType === "Multiple" ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
                      }}>🏘️ Multiple Companies</button>
                    </div>
                    {form.scopeType === "Single" && (
                      <select value={form.companyId || ""} onChange={e => setForm({ ...form, companyId: e.target.value || null })}
                        style={{ ...inputStyle, marginTop: "8px" }}>
                        <option value="">Select Company</option>
                        {companies.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    )}
                    {form.scopeType === "Multiple" && (
                      <div style={{
                        marginTop: "8px", maxHeight: "220px", overflowY: "auto",
                        border: "1px solid #E2E8F0", borderRadius: "6px", padding: "10px"
                      }}>
                        {companies.map((c: any) => {
                          const selected = (form.companyIds || []).includes(c.id);
                          return (
                            <label key={c.id} style={{
                              display: "flex", alignItems: "center", gap: "8px",
                              padding: "6px 4px", fontSize: "13px", cursor: "pointer"
                            }}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const current: string[] = form.companyIds || [];
                                  const next = selected
                                    ? current.filter((cid: string) => cid !== c.id)
                                    : [...current, c.id];
                                  setForm({ ...form, companyIds: next });
                                }}
                              />
                              {c.code} - {c.name}
                            </label>
                          );
                        })}
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                          {(form.companyIds || []).length} company(ies) selected
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                      {form.scopeType === "Multiple"
                        ? "This workflow applies only to the selected companies above"
                        : (form.scopeType === "Global" ? "This workflow applies to all companies" : "This workflow applies only to the selected company")}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                        <div onClick={() => setForm({ ...form, isActive: !form.isActive })} style={{
                          width: "44px", height: "24px", borderRadius: "12px", cursor: "pointer",
                          background: form.isActive ? "#10B981" : "#E2E8F0", position: "relative", transition: "background 0.2s"
                        }}>
                          <div style={{
                            position: "absolute", top: "2px", left: form.isActive ? "22px" : "2px",
                            width: "20px", height: "20px", borderRadius: "50%",
                            background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 500, color: form.isActive ? "#10B981" : "#64748b" }}>
                          {form.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Default Rule</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                        <input type="checkbox" checked={form.isDefault}
                          onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: "#1a2b4b" }} />
                        <span style={{ fontSize: "13px", color: "#64748b" }}>
                          Use as fallback when no category/group condition matches any other rule
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={goNext} style={nextBtnStyle}>Next: Conditions →</button>
              </div>
            </div>
          )}

          {/* ── CONDITIONS ─────────────────────────────────────────────── */}
          {activeTab === "conditions" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
                    Logic Configuration
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    Define when this workflow should trigger. Leave empty to match all requests.
                  </p>
                </div>
                <button onClick={addCondition} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
                }}>+ New Condition</button>
              </div>

              {/* ✅ NEW — ALL/ANY toggle. Only shown once there are 2+ Item
                  Category conditions, since it has no effect with 0 or 1. */}
              {categoryConditionCount >= 2 && (
                <div style={{
                  marginBottom: "16px", background: "#FFFBEB", border: "1px solid #FDE68A",
                  borderRadius: "8px", padding: "16px 20px"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400E", marginBottom: "10px" }}>
                    ⚡ {categoryConditionCount} Item Category conditions detected — how should they combine?
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={() => setForm({ ...form, conditionMatchLogic: "ANY" })} style={{
                      padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                      background: form.conditionMatchLogic === "ANY" ? "#1a2b4b" : "white",
                      color: form.conditionMatchLogic === "ANY" ? "white" : "#64748b",
                      border: form.conditionMatchLogic === "ANY" ? "1px solid #1a2b4b" : "1px solid #E2E8F0",
                      textAlign: "left"
                    }}>
                      Match ANY of these<br />
                      <span style={{ fontWeight: 400, fontSize: "11px", opacity: 0.85 }}>Fires if the request has even one of these categories</span>
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, conditionMatchLogic: "ALL" })} style={{
                      padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                      background: form.conditionMatchLogic === "ALL" ? "#1a2b4b" : "white",
                      color: form.conditionMatchLogic === "ALL" ? "white" : "#64748b",
                      border: form.conditionMatchLogic === "ALL" ? "1px solid #1a2b4b" : "1px solid #E2E8F0",
                      textAlign: "left"
                    }}>
                      Require ALL of these (Combo)<br />
                      <span style={{ fontWeight: 400, fontSize: "11px", opacity: 0.85 }}>Fires only if the request has every one of these categories together</span>
                    </button>
                  </div>
                </div>
              )}

              {conditions.length === 0 ? (
                <div style={{
                  background: "white", border: "2px dashed #E2E8F0", borderRadius: "8px",
                  padding: "48px", textAlign: "center", color: "#94a3b8"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚡</div>
                  <div style={{ fontWeight: 500, color: "#64748b" }}>No conditions defined</div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>This rule will match ALL requests (use when IsDefault = true)</div>
                  <button onClick={addCondition} style={{ ...nextBtnStyle, marginTop: "16px" }}>+ Add First Condition</button>
                </div>
              ) : (
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
                  {conditions.map((cond, i) => (
                    <div key={i}>
                      {i > 0 && (
                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                          <span style={{
                            padding: "3px 12px", borderRadius: "999px", fontSize: "11px",
                            fontWeight: 700, background: "#eff4ff", color: "#1a2b4b", letterSpacing: "0.08em"
                          }}>
                            {cond.field === "ItemCategory" && conditions[i - 1]?.field === "ItemCategory"
                              ? (form.conditionMatchLogic === "ALL" ? "AND" : "OR")
                              : "AND"}
                          </span>
                        </div>
                      )}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 180px 1fr 40px",
                        gap: "12px", alignItems: "end", padding: "16px",
                        background: "#f8fafc", borderRadius: "6px",
                        border: `1px solid ${!cond.value && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`
                      }}>
                        <div>
                          <label style={labelStyle}>Field</label>
                          <select
                            value={cond.field}
                            onChange={e => {
                              const updated = [...conditions];
                              updated[i] = { ...updated[i], field: e.target.value, value: "" };
                              setConditions(updated);
                            }}
                            style={inputStyle}
                          >
                            <option value="ItemCategory">Item Category</option>
                            <option value="ItemGroup">Material Group (Legacy)</option>
                            <option value="TotalAmount">Request Amount</option>
                            <option value="Department">Department</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Operator</label>
                          <select value={cond.operator} onChange={e => updateCondition(i, "operator", e.target.value)} style={inputStyle}>
                            <option value="EQUALS">Equals</option>
                            <option value="NOT_EQUALS">Not Equals</option>
                            <option value="GREATER_THAN">Greater Than</option>
                            <option value="LESS_THAN">Less Than</option>
                            <option value="IN">In List</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Value <span style={{ color: "#E11D48" }}>*</span></label>
                          {renderValueInput(cond, i)}
                        </div>

                        <div style={{ paddingBottom: "1px" }}>
                          <button onClick={() => removeCondition(i)} style={{
                            width: "32px", height: "36px", borderRadius: "4px",
                            border: "1px solid #ffdad6", background: "white",
                            color: "#E11D48", cursor: "pointer", fontSize: "16px"
                          }}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {conditions.length > 0 && (
                <div style={{ marginTop: "16px", background: "#0b1c30", borderRadius: "8px", padding: "16px 20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#8293b8", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    NATURAL LANGUAGE LOGIC
                  </div>
                  <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#e2e8f0", lineHeight: "1.6" }}>
                    IF<br />
                    {conditions.map((c, i) => {
                      const prevIsSameCategoryGroup = i > 0 && c.field === "ItemCategory" && conditions[i - 1]?.field === "ItemCategory";
                      const joiner = prevIsSameCategoryGroup
                        ? (form.conditionMatchLogic === "ALL" ? "AND" : "OR")
                        : "AND";
                      return (
                        <span key={i}>
                          &nbsp;&nbsp;{c.field} {c.operator}{" "}
                          <span style={{ color: "#F59E0B" }}>"{c.value || "?"}"</span>
                          {i < conditions.length - 1 ? <><br />&nbsp;&nbsp;<span style={{ color: "#8293b8" }}>{joiner}</span></> : ""}
                          <br />
                        </span>
                      );
                    })}
                  </code>
                </div>
              )}

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
                <button onClick={goBack} style={backBtnStyle}>← Back</button>
                <button onClick={goNext} style={nextBtnStyle}>Next: Approval Route →</button>
              </div>
            </div>
          )}

          {/* ── STEPS ──────────────────────────────────────────────────── */}
          {activeTab === "steps" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
                    Approval Route
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    Define the sequence of approval stages. Use ↑ ↓ to reorder.
                  </p>
                </div>
                <button onClick={addStep} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
                }}>+ Add Step</button>
              </div>

              {steps.length === 0 ? (
                <div style={{
                  background: "white",
                  border: `2px dashed ${errors.some(e => e.includes("step")) ? "#FECACA" : "#E2E8F0"}`,
                  borderRadius: "8px", padding: "48px", textAlign: "center"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔀</div>
                  <div style={{ fontWeight: 500, color: errors.some(e => e.includes("step")) ? "#DC2626" : "#64748b" }}>
                    {errors.some(e => e.includes("step")) ? "⚠️ At least one step is required" : "No steps defined"}
                  </div>
                  <button onClick={addStep} style={{ ...nextBtnStyle, marginTop: "16px" }}>+ Add First Step</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
                      {/* Step number + reorder controls */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "48px", flexShrink: 0 }}>
                        <button
                          onClick={() => moveStep(i, -1)}
                          disabled={i === 0}
                          title="Move up"
                          style={{
                            border: "none", background: "transparent", cursor: i === 0 ? "default" : "pointer",
                            color: i === 0 ? "#E2E8F0" : "#64748b", fontSize: "14px", padding: "2px", lineHeight: 1
                          }}
                        >▲</button>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "#1a2b4b", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, zIndex: 1, margin: "2px 0"
                        }}>{i + 1}</div>
                        <button
                          onClick={() => moveStep(i, 1)}
                          disabled={i === steps.length - 1}
                          title="Move down"
                          style={{
                            border: "none", background: "transparent",
                            cursor: i === steps.length - 1 ? "default" : "pointer",
                            color: i === steps.length - 1 ? "#E2E8F0" : "#64748b", fontSize: "14px", padding: "2px", lineHeight: 1
                          }}
                        >▼</button>
                        {i < steps.length - 1 && (
                          <div style={{ width: "2px", flex: 1, background: "#E2E8F0", margin: "4px 0" }} />
                        )}
                      </div>
                      <div style={{
                        flex: 1, background: "white",
                        border: `1px solid ${(!step.name.trim() || (step.approverType === "ROLE" && !step.roleId)) && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`,
                        borderRadius: "8px", padding: "16px", marginBottom: "12px", marginLeft: "12px"
                      }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
                          <div>
                            <label style={labelStyle}>Step Name <span style={{ color: "#E11D48" }}>*</span></label>
                            <input value={step.name} onChange={e => updateStep(i, "name", e.target.value)}
                              placeholder="e.g. Manager Approval"
                              style={{ ...inputStyle, borderColor: !step.name.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }} />
                          </div>
                          <div>
                            <label style={labelStyle}>Approver Type</label>
                            <select value={step.approverType} onChange={e => updateStep(i, "approverType", e.target.value)} style={inputStyle}>
                              <option value="DEPARTMENT_MANAGER">Department Manager (requester's own reporting manager)</option>
                              <option value="ROLE">Role Based (company-level fixed role)</option>
                              <option value="STORE_VERIFICATION">Store Verification (stock check before continuing)</option>
                            </select>
                          </div>
                          {(step.approverType === "ROLE" || step.approverType === "STORE_VERIFICATION") ? (
                            <div>
                              <label style={labelStyle}>Role <span style={{ color: "#E11D48" }}>*</span></label>
                              <select value={step.roleId || ""}
                                onChange={e => {
                                  const role = roles.find((r: any) => r.id === e.target.value);
                                  const updated = [...steps];
                                  updated[i] = { ...updated[i], roleId: e.target.value, roleName: role?.name || "" };
                                  setSteps(updated);
                                }}
                                style={{ ...inputStyle, borderColor: !step.roleId && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}>
                                <option value="">Select Role…</option>
                                {roles.map((r: any) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label style={labelStyle}>Resolver</label>
                              <input disabled value="Auto — from requester's User Profile"
                                style={{ ...inputStyle, background: "#f8fafc", color: "#64748b" }} />
                            </div>
                          )}
                          <div>
                            <button onClick={() => removeStep(i)} style={{
                              padding: "8px 12px", borderRadius: "4px",
                              border: "1px solid #ffdad6", background: "white",
                              color: "#E11D48", cursor: "pointer", fontSize: "13px"
                            }}>Remove</button>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <label style={{ fontSize: "12px", color: "#64748b" }}>Timeout (hours)</label>
                            <input type="number" value={step.timeoutHours}
                              onChange={e => updateStep(i, "timeoutHours", Number(e.target.value))}
                              style={{ ...inputStyle, width: "80px", padding: "4px 8px" }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input type="checkbox" checked={step.isRequired}
                              onChange={e => updateStep(i, "isRequired", e.target.checked)}
                              style={{ accentColor: "#1a2b4b" }} />
                            <label style={{ fontSize: "12px", color: "#64748b" }}>Required</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
                <button onClick={goBack} style={backBtnStyle}>← Back</button>
                <button onClick={goNext} style={nextBtnStyle}>Preview & Test →</button>
              </div>
            </div>
          )}

          {/* ── PREVIEW ────────────────────────────────────────────────── */}
          {activeTab === "preview" && (
            <div>
              <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
                Preview & Summary
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
                Review your workflow configuration. Nothing is saved until you click Deploy below.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>BASIC INFO</div>
                  {[
                    { label: "Rule Name", value: form.name || "—" },
                    { label: "Rule Code", value: form.code || "—", mono: true },
                    { label: "Priority",  value: form.priority },
                    { label: "Scope",     value: form.scopeType === "Multiple"
                        ? `${(form.companyIds || []).length} companies: ` + (form.companyIds || []).map((cid: string) => companies.find((c: any) => c.id === cid)?.code).filter(Boolean).join(", ")
                        : (form.companyId ? companies.find(c => c.id === form.companyId)?.name ?? "Specific Company" : "All Companies") },
                    { label: "Default",   value: form.isDefault ? "Yes" : "No" },
                    { label: "Status",    value: form.isActive ? "Active" : "Inactive" },
                    // ✅ NEW — only show when it's actually meaningful (2+ category conditions)
                    ...(categoryConditionCount >= 2
                      ? [{ label: "Category Match Logic", value: form.conditionMatchLogic === "ALL" ? "ALL required (Combo)" : "ANY (first match wins)" }]
                      : []),
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{item.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0b1c30", fontFamily: (item as any).mono ? "JetBrains Mono, monospace" : "inherit" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>
                    CONDITIONS ({conditions.length})
                  </div>
                  {conditions.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>No conditions — matches all requests</p>
                  ) : conditions.map((c, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "4px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#64748b" }}>{c.field}</span>
                      <span style={{ color: "#94a3b8", margin: "0 6px" }}>{c.operator}</span>
                      <span style={{ fontWeight: 600, color: "#1a2b4b" }}>
                        {c.field === "ItemCategory"
                          ? categories.find((cat: any) => cat.code === c.value)?.name ?? c.value
                          : c.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ gridColumn: "1 / -1", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "16px" }}>
                    APPROVAL ROUTE ({steps.length} steps)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
                    {steps.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>No steps defined</p>
                    ) : steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{
                          background: "#eff4ff", border: "2px solid #1a2b4b",
                          borderRadius: "8px", padding: "12px 16px", minWidth: "140px", textAlign: "center"
                        }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#8293b8", letterSpacing: "0.1em" }}>
                            STAGE {String(i + 1).padStart(2, "0")}
                          </div>
                          <div style={{ fontWeight: 600, color: "#0b1c30", marginTop: "4px", fontSize: "14px" }}>
                            {step.name || `Step ${i + 1}`}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                            {step.approverType === "DEPARTMENT_MANAGER" ? "Dept Manager" : step.roleName || "Role Based"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>⏱ {step.timeoutHours}h SLA</div>
                        </div>
                        {i < steps.length - 1 && (
                          <div style={{ display: "flex", alignItems: "center", margin: "0 8px" }}>
                            <div style={{ width: "32px", height: "2px", background: "#E2E8F0" }} />
                            <div style={{ fontSize: "16px", color: "#94a3b8" }}>→</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
                <button onClick={goBack} style={backBtnStyle}>← Back to Steps</button>
                <button onClick={save} disabled={saving} style={{
                  padding: "10px 24px", borderRadius: "4px", fontSize: "14px",
                  fontWeight: 600, cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
                }}>{saving ? "Saving..." : "🚀 Deploy Workflow"}</button>
              </div>
            </div>
          )}

        </div>
      </div>
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

const nextBtnStyle: React.CSSProperties = {
  padding: "10px 20px", borderRadius: "4px", fontSize: "13px",
  fontWeight: 500, cursor: "pointer", background: "#0051d5",
  color: "white", border: "none"
};

const backBtnStyle: React.CSSProperties = {
  padding: "10px 20px", borderRadius: "4px", fontSize: "13px",
  fontWeight: 500, cursor: "pointer", background: "white",
  border: "1px solid #E2E8F0", color: "#64748b"
};
