// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../../api/client";

// type Tab = "basic" | "conditions" | "steps" | "preview";

// export default function WorkflowBuilder() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const isEdit = !!id;

//   const [activeTab, setActiveTab] = useState<Tab>("basic");
//   const [saving, setSaving]       = useState(false);
//   const [errors, setErrors]       = useState<string[]>([]);
//   const [roles, setRoles]         = useState<any[]>([]);
//   const [groups, setGroups]       = useState<any[]>([]);
//   const [categories, setCategories] = useState<any[]>([]);
//   const [companies, setCompanies] = useState<any[]>([]);

//   const [form, setForm] = useState({
//     name:        "",
//     code:        "",
//     description: "",
//     entityType:  "PURCHASE_REQUEST",
//     isDefault:   false,
//     priority:    0,
//     isActive:    true,
//     companyId:   null as string | null,
//   });

//   const [conditions, setConditions] = useState<any[]>([]);
//   const [steps, setSteps]           = useState<any[]>([]);

//   useEffect(() => {
//     api.get("/roles").then(r => setRoles(r.data?.data || r.data || []));
//     api.get("/MaterialGroups").then(r => setGroups(r.data || []));
//     api.get("/companies").then(r => setCompanies(r.data || []));
//     api.get("/item-categories").then(r => setCategories(r.data?.data ?? r.data ?? []));
//     if (isEdit) loadWorkflow();
//   }, []);

//   async function loadWorkflow() {
//     try {
//       const r = await api.get(`/workflows/${id}`);
//       const wf = r.data?.data || r.data;
//       setForm({
//         name:        wf.name,
//         code:        wf.code || "",
//         description: wf.description || "",
//         entityType:  wf.entityType,
//         isDefault:   wf.isDefault,
//         priority:    wf.priority,
//         isActive:    wf.isActive,
//         companyId:   wf.companyId,
//       });
//       setConditions(wf.conditions || []);
//       setSteps(wf.steps || []);
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   // ── Validation ──────────────────────────────────────────────────────────
//   function validate(): string[] {
//     const errs: string[] = [];

//     if (!form.name.trim())
//       errs.push("Rule Name is required.");

//     // Conditions: every condition must have a value
//     conditions.forEach((c, i) => {
//       if (!c.value || !c.value.trim())
//   errs.push(`Condition ${i + 1}: Please select a value.`);
//     });

//     // Steps: must have at least one step
//     if (steps.length === 0)
//       errs.push("At least one approval step is required.");

//     steps.forEach((s, i) => {
//       if (!s.name.trim())
//         errs.push(`Step ${i + 1}: Step Name is required.`);
//       if (s.approverType === "ROLE" && !s.roleId)
//         errs.push(`Step ${i + 1}: Role is required for Role-based approver type.`);
//     });

//     return errs;
//   }

//   async function save() {
//     const errs = validate();
//     if (errs.length > 0) {
//       setErrors(errs);
//       window.scrollTo({ top: 0, behavior: "smooth" });
//       return;
//     }
//     setErrors([]);
//     try {
//       setSaving(true);
//       const payload = { ...form, conditions, steps };
//       if (isEdit) {
//         await api.put(`/workflows/${id}`, payload);
//       } else {
//         await api.post("/workflows", payload);
//       }
//       navigate("/workflows");
//     } catch (err: any) {
//       setErrors([err.response?.data?.message || "Save failed. Please try again."]);
//     } finally {
//       setSaving(false);
//     }
//   }

//   function addCondition() {
//     setConditions([...conditions, {
//       field: "ItemCategory", operator: "EQUALS", value: "", valueType: "STRING"
//     }]);
//   }

//   function updateCondition(i: number, key: string, val: string) {
//     const updated = [...conditions];
//     updated[i] = { ...updated[i], [key]: val };
//     setConditions(updated);
//   }

//   function removeCondition(i: number) {
//     setConditions(conditions.filter((_, idx) => idx !== i));
//   }

//   function addStep() {
//     const nextOrder = steps.length > 0
//       ? Math.max(...steps.map((s: any) => s.stepOrder)) + 1
//       : 1;
//     setSteps([...steps, {
//       stepOrder: nextOrder, name: "", roleName: "", roleId: null,
//       approverType: "ROLE", stepType: "SEQUENTIAL", timeoutHours: 48, isRequired: true
//     }]);
//   }

//   function updateStep(i: number, key: string, val: any) {
//     const updated = [...steps];
//     updated[i] = { ...updated[i], [key]: val };
//     setSteps(updated);
//   }

//   function removeStep(i: number) {
//     setSteps(steps.filter((_, idx) => idx !== i));
//   }

