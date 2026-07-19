// ===== FILE: pages/rfq/RfqList.tsx =====
// Save under: src/pages/rfq/RfqList.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Plus, Search, RefreshCw, Users, FileCheck2 } from 'lucide-react';
import api from '../../api/client';

interface RfqListItem {
  id: string;
  rfqNumber: string;
  title: string;
  companyName: string;
  status: string;
  closingDateTime: string | null;
  supplierCount: number;
  quotationCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Issued:    'bg-amber-50 text-amber-700',
  Closed:    'bg-blue-50 text-blue-700',
  Awarded:   'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

export default function RfqList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RfqListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfq');
      setRows(res.data?.data ?? []);
    } catch (err) {
      console.error('Failed to load RFQs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    const matchesSearch =
      r.rfqNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'Draft', 'Issued', 'Closed', 'Awarded', 'Cancelled'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                Request for Quotation (RFQ)
              </h1>
              <p className="text-gray-500 text-sm mt-1">Structured multi-vendor sourcing &amp; bidding</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={() => navigate('/rfq/create')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
                <Plus className="w-4 h-4" /> Create RFQ
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
                placeholder="Search RFQ no, title, company..."
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
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} RFQs</span>
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
            <p className="text-gray-400 text-sm font-medium">No RFQs yet.</p>
            <p className="text-gray-300 text-xs mt-1">Click "Create RFQ" to start sourcing from multiple vendors.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">RFQ No</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Closing</th>
                    <th className="px-4 py-3 text-center">Suppliers</th>
                    <th className="px-4 py-3 text-center">Quotes</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => navigate(`/rfq/${r.id}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.rfqNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{r.title}</td>
                      <td className="px-4 py-3 text-gray-500">{r.companyName}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.closingDateTime ? new Date(r.closingDateTime).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3.5 h-3.5" /> {r.supplierCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <FileCheck2 className="w-3.5 h-3.5" /> {r.quotationCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
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
