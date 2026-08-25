// // ===== FILE: pages/internationalPO/InternationalPOList.tsx =====
// // Save under: src/pages/internationalPO/InternationalPOList.tsx

// import { useEffect, useMemo, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Plus, Search, Globe2, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
// import api from '../../api/client';

// interface IpoListItem {
//   id: string;
//   poNo: string | null;
//   companyName: string;
//   supplierName: string;
//   currency: string;
//   totalAmount: number;
//   status: string;
//   brightPoNumber: string | null;
//   poDate: string;
//   createdAt: string;
//   isInternational: boolean;
//   mrReferenceNumber: string | null;
//   linkedRequestNumber: string | null;
// }

// const STATUS_COLORS: Record<string, string> = {
//   Draft:     'bg-gray-100 text-gray-600',
//   Completed: 'bg-emerald-50 text-emerald-700',
//   Cancelled: 'bg-red-50 text-red-700',
// };

// // A row's MR reference for grouping — prefer the actual linked MR number,
// // fall back to the free-text reference if this PO isn't system-linked.
// const mrRefOf = (r: IpoListItem) => r.linkedRequestNumber || r.mrReferenceNumber || '';

// type ListEntry =
//   | { type: 'group'; mrRef: string; rows: IpoListItem[]; latestCreatedAt: string }
//   | { type: 'standalone'; row: IpoListItem };

// export default function InternationalPOList() {
//   const navigate = useNavigate();
//   const [rows, setRows] = useState<IpoListItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [filterStatus, setFilterStatus] = useState('ALL');
//   const [expanded, setExpanded] = useState<Set<string>>(new Set());

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get('/international-po');
//       setRows(res.data?.data ?? []);
//     } catch (err) {
//       console.error('Failed to load International POs', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   const toggleExpanded = (mrRef: string) => {
//     setExpanded(prev => {
//       const next = new Set(prev);
//       if (next.has(mrRef)) next.delete(mrRef); else next.add(mrRef);
//       return next;
//     });
//   };

//   // ── Apply search/status filters first, then group what's left ──
//   const filteredRows = rows.filter(r => {
//     const q = search.toLowerCase();
//     const matchesSearch =
//       (r.poNo ?? '').toLowerCase().includes(q) ||
//       r.supplierName.toLowerCase().includes(q) ||
//       r.companyName.toLowerCase().includes(q) ||
//       (r.brightPoNumber ?? '').toLowerCase().includes(q) ||
//       mrRefOf(r).toLowerCase().includes(q);
//     const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
//     return matchesSearch && matchesStatus;
//   });

//   // ── Build grouped entries: ANY PO with an MR reference becomes a group
//   // (even a group of 1), styled consistently and expandable. Only POs with
//   // no MR reference at all (fully manual, standalone) show as plain rows. ──
//   const entries: ListEntry[] = useMemo(() => {
//     const byMr: Record<string, IpoListItem[]> = {};
//     const standalone: IpoListItem[] = [];

//     filteredRows.forEach(r => {
//       const ref = mrRefOf(r);
//       if (!ref) { standalone.push(r); return; }
//       (byMr[ref] ||= []).push(r);
//     });

//     const groupEntries: ListEntry[] = Object.entries(byMr).map(([mrRef, groupRows]) => {
//       const sorted = [...groupRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//       return { type: 'group', mrRef, rows: sorted, latestCreatedAt: sorted[0].createdAt } as ListEntry;
//     });

//     const standaloneEntries: ListEntry[] = standalone.map(row => ({ type: 'standalone', row }));

//     const all = [...groupEntries, ...standaloneEntries];
//     all.sort((a, b) => {
//       const aDate = a.type === 'group' ? a.latestCreatedAt : a.row.createdAt;
//       const bDate = b.type === 'group' ? b.latestCreatedAt : b.row.createdAt;
//       return new Date(bDate).getTime() - new Date(aDate).getTime();
//     });
//     return all;
//   }, [filteredRows]);