//   const tabs: { key: Tab; label: string; icon: string }[] = [
//     { key: "basic",      label: "Basic Info",    icon: "ℹ️" },
//     { key: "conditions", label: "Conditions",    icon: "⚡" },
//     { key: "steps",      label: "Approval Route",icon: "🔀" },
//     { key: "preview",    label: "Preview & Test",icon: "▶️" },
//   ];

//   return (
//     <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

//       {/* TOP BAR */}
//       <div style={{
//         background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 32px",
//         display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px"
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#64748b" }}>
//           <span style={{ cursor: "pointer", color: "#0051d5" }} onClick={() => navigate("/workflows")}>
//             Workflow Management
//           </span>
//           <span>›</span>
//           <span style={{ color: "#0b1c30", fontWeight: 500 }}>
//             {isEdit ? "Edit Rule" : "Create Workflow Rule"}
//           </span>
//         </div>
//         <div style={{ display: "flex", gap: "12px" }}>
//           <button onClick={() => navigate("/workflows")} style={{
//             padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
//             fontWeight: 500, cursor: "pointer", background: "white",
//             border: "1px solid #E2E8F0", color: "#64748b"
//           }}>
//             Cancel
//           </button>
//           <button onClick={save} disabled={saving} style={{
//             padding: "8px 20px", borderRadius: "4px", fontSize: "13px",
//             fontWeight: 500, cursor: "pointer", background: "#1a2b4b",
//             color: "white", border: "none", opacity: saving ? 0.7 : 1
//           }}>
//             {saving ? "Saving..." : "Save Changes"}
//           </button>
//         </div>
//       </div>

//       {/* Validation errors banner */}
//       {errors.length > 0 && (
//         <div style={{
//           background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px",
//           padding: "16px 24px", margin: "16px 32px"
//         }}>
//           <div style={{ fontWeight: 600, color: "#DC2626", marginBottom: "8px", fontSize: "14px" }}>
//             ⚠️ Please fix the following errors:
//           </div>
//           <ul style={{ margin: 0, paddingLeft: "20px" }}>
//             {errors.map((e, i) => (
//               <li key={i} style={{ color: "#DC2626", fontSize: "13px", marginBottom: "4px" }}>{e}</li>
//             ))}
//           </ul>
//         </div>
//       )}

//       <div style={{ display: "flex", flex: 1 }}>

//         {/* LEFT SIDEBAR */}
//         <div style={{
//           width: "240px", background: "white", borderRight: "1px solid #E2E8F0",
//           padding: "24px 16px", flexShrink: 0
//         }}>
//           <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>
//             CONFIGURATION STEPS
//           </div>
//           {tabs.map((tab) => (
//             <button
//               key={tab.key}
//               onClick={() => setActiveTab(tab.key)}
//               style={{
//                 width: "100%", display: "flex", alignItems: "center", gap: "10px",
//                 padding: "10px 12px", borderRadius: "6px", marginBottom: "4px",
//                 border: "none", cursor: "pointer", textAlign: "left", fontSize: "14px",
//                 background: activeTab === tab.key ? "#eff4ff" : "transparent",
//                 color: activeTab === tab.key ? "#1a2b4b" : "#44474e",
//                 fontWeight: activeTab === tab.key ? 600 : 400,
//               }}
//             >
//               <span>{tab.icon}</span>
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         {/* MAIN CONTENT */}
//         <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

//           {/* ── BASIC INFO TAB ─────────────────────────────────────────── */}
//           {activeTab === "basic" && (
//             <div>
//               <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
//                 Basic Information
//               </h2>
//               <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
//                 Define the identity and scope of this workflow rule.
//               </p>

//               <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
//                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

//                   <div>
//                     <label style={labelStyle}>Rule Name <span style={{ color: "#E11D48" }}>*</span></label>
//                     <input
//                       value={form.name}
//                       onChange={e => setForm({ ...form, name: e.target.value })}
//                       placeholder="e.g. IT Hardware Requisition - Tier 1"
//                       style={{ ...inputStyle, borderColor: !form.name.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}
//                     />
//                   </div>

//                   <div>
//                     <label style={labelStyle}>Rule Code</label>
//                     <input
//                       value={form.code}
//                       onChange={e => setForm({ ...form, code: e.target.value })}
//                       placeholder="e.g. WF-IT-001"
//                       style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace" }}
//                     />
//                   </div>

