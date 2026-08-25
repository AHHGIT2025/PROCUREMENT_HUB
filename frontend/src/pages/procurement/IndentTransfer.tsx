// // // src/pages/procurement/IndentTransfer.tsx
// import { useEffect, useState, useCallback } from 'react';
// import api from '../../api/client';
// import {
//   RefreshCw, Search, CheckCircle2, AlertTriangle,
//   Send, ChevronDown, ChevronRight, Building2
// } from 'lucide-react';

// interface Item {
//   id: string;
//   materialId: string;
//   itemCode: string;
//   name: string;
//   quantity: number;
//   uom: string;
//   justification: string;
// }
// interface EligiblePR {
//   id: string;
//   requestNumber: string;
//   companyName: string;
//   requesterName: string;
//   projectName: string | null;
//   createdAt: string;
//   totalAmount: number;
//   externalReferenceNo: string | null;
//   items: Item[];
// }
// interface Company {
//   id: string;
//   name: string;
//   code: string;
// }

// function fmtDate(iso: string) {
//   return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
// }

// export default function IndentTransfer() {
//   const [rows, setRows] = useState<EligiblePR[]>([]);
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [search, setSearch] = useState('');
//   const [companyFilter, setCompanyFilter] = useState<string>('');

//   const [expandedId, setExpandedId] = useState<string | null>(null);
//   const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
//   const [procRemark, setProcRemark] = useState<Record<string, string>>({});
//   const [xpeRefNo, setXpeRefNo] = useState<Record<string, string>>({});
//   const [transferring, setTransferring] = useState<string | null>(null);

//   const loadAll = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const [eligibleRes, companiesRes] = await Promise.all([
//         api.get('/indent-transfer/eligible'),
//         api.get('/companies'),
//       ]);
//       setRows(eligibleRes.data?.data ?? eligibleRes.data ?? []);
//       setCompanies(companiesRes.data?.data ?? companiesRes.data ?? []);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? 'Failed to load eligible requests.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadAll(); }, [loadAll]);

//   // Only show companies that actually have eligible PRs pending transfer,
//   // so the dropdown doesn't list 29 companies when only 3 have anything to do.
//   const companiesWithPendingPRs = companies.filter(c =>
//     rows.some(r => r.companyName === c.name)
//   );

//   function toggleExpand(prId: string) {
//     if (expandedId === prId) { setExpandedId(null); return; }
//     setExpandedId(prId);
//   }

//   function toggleItem(prId: string, itemId: string) {
//     setSelectedItems(prev => {
//       const set = new Set(prev[prId] ?? []);
//       if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
//       return { ...prev, [prId]: set };
//     });
//   }

//   function toggleSelectAll(pr: EligiblePR) {
//     setSelectedItems(prev => {
//       const current = prev[pr.id] ?? new Set();
//       const allSelected = current.size === pr.items.length;
//       return { ...prev, [pr.id]: allSelected ? new Set() : new Set(pr.items.map(i => i.id)) };
//     });
//   }

//   async function transfer(pr: EligiblePR) {
//     const selected = Array.from(selectedItems[pr.id] ?? []);
//     if (selected.length === 0) {
//       setError('Select at least one item before transferring.');
//       return;
//     }
//     if (!confirm(
//       `Transfer ${selected.length} item(s) from ${pr.requestNumber} to Bright ERP?\n\n` +
//       `This writes directly to Oracle. This action cannot be undone.`
//     )) return;

//     setTransferring(pr.id);
//     setError(null);
//     try {
//       const res = await api.post(`/indent-transfer/${pr.id}/transfer`, {
//         selectedItemIds: selected,
//         procRemark: procRemark[pr.id] ?? '',
//         xpeRefNo: xpeRefNo[pr.id] ?? '',
//       });
//       setSuccess(res.data?.message ?? 'Transferred successfully.');
//       setExpandedId(null);
//       setSelectedItems(prev => ({ ...prev, [pr.id]: new Set() }));
//       await loadAll();
//       setTimeout(() => setSuccess(null), 5000);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? 'Transfer failed.');
//     } finally {
//       setTransferring(null);
//     }
//   }

