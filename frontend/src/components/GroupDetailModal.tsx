// components/GroupDetailModal.tsx
// Click any Oracle group tag → this modal opens
// Shows: all items in group, group remap, individual item category override

import { useState, useEffect } from 'react';
import {
  X, Loader2, ArrowRight, AlertTriangle,
  CheckCircle2, Tag, RefreshCw, Info, Boxes
} from 'lucide-react';
import api from '../api/client';

const CAT_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  GENERAL:    { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: '📦' },
  IT:         { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '💻' },
  ASSET:      { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '🏗️' },
  FMCG_FOOD:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🍔' },
  FMCG_NFOOD: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🧴' },
  CIVIL:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🏛️' },
  LOGISTICS:  { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🚛' },
  PROJECT:    { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', icon: '📋' },
  SAFETY:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⛑️' },
  UNIFORM:    { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', icon: '👕' },
};
const getMeta = (code: string) =>
  CAT_META[code?.toUpperCase()] ?? { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '📁' };

interface Props {
  groupName: string;           // Oracle group name e.g. "CLEANING MACHINE"
  currentCategoryId: string;   // current mapped category id
  currentCategoryCode: string; // e.g. "FMCG_NFOOD"
  currentCategoryName: string; // e.g. "FMCG Non-Food"
  mapId: string;               // ItemGroupCategoryMaps.Id for remap
  categories: any[];           // all categories list
  onClose: () => void;
  onGroupRemapped: () => void; // refresh parent after remap
}

interface GroupItem {
  id: string;
  code: string;
  name: string;
  companyCode: string;
  companyName: string;
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
}

export default function GroupDetailModal({
  groupName,
  currentCategoryId,
  currentCategoryCode,
  currentCategoryName,
  mapId,
  categories,
  onClose,
  onGroupRemapped,
}: Props) {
  const [items, setItems]               = useState<GroupItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [remapCatId, setRemapCatId]     = useState('');
  const [remapSaving, setRemapSaving]   = useState(false);
  const [itemSaving, setItemSaving]     = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState('');

  const curMeta = getMeta(currentCategoryCode);

  // ── Load items in this group ────────────────────────────────────────────
  useEffect(() => {
    loadItems();
  }, [groupName]);

  async function loadItems() {
    setLoading(true);
    try {
        
      const r = await api.get('/item-categories/group-items', {
        params: { groupName }
      });
      setItems(r.data?.data ?? r.data ?? []);
    } catch {
      setError('Failed to load items.');
    } finally {
      setLoading(false);
    }
  }

  // ── Remap entire group ──────────────────────────────────────────────────
  async function remapGroup() {
    if (!remapCatId) return;
    const newCat = categories.find((c: any) => c.id === remapCatId);
    if (!newCat) return;

    const confirmed = window.confirm(
      `Move ALL ${items.length} items in "${groupName}" from\n` +
      `"${currentCategoryName}" → "${newCat.name}"?\n\n` +
      `This also affects future Oracle sync items in this group.`
    );
    if (!confirmed) return;

    setRemapSaving(true);
    setError(null);
    try {
      // Step 1: Remove old mapping
      await api.delete(`/item-categories/mappings/${mapId}`);
      // Step 2: Add new mapping (this also updates ItemGroups + Items CategoryId)
      await api.post(`/item-categories/${remapCatId}/mappings`, {
        oracleGroupName: groupName,
      });
      flash('success', `✅ "${groupName}" moved to "${newCat.name}". ${items.length} items updated.`);
      await loadItems();
      onGroupRemapped();
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Remap failed.');
    } finally {
      setRemapSaving(false);
    }
  }

  // ── Update individual item category ────────────────────────────────────
  async function updateItemCategory(itemId: string, categoryId: string, categoryCode: string, categoryName: string) {
    setItemSaving(itemId);
    setError(null);
    try {
    //   await api.put(`/items/${itemId}/category`, { categoryId });
    await api.put(`/materials/${itemId}/category`, { categoryId });
      setItems(prev => prev.map(i =>
        i.id === itemId
          ? { ...i, categoryId, categoryCode, categoryName }
          : i
      ));
      flash('success', `Item category updated to "${categoryName}".`);
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Update failed.');
    } finally {
      setItemSaving(null);
    }
  }

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') {
      setSuccess(msg); setError(null);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(msg); setSuccess(null);
      setTimeout(() => setError(null), 5000);
    }
  }

  const filtered = items.filter(i =>
    !search ||
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.companyCode.toLowerCase().includes(search.toLowerCase())
  );

  // Count items with overridden category (different from group's category)
  const overriddenCount = items.filter(i =>
    i.categoryCode?.toUpperCase() !== currentCategoryCode?.toUpperCase()
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh]
                        flex flex-col overflow-hidden">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 px-6 py-4 border-b"
            style={{ background: curMeta.bg, borderColor: curMeta.border }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: 'white', border: `1px solid ${curMeta.border}` }}
            >
              {curMeta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 text-base truncate">
                {groupName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ color: curMeta.color, background: 'white', border: `1px solid ${curMeta.border}` }}>
                  {currentCategoryCode}
                </span>
                <span className="text-xs text-gray-500">{currentCategoryName}</span>
                <span className="text-xs text-gray-400">· {items.length} items</span>
                {overriddenCount > 0 && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200
                                   px-2 py-0.5 rounded-full">
                    {overriddenCount} item overrides
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/60 rounded-lg transition shrink-0"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          {/* ── Alerts ──────────────────────────────────────────────────── */}
          {(success || error) && (
            <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2
              ${success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {success
                ? <CheckCircle2 size={14} className="shrink-0" />
                : <AlertTriangle size={14} className="shrink-0" />}
              {success || error}
            </div>
          )}

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Group Remap Section ──────────────────────────────────── */}
            <div className="mx-6 mt-5 border border-blue-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-200">
                <RefreshCw size={13} className="text-blue-600 shrink-0" />
                <p className="text-sm font-semibold text-blue-800">
                  Move Entire Group
                </p>
                <span className="text-xs text-blue-600 ml-1">— Recommended</span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-600 bg-gray-50
                                border border-gray-200 rounded-lg px-3 py-2">
                  <Info size={12} className="text-gray-400 shrink-0" />
                  Changes ALL {items.length} items + future Oracle sync items in this group.
                  Use this when the group is mapped to the wrong category.
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Current */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Currently:</span>
                    <span className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ color: curMeta.color, background: curMeta.bg, border: `1px solid ${curMeta.border}` }}>
                      {curMeta.icon} {currentCategoryName}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-gray-400" />
                  {/* New category select */}
                  <select
                    value={remapCatId}
                    onChange={e => setRemapCatId(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-48"
                  >
                    <option value="">Select new category...</option>
                    {categories
                      .filter((c: any) => c.id !== currentCategoryId)
                      .map((c: any) => {
                        const m = getMeta(c.code);
                        return (
                          <option key={c.id} value={c.id}>
                            {m.icon} {c.name} ({c.code})
                          </option>
                        );
                      })}
                  </select>
                  <button
                    onClick={remapGroup}
                    disabled={!remapCatId || remapSaving}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium
                               disabled:opacity-40 flex items-center gap-2 whitespace-nowrap"
                  >
                    {remapSaving
                      ? <><Loader2 size={13} className="animate-spin" /> Moving...</>
                      : <><RefreshCw size={13} /> Move All {items.length} Items</>}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Individual Items Section ─────────────────────────────── */}
            <div className="mx-6 mt-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Individual Items
                  <span className="text-gray-400 ml-1 font-normal normal-case">
                    — override per item if needed
                  </span>
                </p>
                {/* Search */}
                <div className="relative">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search code, name, company..."
                    className="pl-3 pr-3 py-1.5 border rounded-lg text-xs w-56"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Loading items...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Boxes size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No items found</p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Code</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Company</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(item => {
                        const itemMeta = getMeta(item.categoryCode);
                        const isOverridden =
                          item.categoryCode?.toUpperCase() !== currentCategoryCode?.toUpperCase();

                        return (
                          <tr key={item.id}
                            className={`hover:bg-gray-50/50 transition
                              ${isOverridden ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                              {item.code}
                            </td>
                            <td className="px-4 py-2.5 text-gray-800 max-w-xs">
                              <p className="truncate text-xs">{item.name}</p>
                              {isOverridden && (
                                <p className="text-xs text-amber-600 mt-0.5">
                                  ⚡ Individual override
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {item.companyCode}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {itemSaving === item.id ? (
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Loader2 size={13} className="animate-spin" />
                                  <span className="text-xs">Saving...</span>
                                </div>
                              ) : (
                                <select
                                  value={item.categoryId ?? ''}
                                  onChange={e => {
                                    const cat = categories.find((c: any) => c.id === e.target.value);
                                    if (cat) updateItemCategory(item.id, cat.id, cat.code, cat.name);
                                  }}
                                  className="text-xs border rounded-lg px-2 py-1.5 w-full max-w-44"
                                  style={{
                                    borderColor: isOverridden ? '#fbbf24' : itemMeta.border,
                                    background: itemMeta.bg,
                                    color: itemMeta.color,
                                  }}
                                >
                                  {categories.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                      {getMeta(c.code).icon} {c.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length < items.length && (
                    <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400 text-center">
                      Showing {filtered.length} of {items.length} items
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              💡 Use "Move Entire Group" for permanent fix.
              Individual changes are item-level overrides only.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