//   // While actively searching, auto-expand every group so matches aren't hidden.
//   const isSearching = search.trim().length > 0;

//   const statuses = ['ALL', 'Draft', 'Completed', 'Cancelled'];

//   const renderPoRow = (r: IpoListItem, indent: boolean) => (
//     <tr key={r.id}
//       onClick={() => navigate(`/international-po/${r.id}`)}
//       className={`hover:bg-blue-50/50 cursor-pointer transition ${indent ? 'bg-gray-50/40' : ''}`}>
//       <td className={`px-4 py-3 ${indent ? 'pl-10' : ''}`}>
//         <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
//           r.isInternational ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
//         }`}>
//           {r.isInternational ? 'Intl' : 'Local'}
//         </span>
//       </td>
//       <td className="px-4 py-3 font-medium text-gray-800">{r.poNo || <span className="text-gray-300 font-normal">No PO No</span>}</td>
//       <td className="px-4 py-3 text-gray-600">{r.companyName}</td>
//       <td className="px-4 py-3 text-gray-600">{r.supplierName}</td>
//       <td className="px-4 py-3 text-gray-500">{new Date(r.poDate).toLocaleDateString()}</td>
//       <td className="px-4 py-3 text-right font-medium text-gray-800">
//         {r.currency} {r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//       </td>
//       <td className="px-4 py-3">
//         <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
//           {r.status}
//         </span>
//       </td>
//       <td className="px-4 py-3 text-gray-500">{r.brightPoNumber || <span className="text-gray-300">—</span>}</td>
//     </tr>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto space-y-5">

//         {/* Header */}
//         <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//           <div className="flex items-center justify-between">
//             <div className="border-l-4 border-blue-600 pl-4">
//               <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
//                 <Globe2 className="w-6 h-6 text-blue-600" />
//                 Purchase Orders
//               </h1>
//               <p className="text-gray-500 text-sm mt-1">
//                 Every PO is grouped under its source MR — click to expand
//               </p>
//             </div>
//             <div className="flex gap-2">
//               <button onClick={load}
//                 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
//                 <RefreshCw className="w-4 h-4" /> Refresh
//               </button>
//               <button onClick={() => navigate('/international-po/create')}
//                 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
//                 <Plus className="w-4 h-4" /> New PO
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
//           <div className="flex flex-wrap gap-3 items-center">
//             <div className="relative">
//               <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
//               <input value={search} onChange={e => setSearch(e.target.value)}
//                 placeholder="Search PO no, MR ref, supplier, company, Bright PO no..."
//                 className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-300" />
//             </div>
//             <div className="flex gap-1.5 flex-wrap">
//               {statuses.map(s => (
//                 <button key={s} onClick={() => setFilterStatus(s)}
//                   className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
//                     filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                   }`}>{s === 'ALL' ? 'All' : s}</button>
//               ))}
//             </div>
//             <span className="text-xs text-gray-400 ml-auto">{filteredRows.length} POs</span>
//           </div>
//         </div>

//         {/* Table */}
//         {loading ? (
//           <div className="bg-white rounded-2xl border p-12 text-center">
//             <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
//             <p className="text-gray-400 text-sm">Loading...</p>
//           </div>
//         ) : entries.length === 0 ? (
//           <div className="bg-white rounded-2xl border p-12 text-center">
//             <p className="text-gray-400 text-sm font-medium">No purchase orders yet.</p>
//             <p className="text-gray-300 text-xs mt-1">Click "New PO" to create one.</p>
//           </div>
//         ) : (
//           <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
//                     <th className="px-4 py-3">Type</th>
//                     <th className="px-4 py-3">PO No / MR Ref</th>
//                     <th className="px-4 py-3">Company</th>
//                     <th className="px-4 py-3">Supplier</th>
//                     <th className="px-4 py-3">PO Date</th>
//                     <th className="px-4 py-3 text-right">Total</th>
//                     <th className="px-4 py-3">Status</th>
//                     <th className="px-4 py-3">Bright PO No</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100">
//                   {entries.map(entry => {
//                     if (entry.type === 'standalone') {
//                       return renderPoRow(entry.row, false);
//                     }

