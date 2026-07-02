import { useEffect, useState } from 'react';
import api from '../../api/client';

const ASSIGN_STATUS: Record<string, string> = {
  UNASSIGNED:  'bg-gray-100 text-gray-600',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
};

const PO_STATUS: Record<string, string> = {
  PENDING:  'bg-gray-100 text-gray-500',
  ISSUED:   'bg-emerald-100 text-emerald-700',
  HOLD:     'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function Badge({ text, cls }: { text: string; cls: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{text}</span>;
}

export default function ProcurementQueue() {

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const userRoles: string[] = user.roles ?? [];

  // ✅ FIXED: Purchase Manager added
  const isManager = userRoles.some(r =>
    ['System Admin', 'Manager', 'Purchase Officer', 'Purchase Manager'].includes(r)
  );

  const [rows, setRows]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [search, setSearch]           = useState('');
  const [filterPo, setFilterPo]       = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [assignModal, setAssignModal] = useState(false);
  const [poModal, setPoModal]         = useState(false);
  const [selected, setSelected]       = useState<any>(null);

  const [assignTo, setAssignTo]     = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [poNumber, setPoNumber]     = useState('');
  const [poStatus, setPoStatus]     = useState('ISSUED');
  const [poRemarks, setPoRemarks]   = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const r = await api.get('/procurement/queue');
      setRows(r.data?.data ?? r.data ?? []);
      if (isManager) {
        const t = await api.get('/procurement/team-members');
        setTeamMembers(t.data?.data ?? t.data ?? []);
      }
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
    try {
      const t = await api.get('/procurement/team-members');
      setTeamMembers(t.data?.data ?? t.data ?? []);
    } catch (e) { console.error(e); }
  }

  function openPO(row: any) {
    setSelected(row);
    setPoNumber(row.poNumber ?? '');
    setPoStatus(row.poStatus === 'PENDING' ? 'ISSUED' : row.poStatus ?? 'ISSUED');
    setPoRemarks(row.poRemarks ?? '');
    setMsg('');
    setPoModal(true);
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

  async function savePO() {
    if (!poNumber.trim()) { setMsg('Please enter PO Number.'); return; }
    try {
      setSaving(true);
      await api.post(`/procurement/${selected.id}/po-update`, {
        poNumber,
        poStatus,
        remarks: poRemarks,
      });
      setPoModal(false);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message ?? 'Failed to update PO.');
    } finally {
      setSaving(false);
    }
  }

  // ✅ Manager sees ALL rows, team member sees only assigned to them
  const visibleRows = isManager
    ? rows
    : rows.filter(r => r.assignedToId === user.id);

  const filtered = visibleRows
    .filter(r => filterPo === 'ALL' || (r.poStatus ?? '').toUpperCase() === filterPo)
    .filter(r => filterStatus === 'ALL' || r.status === filterStatus)
    .filter(r =>
      !search ||
      r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.requesterName?.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      (r.poNumber ?? '').toLowerCase().includes(search.toLowerCase())
    );

  const totalCount    = visibleRows.length;
  const approvedCount = visibleRows.filter(r => r.canUpdatePO).length;
  const poIssuedCount = visibleRows.filter(r => r.poStatus === 'ISSUED').length;
  const assignedCount = visibleRows.filter(r => r.assignmentStatus === 'ASSIGNED' || r.assignmentStatus === 'IN_PROGRESS').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800">Procurement Queue</h1>
              <p className="text-gray-500 text-sm mt-1">
                {isManager
                  ? 'Manage approved requests — assign to team and track PO updates'
                  : 'Your assigned procurement tasks'}
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
            { label: 'Total',        value: totalCount,    color: 'border-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
            { label: 'In Progress',  value: assignedCount, color: 'border-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
            { label: 'Ready for PO', value: approvedCount, color: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
            { label: 'PO Issued',    value: poIssuedCount, color: 'border-purple-400',  bg: 'bg-purple-50',  text: 'text-purple-700'  },
          ].map(c => (
            <div key={c.label} className={`${c.bg} rounded-2xl border-l-4 ${c.color} shadow-sm p-4`}>
              <p className={`text-xs font-medium ${c.text} opacity-80`}>{c.label}</p>
              <p className={`text-3xl font-bold ${c.text} mt-1`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search request, requester, PO..."
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'Approved', 'PO Issued'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap ml-auto">
              <span className="text-xs text-gray-400 self-center">PO:</span>
              {['ALL', 'PENDING', 'ISSUED', 'HOLD', 'REJECTED'].map(s => (
                <button key={s} onClick={() => setFilterPo(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterPo === s ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{s}</button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{filtered.length} records</span>
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
              {isManager ? 'No requests in queue.' : 'No tasks assigned to you yet.'}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {isManager ? 'Approved PRs will appear here.' : 'Your manager will assign tasks to you.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Request No', 'Company', 'Requester', 'Amount',
                      'PR Status', 'Assigned To', 'Task Status', 'PO No', 'PO Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row, i) => (
                    <tr key={row.id} className={`hover:bg-blue-50/30 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>

                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>

                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-700 text-xs">{row.requestNumber}</span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate">{row.companyName}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.requesterName}</td>

                      <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">
                        QAR {Number(row.totalAmount).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          row.status === 'Approved'     ? 'bg-emerald-100 text-emerald-700' :
                          row.status === 'PO Issued'    ? 'bg-teal-100 text-teal-700'       :
                          row.status === 'Oracle Ready' ? 'bg-blue-100 text-blue-700'       :
                          'bg-slate-100 text-slate-600'
                        }`}>{row.status}</span>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600">
                        {row.assignedToName
                          ? <span className="font-medium text-gray-800">{row.assignedToName}</span>
                          : <span className="text-gray-300 italic">Unassigned</span>}
                        {row.assignmentNote && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[100px]" title={row.assignmentNote}>
                            {row.assignmentNote}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          text={row.assignmentStatus ?? 'UNASSIGNED'}
                          cls={ASSIGN_STATUS[row.assignmentStatus] ?? 'bg-gray-100 text-gray-500'}
                        />
                      </td>

                      <td className="px-4 py-3 text-xs font-mono text-gray-700">
                        {row.poNumber
                          ? <span className="font-semibold text-emerald-700">{row.poNumber}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          text={row.poStatus ?? 'PENDING'}
                          cls={PO_STATUS[row.poStatus] ?? 'bg-gray-100 text-gray-500'}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          {/* MANAGER (Purchase Manager / System Admin / Manager) — Assign + PO Update */}
                          {isManager && (
                            <>
                              <button onClick={() => openAssign(row)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition shadow-sm whitespace-nowrap">
                                {row.assignedToName ? 'Reassign' : 'Assign'}
                              </button>
                              <button onClick={() => openPO(row)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition shadow-sm whitespace-nowrap">
                                PO Update
                              </button>
                            </>
                          )}

                          {/* TEAM MEMBER (Purchase Officer) — Status update + PO Update */}
                          {!isManager && (
                            <>
                              {row.assignmentStatus && row.assignmentStatus !== 'UNASSIGNED' && (
                                <select value={row.assignmentStatus}
                                  onChange={e => updateMyStatus(row.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300">
                                  <option value="ASSIGNED">Assigned</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                              )}
                              {row.canUpdatePO && (
                                <button onClick={() => openPO(row)}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition shadow-sm whitespace-nowrap">
                                  PO Update
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN MODAL */}
      {assignModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 rounded-t-2xl">
              <h2 className="font-bold text-blue-900 text-lg">Assign Task</h2>
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
                {saving ? 'Assigning...' : 'Assign Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO UPDATE MODAL */}
      {poModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 rounded-t-2xl">
              <h2 className="font-bold text-emerald-900 text-lg">Update PO — Bright ERP</h2>
              <p className="text-xs text-emerald-600 mt-0.5">{selected.requestNumber} — {selected.companyName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">PO Number *</label>
                <input value={poNumber} onChange={e => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-00123"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">PO Status *</label>
                <div className="flex gap-2">
                  {[
                    { val: 'ISSUED',   label: 'Issued',   active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'border-gray-200 text-gray-500' },
                    { val: 'HOLD',     label: 'On Hold',  active: 'bg-amber-500 text-white border-amber-500',     inactive: 'border-gray-200 text-gray-500' },
                    { val: 'REJECTED', label: 'Rejected', active: 'bg-red-500 text-white border-red-500',         inactive: 'border-gray-200 text-gray-500' },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setPoStatus(opt.val)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition ${
                        poStatus === opt.val ? opt.active : opt.inactive}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Remarks (optional)</label>
                <textarea value={poRemarks} onChange={e => setPoRemarks(e.target.value)}
                  rows={3} placeholder="Any notes about this PO..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
              </div>
              {msg && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{msg}</p>}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setPoModal(false)}
                className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancel</button>
              <button onClick={savePO} disabled={saving}
                className="px-5 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition">
                {saving ? 'Saving...' : 'Update PO'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
