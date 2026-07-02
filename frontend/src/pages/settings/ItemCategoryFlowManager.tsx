// pages/settings/ItemCategoryFlowManager.tsx  (REPLACE previous version)
// Now: group tags are clickable → opens GroupDetailModal

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Tag, GitBranch,
  Boxes, ArrowRight, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Plus, X, Search, Info, Layers, Zap
} from 'lucide-react';
import api from '../../api/client';
import GroupDetailModal from '../../components/GroupDetailModal';

// ── Category meta ───────────────────────────────────────────────────────────
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

// ── Types ───────────────────────────────────────────────────────────────────
interface Category {
  id: string; code: string; name: string;
  description?: string; groupsMapped: number; itemsMapped: number; isActive: boolean;
}
interface GroupMap {
  id: string; oracleGroupName: string; itemCount: number;
}
interface UnmappedGroup {
  groupId: string; groupName: string; itemCount: number;
}
interface Workflow {
  id: string; name: string; code: string; isDefault: boolean; priority: number;
  steps: { stepOrder: number; name: string; roleName: string }[];
  conditions: { field: string; value: string }[];
}
interface ModalState {
  groupName: string;
  currentCategoryId: string;
  currentCategoryCode: string;
  currentCategoryName: string;
  mapId: string;
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function ItemCategoryFlowManager() {
  const [categories, setCategories]   = useState<Category[]>([]);
  const [unmapped, setUnmapped]       = useState<UnmappedGroup[]>([]);
  const [workflows, setWorkflows]     = useState<Workflow[]>([]);
  const [mappings, setMappings]       = useState<Record<string, GroupMap[]>>({});
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [loadingMaps, setLoadingMaps] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [unmapSearch, setUnmapSearch] = useState('');
  const [mapTarget, setMapTarget]     = useState<Record<string, string>>({});
  const [showNewCat, setShowNewCat]   = useState(false);
  const [newCat, setNewCat]           = useState({ code: '', name: '', description: '' });
  const [newCatSaving, setNewCatSaving] = useState(false);
  const [newCatErr, setNewCatErr]     = useState<string | null>(null);
  const [modal, setModal]             = useState<ModalState | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, unmapRes, wfRes] = await Promise.all([
        api.get('/item-categories'),
        api.get('/item-categories/unmapped-groups'),
        api.get('/workflows'),
      ]);
      setCategories(catRes.data?.data ?? catRes.data ?? []);
      setUnmapped(unmapRes.data?.data ?? unmapRes.data ?? []);
      setWorkflows(wfRes.data?.data ?? wfRes.data ?? []);
    } catch {
      setError('Failed to load. Check API connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function loadMappings(catId: string) {
    if (mappings[catId]) return;
    setLoadingMaps(catId);
    try {
      const r = await api.get(`/item-categories/${catId}/mappings`);
      setMappings(p => ({ ...p, [catId]: r.data?.data ?? r.data ?? [] }));
    } finally { setLoadingMaps(null); }
  }

  async function toggle(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    await loadMappings(id);
  }

  async function removeMap(catId: string, mapId: string, groupName: string) {
    if (!confirm(`Remove "${groupName}" from this category?\nItems will fall to GENERAL flow.`)) return;
    setSaving(mapId);
    try {
      await api.delete(`/item-categories/mappings/${mapId}`);
      setMappings(p => ({ ...p, [catId]: (p[catId] ?? []).filter(m => m.id !== mapId) }));
      flash('success', `"${groupName}" unmapped.`);
      loadAll();
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Remove failed.');
    } finally { setSaving(null); }
  }

  async function mapGroup(groupName: string) {
    const catId = mapTarget[groupName];
    if (!catId) return;
    setSaving('map-' + groupName);
    try {
      const r = await api.post(`/item-categories/${catId}/mappings`, { oracleGroupName: groupName });
      flash('success', r.data?.message ?? 'Mapped.');
      setMappings(p => { const n = { ...p }; delete n[catId]; return n; });
      await loadAll();
      if (expanded === catId) await loadMappings(catId);
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Mapping failed.');
    } finally { setSaving(null); }
  }

  async function createCat() {
    setNewCatErr(null);
    if (!newCat.code.trim()) return setNewCatErr('Code required.');
    if (!newCat.name.trim()) return setNewCatErr('Name required.');
    setNewCatSaving(true);
    try {
      await api.post('/item-categories', {
        code: newCat.code.trim().toUpperCase(),
        name: newCat.name.trim(),
        description: newCat.description.trim() || null,
        sortOrder: categories.length + 1,
      });
      setNewCat({ code: '', name: '', description: '' });
      setShowNewCat(false);
      await loadAll();
      flash('success', 'Category created.');
    } catch (e: any) {
      setNewCatErr(e?.response?.data?.message ?? 'Create failed.');
    } finally { setNewCatSaving(false); }
  }

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 4000); }
    else { setError(msg); setSuccess(null); setTimeout(() => setError(null), 5000); }
  }

  function getLinkedWorkflow(catCode: string): Workflow | undefined {
    return workflows.find(w =>
      w.conditions?.some(c =>
        c.field === 'ItemCategory' && c.value?.toUpperCase() === catCode?.toUpperCase()
      )
    );
  }

  // Open modal for a group tag
  function openGroupModal(
    groupName: string, mapId: string,
    catId: string, catCode: string, catName: string
  ) {
    setModal({ groupName, mapId, currentCategoryId: catId, currentCategoryCode: catCode, currentCategoryName: catName });
  }

  function handleGroupRemapped() {
    // After remap: clear cached mappings + reload all
    setMappings({});
    loadAll();
    if (expanded) loadMappings(expanded);
  }

  const filteredUnmapped = unmapped.filter(g =>
    !unmapSearch || g.groupName.toLowerCase().includes(unmapSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading category flow...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 pb-12">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Item Category Flow</h1>
            <p className="text-sm text-gray-500 mt-1">
              Oracle groups → Categories → Approval workflows.
              Click any group tag to view items or fix wrong category.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setShowNewCat(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">
              <Plus size={13} /> New Category
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
            <CheckCircle2 size={15} className="shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
            <AlertTriangle size={15} className="shrink-0" /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Categories', value: categories.length, icon: <Tag size={16} className="text-slate-500" /> },
            { label: 'Groups Mapped', value: categories.reduce((s, c) => s + (c.groupsMapped ?? 0), 0), icon: <Layers size={16} className="text-blue-500" /> },
            { label: 'Items Covered', value: categories.reduce((s, c) => s + (c.itemsMapped ?? 0), 0).toLocaleString(), icon: <Boxes size={16} className="text-violet-500" /> },
          ].map(s => (
            <div key={s.label} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">How it works: </span>
            Oracle sends item with Group → Group mapped to Category → Category matches Workflow →
            Workflow steps define approvers. <span className="font-semibold">Click any group tag</span> to
            view its items or move it to a different category.
          </p>
        </div>

        {/* New Category Form */}
        {showNewCat && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900 text-sm">New Category</p>
              <button onClick={() => setShowNewCat(false)}><X size={14} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Code *', key: 'code', ph: 'e.g. MEDICAL' },
                { label: 'Name *', key: 'name', ph: 'e.g. Medical & Pharmacy' },
                { label: 'Description', key: 'description', ph: 'Optional' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                  <input
                    value={(newCat as any)[f.key]}
                    onChange={e => setNewCat(p => ({
                      ...p,
                      [f.key]: f.key === 'code' ? e.target.value.toUpperCase() : e.target.value
                    }))}
                    placeholder={f.ph}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            {newCatErr && <p className="text-red-600 text-xs mt-2">{newCatErr}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={createCat} disabled={newCatSaving}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {newCatSaving && <Loader2 size={12} className="animate-spin" />}
                Create Category
              </button>
              <button onClick={() => setShowNewCat(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠️ After creating a category, create a workflow with condition
              <code className="mx-1 bg-white px-1 rounded border">ItemCategory = YOUR_CODE</code>
              in Workflow Management.
            </p>
          </div>
        )}

        {/* Category Cards */}
        <div className="space-y-3">
          {categories.map(cat => {
            const meta     = getMeta(cat.code);
            const linkedWF = getLinkedWorkflow(cat.code);
            const isOpen   = expanded === cat.id;
            const catMaps  = mappings[cat.id] ?? [];
            const isLoading = loadingMaps === cat.id;

            return (
              <div key={cat.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm"
                style={{ borderColor: isOpen ? meta.border : '#e5e7eb' }}>

                {/* Card Header */}
                <button onClick={() => toggle(cat.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                        style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                        {cat.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {cat.groupsMapped} groups · {cat.itemsMapped?.toLocaleString()} items
                      </span>
                      <span className="text-gray-300">·</span>
                      <ArrowRight size={10} className="text-gray-300" />
                      {linkedWF ? (
                        <span className="text-xs text-emerald-700 flex items-center gap-1">
                          <Zap size={10} className="text-emerald-500" />
                          {linkedWF.name}
                          {linkedWF.steps?.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              ({linkedWF.steps.sort((a,b)=>a.stepOrder-b.stepOrder).map(s => s.roleName).join(' → ')})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={10} /> No workflow — falls to GENERAL
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-gray-400">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t" style={{ borderColor: meta.border }}>
                    {/* Flow chain */}
                    <div className="px-5 py-3 flex items-center gap-2 flex-wrap"
                      style={{ background: meta.bg }}>
                      <Tag size={12} style={{ color: meta.color }} />
                      <span className="text-xs font-medium" style={{ color: meta.color }}>{cat.name}</span>
                      <ArrowRight size={11} className="text-gray-400" />
                      <GitBranch size={12} className="text-gray-500" />
                      {linkedWF ? (
                        <>
                          <span className="text-xs text-gray-700 font-medium">{linkedWF.name}</span>
                          <ArrowRight size={11} className="text-gray-400" />
                          <div className="flex items-center gap-1 flex-wrap">
                            {linkedWF.steps?.sort((a,b)=>a.stepOrder-b.stepOrder).map((s, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-700">
                                  {s.roleName}
                                </span>
                                {i < linkedWF.steps.length - 1 && <ArrowRight size={9} className="text-gray-300" />}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⚠️ Create workflow: ItemCategory = {cat.code}
                        </span>
                      )}
                    </div>

                    {/* Mapped Groups — CLICKABLE */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Oracle Groups — <span className="font-normal normal-case text-blue-600">click to view items or fix category</span>
                      </p>
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                          <Loader2 size={13} className="animate-spin" /> Loading...
                        </div>
                      ) : catMaps.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">No groups mapped yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {catMaps.map(m => (
                            <div key={m.id} className="flex items-center gap-0">
                              {/* Clickable group name → opens modal */}
                              <button
                                onClick={() => openGroupModal(
                                  m.oracleGroupName, m.id,
                                  cat.id, cat.code, cat.name
                                )}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5
                                           rounded-l-lg border-y border-l transition hover:opacity-80
                                           active:scale-95"
                                style={{
                                  background: meta.bg,
                                  borderColor: meta.border,
                                  color: meta.color,
                                }}
                                title="Click to view items or change category"
                              >
                                <Tag size={10} />
                                <span className="font-medium">{m.oracleGroupName}</span>
                                <span className="opacity-60">({m.itemCount})</span>
                              </button>
                              {/* Remove button */}
                              <button
                                onClick={() => removeMap(cat.id, m.id, m.oracleGroupName)}
                                disabled={saving === m.id}
                                className="inline-flex items-center justify-center w-6 h-7
                                           border-y border-r rounded-r-lg transition
                                           hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                                style={{ borderColor: meta.border, color: meta.color }}
                                title="Remove mapping"
                              >
                                {saving === m.id
                                  ? <Loader2 size={9} className="animate-spin" />
                                  : <X size={9} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unmapped Groups */}
        {unmapped.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {unmapped.length} Oracle groups have no category
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Items in these groups fall to GENERAL flow.
                </p>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-2 text-gray-400" />
                <input value={unmapSearch} onChange={e => setUnmapSearch(e.target.value)}
                  placeholder="Search groups..."
                  className="pl-8 pr-3 py-1.5 border border-amber-200 rounded-lg text-xs bg-white w-48" />
              </div>
            </div>
            <div className="divide-y divide-amber-50 max-h-96 overflow-y-auto">
              {filteredUnmapped.map(g => (
                <div key={g.groupId} className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.groupName}</p>
                    <p className="text-xs text-gray-400">{g.itemCount} items</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={mapTarget[g.groupName] ?? ''}
                      onChange={e => setMapTarget(p => ({ ...p, [g.groupName]: e.target.value }))}
                      className="px-2 py-1.5 border rounded-lg text-xs bg-white min-w-36">
                      <option value="">Select category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{getMeta(c.code).icon} {c.name}</option>
                      ))}
                    </select>
                    <button onClick={() => mapGroup(g.groupName)}
                      disabled={!mapTarget[g.groupName] || saving === 'map-' + g.groupName}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium
                                 disabled:opacity-40 flex items-center gap-1">
                      {saving === 'map-' + g.groupName
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Plus size={11} />}
                      Map
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unmapped.length === 0 && !loading && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              All Oracle groups mapped. Workflow routing fully configured.
            </p>
          </div>
        )}
      </div>

      {/* Group Detail Modal */}
      {modal && (
        <GroupDetailModal
          groupName={modal.groupName}
          currentCategoryId={modal.currentCategoryId}
          currentCategoryCode={modal.currentCategoryCode}
          currentCategoryName={modal.currentCategoryName}
          mapId={modal.mapId}
          categories={categories}
          onClose={() => setModal(null)}
          onGroupRemapped={() => {
            setModal(null);
            handleGroupRemapped();
          }}
        />
      )}
    </>
  );
}




// // pages/settings/ItemCategoryFlowManager.tsx
// // Route: /settings/item-category-flow
// // Shows: All categories → their Oracle groups → linked workflow → item count
// // Admin can: remap groups, see flow, understand full chain

// import { useState, useEffect, useCallback } from 'react';
// import {
//   ChevronDown, ChevronRight, Tag, GitBranch,
//   Boxes, ArrowRight, AlertTriangle, CheckCircle2,
//   Loader2, RefreshCw, Plus, X, Search, Info,
//   Layers, Zap
// } from 'lucide-react';
// import api from '../../api/client';

// // ── Category color palette ──────────────────────────────────────────────────
// const CAT_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
//   GENERAL:    { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: '📦' },
//   IT:         { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '💻' },
//   ASSET:      { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '🏗️' },
//   FMCG_FOOD:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🍔' },
//   FMCG_NFOOD: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🧴' },
//   CIVIL:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🏛️' },
//   LOGISTICS:  { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🚛' },
//   PROJECT:    { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', icon: '📋' },
//   SAFETY:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⛑️' },
//   UNIFORM:    { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', icon: '👕' },
// };

// const getMeta = (code: string) =>
//   CAT_META[code?.toUpperCase()] ?? { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '📁' };

// // ── Types ───────────────────────────────────────────────────────────────────
// interface Category {
//   id: string;
//   code: string;
//   name: string;
//   description?: string;
//   groupsMapped: number;
//   itemsMapped: number;
//   isActive: boolean;
// }

// interface GroupMap {
//   id: string;
//   oracleGroupName: string;
//   itemCount: number;
// }

// interface UnmappedGroup {
//   groupId: string;
//   groupName: string;
//   itemCount: number;
// }

// interface Workflow {
//   id: string;
//   name: string;
//   code: string;
//   isDefault: boolean;
//   priority: number;
//   steps: { stepOrder: number; name: string; roleName: string }[];
//   conditions: { field: string; value: string }[];
// }

// // ── Main Component ──────────────────────────────────────────────────────────
// export default function ItemCategoryFlowManager() {
//   const [categories, setCategories]   = useState<Category[]>([]);
//   const [unmapped, setUnmapped]       = useState<UnmappedGroup[]>([]);
//   const [workflows, setWorkflows]     = useState<Workflow[]>([]);
//   const [mappings, setMappings]       = useState<Record<string, GroupMap[]>>({});
//   const [expanded, setExpanded]       = useState<string | null>(null);
//   const [loadingMaps, setLoadingMaps] = useState<string | null>(null);
//   const [loading, setLoading]         = useState(true);
//   const [saving, setSaving]           = useState<string | null>(null);
//   const [success, setSuccess]         = useState<string | null>(null);
//   const [error, setError]             = useState<string | null>(null);
//   const [unmapSearch, setUnmapSearch] = useState('');
//   const [mapTarget, setMapTarget]     = useState<Record<string, string>>({});
//   const [showNewCat, setShowNewCat]   = useState(false);
//   const [newCat, setNewCat]           = useState({ code: '', name: '', description: '' });
//   const [newCatSaving, setNewCatSaving] = useState(false);
//   const [newCatErr, setNewCatErr]     = useState<string | null>(null);

//   // ── Load data ─────────────────────────────────────────────────────────────
//   const loadAll = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [catRes, unmapRes, wfRes] = await Promise.all([
//         api.get('/item-categories'),
//         api.get('/item-categories/unmapped-groups'),
//         api.get('/workflows'),
//       ]);
//       setCategories(catRes.data?.data ?? catRes.data ?? []);
//       setUnmapped(unmapRes.data?.data ?? unmapRes.data ?? []);
//       setWorkflows(wfRes.data?.data ?? wfRes.data ?? []);
//     } catch {
//       setError('Failed to load data. Check API connection.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadAll(); }, [loadAll]);

//   // ── Load mappings for a category ──────────────────────────────────────────
//   async function loadMappings(catId: string) {
//     if (mappings[catId]) return;
//     setLoadingMaps(catId);
//     try {
//       const r = await api.get(`/item-categories/${catId}/mappings`);
//       setMappings(p => ({ ...p, [catId]: r.data?.data ?? r.data ?? [] }));
//     } finally {
//       setLoadingMaps(null);
//     }
//   }

//   // ── Toggle expand ─────────────────────────────────────────────────────────
//   async function toggle(id: string) {
//     if (expanded === id) { setExpanded(null); return; }
//     setExpanded(id);
//     await loadMappings(id);
//   }

//   // ── Remove group mapping ──────────────────────────────────────────────────
//   async function removeMap(catId: string, mapId: string, groupName: string) {
//     if (!confirm(`Remove "${groupName}" from this category?\n\nItems will become uncategorized and fall to GENERAL flow.`)) return;
//     setSaving(mapId);
//     try {
//       await api.delete(`/item-categories/mappings/${mapId}`);
//       setMappings(p => ({ ...p, [catId]: (p[catId] ?? []).filter(m => m.id !== mapId) }));
//       flash('success', `"${groupName}" unmapped.`);
//       loadAll();
//     } catch (e: any) {
//       flash('error', e?.response?.data?.message ?? 'Remove failed.');
//     } finally {
//       setSaving(null);
//     }
//   }

//   // ── Map an unmapped group ─────────────────────────────────────────────────
//   async function mapGroup(groupName: string) {
//     const catId = mapTarget[groupName];
//     if (!catId) return;
//     setSaving('map-' + groupName);
//     try {
//       const r = await api.post(`/item-categories/${catId}/mappings`, {
//         oracleGroupName: groupName,
//       });
//       flash('success', r.data?.message ?? 'Mapped.');
//       setMappings(p => { const n = { ...p }; delete n[catId]; return n; });
//       await loadAll();
//       if (expanded === catId) await loadMappings(catId);
//     } catch (e: any) {
//       flash('error', e?.response?.data?.message ?? 'Mapping failed.');
//     } finally {
//       setSaving(null);
//     }
//   }

//   // ── Create new category ───────────────────────────────────────────────────
//   async function createCat() {
//     setNewCatErr(null);
//     if (!newCat.code.trim()) return setNewCatErr('Code required.');
//     if (!newCat.name.trim()) return setNewCatErr('Name required.');
//     setNewCatSaving(true);
//     try {
//       await api.post('/item-categories', {
//         code: newCat.code.trim().toUpperCase(),
//         name: newCat.name.trim(),
//         description: newCat.description.trim() || null,
//         sortOrder: categories.length + 1,
//       });
//       setNewCat({ code: '', name: '', description: '' });
//       setShowNewCat(false);
//       await loadAll();
//       flash('success', 'Category created.');
//     } catch (e: any) {
//       setNewCatErr(e?.response?.data?.message ?? 'Create failed.');
//     } finally {
//       setNewCatSaving(false);
//     }
//   }

//   // ── Helpers ───────────────────────────────────────────────────────────────
//   function flash(type: 'success' | 'error', msg: string) {
//     if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); }
//     else { setError(msg); setTimeout(() => setError(null), 5000); }
//   }

//   // Find workflow linked to this category
//   function getLinkedWorkflow(catCode: string): Workflow | undefined {
//     return workflows.find(w =>
//       w.conditions?.some(c =>
//         c.field === 'ItemCategory' && c.value?.toUpperCase() === catCode?.toUpperCase()
//       )
//     );
//   }

//   const filteredUnmapped = unmapped.filter(g =>
//     !unmapSearch || g.groupName.toLowerCase().includes(unmapSearch.toLowerCase())
//   );

//   const totalItems = categories.reduce((s, c) => s + (c.itemsMapped ?? 0), 0);

//   // ── Render ────────────────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
//         <Loader2 size={20} className="animate-spin" />
//         <span>Loading category flow...</span>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-5 pb-12">

//       {/* ── Header ─────────────────────────────────────────────────────── */}
//       <div className="flex items-start justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-900">
//             Item Category Flow
//           </h1>
//           <p className="text-sm text-gray-500 mt-1">
//             Oracle groups → Categories → Approval workflows.
//             Fix a group's category here to automatically route it to the correct approval flow.
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <button
//             onClick={loadAll}
//             className="flex items-center gap-1.5 px-3 py-2 border rounded-lg
//                        text-sm text-gray-600 hover:bg-gray-50"
//           >
//             <RefreshCw size={13} /> Refresh
//           </button>
//           <button
//             onClick={() => setShowNewCat(true)}
//             className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white
//                        rounded-lg text-sm font-medium hover:bg-slate-700"
//           >
//             <Plus size={13} /> New Category
//           </button>
//         </div>
//       </div>

//       {/* ── Alerts ─────────────────────────────────────────────────────── */}
//       {success && (
//         <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
//                         text-emerald-800 px-4 py-3 rounded-xl text-sm">
//           <CheckCircle2 size={15} className="shrink-0" /> {success}
//         </div>
//       )}
//       {error && (
//         <div className="flex items-center gap-2 bg-red-50 border border-red-200
//                         text-red-800 px-4 py-3 rounded-xl text-sm">
//           <AlertTriangle size={15} className="shrink-0" /> {error}
//         </div>
//       )}

//       {/* ── Stats bar ──────────────────────────────────────────────────── */}
//       <div className="grid grid-cols-3 gap-3">
//         {[
//           { label: 'Categories', value: categories.length, icon: <Tag size={16} className="text-slate-500" /> },
//           { label: 'Oracle Groups Mapped', value: categories.reduce((s, c) => s + (c.groupsMapped ?? 0), 0), icon: <Layers size={16} className="text-blue-500" /> },
//           { label: 'Items Covered', value: totalItems.toLocaleString(), icon: <Boxes size={16} className="text-violet-500" /> },
//         ].map(s => (
//           <div key={s.label} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
//             {s.icon}
//             <div>
//               <p className="text-xl font-semibold text-gray-900">{s.value}</p>
//               <p className="text-xs text-gray-400">{s.label}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* ── How it works info box ───────────────────────────────────────── */}
//       <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3
//                       flex items-start gap-3">
//         <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
//         <div className="text-xs text-blue-800 leading-relaxed">
//           <span className="font-semibold">How flow works: </span>
//           Oracle sends item with a Group (e.g. "IT Accessories") →
//           Group is mapped to a Category (e.g. IT) →
//           Category matches a Workflow condition (ItemCategory = IT) →
//           Workflow steps define who approves (Manager → IT Manager → Budget → PO).
//           <br />
//           <span className="font-semibold mt-1 inline-block">
//             Change a group's category here → all items in that group automatically go to the correct approval flow.
//           </span>
//         </div>
//       </div>

//       {/* ── New Category Form ───────────────────────────────────────────── */}
//       {showNewCat && (
//         <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
//           <div className="flex items-center justify-between mb-4">
//             <p className="font-semibold text-gray-900 text-sm">New Category</p>
//             <button onClick={() => setShowNewCat(false)}>
//               <X size={14} className="text-gray-400 hover:text-gray-600" />
//             </button>
//           </div>
//           <div className="grid grid-cols-3 gap-3">
//             <div>
//               <label className="text-xs text-gray-500 mb-1 block">Code *</label>
//               <input
//                 value={newCat.code}
//                 onChange={e => setNewCat(p => ({ ...p, code: e.target.value.toUpperCase() }))}
//                 placeholder="e.g. MEDICAL"
//                 className="w-full border rounded-lg px-3 py-2 text-sm"
//               />
//             </div>
//             <div>
//               <label className="text-xs text-gray-500 mb-1 block">Name *</label>
//               <input
//                 value={newCat.name}
//                 onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
//                 placeholder="e.g. Medical & Pharmacy"
//                 className="w-full border rounded-lg px-3 py-2 text-sm"
//               />
//             </div>
//             <div>
//               <label className="text-xs text-gray-500 mb-1 block">Description</label>
//               <input
//                 value={newCat.description}
//                 onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))}
//                 placeholder="Optional"
//                 className="w-full border rounded-lg px-3 py-2 text-sm"
//               />
//             </div>
//           </div>
//           {newCatErr && (
//             <p className="text-red-600 text-xs mt-2">{newCatErr}</p>
//           )}
//           <div className="flex gap-2 mt-4">
//             <button
//               onClick={createCat}
//               disabled={newCatSaving}
//               className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm
//                          font-medium disabled:opacity-50 flex items-center gap-2"
//             >
//               {newCatSaving && <Loader2 size={12} className="animate-spin" />}
//               Create Category
//             </button>
//             <button
//               onClick={() => setShowNewCat(false)}
//               className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
//             >
//               Cancel
//             </button>
//           </div>
//           <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-100
//                         rounded-lg px-3 py-2">
//             ⚠️ After creating a category, go to <strong>Workflow Management</strong> and create
//             a workflow with condition <code>ItemCategory = [YOUR_CODE]</code> so requests
//             route correctly.
//           </p>
//         </div>
//       )}

//       {/* ── Category Cards ──────────────────────────────────────────────── */}
//       <div className="space-y-3">
//         {categories.map(cat => {
//           const meta      = getMeta(cat.code);
//           const linkedWF  = getLinkedWorkflow(cat.code);
//           const isOpen    = expanded === cat.id;
//           const catMaps   = mappings[cat.id] ?? [];
//           const isLoading = loadingMaps === cat.id;

//           return (
//             <div
//               key={cat.id}
//               className="bg-white border rounded-2xl overflow-hidden shadow-sm"
//               style={{ borderColor: isOpen ? meta.border : '#e5e7eb' }}
//             >
//               {/* Card Header */}
//               <button
//                 onClick={() => toggle(cat.id)}
//                 className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50
//                            transition text-left"
//               >
//                 {/* Icon + Name */}
//                 <div
//                   className="w-10 h-10 rounded-xl flex items-center justify-center
//                              text-lg shrink-0 font-medium"
//                   style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
//                 >
//                   {meta.icon}
//                 </div>

//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-center gap-2 flex-wrap">
//                     <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
//                     <span
//                       className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
//                       style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
//                     >
//                       {cat.code}
//                     </span>
//                     {!cat.isActive && (
//                       <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
//                         Inactive
//                       </span>
//                     )}
//                   </div>

//                   {/* Flow chain preview */}
//                   <div className="flex items-center gap-1.5 mt-1 flex-wrap">
//                     <span className="text-xs text-gray-400">
//                       {cat.groupsMapped} groups · {cat.itemsMapped?.toLocaleString()} items
//                     </span>
//                     <span className="text-gray-300">·</span>
//                     <ArrowRight size={10} className="text-gray-300" />
//                     {linkedWF ? (
//                       <span className="text-xs text-emerald-700 flex items-center gap-1">
//                         <Zap size={10} className="text-emerald-500" />
//                         {linkedWF.name}
//                         {linkedWF.steps?.length > 0 && (
//                           <span className="text-gray-400 ml-1">
//                             ({linkedWF.steps.map(s => s.roleName).join(' → ')})
//                           </span>
//                         )}
//                       </span>
//                     ) : (
//                       <span className="text-xs text-amber-600 flex items-center gap-1">
//                         <AlertTriangle size={10} />
//                         No workflow — falls to GENERAL
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* Chevron */}
//                 <div className="shrink-0 text-gray-400">
//                   {isOpen
//                     ? <ChevronDown size={16} />
//                     : <ChevronRight size={16} />}
//                 </div>
//               </button>

//               {/* Expanded Content */}
//               {isOpen && (
//                 <div className="border-t" style={{ borderColor: meta.border }}>

//                   {/* Flow explanation */}
//                   <div className="px-5 py-3 flex items-center gap-2 flex-wrap"
//                     style={{ background: meta.bg }}>
//                     <Tag size={12} style={{ color: meta.color }} />
//                     <span className="text-xs font-medium" style={{ color: meta.color }}>
//                       {cat.name}
//                     </span>
//                     <ArrowRight size={11} className="text-gray-400" />
//                     <GitBranch size={12} className="text-gray-500" />
//                     {linkedWF ? (
//                       <>
//                         <span className="text-xs text-gray-700 font-medium">
//                           {linkedWF.name}
//                         </span>
//                         <ArrowRight size={11} className="text-gray-400" />
//                         <div className="flex items-center gap-1">
//                           {linkedWF.steps
//                             ?.sort((a, b) => a.stepOrder - b.stepOrder)
//                             .map((s, i) => (
//                               <span key={i} className="flex items-center gap-1">
//                                 <span className="text-xs bg-white border border-gray-200
//                                                  px-2 py-0.5 rounded-full text-gray-700">
//                                   {s.roleName}
//                                 </span>
//                                 {i < linkedWF.steps.length - 1 && (
//                                   <ArrowRight size={9} className="text-gray-300" />
//                                 )}
//                               </span>
//                             ))}
//                         </div>
//                       </>
//                     ) : (
//                       <span className="text-xs text-amber-700 bg-amber-50 border
//                                        border-amber-200 px-2 py-0.5 rounded-full">
//                         ⚠️ No workflow configured — create one in Workflow Management
//                         with condition: ItemCategory = {cat.code}
//                       </span>
//                     )}
//                   </div>

//                   {/* Mapped Groups */}
//                   <div className="px-5 py-4">
//                     <p className="text-xs font-semibold text-gray-500 uppercase
//                                   tracking-wider mb-3">
//                       Oracle Groups mapped to this category
//                     </p>

//                     {isLoading ? (
//                       <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
//                         <Loader2 size={13} className="animate-spin" /> Loading groups...
//                       </div>
//                     ) : catMaps.length === 0 ? (
//                       <p className="text-sm text-gray-400 py-2">
//                         No groups mapped yet. Map groups from the section below.
//                       </p>
//                     ) : (
//                       <div className="flex flex-wrap gap-2">
//                         {catMaps.map(m => (
//                           <span
//                             key={m.id}
//                             className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5
//                                        rounded-lg border group cursor-default"
//                             style={{
//                               background: meta.bg,
//                               borderColor: meta.border,
//                               color: meta.color,
//                             }}
//                           >
//                             <Tag size={10} />
//                             <span className="font-medium">{m.oracleGroupName}</span>
//                             <span className="opacity-60">({m.itemCount})</span>
//                             <button
//                               onClick={() => removeMap(cat.id, m.id, m.oracleGroupName)}
//                               disabled={saving === m.id}
//                               className="ml-1 opacity-0 group-hover:opacity-100
//                                          hover:text-red-500 transition"
//                               title="Remove mapping"
//                             >
//                               {saving === m.id
//                                 ? <Loader2 size={10} className="animate-spin" />
//                                 : <X size={10} />}
//                             </button>
//                           </span>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>

//       {/* ── Unmapped Groups ─────────────────────────────────────────────── */}
//       {unmapped.length > 0 && (
//         <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
//           <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
//             <AlertTriangle size={15} className="text-amber-500 shrink-0" />
//             <div className="flex-1">
//               <p className="text-sm font-semibold text-amber-800">
//                 {unmapped.length} Oracle groups have no category
//               </p>
//               <p className="text-xs text-amber-600 mt-0.5">
//                 Items in these groups fall to GENERAL flow. Map them to route correctly.
//               </p>
//             </div>
//             <div className="relative">
//               <Search size={13} className="absolute left-3 top-2 text-gray-400" />
//               <input
//                 value={unmapSearch}
//                 onChange={e => setUnmapSearch(e.target.value)}
//                 placeholder="Search groups..."
//                 className="pl-8 pr-3 py-1.5 border border-amber-200 rounded-lg
//                            text-xs bg-white w-48"
//               />
//             </div>
//           </div>

//           <div className="divide-y divide-amber-50 max-h-96 overflow-y-auto">
//             {filteredUnmapped.map(g => (
//               <div key={g.groupId}
//                 className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/30">
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium text-gray-800 truncate">
//                     {g.groupName}
//                   </p>
//                   <p className="text-xs text-gray-400">{g.itemCount} items</p>
//                 </div>
//                 <div className="flex items-center gap-2 shrink-0">
//                   <select
//                     value={mapTarget[g.groupName] ?? ''}
//                     onChange={e => setMapTarget(p => ({
//                       ...p,
//                       [g.groupName]: e.target.value,
//                     }))}
//                     className="px-2 py-1.5 border rounded-lg text-xs bg-white min-w-36"
//                   >
//                     <option value="">Select category...</option>
//                     {categories.map(c => (
//                       <option key={c.id} value={c.id}>
//                         {getMeta(c.code).icon} {c.name}
//                       </option>
//                     ))}
//                   </select>
//                   <button
//                     onClick={() => mapGroup(g.groupName)}
//                     disabled={!mapTarget[g.groupName] || saving === 'map-' + g.groupName}
//                     className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs
//                                font-medium disabled:opacity-40 flex items-center gap-1"
//                   >
//                     {saving === 'map-' + g.groupName
//                       ? <Loader2 size={11} className="animate-spin" />
//                       : <Plus size={11} />}
//                     Map
//                   </button>
//                 </div>
//               </div>
//             ))}
//             {filteredUnmapped.length === 0 && (
//               <div className="px-5 py-6 text-center text-sm text-gray-400">
//                 No groups match "{unmapSearch}"
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── All mapped ─────────────────────────────────────────────────── */}
//       {unmapped.length === 0 && !loading && (
//         <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200
//                         rounded-xl px-5 py-4">
//           <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
//           <p className="text-sm text-emerald-800 font-medium">
//             All Oracle groups are mapped. Workflow routing is fully configured.
//           </p>
//         </div>
//       )}

//     </div>
//   );
// }
