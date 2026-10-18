// Save under: src/pages/procurement/CompanyFollowUp.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, RefreshCw, Eye } from 'lucide-react';
import api from '../../api/client';

const STATUS_COLORS: Record<string, string> = {
  Draft:              'bg-gray-100 text-gray-600',
  Submitted:          'bg-blue-50 text-blue-700',
  PendingApproval:    'bg-amber-50 text-amber-700',
  Approved:           'bg-emerald-50 text-emerald-700',
  Rejected:           'bg-red-50 text-red-700',
  Returned:           'bg-orange-50 text-orange-700',
  OracleReady:        'bg-indigo-50 text-indigo-700',
  OraclePosted:       'bg-teal-50 text-teal-700',
  FulfilledFromStock: 'bg-purple-50 text-purple-700',
};

const STATUS_LABELS: Record<string, string> = {
  PendingApproval: 'Pending Approval',
  OracleReady:     'Ready For Oracle',
  OraclePosted:    'Posted To Oracle',
  FulfilledFromStock: 'Fulfilled From Stock',
};

export default function CompanyFollowUp() {
  const navigate = useNavigate();

  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter]     = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const r = await api.get('/purchase-requests/company-followup');
      setRows(r.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const statuses = Array.from(new Set(rows.map(r => r.status))).sort();

  const filtered = rows
    .filter(r =>
      !search ||
      r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy?.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.currentApproverName?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(r => !statusFilter || r.status === statusFilter)
    .filter(r => {
      if (!dateFilter) return true;
      const rowDate = new Date(r.createdAt).toISOString().slice(0, 10);
      return rowDate === dateFilter;
    });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="border-l-4 border-blue-600 pl-4">
            <h1 className="text-2xl font-bold text-gray-800">Company Follow-Up</h1>
            <p className="text-gray-500 text-sm mt-1">
              All requests across your assigned company — read-only, for tracking and follow-up
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search request, requester, approver..."
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
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
            <p className="text-gray-400 text-sm font-medium">No requests found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Request No', 'Company', 'Department', 'Requester', 'Amount', 'Status', 'Currently With', 'Days Open', ''].map(h => (
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

                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{row.companyName}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.departmentName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.requestedBy}</td>

                      <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">
                        QAR {Number(row.totalAmount).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600">
                        {row.currentApproverName ? (
                          <>
                            <span className="font-medium text-gray-800">{row.currentApproverName}</span>
                            {row.currentStageName && (
                              <p className="text-[11px] text-gray-400 mt-0.5">{row.currentStageName}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className={row.daysOpen > 7 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {row.daysOpen}d
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button onClick={() => window.open(`/purchase-requests/${row.id}/print`, '_blank', 'noopener,noreferrer')}
                          title="View / Print MR"
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition whitespace-nowrap">
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