//                     const isOpen = isSearching || expanded.has(entry.mrRef);
//                     const groupTotal = entry.rows.reduce((sum, r) => sum + r.totalAmount, 0);
//                     const currency = entry.rows[0]?.currency || '';

//                     return (
//                       <>
//                         <tr key={`group-${entry.mrRef}`}
//                           onClick={() => toggleExpanded(entry.mrRef)}
//                           className="bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition">
//                           <td className="px-4 py-3" colSpan={2}>
//                             <div className="flex items-center gap-2">
//                               {isOpen ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
//                               <Package className="w-3.5 h-3.5 text-amber-600" />
//                               <span className="font-semibold text-gray-800">{entry.mrRef}</span>
//                               <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
//                                 {entry.rows.length} {entry.rows.length === 1 ? 'PO' : 'POs'}
//                               </span>
//                             </div>
//                           </td>
//                           <td className="px-4 py-3 text-gray-400 text-xs" colSpan={3}>
//                             {entry.rows[0]?.companyName}
//                           </td>
//                           <td className="px-4 py-3 text-right font-medium text-gray-700">
//                             {currency} {groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                           </td>
//                           <td className="px-4 py-3 text-xs text-gray-400" colSpan={2}>
//                             {isOpen ? 'Click to collapse' : 'Click to expand'}
//                           </td>
//                         </tr>
//                         {isOpen && entry.rows.map(r => renderPoRow(r, true))}
//                       </>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
// ===== FILE: pages/internationalPO/InternationalPOList.tsx =====
// Save under: src/pages/internationalPO/InternationalPOList.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Globe2, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
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
  isInternational: boolean;
  mrReferenceNumber: string | null;
  linkedRequestNumber: string | null;
  // ── NEW: full set of MR numbers this PO's items actually came from.
  // Populated by the backend for both single-MR POs (one entry, same
  // info as linkedRequestNumber) and multi-MR combined POs (several
  // entries). Falls back to the older single fields when absent, so
  // older API responses / cached data don't break this page.
  linkedMrNumbers?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

// ── CHANGED: a row's grouping key is now every MR it's linked to, not
// just one. A PO combining MR-A and MR-B will now appear (and be
// clickable to expand from) under BOTH MR-A's group and MR-B's group —
// so whichever MR reference someone recognizes, they'll find the PO.
const mrRefsOf = (r: IpoListItem): string[] => {
  if (r.linkedMrNumbers && r.linkedMrNumbers.length > 0) return r.linkedMrNumbers;
  const single = r.linkedRequestNumber || r.mrReferenceNumber || '';
  return single ? [single] : [];
};

// Display label for a group header — for a genuinely multi-MR PO this
// still groups per-MR (see above), so this only ever needs to show the
// single MR the group itself is keyed on. Kept as a separate helper in
// case that changes later.
const primaryMrRefOf = (r: IpoListItem): string => mrRefsOf(r)[0] ?? '';

type ListEntry =
  | { type: 'group'; mrRef: string; rows: IpoListItem[]; latestCreatedAt: string }
  | { type: 'standalone'; row: IpoListItem };