//   const filtered = rows
//     .filter(r => !companyFilter || r.companyName === companyFilter)
//     .filter(r =>
//       !search ||
//       r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
//       r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
//       r.requesterName?.toLowerCase().includes(search.toLowerCase())
//     );

//   if (loading) return (
//     <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
//       <RefreshCw size={20} className="animate-spin" /> Loading eligible requests…
//     </div>
//   );

//   return (
//     <div className="space-y-6 pb-10">
//       <div className="flex items-start justify-between border-b pb-4">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-900">Transfer to Bright ERP</h1>
//           <p className="text-sm text-gray-500 mt-0.5">
//             Manually transfer approved indent items to Oracle Bright ERP — replaces the
//             legacy desktop Indent Transfer application. Oracle-integrated companies only.
//           </p>
//         </div>
//         <button onClick={loadAll}
//           className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
//           <RefreshCw size={14} /> Refresh
//         </button>
//       </div>

//       {success && (
//         <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
//           <CheckCircle2 size={15} /> {success}
//         </div>
//       )}
//       {error && (
//         <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
//           <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
//         </div>
//       )}

//       <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
//         <div className="flex flex-col sm:flex-row gap-3">
//           <div className="relative sm:w-72">
//             <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//             <select
//               className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white appearance-none"
//               value={companyFilter}
//               onChange={e => setCompanyFilter(e.target.value)}
//             >
//               <option value="">All Companies ({companiesWithPendingPRs.length})</option>
//               {companiesWithPendingPRs
//                 .sort((a, b) => a.name.localeCompare(b.name))
//                 .map(c => {
//                   const count = rows.filter(r => r.companyName === c.name).length;
//                   return (
//                     <option key={c.id} value={c.name}>
//                       {c.code ? `${c.code} — ${c.name}` : c.name} ({count})
//                     </option>
//                   );
//                 })}
//             </select>
//           </div>

//           <div className="relative flex-1 max-w-xs">
//             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//               className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
//               placeholder="Search request, company, requester…"
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//             />
//           </div>

//           {companyFilter && (
//             <button
//               onClick={() => setCompanyFilter('')}
//               className="text-sm text-blue-600 hover:text-blue-800 px-2"
//             >
//               Clear company filter
//             </button>
//           )}
//         </div>
//       </div>

//       {filtered.length === 0 ? (
//         <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center text-gray-400">
//           {companyFilter
//             ? `No approved requests pending Oracle transfer for ${companyFilter}.`
//             : 'No approved requests pending Oracle transfer.'}
//         </div>
//       ) : (
//         <div className="space-y-3">
//           {filtered.map(pr => {
//             const isOpen = expandedId === pr.id;
//             const selected = selectedItems[pr.id] ?? new Set();
//             const allSelected = selected.size === pr.items.length && pr.items.length > 0;

//             return (
//               <div key={pr.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
//                 <button
//                   onClick={() => toggleExpand(pr.id)}
//                   className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
//                 >
//                   {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-2 flex-wrap">
//                       <span className="font-mono font-bold text-blue-700 text-sm">{pr.requestNumber}</span>
//                       <span className="text-xs text-gray-400">{pr.companyName}</span>
//                     </div>
//                     <p className="text-xs text-gray-400 mt-0.5">
//                       {pr.requesterName} · {pr.projectName ?? 'No Project'} · {fmtDate(pr.createdAt)} · {pr.items.length} item(s) pending
//                     </p>
//                   </div>
//                   <span className="text-sm font-semibold text-gray-700">
//                     QAR {Number(pr.totalAmount).toLocaleString()}
//                   </span>
//                 </button>

