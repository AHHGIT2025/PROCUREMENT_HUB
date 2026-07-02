// src/pages/settings/ItemCategories.tsx
// Settings → Item Categories
// Admin manages Oracle group → category mappings here

import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import {
  Tag, Plus, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Loader2, X, Search
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  groupsMapped: number;
  itemsMapped: number;
  isActive: boolean;
}

interface GroupMap {
  id: string;
  oracleGroupName: string;
  itemCount: number;
  createdAt: string;
}

interface UnmappedGroup {
  groupId: string;
  groupName: string;
  itemCount: number;
}

// ── Category badge colors ──────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  IT:         'bg-blue-50 text-blue-700 border-blue-200',
  ASSET:      'bg-purple-50 text-purple-700 border-purple-200',
  LOGISTICS:  'bg-amber-50 text-amber-700 border-amber-200',
  PROJECT:    'bg-teal-50 text-teal-700 border-teal-200',
  CIVIL:      'bg-orange-50 text-orange-700 border-orange-200',
  FMCG_FOOD:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  FMCG_NFOOD: 'bg-green-50 text-green-700 border-green-200',
  SAFETY:     'bg-red-50 text-red-700 border-red-200',
  UNIFORM:    'bg-pink-50 text-pink-700 border-pink-200',
  GENERAL:    'bg-gray-100 text-gray-600 border-gray-200',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ItemCategories() {
  const [categories, setCategories]       = useState<Category[]>([]);
  const [unmapped, setUnmapped]           = useState<UnmappedGroup[]>([]);
  const [loading, setLoading]             = useState(true);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [mappings, setMappings]           = useState<Record<string, GroupMap[]>>({});
  const [mappingLoading, setMappingLoading] = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<string | null>(null);

  // New category form
  const [showNewForm, setShowNewForm]     = useState(false);
  const [newForm, setNewForm]             = useState({ code: '', name: '', description: '' });
  const [newFormSaving, setNewFormSaving] = useState(false);
  const [newFormError, setNewFormError]   = useState<string | null>(null);

  // Map unmapped group
  const [mapTarget, setMapTarget]         = useState<Record<string, string>>({});
  const [mapSearch, setMapSearch]         = useState('');
  const [mapping, setMapping]             = useState<string | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, unmappedRes] = await Promise.all([
        api.get('/item-categories'),
        api.get('/item-categories/unmapped-groups'),
      ]);
      setCategories(catRes.data?.data ?? catRes.data ?? []);
      setUnmapped(unmappedRes.data?.data ?? unmappedRes.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function loadMappings(categoryId: string) {
    if (mappings[categoryId]) return;
    setMappingLoading(categoryId);
    try {
      const res = await api.get(`/item-categories/${categoryId}/mappings`);
      setMappings(prev => ({ ...prev, [categoryId]: res.data?.data ?? res.data ?? [] }));
    } catch {
      setMappings(prev => ({ ...prev, [categoryId]: [] }));
    } finally {
      setMappingLoading(null);
    }
  }

  // ── Expand/Collapse ────────────────────────────────────────────────────────
  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await loadMappings(id);
  }

  // ── Remove mapping ─────────────────────────────────────────────────────────
  async function removeMapping(categoryId: string, mapId: string, groupName: string) {
    if (!confirm(`Remove mapping: "${groupName}"?\n\nItems in this group will become uncategorized.`)) return;
    try {
      const res = await api.delete(`/item-categories/mappings/${mapId}`);
      setMappings(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] ?? []).filter(m => m.id !== mapId)
      }));
      setSuccess(res.data?.message ?? 'Mapping removed.');
      loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to remove mapping.');
    }
  }

  // ── Map an unmapped group ──────────────────────────────────────────────────
  async function mapGroup(groupName: string) {
    const categoryId = mapTarget[groupName];
    if (!categoryId) return;
    setMapping(groupName);
    setError(null);
    try {
      const res = await api.post(`/item-categories/${categoryId}/mappings`, {
        oracleGroupName: groupName
      });
      setSuccess(res.data?.message ?? 'Group mapped successfully.');
      // Refresh data
      setMappings(prev => {
        const updated = { ...prev };
        delete updated[categoryId]; // force reload
        return updated;
      });
      await loadAll();
      // If category is expanded, reload its mappings
      if (expandedId === categoryId) {
        const mRes = await api.get(`/item-categories/${categoryId}/mappings`);
        setMappings(prev => ({ ...prev, [categoryId]: mRes.data?.data ?? mRes.data ?? [] }));
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to map group.');
    } finally {
      setMapping(null);
    }
  }

  // ── Create new category ────────────────────────────────────────────────────
  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setNewFormError(null);
    if (!newForm.code.trim()) return setNewFormError('Code is required.');
    if (!newForm.name.trim()) return setNewFormError('Name is required.');
    setNewFormSaving(true);
    try {
      await api.post('/item-categories', {
        code: newForm.code.trim().toUpperCase(),
        name: newForm.name.trim(),
        description: newForm.description.trim() || null,
        sortOrder: categories.length + 1
      });
      setNewForm({ code: '', name: '', description: '' });
      setShowNewForm(false);
      await loadAll();
      setSuccess('Category created.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setNewFormError(e?.response?.data?.message ?? 'Failed to create category.');
    } finally {
      setNewFormSaving(false);
    }
  }

  // ── Filtered unmapped groups ───────────────────────────────────────────────
  const filteredUnmapped = unmapped.filter(g =>
    !mapSearch || g.groupName.toLowerCase().includes(mapSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <Loader2 size={20} className="animate-spin" />
        Loading categories…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Item Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Map Oracle item groups to clean categories used in workflow routing.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-700 transition"
        >
          <Plus size={14} /> New Category
        </button>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* New category form */}
      {showNewForm && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">New Category</h3>
          <form onSubmit={createCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Code <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. WOOD"
                value={newForm.code}
                onChange={e => setNewForm(f => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. Wood & Plywood"
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="optional"
                value={newForm.description}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            {newFormError && (
              <div className="md:col-span-3 text-red-600 text-xs">{newFormError}</div>
            )}
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={newFormSaving}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {newFormSaving && <Loader2 size={13} className="animate-spin" />}
                Save Category
              </button>
              <button
                type="button"
                onClick={() => { setShowNewForm(false); setNewFormError(null); }}
                className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Categories list ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {categories.map(cat => {
          const color     = CATEGORY_COLORS[cat.code] ?? CATEGORY_COLORS.GENERAL;
          const isOpen    = expandedId === cat.id;
          const catMaps   = mappings[cat.id] ?? [];
          const isLoading = mappingLoading === cat.id;

          return (
            <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

              {/* Category header */}
              <button
                onClick={() => toggleExpand(cat.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
              >
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
                  {cat.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-gray-400 truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-400 shrink-0">
                  <span>
                    <strong className="text-gray-700">{cat.groupsMapped}</strong> groups
                  </span>
                  <span>
                    <strong className="text-gray-700">{cat.itemsMapped.toLocaleString()}</strong> items
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded — mapped groups */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Mapped Oracle Groups
                  </p>

                  {isLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
                      <Loader2 size={14} className="animate-spin" /> Loading…
                    </div>
                  ) : catMaps.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No groups mapped yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {catMaps.map(m => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg group"
                        >
                          <Tag size={10} className="text-gray-400" />
                          {m.oracleGroupName}
                          <span className="text-gray-400">({m.itemCount})</span>
                          <button
                            onClick={() => removeMapping(cat.id, m.id, m.oracleGroupName)}
                            className="ml-1 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            title="Remove mapping"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Unmapped Groups ─────────────────────────────────────────────────── */}
      {unmapped.length > 0 && (
        <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50/50">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {unmapped.length} Oracle groups have no category mapping
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Items in these groups will use the General fallback flow. Map them to enable correct workflow routing.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Search groups…"
                value={mapSearch}
                onChange={e => setMapSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {filteredUnmapped.map(g => (
              <div key={g.groupId} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{g.groupName}</p>
                  <p className="text-xs text-gray-400">{g.itemCount} items</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={mapTarget[g.groupName] ?? ''}
                    onChange={e => setMapTarget(prev => ({ ...prev, [g.groupName]: e.target.value }))}
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => mapGroup(g.groupName)}
                    disabled={!mapTarget[g.groupName] || mapping === g.groupName}
                    className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-1"
                  >
                    {mapping === g.groupName
                      ? <><Loader2 size={11} className="animate-spin" /> Mapping…</>
                      : 'Map'}
                  </button>
                </div>
              </div>
            ))}
            {filteredUnmapped.length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-gray-400">
                No groups match "{mapSearch}"
              </div>
            )}
          </div>
        </div>
      )}

      {unmapped.length === 0 && !loading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            All Oracle groups are mapped to categories. Workflow routing is fully configured. ✅
          </p>
        </div>
      )}

    </div>
  );
}