//                   <div style={{ gridColumn: "1 / -1" }}>
//                     <label style={labelStyle}>Description</label>
//                     <textarea
//                       value={form.description}
//                       onChange={e => setForm({ ...form, description: e.target.value })}
//                       rows={3}
//                       placeholder="Describe the purpose and scope of this workflow..."
//                       style={{ ...inputStyle, resize: "vertical" as const }}
//                     />
//                   </div>

//                   <div>
//                     <label style={labelStyle}>Priority</label>
//                     <select value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} style={inputStyle}>
//                       <option value={0}>Low (0)</option>
//                       <option value={5}>Medium (5)</option>
//                       <option value={8}>High (8)</option>
//                       <option value={10}>Critical (10)</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label style={labelStyle}>Entity Type</label>
//                     <select value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} style={inputStyle}>
//                       <option value="PURCHASE_REQUEST">Purchase Request</option>
//                     </select>
//                   </div>

//                   <div style={{ gridColumn: "1 / -1" }}>
//                     <label style={labelStyle}>Company Scope</label>
//                     <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
//                       <button type="button" onClick={() => setForm({ ...form, companyId: null })} style={{
//                         padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
//                         fontWeight: 500, cursor: "pointer",
//                         background: !form.companyId ? "#1a2b4b" : "white",
//                         color: !form.companyId ? "white" : "#64748b",
//                         border: !form.companyId ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
//                       }}>
//                         🌐 All Companies
//                       </button>
//                       <button type="button" onClick={() => setForm({ ...form, companyId: companies[0]?.id || "" })} style={{
//                         padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
//                         fontWeight: 500, cursor: "pointer",
//                         background: form.companyId ? "#1a2b4b" : "white",
//                         color: form.companyId ? "white" : "#64748b",
//                         border: form.companyId ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
//                       }}>
//                         🏢 Specific Company
//                       </button>
//                     </div>
//                     {form.companyId !== null && (
//                       <select
//                         value={form.companyId || ""}
//                         onChange={e => setForm({ ...form, companyId: e.target.value || null })}
//                         style={{ ...inputStyle, marginTop: "8px" }}
//                       >
//                         <option value="">Select Company</option>
//                         {companies.map((c: any) => (
//                           <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
//                         ))}
//                       </select>
//                     )}
//                     <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
//                       {!form.companyId
//                         ? "This workflow applies to all companies"
//                         : "This workflow applies only to the selected company"}
//                     </div>
//                   </div>

//                   <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                     <div>
//                       <label style={labelStyle}>Status</label>
//                       <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
//                         <div onClick={() => setForm({ ...form, isActive: !form.isActive })} style={{
//                           width: "44px", height: "24px", borderRadius: "12px", cursor: "pointer",
//                           background: form.isActive ? "#10B981" : "#E2E8F0",
//                           position: "relative", transition: "background 0.2s"
//                         }}>
//                           <div style={{
//                             position: "absolute", top: "2px",
//                             left: form.isActive ? "22px" : "2px",
//                             width: "20px", height: "20px", borderRadius: "50%",
//                             background: "white", transition: "left 0.2s",
//                             boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
//                           }} />
//                         </div>
//                         <span style={{ fontSize: "14px", fontWeight: 500, color: form.isActive ? "#10B981" : "#64748b" }}>
//                           {form.isActive ? "Active" : "Inactive"}
//                         </span>
//                       </div>
//                     </div>

//                     <div style={{ marginLeft: "20px" }}>
//                       <label style={labelStyle}>Default Rule</label>
//                       <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
//                         <input
//                           type="checkbox"
//                           checked={form.isDefault}
//                           onChange={e => setForm({ ...form, isDefault: e.target.checked })}
//                           style={{ width: "16px", height: "16px", accentColor: "#1a2b4b" }}
//                         />
//                         <span style={{ fontSize: "13px", color: "#64748b" }}>
//                           Use as fallback when no other rule matches
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                 </div>
//               </div>

//               <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setActiveTab("conditions")} style={nextBtnStyle}>
//                   Next: Conditions →
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── CONDITIONS TAB ─────────────────────────────────────────── */}
//           {activeTab === "conditions" && (
//             <div>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
//                 <div>
//                   <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
//                     Logic Configuration
//                   </h2>
//                   <p style={{ color: "#64748b", fontSize: "14px" }}>
//                     Define when this workflow should trigger. Leave empty to match all requests.
//                   </p>
//                 </div>
//                 <button onClick={addCondition} style={{
//                   display: "flex", alignItems: "center", gap: "6px",
//                   padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
//                   fontWeight: 500, cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
//                 }}>
//                   + New Condition
//                 </button>
//               </div>