//                 {isOpen && (
//                   <div className="border-t border-gray-100 px-5 py-4 space-y-4">
//                     <div className="flex items-center justify-between">
//                       <label className="flex items-center gap-2 text-sm text-gray-600">
//                         <input type="checkbox" checked={allSelected} onChange={() => toggleSelectAll(pr)} />
//                         Select all ({pr.items.length})
//                       </label>
//                       <span className="text-xs text-gray-400">{selected.size} selected</span>
//                     </div>

//                     <div className="divide-y divide-gray-50 border rounded-xl overflow-hidden">
//                       {pr.items.map(item => (
//                         <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
//                           <input
//                             type="checkbox"
//                             checked={selected.has(item.id)}
//                             onChange={() => toggleItem(pr.id, item.id)}
//                           />
//                           <div className="flex-1 min-w-0">
//                             <p className="text-sm font-medium text-gray-800">{item.name}</p>
//                             <p className="text-xs text-gray-400 font-mono">{item.itemCode}</p>
//                           </div>
//                           <span className="text-xs text-gray-500 whitespace-nowrap">{item.quantity} {item.uom}</span>
//                         </label>
//                       ))}
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div>
//                         <label className="text-xs font-medium text-gray-600 mb-1 block">Proc. Remark</label>
//                         <textarea
//                           rows={2}
//                           className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
//                           placeholder="Notes for this transfer…"
//                           value={procRemark[pr.id] ?? ''}
//                           onChange={e => setProcRemark(p => ({ ...p, [pr.id]: e.target.value }))}
//                         />

//                       </div>
//                       <div>
//                         <label className="text-xs font-medium text-gray-600 mb-1 block">Xpe. Ref. No.</label>
//                         <input
//                           className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
//                           placeholder="External reference (optional)"
//                           value={xpeRefNo[pr.id] ?? pr.externalReferenceNo ?? ''}
//                           onChange={e => setXpeRefNo(p => ({ ...p, [pr.id]: e.target.value }))}
//                         />
//                       </div>
//                     </div>

//                     <div className="flex justify-end">
//                       <button
//                         onClick={() => transfer(pr)}
//                         disabled={selected.size === 0 || transferring === pr.id}
//                         className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
//                       >
//                         {transferring === pr.id
//                           ? <><RefreshCw size={14} className="animate-spin" /> Transferring…</>
//                           : <><Send size={14} /> Transfer to ERP</>}
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
// src/pages/procurement/IndentTransfer.tsx
import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import {
  RefreshCw, Search, CheckCircle2, AlertTriangle,
  Send, ChevronDown, ChevronRight, Building2, PackageCheck, Clock
} from 'lucide-react';

