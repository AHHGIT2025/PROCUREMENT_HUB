// src/pages/roles/RolesManager.tsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function RolesManager() {
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    setLoading(true);
    try {
      const r = await api.get("/roles");
      setRoles(r.data?.data ?? r.data ?? []);
    } catch {
      setError("Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(role: Role) {
    setEditingId(role.id);
    setForm({ name: role.name, description: role.description ?? "" });
    setFormError(null);
    setShowForm(true);
  }

  async function saveRole() {
    setFormError(null);
    if (!form.name.trim()) { setFormError("Role name is required."); return; }

    // Block plain/generic role names — these cause ambiguous approval
    // routing when a company has multiple department managers, since
    // ResolveByRoleAsync can't tell which "Manager" the workflow meant.
    const GENERIC_NAMES = ["manager", "officer", "head", "admin", "supervisor", "lead"];
    if (GENERIC_NAMES.includes(form.name.trim().toLowerCase())) {
      setFormError(
        `"${form.name.trim()}" is too generic — a company can have several department managers. ` +
        `Qualify it (e.g. "Budget Manager", "IT Manager"), or if you mean the requester's own ` +
        `reporting manager, that's already handled automatically by the "Department Manager" ` +
        `approver type in the Workflow Builder — no separate role is needed for that.`
      );
      return;
    }

    // Prevent obvious duplicates (case-insensitive) before hitting the server
    const dup = roles.find(r =>
      r.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
      r.id !== editingId
    );
    if (dup) { setFormError(`A role named "${dup.name}" already exists.`); return; }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/roles/${editingId}`, { name: form.name.trim(), description: form.description.trim() });
        flash("success", `Role "${form.name}" updated.`);
      } else {
        await api.post("/roles", { name: form.name.trim(), description: form.description.trim() });
        flash("success", `Role "${form.name}" created.`);
      }
      setShowForm(false);
      await loadRoles();
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: Role) {
    if (!confirm(`Delete role "${role.name}"?\n\nUsers currently assigned this role will lose it — make sure no one depends on it before deleting.`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      flash("success", `Role "${role.name}" deleted.`);
      await loadRoles();
    } catch (e: any) {
      flash("error", e?.response?.data?.message ?? "Delete failed — this role may still be assigned to users or workflow steps.");
    }
  }

  function flash(type: "success" | "error", msg: string) {
    if (type === "success") { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 4000); }
    else { setError(msg); setSuccess(null); setTimeout(() => setError(null), 5000); }
  }

  const filtered = roles.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 border-b pb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {/* Global role definitions (e.g. Budget Manager, IT Manager, CEO). Company-specific access is
            assigned per-user in User Management — roles themselves are shared across all companies. */}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl hover:bg-gray-700 transition whitespace-nowrap"
        >
          <Plus size={14} /> New Role
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search roles…"
        className="w-full max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {/* Create/Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? "Edit Role" : "New Role"}</h3>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. IT Manager"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="What this role approves / does"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          {formError && <p className="text-red-600 text-xs mt-2">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveRole}
              disabled={saving}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {editingId ? "Save Changes" : "Create Role"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles list */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading roles…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">{roles.length === 0 ? "No roles yet — create the first one." : "No roles match your search."}</p>
          </div>
        ) : (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "48%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Role Name</th>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(role => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800 truncate">{role.name}</td>
                  <td className="px-5 py-3 text-gray-500 truncate">{role.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(role)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        onClick={() => deleteRole(role)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        <Trash2 size={11} /> Delete
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