//               {conditions.length === 0 ? (
//                 <div style={{
//                   background: "white", border: "2px dashed #E2E8F0", borderRadius: "8px",
//                   padding: "48px", textAlign: "center", color: "#94a3b8"
//                 }}>
//                   <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚡</div>
//                   <div style={{ fontWeight: 500, color: "#64748b" }}>No conditions defined</div>
//                   <div style={{ fontSize: "13px", marginTop: "4px" }}>
//                     This rule will match ALL requests (use when IsDefault = true)
//                   </div>
//                   <button onClick={addCondition} style={{ ...nextBtnStyle, marginTop: "16px" }}>
//                     + Add First Condition
//                   </button>
//                 </div>
//               ) : (
//                 <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
//                   {conditions.map((cond, i) => (
//                     <div key={i}>
//                       {i > 0 && (
//                         <div style={{ textAlign: "center", padding: "8px 0" }}>
//                           <span style={{
//                             padding: "3px 12px", borderRadius: "999px", fontSize: "11px",
//                             fontWeight: 700, background: "#eff4ff", color: "#1a2b4b", letterSpacing: "0.08em"
//                           }}>AND</span>
//                         </div>
//                       )}
//                       <div style={{
//                         display: "grid", gridTemplateColumns: "1fr 180px 1fr 40px",
//                         gap: "12px", alignItems: "end",
//                         padding: "16px", background: "#f8fafc", borderRadius: "6px",
//                         // border: `1px solid ${!cond.value.trim() && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`
//                         border: `1px solid ${!cond.value && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`
//                       }}>
//                         {/* Field */}
//                         <div>
//                           <label style={labelStyle}>Field</label>
//                           <select
//                             value={cond.field}
//                             onChange={e => {
//                             const updated = [...conditions];
//                             updated[i] = { ...updated[i], field: e.target.value, value: "" };
//                             setConditions(updated);
//                             }}
//                             style={inputStyle}
//                           >
//                             <option value="ItemCategory">Item Category</option>
//                             <option value="ItemGroup">Material Group (Legacy)</option>
//                             <option value="TotalAmount">Request Amount</option>
//                             <option value="Department">Department</option>
//                           </select>
//                         </div>

//                         {/* Operator */}
//                         <div>
//                           <label style={labelStyle}>Operator</label>
//                           <select
//                             value={cond.operator}
//                             onChange={e => updateCondition(i, "operator", e.target.value)}
//                             style={inputStyle}
//                           >
//                             <option value="EQUALS">Equals</option>
//                             <option value="NOT_EQUALS">Not Equals</option>
//                             <option value="GREATER_THAN">Greater Than</option>
//                             <option value="LESS_THAN">Less Than</option>
//                             <option value="IN">In List</option>
//                           </select>
//                         </div>

//                         {/* Value */}
//                         <div>
//                           <label style={labelStyle}>
//                             Value <span style={{ color: "#E11D48" }}>*</span>
//                           </label>
//                           {cond.field === "ItemCategory" ? (
//                             <select
//                               value={cond.value}
//                               onChange={e => updateCondition(i, "value", e.target.value)}
//                               style={{ ...inputStyle, borderColor: !cond.value.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}
//                             >
//                               <option value="">Select Category…</option>
//                               {categories.map((c: any) => (
//                                 <option key={c.id} value={c.code}>{c.code} — {c.name}</option>
//                               ))}
//                             </select>
//                           ) : cond.field === "ItemGroup" ? (
//                             <select
//                               value={cond.value}
//                               onChange={e => updateCondition(i, "value", e.target.value)}
//                               style={inputStyle}
//                             >
//                               <option value="">Select Group…</option>
//                               {groups.map((g: any) => (
//                                 <option key={g.id} value={g.name.toUpperCase()}>{g.name}</option>
//                               ))}
//                             </select>
//                           ) : (
//                             <input
//                               value={cond.value}
//                               onChange={e => updateCondition(i, "value", e.target.value)}
//                               placeholder={cond.field === "TotalAmount" ? "e.g. 10000" : "Enter value..."}
//                               style={{ ...inputStyle, borderColor: !cond.value.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}
//                             />
//                           )}
//                         </div>

