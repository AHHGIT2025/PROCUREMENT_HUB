// src/pages/settings/OracleMonitor.tsx
import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import {
  RefreshCw, Plus, Trash2, Pencil, Save, X, CheckCircle2, XCircle,
  Clock, Database, Building2, Link2, AlertTriangle,
  ChevronDown, ChevronUp, Activity, Users
} from 'lucide-react';

interface Watermark {
  connectorName: string;
  entityType: string;
  lastWatermark: string;
  updatedAt: string;
}
interface RecentLog {
  module: string;
  status: number;
  message: string;
  createdAt: string;
}
interface SyncStatus {
  watermarks: Watermark[];
  recentLogs: RecentLog[];
}
interface Mapping {
  id: string;
  oracleSource: string;
  branchId: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
}
interface Company {
  id: string;
  code: string;
  name: string;
}
interface SyncResult {
  itemsProcessed: number;
  itemsSkipped: number;
  projectsProcessed: number;
  projectsSkipped: number;
}
interface SupplierSyncResult {
  processed: number;
  created: number;
  updated: number;
}
interface SchedulerStatus {
  enabled: boolean;
  isRunning: boolean;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunSuccess: boolean | null;
  lastRunSummary: string | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  consecutiveFailures: number;
  totalRunsCompleted: number;
  isFailing: boolean;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Qatar'
  });
}

function fmtRelative(iso: string | null) {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return 'just now';
  if (diffMin > 0) return `in ${diffMin} min`;
  return `${Math.abs(diffMin)} min ago`;
}

