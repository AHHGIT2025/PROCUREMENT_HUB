// ===== FILE: pages/procurement/ProcurementQueue.tsx =====
// Save under: src/pages/procurement/ProcurementQueue.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, RefreshCw, Eye, X, Loader2, Calendar, ListChecks, ArrowRightLeft } from 'lucide-react';
import api from '../../api/client';

const PO_STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
  Blocked:   'bg-amber-50 text-amber-700',
};

export default function ProcurementQueue() {
  const navigate = useNavigate();

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const userRoles: string[] = user.roles ?? [];

  const isManager = userRoles.some(r =>
    ['System Admin', 'Manager', 'Purchase Manager', 'Procurement Manager'].includes(r)
  );

  const [rows, setRows]               = useState<any[]>([]);
  const [companies, setCompanies]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [search, setSearch]           = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFilter, setDateFilter]   = useState('');

  const [assignModal, setAssignModal] = useState(false);
  const [selected, setSelected]       = useState<any>(null);
  const [assignTo, setAssignTo]       = useState('');
  const [assignNote, setAssignNote]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState('');

  // ── Transfer modal state — separate from Assign. Assign is the
  // Manager's original/key assignment; Transfer is a peer-to-peer handoff
  // by whoever currently holds the MR (its effective owner), used to
  // consolidate several MRs onto one officer before combining them into a
  // single PO.
  const [transferModal, setTransferModal] = useState(false);
  const [transferSelected, setTransferSelected] = useState<any>(null);
  const [transferTo, setTransferTo]   = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  const [viewPoRow, setViewPoRow] = useState<any>(null);
  const [poList, setPoList] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  const [viewItemsRow, setViewItemsRow] = useState<any>(null);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const r = await api.get('/procurement/queue');
      setRows(r.data?.data ?? r.data ?? []);
      const c = await api.get('/companies');
      setCompanies(c.data?.data ?? c.data ?? []);
      // team members list is needed by BOTH the Manager's Assign modal AND
      // the officer's Transfer modal, so load it for everyone up front.
      const t = await api.get('/procurement/team-members');
      setTeamMembers(t.data?.data ?? t.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function openAssign(row: any) {
    setSelected(row);
    setAssignTo('');
    setAssignNote('');
    setMsg('');
    setAssignModal(true);
    if (teamMembers.length === 0) {
      try {
        const t = await api.get('/procurement/team-members');
        setTeamMembers(t.data?.data ?? t.data ?? []);
      } catch (e) { console.error(e); }
    }
  }

  // ── open the Transfer modal for an officer's own row ──
  function openTransfer(row: any) {
    setTransferSelected(row);
    setTransferTo('');
    setTransferNote('');
    setTransferMsg('');
    setTransferModal(true);
  }

  async function saveTransfer() {
    if (!transferTo) { setTransferMsg('Please select who to transfer this to.'); return; }
    try {
      setTransferring(true);
      await api.post(`/procurement/${transferSelected.id}/transfer`, {
        transferredToId: transferTo,
        note: transferNote,
      });
      setTransferModal(false);
      await load();
    } catch (e: any) {
      setTransferMsg(e.response?.data?.message ?? 'Failed to transfer.');
    } finally {
      setTransferring(false);
    }
  }

  async function openViewPo(row: any) {
    setViewPoRow(row);
    setPoLoading(true);
    setPoList([]);
    try {
      const r = await api.get('/international-po', { params: { linkedPurchaseRequestId: row.id } });
      setPoList(r.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setPoLoading(false);
    }
  }

  async function openViewItems(row: any) {
    setViewItemsRow(row);
    setItemsLoading(true);
    setItemsList([]);
    try {
      const r = await api.get(`/purchase-requests/${row.id}`);
      setItemsList(r.data?.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setItemsLoading(false);
    }
  }

  function openConvertToPo(row: any) {
    navigate(`/international-po/create?prId=${row.id}`);
  }

  async function saveAssign() {
    if (!assignTo) { setMsg('Please select a team member.'); return; }
    try {
      setSaving(true);
      await api.post(`/procurement/${selected.id}/assign`, {
        assignedToId: assignTo,
        note: assignNote,
      });
      setAssignModal(false);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message ?? 'Failed to assign.');
    } finally {
      setSaving(false);
    }
  }

  async function updateMyStatus(id: string, status: string) {
    try {
      await api.post(`/procurement/${id}/update-status`, { assignmentStatus: status });
      await load();
    } catch (e) { console.error(e); }
  }

  // officer visibility uses effectiveOwnerId (falls back to assignedToId
  // if the backend hasn't been updated yet / field is missing) instead of
  // assignedToId directly. This is what makes a transferred MR show up in
  // the new owner's queue instead of staying stuck under the original
  // Manager-assigned officer.
  const visibleRows = isManager
    ? rows
    : rows.filter(r => (r.effectiveOwnerId ?? r.assignedToId) === user.id);

  const filtered = visibleRows
    .filter(r =>
      !search ||
      r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.requesterName?.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(r => !companyFilter || r.companyName === companyFilter)
    .filter(r => {
      if (!dateFilter) return true;
      const rowDate = new Date(r.createdAt).toISOString().slice(0, 10);
      return rowDate === dateFilter;
    });

  const totalCount      = visibleRows.length;
  const unassignedCount = visibleRows.filter(r => !r.assignedToName).length;
  const inProgressCount = visibleRows.filter(r => r.assignmentStatus === 'ASSIGNED' || r.assignmentStatus === 'IN_PROGRESS').length;
  const completedCount  = visibleRows.filter(r => r.assignmentStatus === 'COMPLETED').length;

  // team members list minus the current user (can't transfer to yourself)
  const transferCandidates = teamMembers.filter(m => m.id !== user.id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800">Procurement Queue</h1>
              <p className="text-gray-500 text-sm mt-1">
                {isManager ? 'Assign approved requests to your team' : 'Your assigned procurement tasks'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Logged in as</p>
              <p className="text-sm font-semibold text-gray-700">{user.fullName}</p>
              <p className="text-xs text-blue-600">{userRoles.join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',       value: totalCount,      color: 'border-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
            { label: 'Unassigned',  value: unassignedCount, color: 'border-gray-400',    bg: 'bg-gray-50',    text: 'text-gray-700'    },
            { label: 'In Progress', value: inProgressCount, color: 'border-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
            { label: 'Completed',   value: completedCount,  color: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
          ].map(c => (
            <div key={c.label} className={`${c.bg} rounded-2xl border-l-4 ${c.color} shadow-sm p-4`}>
              <p className={`text-xs font-medium ${c.text} opacity-80`}>{c.label}</p>
              <p className={`text-3xl font-bold ${c.text} mt-1`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Company + Date */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search request, company, requester..."
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">All Companies</option>
              {companies.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Clear date
              </button>
            )}

            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              <RefreshCw className="w-4 h-4" />
            </button>

            <span className="text-xs text-gray-400 ml-auto">{filtered.length} records</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 text-sm font-medium">
              {isManager ? 'No requests match these filters.' : 'No tasks assigned to you yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(isManager
                      ? ['#', 'Request No', 'Company', 'Requester', 'Amount', 'Assigned To', 'Action']
                      : ['#', 'Request No', 'Company', 'Amount', 'Status / Action']
                    ).map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row, i) => {
                    const isTaskCompleted = row.assignmentStatus === 'COMPLETED';
                    return (
                      <tr key={row.id} className={`hover:bg-blue-50/30 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>

                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>

                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-blue-700 text-xs">{row.requestNumber}</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{row.companyName}</td>

                        {isManager && (
                          <td className="px-4 py-3 text-gray-600 text-xs">{row.requesterName}</td>
                        )}

                        <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">
                          QAR {Number(row.totalAmount).toLocaleString()}
                        </td>

                        {isManager && (
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {row.assignedToName
                              ? <span className="font-medium text-gray-800">{row.assignedToName}</span>
                              : <span className="text-gray-300 italic">Unassigned</span>}
                            {/* shows when the original assignee has since
                                handed this off to someone else, so a Manager
                                glancing at the list isn't confused by who's
                                actually working it now. */}
                            {row.isTransferred && row.transferredToName && (
                              <p className="text-[11px] text-indigo-500 mt-0.5 flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3" /> → {row.transferredToName}
                              </p>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3">
                          {isManager ? (
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              {/* FIXED — Reassign is now hidden once the row
                                  is Fully Converted (all items already on a
                                  PO), not just when assignmentStatus is
                                  COMPLETED. A fully converted MR has nothing
                                  left to reassign — reassigning at that point
                                  makes no sense and was confusing on the
                                  "View PO" popup shown in the screenshot.
                                  If the PO later gets unposted/reversed and
                                  isFullyConverted flips back to false (e.g.
                                  a revision path), this button reappears
                                  automatically since it's driven by that
                                  same flag — no separate toggle needed. */}
                              {!isTaskCompleted && !row.isFullyConverted && (
                                <button onClick={() => openAssign(row)}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition shadow-sm whitespace-nowrap">
                                  <UserPlus className="w-3 h-3" />
                                  {row.assignedToName ? 'Reassign' : 'Assign'}
                                </button>
                              )}
                              <button onClick={() => openViewPo(row)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition whitespace-nowrap">
                                <Eye className="w-3 h-3" /> View PO
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-nowrap flex-wrap">
                              {/* shows when this MR was transferred TO the
                                  current officer, so they know it didn't
                                  come from their manager directly. */}
                              {row.isTransferred && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium whitespace-nowrap flex items-center gap-1">
                                  <ArrowRightLeft className="w-2.5 h-2.5" /> Transferred to you
                                </span>
                              )}
                              {!row.isFullyConverted && (
                                <button onClick={() => openViewItems(row)}
                                  title="See what materials are on this MR"
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition whitespace-nowrap">
                                  <ListChecks className="w-3 h-3" /> View Items
                                </button>
                              )}
                              {row.assignmentStatus && row.assignmentStatus !== 'UNASSIGNED' && (
                                <select
                                  value={row.isFullyConverted ? 'COMPLETED' : row.assignmentStatus}
                                  disabled={row.isFullyConverted}
                                  onChange={e => updateMyStatus(row.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400">
                                  {!row.isFullyConverted && <option value="ASSIGNED">Assigned</option>}
                                  {!row.isFullyConverted && <option value="IN_PROGRESS">In Progress</option>}
                                  <option value="COMPLETED">Completed</option>
                                </select>
                              )}
                              {row.canUpdatePO && (
                                <button onClick={() => openConvertToPo(row)}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-sm whitespace-nowrap">
                                  Convert to PO
                                </button>
                              )}
                              {/* Transfer — lets the officer currently
                                  holding this MR hand it off to a peer, e.g.
                                  to consolidate several MRs onto one person
                                  before combining them into a single PO.
                                  Hidden once fully converted (nothing left
                                  to hand off at that point). */}
                              {!row.isFullyConverted && (
                                <button onClick={() => openTransfer(row)}
                                  title="Hand this MR off to another officer"
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition whitespace-nowrap">
                                  <ArrowRightLeft className="w-3 h-3" /> Transfer
                                </button>
                              )}
                              {!row.canUpdatePO && row.isFullyConverted && (
                                <>
                                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap">
                                    Fully Converted
                                  </span>
                                  <button onClick={() => openViewPo(row)}
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition whitespace-nowrap">
                                    <Eye className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN MODAL (Manager) */}
      {assignModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 rounded-t-2xl">
              <h2 className="font-bold text-blue-900 text-lg">
                {selected.assignedToName ? 'Reassign Task' : 'Assign Task'}
              </h2>
              <p className="text-xs text-blue-600 mt-0.5">{selected.requestNumber} — {selected.companyName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Assign To *</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select team member...</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Note (optional)</label>
                <textarea value={assignNote} onChange={e => setAssignNote(e.target.value)}
                  rows={3} placeholder="Instructions for the assignee..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              {msg && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setAssignModal(false)}
                className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancel</button>
              <button onClick={saveAssign} disabled={saving}
                className="px-5 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition">
                {saving ? 'Saving...' : (selected.assignedToName ? 'Reassign' : 'Assign Task')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL (Officer, peer-to-peer handoff) */}
      {transferModal && transferSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 rounded-t-2xl">
              <h2 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> Transfer MR
              </h2>
              <p className="text-xs text-indigo-600 mt-0.5">{transferSelected.requestNumber} — {transferSelected.companyName}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Hand this MR off to another officer — useful when combining several MRs onto
                one person before converting them into a single PO. Your manager's original
                assignment stays on record either way.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Transfer To *</label>
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Select officer...</option>
                  {transferCandidates.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Note (optional)</label>
                <textarea value={transferNote} onChange={e => setTransferNote(e.target.value)}
                  rows={3} placeholder="Why you're handing this off..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
              {transferMsg && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{transferMsg}</p>}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setTransferModal(false)}
                className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancel</button>
              <button onClick={saveTransfer} disabled={transferring}
                className="px-5 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition">
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PO POPUP — shared by both Manager and Officer */}
      {viewPoRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="font-bold text-gray-800">Purchase Orders</h2>
                <p className="text-xs text-gray-400 mt-0.5">{viewPoRow.requestNumber} — {viewPoRow.companyName}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  viewPoRow.isFullyConverted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {viewPoRow.isFullyConverted ? 'Fully Converted' : 'Items Pending'}
                </span>
              </div>
              <button onClick={() => setViewPoRow(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {poLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : poList.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No PO created for this MR yet.</p>
              ) : (
                <div className="space-y-2">
                  {poList.map(po => (
                    <div key={po.id}
                      onClick={() => navigate(`/international-po/${po.id}`)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 cursor-pointer transition">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{po.poNo || 'No PO No'}</p>
                        <p className="text-xs text-gray-400">
                          {po.supplierName} · {po.currency} {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {po.brightPoNumber && ` · Bright: ${po.brightPoNumber}`}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PO_STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {po.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW ITEMS POPUP — Officer only, before Convert to PO */}
      {viewItemsRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="font-bold text-gray-800">MR Items</h2>
                <p className="text-xs text-gray-400 mt-0.5">{viewItemsRow.requestNumber} — {viewItemsRow.companyName}</p>
              </div>
              <button onClick={() => setViewItemsRow(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : itemsList.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No items found on this request.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['#', 'Code', 'Material', 'Qty', 'UOM', 'Unit Price', 'Line Total'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {itemsList.map((item: any, i: number) => (
                        <tr key={item.id ?? i} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">{item.materialCode}</td>
                          <td className="px-3 py-2.5 text-gray-800 font-medium">{item.materialName}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-800">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-gray-500">{item.uom}</td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            {Number(item.estimatedUnitPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-blue-700 whitespace-nowrap">
                        {(Number(item.quantity || 0) * Number(item.estimatedUnitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