//                         {/* Remove */}
//                         <div style={{ paddingBottom: "1px" }}>
//                           <button onClick={() => removeCondition(i)} style={{
//                             width: "32px", height: "36px", borderRadius: "4px",
//                             border: "1px solid #ffdad6", background: "white",
//                             color: "#E11D48", cursor: "pointer", fontSize: "16px"
//                           }}>×</button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Natural language summary */}
//               {conditions.length > 0 && (
//                 <div style={{ marginTop: "16px", background: "#0b1c30", borderRadius: "8px", padding: "16px 20px" }}>
//                   <div style={{ fontSize: "11px", fontWeight: 600, color: "#8293b8", letterSpacing: "0.1em", marginBottom: "8px" }}>
//                     NATURAL LANGUAGE LOGIC
//                   </div>
//                   <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#e2e8f0", lineHeight: "1.6" }}>
//                     IF<br />
//                     {conditions.map((c, i) => (
//                       <span key={i}>
//                         &nbsp;&nbsp;{c.field} {c.operator}{" "}
//                         <span style={{ color: "#F59E0B" }}>"{c.value || "?"}"</span>
//                         {i < conditions.length - 1 ? (
//                           <><br />&nbsp;&nbsp;<span style={{ color: "#8293b8" }}>AND</span></>
//                         ) : ""}
//                         <br />
//                       </span>
//                     ))}
//                   </code>
//                 </div>
//               )}

//               <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setActiveTab("steps")} style={nextBtnStyle}>
//                   Next: Approval Route →
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── STEPS TAB ──────────────────────────────────────────────── */}
//           {activeTab === "steps" && (
//             <div>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
//                 <div>
//                   <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
//                     Approval Route
//                   </h2>
//                   <p style={{ color: "#64748b", fontSize: "14px" }}>
//                     Define the sequence of approval stages.
//                   </p>
//                 </div>
//                 <button onClick={addStep} style={{
//                   display: "flex", alignItems: "center", gap: "6px",
//                   padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
//                   fontWeight: 500, cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
//                 }}>
//                   + Add Step
//                 </button>
//               </div>

//               {steps.length === 0 ? (
//                 <div style={{
//                   background: "white",
//                   border: `2px dashed ${errors.some(e => e.includes("step")) ? "#FECACA" : "#E2E8F0"}`,
//                   borderRadius: "8px", padding: "48px", textAlign: "center"
//                 }}>
//                   <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔀</div>
//                   <div style={{ fontWeight: 500, color: errors.some(e => e.includes("step")) ? "#DC2626" : "#64748b" }}>
//                     {errors.some(e => e.includes("step")) ? "⚠️ At least one step is required" : "No steps defined"}
//                   </div>
//                   <button onClick={addStep} style={{ ...nextBtnStyle, marginTop: "16px" }}>
//                     + Add First Step
//                   </button>
//                 </div>
//               ) : (
//                 <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
//                   {steps.map((step, i) => (
//                     <div key={i} style={{ display: "flex", alignItems: "stretch", gap: "0" }}>
//                       <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "48px", flexShrink: 0 }}>
//                         <div style={{
//                           width: "36px", height: "36px", borderRadius: "50%",
//                           background: "#1a2b4b", color: "white",
//                           display: "flex", alignItems: "center", justifyContent: "center",
//                           fontSize: "13px", fontWeight: 700, flexShrink: 0, zIndex: 1
//                         }}>
//                           {i + 1}
//                         </div>
//                         {i < steps.length - 1 && (
//                           <div style={{ width: "2px", flex: 1, background: "#E2E8F0", margin: "4px 0" }} />
//                         )}
//                       </div>

//                       <div style={{
//                         flex: 1, background: "white",
//                         border: `1px solid ${(!step.name.trim() || (step.approverType === "ROLE" && !step.roleId)) && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`,
//                         borderRadius: "8px", padding: "16px", marginBottom: "12px", marginLeft: "12px"
//                       }}>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>

//                           <div>
//                             <label style={labelStyle}>Step Name <span style={{ color: "#E11D48" }}>*</span></label>
//                             <input
//                               value={step.name}
//                               onChange={e => updateStep(i, "name", e.target.value)}
//                               placeholder="e.g. Manager Approval"
//                               style={{ ...inputStyle, borderColor: !step.name.trim() && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}
//                             />
//                           </div>

//                           <div>
//                             <label style={labelStyle}>Approver Type</label>
//                             <select value={step.approverType} onChange={e => updateStep(i, "approverType", e.target.value)} style={inputStyle}>
//                               <option value="DEPARTMENT_MANAGER">Department Manager</option>
//                               <option value="ROLE">Role Based</option>
//                             </select>
//                           </div>

