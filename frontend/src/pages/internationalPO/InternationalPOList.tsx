// ===== FILE: pages/internationalPO/InternationalPOList.tsx =====
// Save under: src/pages/internationalPO/InternationalPOList.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Globe2, RefreshCw } from 'lucide-react';
import api from '../../api/client';

interface IpoListItem {
  id: string;
  poNo: string | null;
  companyName: string;
  supplierName: string;
  currency: string;
  totalAmount: number;
  status: string;
  brightPoNumber: string | null;
  poDate: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft:            'bg-gray-100 text-gray-600',
  QuotesCollected:  'bg-amber-50 text-amber-700',
  SupplierSelected: 'bg-blue-50 text-blue-700',
  Finalized:        'bg-indigo-50 text-indigo-700',
  SentToBright:     'bg-purple-50 text-purple-700',
  Completed:        'bg-emerald-50 text-emerald-700',
  Cancelled:        'bg-red-50 text-red-700',
};

export default function InternationalPOList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<IpoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/international-po');
      setRows(res.data?.data ?? []);
    } catch (err) {
      console.error('Failed to load International POs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    const matchesSearch =
      (r.poNo ?? '').toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (r.brightPoNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'Draft', 'QuotesCollected', 'SupplierSelected', 'Finalized', 'SentToBright', 'Completed', 'Cancelled'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-blue-600" />
                International Purchase Orders
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Compare vendor quotes and track international POs
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={load}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={() => navigate('/international-po/create')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
                <Plus className="w-4 h-4" /> New International PO
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search PO no, supplier, company, Bright PO no..."
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{s === 'ALL' ? 'All' : s}</button>
              ))}
            </div>
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
            <p className="text-gray-400 text-sm font-medium">No international POs yet.</p>
            <p className="text-gray-300 text-xs mt-1">Click "New International PO" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">PO No</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">PO Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Bright PO No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <tr key={r.id}
                      onClick={() => navigate(`/international-po/${r.id}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.poNo || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{r.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.supplierName}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(r.poDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {r.currency} {r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.brightPoNumber || <span className="text-gray-300">—</span>}</td>
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