function StatusDot({ status }: { status: number }) {
  const map: Record<number, { color: string; label: string }> = {
    1: { color: 'bg-amber-400', label: 'Pending' },
    2: { color: 'bg-emerald-500', label: 'Success' },
    3: { color: 'bg-red-500', label: 'Failed' },
    4: { color: 'bg-blue-400', label: 'Retrying' },
  };
  const s = map[status] ?? { color: 'bg-gray-400', label: 'Unknown' };
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${s.color}`} />
      {s.label}
    </span>
  );
}

function StatusCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
        {icon}<span>{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function SchedulerStatusCard({ s }: { s: SchedulerStatus }) {
  const dotColor = s.isFailing ? 'bg-red-500' : s.enabled ? 'bg-emerald-500' : 'bg-gray-400';
  const label = s.isFailing ? 'Failing' : s.enabled ? 'Active' : 'Disabled';
  const labelColor = s.isFailing ? 'text-red-600' : s.enabled ? 'text-emerald-600' : 'text-gray-400';

  return (
    <div className={`rounded-2xl shadow-sm px-5 py-4 border ${
      s.isFailing ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Activity size={14} />
          <span>Auto-Sync Scheduler</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${labelColor}`}>
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          {label}
        </span>
      </div>
      <p className="text-sm text-gray-700">
        {s.isRunning
          ? 'Sync running now…'
          : s.lastRunCompletedAt
            ? `Last run: ${fmtRelative(s.lastRunCompletedAt)} ${s.lastRunSuccess ? '✅' : '❌'}`
            : 'No runs yet'}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        {s.nextRunAt && `Next run: ${fmtRelative(s.nextRunAt)}`}
        {s.consecutiveFailures > 0 && ` · ${s.consecutiveFailures} consecutive failure${s.consecutiveFailures > 1 ? 's' : ''}`}
      </p>
      {s.isFailing && s.lastRunError && (
        <p className="text-xs text-red-600 mt-1 truncate" title={s.lastRunError}>
          {s.lastRunError}
        </p>
      )}
    </div>
  );
}

export default function OracleMonitor() {
  const [status,          setStatus]          = useState<SyncStatus | null>(null);
  const [mappings,        setMappings]        = useState<Mapping[]>([]);
  const [companies,       setCompanies]       = useState<Company[]>([]);
  const [sources,         setSources]         = useState<string[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [syncing,         setSyncing]         = useState<string | null>(null);
  const [syncResult,      setSyncResult]      = useState<Record<string, SyncResult> | null>(null);
  const [supplierSyncResult, setSupplierSyncResult] = useState<Record<string, SupplierSyncResult> | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [showAddForm,     setShowAddForm]     = useState(false);
  const [logsExpanded,    setLogsExpanded]    = useState(false);
  const [deactivating,    setDeactivating]    = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  const [form, setForm] = useState({
    oracleSource: '', branchId: '', companyId: '', notes: '',
  });
  const [formError,  setFormError]  = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // ── Edit mapping ─────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState({
    companyId: '', effectiveFrom: '', effectiveTo: '', notes: '', isActive: true,
  });
  const [editError,  setEditError]  = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // ── Historical mappings (collapsed by default) ──────────────────────────
  const [showHistorical, setShowHistorical] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, mappingRes, companyRes, sourceRes] = await Promise.all([
        api.get('/erp-sync/status'),
        api.get('/oracle-source-mappings'),
        api.get('/companies'),
        api.get('/oracle-source-mappings/sources'),
      ]);
      setStatus(statusRes.data?.data ?? statusRes.data);
      setMappings(mappingRes.data?.data ?? mappingRes.data ?? []);
      setCompanies(companyRes.data?.data ?? companyRes.data ?? []);
      setSources(sourceRes.data?.data ?? sourceRes.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Scheduler status polling (every 30s, independent of main loadAll) ─────
  const loadSchedulerStatus = useCallback(() => {
    api.get('/erp-sync/scheduler-status')
      .then(r => setSchedulerStatus(r.data?.data ?? r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSchedulerStatus();
    const interval = setInterval(loadSchedulerStatus, 30000);
    return () => clearInterval(interval);
  }, [loadSchedulerStatus]);

  // ── Incremental Sync (Items + Projects) ────────────────────────────────────
  async function runSync(source: string) {
    setSyncing(source);
    setSyncResult(null);
    setError(null);
    try {
      const res = await api.post(`/erp-sync/run?source=${source}`);
      setSyncResult(res.data?.data ?? res.data);
      await loadAll();
      loadSchedulerStatus();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Sync failed.');
    } finally {
      setSyncing(null);
    }
  }

  // ── Supplier Sync (manual trigger — full pull, no watermark) ──────────────
  async function runSupplierSync(source: string) {
    setSyncing(`suppliers-${source}`);
    setSupplierSyncResult(null);
    setError(null);
    try {
      const res = await api.post(`/erp-sync/run-suppliers?source=${source}`);
      setSupplierSyncResult(res.data?.data ?? res.data);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Supplier sync failed.');
    } finally {
      setSyncing(null);
    }
  }

  // ── Full Sync (reset watermark + run) ─────────────────────────────────────
  async function runFullSync(source: string) {
    if (!confirm(
      `⚠ Full Sync — ${source}\n\n` +
      `This will reset the watermark and re-pull ALL records from Oracle.\n` +
      `This may take several minutes. Continue?`
    )) return;

    setSyncing(`full-${source}`);
    setSyncResult(null);
    setError(null);
    try {
      await api.post(`/erp-sync/reset-watermark?source=${source}`);
      const res = await api.post(`/erp-sync/run?source=${source}`);
      setSyncResult(res.data?.data ?? res.data);
      await loadAll();
      loadSchedulerStatus();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Full sync failed.');
    } finally {
      setSyncing(null);
    }
  }

  // ── Add Mapping ───────────────────────────────────────────────────────────
  async function saveMapping(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.oracleSource.trim()) return setFormError('Oracle Source is required.');
    if (!form.branchId.trim())     return setFormError('Branch ID is required.');
    if (!form.companyId)           return setFormError('Company is required.');
    setFormSaving(true);
    try {
      await api.post('/oracle-source-mappings', {
        oracleSource: form.oracleSource.trim(),
        branchId:     form.branchId.trim(),
        companyId:    form.companyId,
        notes:        form.notes.trim() || null,
      });
      setForm({ oracleSource: '', branchId: '', companyId: '', notes: '' });
      setShowAddForm(false);
      await loadAll();
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to save mapping.');
    } finally {
      setFormSaving(false);
    }
  }

  // ── Deactivate Mapping ────────────────────────────────────────────────────
  async function deactivate(id: string, branchId: string, companyName: string) {
    if (!confirm(`Deactivate mapping: Branch ${branchId} → ${companyName}?\n\nFuture syncs will skip this branch.`))
      return;
    setDeactivating(id);
    try {
      await api.delete(`/oracle-source-mappings/${id}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to deactivate mapping.');
    } finally {
      setDeactivating(null);
    }
  }

  // ── Edit Mapping ──────────────────────────────────────────────────────────
  // Note: OracleSource / BranchId are NOT editable (matches backend rule —
  // changing them would break sync-history identity). CompanyId, dates,
  // notes, and active status can be changed here.
  function startEdit(m: Mapping) {
    setEditingId(m.id);
    setEditError(null);
    setEditForm({
      companyId:     m.companyId,
      effectiveFrom: m.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo:   m.effectiveTo?.slice(0, 10) ?? '',
      notes:         m.notes ?? '',
      isActive:      m.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    if (!editForm.companyId) { setEditError('Company is required.'); return; }
    if (!editForm.effectiveFrom) { setEditError('Effective From is required.'); return; }
    setEditSaving(true);
    try {
      await api.put(`/oracle-source-mappings/${id}`, {
        companyId:     editForm.companyId,
        effectiveFrom: editForm.effectiveFrom,
        effectiveTo:   editForm.effectiveTo || null,
        notes:         editForm.notes.trim() || null,
        isActive:      editForm.isActive,
      });
      setEditingId(null);
      await loadAll();
    } catch (e: any) {
      setEditError(e?.response?.data?.message ?? e?.message ?? 'Failed to update mapping.');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentMappings  = mappings.filter(m => m.isCurrent);
  const historicMappings = mappings.filter(m => !m.isCurrent);
  const hqItemWm  = status?.watermarks.find(w => w.connectorName === 'BrightOracle-HQ' && w.entityType === 'Item');
  const hqProjWm  = status?.watermarks.find(w => w.connectorName === 'BrightOracle-HQ' && w.entityType === 'Project');
  const visibleLogs = logsExpanded
    ? (status?.recentLogs ?? [])
    : (status?.recentLogs ?? []).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
      <RefreshCw size={20} className="animate-spin" />
      <span>Loading Oracle Monitor…</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Oracle Integration Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bright ERP sync status, branch-to-company mappings, and manual sync controls.
          </p>
        </div>
        <button onClick={() => { loadAll(); loadSchedulerStatus(); }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Failing scheduler banner (only shown when actively failing) */}
      {schedulerStatus?.isFailing && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Auto-sync is failing</p>
            <p className="text-xs text-red-600 mt-0.5">
              {schedulerStatus.consecutiveFailures} consecutive failures.
              {schedulerStatus.lastRunError ? ` Last error: ${schedulerStatus.lastRunError}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium mb-1">✅ Sync completed</p>
          {Object.entries(syncResult).map(([src, r]) => (
            <p key={src} className="text-xs text-emerald-700">
              <strong>{src}:</strong> {r.itemsProcessed} items ({r.itemsSkipped} skipped)
              &nbsp;·&nbsp; {r.projectsProcessed} projects ({r.projectsSkipped} skipped)
            </p>
          ))}
        </div>
      )}

      {/* Supplier Sync Result */}
      {supplierSyncResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <p className="font-medium mb-1">✅ Supplier sync completed</p>
          {Object.entries(supplierSyncResult).map(([src, r]) => (
            <p key={src} className="text-xs text-blue-700">
              <strong>{src}:</strong> {r.processed} suppliers processed
              &nbsp;·&nbsp; {r.created} new &nbsp;·&nbsp; {r.updated} updated
            </p>
          ))}
        </div>
      )}

      {/* Section 1: Status Cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Sync Status — BrightOracle-HQ
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            icon={<Database size={18} className="text-blue-500" />}
            label="Items — Last Synced"
            value={hqItemWm ? fmtDate(hqItemWm.updatedAt) : '—'}
            sub={hqItemWm ? `Watermark: ${hqItemWm.lastWatermark?.slice(0, 10)}` : 'Never synced'}
          />
          <StatusCard
            icon={<Activity size={18} className="text-violet-500" />}
            label="Projects — Last Synced"
            value={hqProjWm ? fmtDate(hqProjWm.updatedAt) : '—'}
            sub={hqProjWm ? `Watermark: ${hqProjWm.lastWatermark?.slice(0, 10)}` : 'Never synced'}
          />
          <StatusCard
            icon={<Link2 size={18} className="text-emerald-500" />}
            label="Active Mappings"
            value={String(currentMappings.length)}
            sub="branch → company"
          />
          <StatusCard
            icon={<Building2 size={18} className="text-amber-500" />}
            label="Companies Mapped"
            value={String(new Set(currentMappings.map(m => m.companyId)).size)}
            sub={`of ${companies.length} total`}
          />
        </div>
      </section>

      {/* Section 1b: Auto-Sync Scheduler Status */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Background Scheduler
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {schedulerStatus ? (
            <SchedulerStatusCard s={schedulerStatus} />
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 text-sm text-gray-400">
              Loading scheduler status…
            </div>
          )}
          <StatusCard
            icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            label="Total Auto-Runs Completed"
            value={schedulerStatus ? String(schedulerStatus.totalRunsCompleted) : '—'}
            sub="since app started"
          />
          <StatusCard
            icon={<Clock size={18} className="text-gray-400" />}
            label="Next Auto-Run"
            value={schedulerStatus?.nextRunAt ? fmtRelative(schedulerStatus.nextRunAt) : '—'}
            sub={schedulerStatus?.nextRunAt ? fmtDate(schedulerStatus.nextRunAt) : 'Scheduler not reporting'}
          />
        </div>
      </section>

      {/* Section 2: Sync Controls */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Run Sync Now</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Incremental sync pulls only new/updated records since the last watermark.
            Auto-sync also runs this in the background every few minutes — manual runs are for on-demand/emergency use.
          </p>
        </div>

        {/* Incremental Sync */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Incremental Sync (Items + Projects):</p>
          <div className="flex flex-wrap gap-3">
            {(['HQ', 'FMCG', 'All'] as const).map(src => (
              <button key={src} onClick={() => runSync(src)} disabled={!!syncing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  syncing === src
                    ? 'bg-blue-100 text-blue-600 cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50'
                }`}>
                <RefreshCw size={14} className={syncing === src ? 'animate-spin' : ''} />
                {syncing === src ? `Syncing ${src}…` : `Run ${src}`}
              </button>
            ))}
          </div>
        </div>

        {/* Supplier Sync */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Supplier Sync:</p>
          <p className="text-xs text-gray-400 mb-2">
            Full pull every time (Oracle Suppliers table has no incremental watermark). Also runs automatically every 15 min.
          </p>
          <div className="flex flex-wrap gap-3">
            {(['HQ', 'FMCG', 'All'] as const).map(src => (
              <button key={src} onClick={() => runSupplierSync(src)} disabled={!!syncing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  syncing === `suppliers-${src}`
                    ? 'bg-indigo-100 text-indigo-600 cursor-wait'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50'
                }`}>
                <Users size={14} className={syncing === `suppliers-${src}` ? 'animate-pulse' : ''} />
                {syncing === `suppliers-${src}` ? `Syncing Suppliers ${src}…` : `Sync Suppliers ${src}`}
              </button>
            ))}
          </div>
        </div>

        {/* Full Sync */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-gray-500 mb-1">
            Full Sync{' '}
            <span className="text-red-500 font-normal">
              — resets watermark and re-pulls ALL records from Oracle
            </span>
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Use this if items or projects are missing. May take several minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            {(['HQ', 'FMCG', 'All'] as const).map(src => (
              <button key={src} onClick={() => runFullSync(src)} disabled={!!syncing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition border ${
                  syncing === `full-${src}`
                    ? 'border-red-200 bg-red-50 text-red-600 cursor-wait'
                    : 'border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50'
                }`}>
                <RefreshCw size={14} className={syncing === `full-${src}` ? 'animate-spin' : ''} />
                {syncing === `full-${src}` ? `Full Syncing ${src}…` : `Full Sync ${src}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Branch Mappings */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">Branch → Company Mappings</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Maps each Oracle branch ID to a company in this system.
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm(v => !v); setFormError(null); }}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-700 transition">
            <Plus size={14} /> Add Mapping
          </button>
        </div>

        {/* Add Mapping Form */}
        {showAddForm && (
          <form onSubmit={saveMapping} className="px-5 py-4 bg-gray-50 border-b space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Oracle Source</label>
                <input list="source-list"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="BrightOracle-HQ"
                  value={form.oracleSource}
                  onChange={e => setForm(f => ({ ...f, oracleSource: e.target.value }))} />
                <datalist id="source-list">
                  {sources.map(s => <option key={s} value={s} />)}
                  <option value="BrightOracle-HQ" />
                  <option value="BrightOracle-FMCG" />
                </datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Branch ID</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. 187"
                  value={form.branchId}
                  onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Company</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.companyId}
                  onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                  <option value="">Select company…</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="optional note"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {formError && <p className="text-red-600 text-xs">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={formSaving}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                {formSaving ? 'Saving…' : 'Save Mapping'}
              </button>
              <button type="button"
                onClick={() => { setShowAddForm(false); setFormError(null); }}
                className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-100 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Mappings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Branch ID</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Effective From</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentMappings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No active mappings. Click "Add Mapping" to create one.
                  </td>
                </tr>
              )}
              {currentMappings.map(m => {
                const isEditing = editingId === m.id;
                return isEditing ? (
                  <tr key={m.id} className="bg-blue-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
                        <div className="text-xs text-gray-500">
                          <span className="block font-medium text-gray-400 mb-1">Source / Branch (fixed)</span>
                          <span className="font-mono">{m.oracleSource} · {m.branchId}</span>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Company</label>
                          <select
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={editForm.companyId}
                            onChange={e => setEditForm(f => ({ ...f, companyId: e.target.value }))}>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Effective From</label>
                          <input type="date"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={editForm.effectiveFrom}
                            onChange={e => setEditForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Effective To <span className="text-gray-300">(leave blank = current)</span>
                          </label>
                          <input type="date"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={editForm.effectiveTo}
                            onChange={e => setEditForm(f => ({ ...f, effectiveTo: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                          <input
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={editForm.notes}
                            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                        <input type="checkbox"
                          checked={editForm.isActive}
                          onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
                        Active
                      </label>
                      {editError && <p className="text-red-600 text-xs mt-2">{editError}</p>}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => saveEdit(m.id)}
                          disabled={editSaving}
                          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                          <Save size={12} /> {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-100 transition">
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{m.oracleSource}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800 font-semibold">{m.branchId}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{m.companyName}</span>
                      <span className="ml-1.5 text-xs text-gray-400">{m.companyCode}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(m.effectiveFrom)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 size={11} /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(m)}
                          title="Edit mapping"
                          className="text-gray-300 hover:text-blue-500 transition">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deactivate(m.id, m.branchId, m.companyName)}
                          disabled={deactivating === m.id}
                          title="Deactivate mapping"
                          className="text-gray-300 hover:text-red-500 transition disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Historical Mappings — now expandable instead of just a count */}
        {historicMappings.length > 0 && (
          <div className="border-t bg-gray-50">
            <button
              onClick={() => setShowHistorical(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:text-gray-800 transition">
              <span>
                {historicMappings.length} historical / closed mapping{historicMappings.length > 1 ? 's' : ''}
              </span>
              {showHistorical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showHistorical && (
              <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Source</th>
                      <th className="px-4 py-2.5 text-left">Branch ID</th>
                      <th className="px-4 py-2.5 text-left">Company</th>
                      <th className="px-4 py-2.5 text-left">Effective From</th>
                      <th className="px-4 py-2.5 text-left">Effective To</th>
                      <th className="px-4 py-2.5 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historicMappings.map(m => (
                      <tr key={m.id} className="text-gray-400">
                        <td className="px-5 py-2.5 font-mono text-xs">{m.oracleSource}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{m.branchId}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-500">{m.companyName}</span>
                          <span className="ml-1.5 text-xs">{m.companyCode}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{fmtDate(m.effectiveFrom)}</td>
                        <td className="px-4 py-2.5 text-xs">{fmtDate(m.effectiveTo)}</td>
                        <td className="px-4 py-2.5 text-xs">{m.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 4: Recent Sync Logs */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Sync Logs</h2>
          <button onClick={() => setLogsExpanded(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition">
            {logsExpanded
              ? <><ChevronUp size={14} /> Show less</>
              : <><ChevronDown size={14} /> Show all</>}
          </button>
        </div>
        {(status?.recentLogs ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            No sync logs yet. Run a sync above to see activity here.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleLogs.map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition">
                <div className="mt-0.5 shrink-0">
                  {log.status === 2
                    ? <CheckCircle2 size={15} className="text-emerald-500" />
                    : log.status === 3
                    ? <XCircle size={15} className="text-red-400" />
                    : <Clock size={15} className="text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">{log.module}</span>
                    <StatusDot status={log.status} />
                    <span className="text-xs text-gray-400 ml-auto">{fmtDate(log.createdAt)}</span>
                  </div>
                  {log.message && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{log.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