//                           {step.approverType === "ROLE" ? (
//                             <div>
//                               <label style={labelStyle}>Role <span style={{ color: "#E11D48" }}>*</span></label>
//                               <select
//                                 value={step.roleId || ""}
//                                 onChange={e => {
//                                   const role = roles.find((r: any) => r.id === e.target.value);
//                                   const updated = [...steps];
//                                   updated[i] = { ...updated[i], roleId: e.target.value, roleName: role?.name || "" };
//                                   setSteps(updated);
//                                 }}
//                                 style={{ ...inputStyle, borderColor: !step.roleId && errors.length > 0 ? "#E11D48" : "#E2E8F0" }}
//                               >
//                                 <option value="">Select Role…</option>
//                                 {roles.map((r: any) => (
//                                   <option key={r.id} value={r.id}>{r.name}</option>
//                                 ))}
//                               </select>
//                             </div>
//                           ) : (
//                             <div>
//                               <label style={labelStyle}>Resolver</label>
//                               <input disabled value="Auto — from User Profile" style={{ ...inputStyle, background: "#f8fafc", color: "#64748b" }} />
//                             </div>
//                           )}

//                           <div>
//                             <button onClick={() => removeStep(i)} style={{
//                               padding: "8px 12px", borderRadius: "4px",
//                               border: "1px solid #ffdad6", background: "white",
//                               color: "#E11D48", cursor: "pointer", fontSize: "13px"
//                             }}>
//                               Remove
//                             </button>
//                           </div>
//                         </div>

//                         <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
//                           <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                             <label style={{ fontSize: "12px", color: "#64748b" }}>Timeout (hours)</label>
//                             <input
//                               type="number"
//                               value={step.timeoutHours}
//                               onChange={e => updateStep(i, "timeoutHours", Number(e.target.value))}
//                               style={{ ...inputStyle, width: "80px", padding: "4px 8px" }}
//                             />
//                           </div>
//                           <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                             <input
//                               type="checkbox"
//                               checked={step.isRequired}
//                               onChange={e => updateStep(i, "isRequired", e.target.checked)}
//                               style={{ accentColor: "#1a2b4b" }}
//                             />
//                             <label style={{ fontSize: "12px", color: "#64748b" }}>Required</label>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
//                 <button onClick={() => setActiveTab("preview")} style={nextBtnStyle}>
//                   Preview & Test →
//                 </button>
//                 <button onClick={save} disabled={saving} style={{
//                   padding: "10px 24px", borderRadius: "4px", fontSize: "13px",
//                   fontWeight: 600, cursor: "pointer", background: "#10B981",
//                   color: "white", border: "none"
//                 }}>
//                   {saving ? "Saving..." : "💾 Save Workflow"}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── PREVIEW TAB ────────────────────────────────────────────── */}
//           {activeTab === "preview" && (
//             <div>
//               <h2 style={{ fontFamily: "Hanken Grotesk", fontSize: "22px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
//                 Preview & Summary
//               </h2>
//               <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
//                 Review your workflow configuration before saving.
//               </p>

//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

//                 {/* Basic Info */}
//                 <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
//                   <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>BASIC INFO</div>
//                   {[
//                     { label: "Rule Name",  value: form.name || "—" },
//                     { label: "Rule Code",  value: form.code || "—", mono: true },
//                     { label: "Priority",   value: form.priority },
//                     { label: "Scope",      value: form.companyId ? companies.find(c => c.id === form.companyId)?.name ?? "Specific Company" : "All Companies" },
//                     { label: "Default",    value: form.isDefault ? "Yes" : "No" },
//                     { label: "Status",     value: form.isActive ? "Active" : "Inactive" },
//                   ].map(item => (
//                     <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
//                       <span style={{ fontSize: "13px", color: "#64748b" }}>{item.label}</span>
//                       <span style={{
//                         fontSize: "13px", fontWeight: 500, color: "#0b1c30",
//                         fontFamily: (item as any).mono ? "JetBrains Mono, monospace" : "inherit"
//                       }}>{item.value}</span>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Conditions */}
//                 <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
//                   <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>
//                     CONDITIONS ({conditions.length})
//                   </div>
//                   {conditions.length === 0 ? (
//                     <p style={{ fontSize: "13px", color: "#94a3b8" }}>No conditions — matches all requests</p>
//                   ) : conditions.map((c, i) => (
//                     <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "4px", marginBottom: "8px", fontSize: "13px" }}>
//                       <span style={{ color: "#64748b" }}>{c.field}</span>
//                       <span style={{ color: "#94a3b8", margin: "0 6px" }}>{c.operator}</span>
//                       <span style={{ fontWeight: 600, color: "#1a2b4b" }}>
//                         {c.field === "ItemCategory"
//                           ? categories.find(cat => cat.code === c.value)?.name ?? c.value
//                           : c.value}
//                       </span>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Steps — full width */}
//                 <div style={{ gridColumn: "1 / -1", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
//                   <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "16px" }}>
//                     APPROVAL ROUTE ({steps.length} steps)
//                   </div>
//                   <div style={{ display: "flex", alignItems: "center", overflowX: "auto", gap: "0" }}>
//                     {steps.length === 0 ? (
//                       <p style={{ fontSize: "13px", color: "#94a3b8" }}>No steps defined</p>
//                     ) : steps.map((step, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "center" }}>
//                         <div style={{
//                           background: "#eff4ff", border: "2px solid #1a2b4b",
//                           borderRadius: "8px", padding: "12px 16px", minWidth: "140px", textAlign: "center"
//                         }}>
//                           <div style={{ fontSize: "10px", fontWeight: 700, color: "#8293b8", letterSpacing: "0.1em" }}>
//                             STAGE {String(i + 1).padStart(2, "0")}
//                           </div>
//                           <div style={{ fontWeight: 600, color: "#0b1c30", marginTop: "4px", fontSize: "14px" }}>
//                             {step.name || `Step ${i + 1}`}
//                           </div>
//                           <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
//                             {step.approverType === "DEPARTMENT_MANAGER" ? "Dept Manager" : step.roleName || "Role Based"}
//                           </div>
//                           <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
//                             ⏱ {step.timeoutHours}h SLA
//                           </div>
//                         </div>
//                         {i < steps.length - 1 && (
//                           <div style={{ display: "flex", alignItems: "center", margin: "0 8px" }}>
//                             <div style={{ width: "32px", height: "2px", background: "#E2E8F0" }} />
//                             <div style={{ fontSize: "16px", color: "#94a3b8" }}>→</div>
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//               </div>