export default function InternationalPOList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<IpoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (mrRef: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(mrRef)) next.delete(mrRef); else next.add(mrRef);
      return next;
    });
  };

  // ── Apply search/status filters first, then group what's left ──
  const filteredRows = rows.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch =
      (r.poNo ?? '').toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      (r.brightPoNumber ?? '').toLowerCase().includes(q) ||
      mrRefsOf(r).some(ref => ref.toLowerCase().includes(q));
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ── CHANGED: a PO now gets bucketed into a group for EVERY MR it's
  // linked to (not just one). A single-MR PO behaves exactly as before —
  // one group, one entry. A multi-MR PO shows up once per MR group, each
  // time alongside that MR's other POs, so it's discoverable from any of
  // its source MRs. Only POs with no MR reference at all show standalone. ──
  const entries: ListEntry[] = useMemo(() => {
    const byMr: Record<string, IpoListItem[]> = {};
    const standalone: IpoListItem[] = [];

    filteredRows.forEach(r => {
      const refs = mrRefsOf(r);
      if (refs.length === 0) { standalone.push(r); return; }
      refs.forEach(ref => { (byMr[ref] ||= []).push(r); });
    });

    const groupEntries: ListEntry[] = Object.entries(byMr).map(([mrRef, groupRows]) => {
      const sorted = [...groupRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { type: 'group', mrRef, rows: sorted, latestCreatedAt: sorted[0].createdAt } as ListEntry;
    });

    const standaloneEntries: ListEntry[] = standalone.map(row => ({ type: 'standalone', row }));

    const all = [...groupEntries, ...standaloneEntries];
    all.sort((a, b) => {
      const aDate = a.type === 'group' ? a.latestCreatedAt : a.row.createdAt;
      const bDate = b.type === 'group' ? b.latestCreatedAt : b.row.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return all;
  }, [filteredRows]);

  const isSearching = search.trim().length > 0;

  const statuses = ['ALL', 'Draft', 'Completed', 'Cancelled'];

  const renderPoRow = (r: IpoListItem, indent: boolean) => {
    const refs = mrRefsOf(r);
    const isMultiMr = refs.length > 1;
    return (
      <tr key={r.id}
        onClick={() => navigate(`/international-po/${r.id}`)}
        className={`hover:bg-blue-50/50 cursor-pointer transition ${indent ? 'bg-gray-50/40' : ''}`}>
        <td className={`px-4 py-3 ${indent ? 'pl-10' : ''}`}>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            r.isInternational ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {r.isInternational ? 'Intl' : 'Local'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-medium text-gray-800">{r.poNo || <span className="text-gray-300 font-normal">No PO No</span>}</span>
          {/* ── NEW: small badge flagging this PO as combining several
              MRs, with all of them listed on hover via title attr. Only
              shown on the indented (grouped) row, not the group header
              itself, to avoid cluttering the collapsed view. ── */}
          {indent && isMultiMr && (
            <span title={refs.join(', ')}
              className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-600">
              {refs.length} MRs
            </span>
          )}
        </td>
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-blue-600" />
                Purchase Orders
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Every PO is grouped under its source MR — click to expand. POs combining multiple MRs appear under each.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={load}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={() => navigate('/international-po/create')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
                <Plus className="w-4 h-4" /> New PO
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
                placeholder="Search PO no, MR ref, supplier, company, Bright PO no..."
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{s === 'ALL' ? 'All' : s}</button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filteredRows.length} POs</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 text-sm font-medium">No purchase orders yet.</p>
            <p className="text-gray-300 text-xs mt-1">Click "New PO" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">PO No / MR Ref</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">PO Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Bright PO No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map(entry => {
                    if (entry.type === 'standalone') {
                      return renderPoRow(entry.row, false);
                    }

                    const isOpen = isSearching || expanded.has(entry.mrRef);
                    const groupTotal = entry.rows.reduce((sum, r) => sum + r.totalAmount, 0);
                    const currency = entry.rows[0]?.currency || '';

                    return (
                      <>
                        <tr key={`group-${entry.mrRef}`}
                          onClick={() => toggleExpanded(entry.mrRef)}
                          className="bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition">
                          <td className="px-4 py-3" colSpan={2}>
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                              <span className="font-semibold text-gray-800">{entry.mrRef}</span>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                {entry.rows.length} {entry.rows.length === 1 ? 'PO' : 'POs'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs" colSpan={3}>
                            {entry.rows[0]?.companyName}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {currency} {groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400" colSpan={2}>
                            {isOpen ? 'Click to collapse' : 'Click to expand'}
                          </td>
                        </tr>
                        {isOpen && entry.rows.map(r => renderPoRow(r, true))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
