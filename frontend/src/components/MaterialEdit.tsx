// src/components/MaterialEdit.tsx
// Edit modal for Item Master — opens when user clicks Edit on any item.
// Blocks Group/UOM changes if item is used in active MRs/PRs.

import { useEffect, useState } from "react";
import api from "../api/client";
import { AlertTriangle, X, Save, Loader2 } from "lucide-react";

interface Props {
  itemId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface ItemDetail {
  id: string;
  itemCode: string;
  name: string;
  description: string;
  groupId: string | null;
  subGroupId: string | null;
  unitId: string | null;
  sourceType: string;
  hasActiveMRs: boolean;
  activeMRCount: number;
}

export default function MaterialEdit({ itemId, onClose, onSaved }: Props) {
  const [item, setItem]       = useState<ItemDetail | null>(null);
  const [groups, setGroups]   = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [units, setUnits]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    groupId: "",
    subGroupId: "",
    unitId: "",
  });

  // ── Load item details + dropdowns ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [itemRes, groupRes, unitRes] = await Promise.all([
          api.get(`/materials/${itemId}`),
          api.get("/materialgroups"),
          api.get("/units"),
        ]);

        const d: ItemDetail = itemRes.data;
        setItem(d);
        setGroups(groupRes.data);
        setUnits(unitRes.data);

        setForm({
          name:        d.name ?? "",
          description: d.description ?? "",
          groupId:     d.groupId ?? "",
          subGroupId:  d.subGroupId ?? "",
          unitId:      d.unitId ?? "",
        });

        // Load subgroups for the item's current group
        if (d.groupId) {
          const sgRes = await api.get(`/materialsubgroups?groupId=${d.groupId}`);
          setSubGroups(sgRes.data);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load item details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [itemId]);

  // ── Reload subgroups when group changes ──────────────────────────────────
  useEffect(() => {
    if (!form.groupId) { setSubGroups([]); return; }
    api.get(`/materialsubgroups?groupId=${form.groupId}`)
      .then(r => setSubGroups(r.data))
      .catch(() => setSubGroups([]));
  }, [form.groupId]);

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }

    setError(null);
    setWarning(null);
    setSaving(true);

    try {
      const res = await api.put(`/materials/${itemId}`, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        groupId:     form.groupId || null,
        subGroupId:  form.subGroupId || null,
        unitId:      form.unitId || null,
      });

      if (res.data.warning) {
        setWarning(res.data.warning);
        // Show warning for 2 seconds then close
        setTimeout(() => { onSaved(); onClose(); }, 2500);
      } else {
        onSaved();
        onClose();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
            {item && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.itemCode} &nbsp;·&nbsp;
                <span className={item.sourceType === "ORACLE"
                  ? "text-blue-500 font-medium"
                  : "text-gray-400"}>
                  {item.sourceType === "ORACLE" ? "Oracle Synced" : "Manual"}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" />
              Loading…
            </div>
          )}

          {!loading && (
            <>
              {/* Active MR warning */}
              {item?.hasActiveMRs && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2 items-start">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      This item is used in {item.activeMRCount} active request{item.activeMRCount > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Name and Description can be edited. Group and UOM are locked until those requests are approved, rejected, or returned.
                    </p>
                  </div>
                </div>
              )}

              {/* Oracle warning */}
              {item?.sourceType === "ORACLE" && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-2 items-start">
                  <AlertTriangle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    This item is synced from Oracle (Bright ERP). Manual changes may be overwritten on the next sync if Oracle data differs.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex gap-2 items-start">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Success warning */}
              {warning && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  {warning}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSave} className="space-y-4">

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>

                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group (Category)
                  </label>
                  <select
                    value={form.groupId}
                    disabled={item?.hasActiveMRs}
                    onChange={e => setForm(f => ({ ...f, groupId: e.target.value, subGroupId: "" }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">— Select Group —</option>
                    {groups.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {item?.hasActiveMRs && (
                    <p className="text-xs text-amber-500 mt-1">🔒 Locked — active requests exist</p>
                  )}
                </div>

                {/* Sub Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub Group
                  </label>
                  <select
                    value={form.subGroupId}
                    disabled={item?.hasActiveMRs || !form.groupId}
                    onChange={e => setForm(f => ({ ...f, subGroupId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">— Select Sub Group —</option>
                    {subGroups.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* UOM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measure (UOM)
                  </label>
                  <select
                    value={form.unitId}
                    disabled={item?.hasActiveMRs}
                    onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">— Select UOM —</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {item?.hasActiveMRs && (
                    <p className="text-xs text-amber-500 mt-1">🔒 Locked — active requests exist</p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving
                      ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                      : <><Save size={14} /> Save Changes</>}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-sm border hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