interface PendingItem {
  id: string;
  materialId: string;
  itemCode: string;
  name: string;
  quantity: number;
  uom: string;
  justification: string;
}
interface TransferredItem {
  id: string;
  materialId: string;
  itemCode: string;
  name: string;
  quantity: number;
  uom: string;
  oracleDocumentId: string;
  oracleTransferredAt: string;
}
interface EligiblePR {
  id: string;
  requestNumber: string;
  companyName: string;
  requesterName: string;
  projectName: string | null;
  createdAt: string;
  totalAmount: number;
  externalReferenceNo: string | null;
  items: PendingItem[];
}
interface TransferredPR {
  id: string;
  requestNumber: string;
  companyName: string;
  requesterName: string;
  projectName: string | null;
  createdAt: string;
  totalAmount: number;
  externalReferenceNo: string | null;
  items: TransferredItem[];
}
interface Company {
  id: string;
  name: string;
  code: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function IndentTransfer() {
  const [tab, setTab] = useState<'pending' | 'transferred'>('pending');

  const [rows, setRows] = useState<EligiblePR[]>([]);
  const [transferredRows, setTransferredRows] = useState<TransferredPR[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
  const [procRemark, setProcRemark] = useState<Record<string, string>>({});
  const [xpeRefNo, setXpeRefNo] = useState<Record<string, string>>({});
  const [transferring, setTransferring] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eligibleRes, transferredRes, companiesRes] = await Promise.all([
        api.get('/indent-transfer/eligible'),
        api.get('/indent-transfer/transferred'),
        api.get('/companies'),
      ]);
      setRows(eligibleRes.data?.data ?? eligibleRes.data ?? []);
      setTransferredRows(transferredRes.data?.data ?? transferredRes.data ?? []);
      setCompanies(companiesRes.data?.data ?? companiesRes.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Company dropdown source list depends on which tab is active — only show
  // companies that actually have rows in that tab, so the dropdown stays short.
  const activeRowsForCompanyList = tab === 'pending' ? rows : transferredRows;
  const companiesWithPendingPRs = companies.filter(c =>
    activeRowsForCompanyList.some(r => r.companyName === c.name)
  );

  function toggleExpand(prId: string) {
    if (expandedId === prId) { setExpandedId(null); return; }
    setExpandedId(prId);
  }

  function toggleItem(prId: string, itemId: string) {
    setSelectedItems(prev => {
      const set = new Set(prev[prId] ?? []);
      if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
      return { ...prev, [prId]: set };
    });
  }

  function toggleSelectAll(pr: EligiblePR) {
    setSelectedItems(prev => {
      const current = prev[pr.id] ?? new Set();
      const allSelected = current.size === pr.items.length;
      return { ...prev, [pr.id]: allSelected ? new Set() : new Set(pr.items.map(i => i.id)) };
    });
  }

  async function transfer(pr: EligiblePR) {
    const selected = Array.from(selectedItems[pr.id] ?? []);
    if (selected.length === 0) {
      setError('Select at least one item before transferring.');
      return;
    }
    if (!confirm(
      `Transfer ${selected.length} item(s) from ${pr.requestNumber} to Bright ERP?\n\n` +
      `This writes directly to Oracle. This action cannot be undone.`
    )) return;

    setTransferring(pr.id);
    setError(null);
    try {
      const res = await api.post(`/indent-transfer/${pr.id}/transfer`, {
        selectedItemIds: selected,
        procRemark: procRemark[pr.id] ?? '',
        xpeRefNo: xpeRefNo[pr.id] ?? '',
      });
      setSuccess(res.data?.message ?? 'Transferred successfully.');
      setExpandedId(null);
      setSelectedItems(prev => ({ ...prev, [pr.id]: new Set() }));
      await loadAll();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Transfer failed.');
    } finally {
      setTransferring(null);
    }
  }

  const filteredPending = rows
    .filter(r => !companyFilter || r.companyName === companyFilter)
    .filter(r =>
      !search ||
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.requesterName?.toLowerCase().includes(search.toLowerCase())
    );

  const filteredTransferred = transferredRows
    .filter(r => !companyFilter || r.companyName === companyFilter)
    .filter(r =>
      !search ||
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.requesterName?.toLowerCase().includes(search.toLowerCase()) ||
      r.items.some(i => i.oracleDocumentId?.toLowerCase().includes(search.toLowerCase()))
    );

  // Switching tabs should not carry over an expanded row or company filter
  // that might not exist in the other tab's data.
  function switchTab(next: 'pending' | 'transferred') {
    setTab(next);
    setExpandedId(null);
    setCompanyFilter('');
    setSearch('');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={20} className="animate-spin" /> Loading requests…
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transfer to Bright ERP</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manually transfer approved indent items to Oracle Bright ERP — replaces the
            legacy desktop Indent Transfer application. Oracle-integrated companies only.
          </p>
        </div>
        <button onClick={loadAll}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => switchTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'pending'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Clock size={15} /> Pending Transfer ({rows.length})
        </button>
        <button
          onClick={() => switchTab('transferred')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'transferred'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <PackageCheck size={15} /> Transferred ({transferredRows.length})
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative sm:w-72">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white appearance-none"
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
            >
              <option value="">All Companies ({companiesWithPendingPRs.length})</option>
              {companiesWithPendingPRs
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => {
                  const count = activeRowsForCompanyList.filter(r => r.companyName === c.name).length;
                  return (
                    <option key={c.id} value={c.name}>
                      {c.code ? `${c.code} — ${c.name}` : c.name} ({count})
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={tab === 'pending'
                ? 'Search request, company, requester…'
                : 'Search request, company, requester, Oracle Doc ID…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {companyFilter && (
            <button
              onClick={() => setCompanyFilter('')}
              className="text-sm text-blue-600 hover:text-blue-800 px-2"
            >
              Clear company filter
            </button>
          )}
        </div>
      </div>

      {tab === 'pending' ? (
        filteredPending.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center text-gray-400">
            {companyFilter
              ? `No approved requests pending Oracle transfer for ${companyFilter}.`
              : 'No approved requests pending Oracle transfer.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPending.map(pr => {
              const isOpen = expandedId === pr.id;
              const selected = selectedItems[pr.id] ?? new Set();
              const allSelected = selected.size === pr.items.length && pr.items.length > 0;

              return (
                <div key={pr.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleExpand(pr.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-700 text-sm">{pr.requestNumber}</span>
                        <span className="text-xs text-gray-400">{pr.companyName}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {pr.requesterName} · {pr.projectName ?? 'No Project'} · {fmtDate(pr.createdAt)} · {pr.items.length} item(s) pending
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      QAR {Number(pr.totalAmount).toLocaleString()}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" checked={allSelected} onChange={() => toggleSelectAll(pr)} />
                          Select all ({pr.items.length})
                        </label>
                        <span className="text-xs text-gray-400">{selected.size} selected</span>
                      </div>

                      <div className="divide-y divide-gray-50 border rounded-xl overflow-hidden">
                        {pr.items.map(item => (
                          <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.has(item.id)}
                              onChange={() => toggleItem(pr.id, item.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{item.itemCode}</p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{item.quantity} {item.uom}</span>
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Proc. Remark</label>
                          <textarea
                            rows={2}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                            placeholder="Notes for this transfer…"
                            value={procRemark[pr.id] ?? ''}
                            onChange={e => setProcRemark(p => ({ ...p, [pr.id]: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Xpe. Ref. No.</label>
                          <input
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder="External reference (optional)"
                            value={xpeRefNo[pr.id] ?? pr.externalReferenceNo ?? ''}
                            onChange={e => setXpeRefNo(p => ({ ...p, [pr.id]: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => transfer(pr)}
                          disabled={selected.size === 0 || transferring === pr.id}
                          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
                        >
                          {transferring === pr.id
                            ? <><RefreshCw size={14} className="animate-spin" /> Transferring…</>
                            : <><Send size={14} /> Transfer to ERP</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredTransferred.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center text-gray-400">
            {companyFilter
              ? `No transferred requests found for ${companyFilter}.`
              : 'No requests transferred to Oracle yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransferred.map(pr => {
              const isOpen = expandedId === pr.id;

              return (
                <div key={pr.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleExpand(pr.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-700 text-sm">{pr.requestNumber}</span>
                        <span className="text-xs text-gray-400">{pr.companyName}</span>
                        <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <PackageCheck size={11} /> Transferred
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {pr.requesterName} · {pr.projectName ?? 'No Project'} · {pr.items.length} item(s) transferred
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      QAR {Number(pr.totalAmount).toLocaleString()}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      <div className="divide-y divide-gray-50 border rounded-xl overflow-hidden">
                        {pr.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{item.itemCode}</p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{item.quantity} {item.uom}</span>
                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold">
                                Doc ID: {item.oracleDocumentId}
                              </span>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {fmtDateTime(item.oracleTransferredAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