//               <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
//                 <button onClick={() => setActiveTab("steps")} style={{
//                   padding: "10px 20px", borderRadius: "4px", fontSize: "13px",
//                   fontWeight: 500, cursor: "pointer", background: "white",
//                   border: "1px solid #E2E8F0", color: "#64748b"
//                 }}>
//                   ← Back to Steps
//                 </button>
//                 <button onClick={save} disabled={saving} style={{
//                   padding: "10px 24px", borderRadius: "4px", fontSize: "14px",
//                   fontWeight: 600, cursor: "pointer", background: "#1a2b4b",
//                   color: "white", border: "none"
//                 }}>
//                   {saving ? "Saving..." : "🚀 Deploy Workflow"}
//                 </button>
//               </div>
//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Shared styles ───────────────────────────────────────────────────────────
// const labelStyle: React.CSSProperties = {
//   display: "block", fontSize: "12px", fontWeight: 600,
//   color: "#44474e", marginBottom: "6px", letterSpacing: "0.02em"
// };

// const inputStyle: React.CSSProperties = {
//   width: "100%", padding: "8px 12px", borderRadius: "4px",
//   border: "1px solid #E2E8F0", fontSize: "14px", color: "#0b1c30",
//   background: "white", outline: "none", boxSizing: "border-box" as const,
//   fontFamily: "Inter, sans-serif"
// };

