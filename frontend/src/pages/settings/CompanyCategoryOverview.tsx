// src/pages/settings/CompanyCategoryOverview.tsx
// Route suggestion: /settings/company-categories
// Flow: Select company → see category breakdown → click a category →
//       see items → bulk-move all, or override individual items.

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, ChevronDown, ChevronRight, Loader2, ArrowRight,
  CheckCircle2, AlertTriangle, X, Search, Boxes
} from 'lucide-react';
import api from '../../api/client';

// ── Category meta (same palette as ItemCategoryFlowManager) ─────────────────
const CAT_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  GENERAL:    { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: '📦' },
  IT:         { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '💻' },
  IT_ASSET:   { color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', icon: '📁' },
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

// ── Types ─────────────────────────────────────────────────────────────────
interface Company { id: string; code: string; name: string; }
interface Category { id: string; code: string; name: string; }
interface Breakdown {
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
  itemCount: number;
}
interface CompanyItem {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
  createdAt: string;
  updatedAt: string | null;
  isManualOverride: boolean;
}

export default function CompanyCategoryOverview() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [companyId, setCompanyId]     = useState('');
  const [breakdown, setBreakdown]     = useState<Breakdown[]>([]);
  const [loadingBreak, setLoadingBreak] = useState(false);

  const [expanded, setExpanded]       = useState<string>('');   // categoryId or 'null' for uncategorized
  const [items, setItems]             = useState<CompanyItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemSearch, setItemSearch]   = useState('');

  const [bulkTarget, setBulkTarget]   = useState('');
  const [bulkSaving, setBulkSaving]   = useState(false);

  const [itemSaving, setItemSaving]   = useState<string | null>(null);
  const [itemTarget, setItemTarget]   = useState<Record<string, string>>({});

  const [groupFilter, setGroupFilter] = useState('');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedSaving, setSelectedSaving] = useState(false);

  const [success, setSuccess]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  // ── Load base lists ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data?.data ?? r.data ?? []));
    api.get('/item-categories').then(r => setCategories(r.data?.data ?? r.data ?? []));
  }, []);

  // ── Load breakdown when company changes ────────────────────────────────
  const loadBreakdown = useCallback(async (cid: string) => {
    if (!cid) { setBreakdown([]); return; }
    setLoadingBreak(true);
    setExpanded('');
    setItems([]);
    try {
      const r = await api.get('/item-categories/company-breakdown', { params: { companyId: cid } });
      setBreakdown(r.data?.data ?? r.data ?? []);
    } catch {
      flash('error', 'Failed to load category breakdown.');
    } finally {
      setLoadingBreak(false);
    }
  }, []);

  useEffect(() => { loadBreakdown(companyId); }, [companyId, loadBreakdown]);

  // ── Load items for expanded category ───────────────────────────────────
  async function loadItems(categoryId: string | null) {
    setLoadingItems(true);
    try {
      const r = await api.get('/item-categories/company-items', {
        params: {
          companyId,
          categoryId: categoryId ?? undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }
      });
      setItems(r.data?.data ?? r.data ?? []);
    } catch {
      flash('error', 'Failed to load items.');
    } finally {
      setLoadingItems(false);
    }
  }

  function toggleCategory(row: Breakdown) {
    const key = row.categoryId ?? 'null';
    if (expanded === key) { setExpanded(''); setItems([]); return; }
    setExpanded(key);
    setBulkTarget('');
    setSelectedIds(new Set());
    setSelectedTarget('');
    setGroupFilter('');
    setItemSearch('');
    loadItems(row.categoryId);
  }

  // ── Bulk move all items in this category ───────────────────────────────
  async function bulkMove(fromRow: Breakdown) {
    if (!bulkTarget) return;
    const target = categories.find(c => c.id === bulkTarget);
    if (!target) return;

    const confirmed = window.confirm(
      `Move ALL ${fromRow.itemCount} items in "${fromRow.categoryName}" (this company only) → "${target.name}"?\n\n` +
      `This only affects this company's items, not the global Oracle group mapping.`
    );
    if (!confirmed) return;

    setBulkSaving(true);
    setError(null);
    try {
      const r = await api.post('/item-categories/bulk-move', {
        companyId,
        fromCategoryId: fromRow.categoryId,
        toCategoryId: bulkTarget,
      });
      flash('success', r.data?.message ?? 'Items moved.');
      setExpanded('');
      setItems([]);
      setBulkTarget('');
      await loadBreakdown(companyId);
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Bulk move failed.');
    } finally {
      setBulkSaving(false);
    }
  }

  // ── Individual item override ────────────────────────────────────────────
  async function moveItem(itemId: string) {
    const catId = itemTarget[itemId];
    if (!catId) return;
    const target = categories.find(c => c.id === catId);
    if (!target) return;

    setItemSaving(itemId);
    setError(null);
    try {
      await api.put(`/materials/${itemId}/category`, { categoryId: catId });
      flash('success', `Item moved to "${target.name}".`);
      setItems(prev => prev.filter(i => i.id !== itemId));
      await loadBreakdown(companyId);
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Update failed.');
    } finally {
      setItemSaving(null);
    }
  }

  // ── Move only the checked items ─────────────────────────────────────────
  async function moveSelected() {
    if (!selectedTarget || selectedIds.size === 0) return;
    const target = categories.find(c => c.id === selectedTarget);
    if (!target) return;

    const confirmed = window.confirm(`Move ${selectedIds.size} selected item(s) → "${target.name}"?`);
    if (!confirmed) return;

    setSelectedSaving(true);
    setError(null);
    try {
      const r = await api.post('/item-categories/move-items', {
        itemIds: Array.from(selectedIds),
        toCategoryId: selectedTarget,
      });
      flash('success', r.data?.message ?? 'Items moved.');
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setSelectedTarget('');
      await loadBreakdown(companyId);
    } catch (e: any) {
      flash('error', e?.response?.data?.message ?? 'Move failed.');
    } finally {
      setSelectedSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  }

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 4000); }
    else { setError(msg); setSuccess(null); setTimeout(() => setError(null), 5000); }
  }

  const distinctGroups = Array.from(new Set(items.map(i => i.groupName).filter(Boolean))) as string[];

  const filteredItems = items.filter(i =>
    (!itemSearch ||
      i.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.name.toLowerCase().includes(itemSearch.toLowerCase())) &&
    (!groupFilter || i.groupName === groupFilter)
  );

  const totalItems = breakdown.reduce((s, b) => s + b.itemCount, 0);

  return (
    <div className="space-y-5 pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Company Category Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a company to see how its items are split across categories. Fix wrong ones — bulk or one at a time.
        </p>
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

      {/* Company selector */}
      <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3">
        <Building2 size={16} className="text-gray-400" />
        <select
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white min-w-64"
        >
          <option value="">— Select a company —</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
        {totalItems > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{totalItems.toLocaleString()} total items</span>
        )}
      </div>

      {!companyId && (
        <div className="text-center py-16 text-gray-400">
          <Boxes size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Select a company above to see its category breakdown.</p>
        </div>
      )}

      {companyId && loadingBreak && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Loading breakdown…
        </div>
      )}

      {/* Category breakdown cards */}
      {companyId && !loadingBreak && (
        <div className="space-y-3">
          {breakdown.map(row => {
            const meta   = getMeta(row.categoryCode);
            const key    = row.categoryId ?? 'null';
            const isOpen = expanded === key;

            return (
              <div key={key} className="bg-white border rounded-2xl overflow-hidden shadow-sm"
                style={{ borderColor: isOpen ? meta.border : '#e5e7eb' }}>

                <button
                  onClick={() => toggleCategory(row)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{row.categoryName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                        style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                        {row.categoryCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{row.itemCount.toLocaleString()} items in this company</p>
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t" style={{ borderColor: meta.border }}>

                    {/* Bulk move bar */}
                    <div className="px-5 py-3 flex items-center gap-3 flex-wrap" style={{ background: meta.bg }}>
                      <span className="text-xs font-medium" style={{ color: meta.color }}>
                        Move ALL {row.itemCount} items in this category →
                      </span>
                      <select
                        value={bulkTarget}
                        onChange={e => setBulkTarget(e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-xs bg-white min-w-40"
                      >
                        <option value="">Select target category…</option>
                        {categories.filter(c => c.id !== row.categoryId).map(c => (
                          <option key={c.id} value={c.id}>{getMeta(c.code).icon} {c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => bulkMove(row)}
                        disabled={!bulkTarget || bulkSaving}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {bulkSaving ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                        Move All
                      </button>
                      <span className="text-xs text-gray-400 ml-auto">
                        Bulk move affects this company only — global Oracle group mapping is unchanged.
                      </span>
                    </div>

                    {/* Item search + group filter */}
                    <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-3 flex-wrap">
                      <div className="relative max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={itemSearch}
                          onChange={e => setItemSearch(e.target.value)}
                          placeholder="Search items in this category…"
                          className="w-full border rounded-lg pl-8 pr-3 py-2 text-xs"
                        />
                      </div>
                      {distinctGroups.length > 0 && (
                        <select
                          value={groupFilter}
                          onChange={e => setGroupFilter(e.target.value)}
                          className="border rounded-lg px-2 py-2 text-xs bg-white min-w-40"
                        >
                          <option value="">All groups</option>
                          {distinctGroups.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">From</span>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => setFromDate(e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-xs"
                        />
                        <span className="text-xs text-gray-400">To</span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => setToDate(e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-xs"
                        />
                        <button
                          onClick={() => loadItems(row.categoryId)}
                          className="px-2.5 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium"
                        >
                          Apply
                        </button>
                      </div>
                      {(itemSearch || groupFilter || fromDate || toDate) && (
                        <button
                          onClick={() => {
                            setItemSearch(''); setGroupFilter('');
                            setFromDate(''); setToDate('');
                            loadItems(row.categoryId);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear filters
                        </button>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {filteredItems.length} of {items.length} items
                      </span>
                    </div>

                    {/* Selected items bulk-move bar */}
                    {selectedIds.size > 0 && (
                      <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-blue-800">
                          {selectedIds.size} item(s) selected
                        </span>
                        <select
                          value={selectedTarget}
                          onChange={e => setSelectedTarget(e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-xs bg-white min-w-40"
                        >
                          <option value="">Move selected to…</option>
                          {categories.filter(c => c.id !== row.categoryId).map(c => (
                            <option key={c.id} value={c.id}>{getMeta(c.code).icon} {c.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={moveSelected}
                          disabled={!selectedTarget || selectedSaving}
                          className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {selectedSaving ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                          Move Selected
                        </button>
                        <button
                          onClick={() => setSelectedIds(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}

                    {/* Item list — individual override */}
                    {loadingItems ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center">
                        <Loader2 size={14} className="animate-spin" /> Loading items…
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No items match.</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b sticky top-0 z-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs font-medium text-gray-500">Select all ({filteredItems.length})</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {filteredItems.map(it => (
                            <div key={it.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(it.id)}
                                onChange={() => toggleSelect(it.id)}
                                className="w-4 h-4 rounded border-gray-300 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-gray-800 truncate">{it.name}</p>
                                  {it.isManualOverride && (
                                    <span
                                      title="Manually moved — won't be overwritten by Oracle sync unless the item's group changes"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                                    >
                                      🔒 Manual
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 font-mono">
                                  {it.code} {it.groupName ? `· ${it.groupName}` : ''}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Created {new Date(it.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  {it.updatedAt && it.updatedAt !== it.createdAt && (
                                    <> · Modified {new Date(it.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                                  )}
                                </p>
                              </div>
                              <select
                                value={itemTarget[it.id] ?? ''}
                                onChange={e => setItemTarget(p => ({ ...p, [it.id]: e.target.value }))}
                                className="border rounded-lg px-2 py-1.5 text-xs bg-white min-w-36 shrink-0"
                              >
                                <option value="">Move to…</option>
                                {categories.filter(c => c.id !== row.categoryId).map(c => (
                                  <option key={c.id} value={c.id}>{getMeta(c.code).icon} {c.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => moveItem(it.id)}
                                disabled={!itemTarget[it.id] || itemSaving === it.id}
                                className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-40 shrink-0"
                              >
                                {itemSaving === it.id ? <Loader2 size={11} className="animate-spin" /> : 'Move'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {items.length > 500 && (
                      <div className="px-5 py-2 bg-gray-50 border-t text-xs text-gray-400 text-center">
                        Showing first 500 items. Use search to narrow down.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