// const nextBtnStyle: React.CSSProperties = {
//   padding: "10px 20px", borderRadius: "4px", fontSize: "13px",
//   fontWeight: 500, cursor: "pointer", background: "#0051d5",
//   color: "white", border: "none"
// };
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
  });

  const [conditions, setConditions] = useState<any[]>([]);
  const [steps, setSteps]           = useState<any[]>([]);

  useEffect(() => {
    api.get("/roles").then(r => setRoles(r.data?.data || r.data || []));
    api.get("/MaterialGroups").then(r => setGroups(r.data || []));
    api.get("/companies").then(r => setCompanies(r.data || []));
    api.get("/item-categories").then(r => setCategories(r.data?.data ?? r.data ?? []));
    if (isEdit) loadWorkflow();
  }, []);

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
      if (s.approverType === "ROLE" && !s.roleId) errs.push(`Step ${i + 1}: Role is required.`);
    });
    return errs;
  }

  async function save() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
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
    setSteps(steps.filter((_, idx) => idx !== i));
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "basic",      label: "Basic Info",     icon: "ℹ️" },
    { key: "conditions", label: "Conditions",     icon: "⚡" },
    { key: "steps",      label: "Approval Route", icon: "🔀" },
    { key: "preview",    label: "Preview & Test", icon: "▶️" },
  ];

  // ── Value dropdown for condition ──────────────────────────────────────────
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

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* TOP BAR */}
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
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => navigate("/workflows")} style={{
            padding: "8px 16px", borderRadius: "4px", fontSize: "13px",
            fontWeight: 500, cursor: "pointer", background: "white",
            border: "1px solid #E2E8F0", color: "#64748b"
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "8px 20px", borderRadius: "4px", fontSize: "13px",
            fontWeight: 500, cursor: "pointer", background: "#1a2b4b",
            color: "white", border: "none", opacity: saving ? 0.7 : 1
          }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
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
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} style={inputStyle}>
                      <option value={0}>Low (0)</option>
                      <option value={5}>Medium (5)</option>
                      <option value={8}>High (8)</option>
                      <option value={10}>Critical (10)</option>
                    </select>
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
                      <button type="button" onClick={() => setForm({ ...form, companyId: null })} style={{
                        padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                        background: !form.companyId ? "#1a2b4b" : "white",
                        color: !form.companyId ? "white" : "#64748b",
                        border: !form.companyId ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
                      }}>🌐 All Companies</button>
                      <button type="button" onClick={() => setForm({ ...form, companyId: companies[0]?.id || "" })} style={{
                        padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                        background: form.companyId ? "#1a2b4b" : "white",
                        color: form.companyId ? "white" : "#64748b",
                        border: form.companyId ? "1px solid #1a2b4b" : "1px solid #E2E8F0"
                      }}>🏢 Specific Company</button>
                    </div>
                    {form.companyId !== null && (
                      <select value={form.companyId || ""} onChange={e => setForm({ ...form, companyId: e.target.value || null })}
                        style={{ ...inputStyle, marginTop: "8px" }}>
                        <option value="">Select Company</option>
                        {companies.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    )}
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                      {!form.companyId ? "This workflow applies to all companies" : "This workflow applies only to the selected company"}
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
                        <span style={{ fontSize: "13px", color: "#64748b" }}>Use as fallback when no other rule matches</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setActiveTab("conditions")} style={nextBtnStyle}>Next: Conditions →</button>
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
                          }}>AND</span>
                        </div>
                      )}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 180px 1fr 40px",
                        gap: "12px", alignItems: "end", padding: "16px",
                        background: "#f8fafc", borderRadius: "6px",
                        border: `1px solid ${!cond.value && errors.length > 0 ? "#FECACA" : "#E2E8F0"}`
                      }}>
                        {/* Field */}
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

                        {/* Operator */}
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

                        {/* Value */}
                        <div>
                          <label style={labelStyle}>Value <span style={{ color: "#E11D48" }}>*</span></label>
                          {renderValueInput(cond, i)}
                        </div>

                        {/* Remove */}
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
                    {conditions.map((c, i) => (
                      <span key={i}>
                        &nbsp;&nbsp;{c.field} {c.operator}{" "}
                        <span style={{ color: "#F59E0B" }}>"{c.value || "?"}"</span>
                        {i < conditions.length - 1 ? <><br />&nbsp;&nbsp;<span style={{ color: "#8293b8" }}>AND</span></> : ""}
                        <br />
                      </span>
                    ))}
                  </code>
                </div>
              )}

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setActiveTab("steps")} style={nextBtnStyle}>Next: Approval Route →</button>
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
                  <p style={{ color: "#64748b", fontSize: "14px" }}>Define the sequence of approval stages.</p>
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
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "48px", flexShrink: 0 }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "#1a2b4b", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, zIndex: 1
                        }}>{i + 1}</div>
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
                              <option value="DEPARTMENT_MANAGER">Department Manager</option>
                              <option value="ROLE">Role Based</option>
                            </select>
                          </div>
                          {step.approverType === "ROLE" ? (
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
                              <input disabled value="Auto — from User Profile"
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

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={() => setActiveTab("preview")} style={nextBtnStyle}>Preview & Test →</button>
                <button onClick={save} disabled={saving} style={{
                  padding: "10px 24px", borderRadius: "4px", fontSize: "13px",
                  fontWeight: 600, cursor: "pointer", background: "#10B981", color: "white", border: "none"
                }}>{saving ? "Saving..." : "💾 Save Workflow"}</button>
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
                Review your workflow configuration before saving.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>BASIC INFO</div>
                  {[
                    { label: "Rule Name", value: form.name || "—" },
                    { label: "Rule Code", value: form.code || "—", mono: true },
                    { label: "Priority",  value: form.priority },
                    { label: "Scope",     value: form.companyId ? companies.find(c => c.id === form.companyId)?.name ?? "Specific Company" : "All Companies" },
                    { label: "Default",   value: form.isDefault ? "Yes" : "No" },
                    { label: "Status",    value: form.isActive ? "Active" : "Inactive" },
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

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={() => setActiveTab("steps")} style={{
                  padding: "10px 20px", borderRadius: "4px", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer", background: "white",
                  border: "1px solid #E2E8F0", color: "#64748b"
                }}>← Back to Steps</button>
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
