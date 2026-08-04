// // ===== FILE: pages/internationalPO/InternationalPODetail.tsx =====
// // Save under: src/pages/internationalPO/InternationalPODetail.tsx

// import { useEffect, useState } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import {
//   ArrowLeft, Globe2, Truck, Plus, Trash2, Loader2, X,
//   Building2, FileText, Printer, RefreshCw, Package,
//   CreditCard, Landmark, Pencil, CheckCircle2, GitBranch,
//   Ban, PlayCircle, RotateCcw
// } from 'lucide-react';
// import api from '../../api/client';

// const STATUS_COLORS: Record<string, string> = {
//   Draft:      'bg-gray-100 text-gray-600',
//   Completed:  'bg-emerald-50 text-emerald-700',
//   Cancelled:  'bg-red-50 text-red-700',
//   Blocked:    'bg-amber-50 text-amber-700',
//   Superseded: 'bg-indigo-50 text-indigo-700',
// };

// export default function InternationalPODetail() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [po, setPo] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [actionLoading, setActionLoading] = useState(false);

//   const [showAddItem, setShowAddItem] = useState(false);
//   const [showEdit, setShowEdit] = useState(false);
//   const [showComplete, setShowComplete] = useState(false);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get(`/international-po/${id}`);
//       setPo(res.data?.data ?? res.data);
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to load PO.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); }, [id]);

//   const removeItem = async (itemId: string) => {
//     if (!confirm('Remove this item line?')) return;
//     try {
//       await api.delete(`/international-po/${id}/items/${itemId}`);
//       await load();
//     } catch (err) { console.error(err); }
//   };

//   // ── NEW — inline qty/rate edit for unlocked item rows (used on
//   // revisions, where MR-linked items become editable again) ──
//   const updateItemQty = async (itemId: string, qty: number, rate: number, discountAmount: number) => {
//     try {
//       await api.put(`/international-po/${id}/items/${itemId}`, { qty, rate, discountAmount });
//       await load();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to update item.');
//     }
//   };

//   const changeStatus = async (status: string, confirmMsg: string) => {
//     if (!confirm(confirmMsg)) return;
//     setError('');
//     setActionLoading(true);
//     try {
//       await api.put(`/international-po/${id}/status`, { status });
//       await load();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to update status.');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   // ── CHANGED — prompts for a revision reason before creating, and sends
//   // it along so it's recorded on the new revision for audit clarity.
//   const createRevision = async () => {
//     const reason = prompt(`Reason for revising ${po.poNo}? (e.g. "Supplier short-supplied 5 of 10 qty")`);
//     if (reason === null) return; // user cancelled the prompt
//     if (!confirm(`Create a revision of ${po.poNo}? A new editable draft PO will be created, and this PO will be marked as superseded.`)) return;
//     setError('');
//     setActionLoading(true);
//     try {
//       const res = await api.post(`/international-po/${id}/create-revision`, { reason: reason.trim() || null });
//       const newId = res.data?.data?.id;
//       navigate(`/international-po/${newId}`);
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to create revision.');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   if (loading) return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//       <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
//     </div>
//   );

//   if (!po) return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//       <p className="text-gray-400">{error || 'PO not found.'}</p>
//     </div>
//   );

//   const isCompleted = po.status === 'Completed';
//   const isCancelled = po.status === 'Cancelled';
//   const isBlocked = po.status === 'Blocked';

//   // ── CHANGED — status-based now, not id-based. supersededByPoId used to
//   // stay truthy even after the linked revision got Cancelled; the backend
//   // now flips this PO's status back to Completed in that case, so status
//   // is the reliable signal.
//   const isSuperseded = po.status === 'Superseded';

//   // ── CHANGED — MR-lock only applies to the ORIGINAL PO (revisionNumber
//   // === 0). A revision's whole purpose is correcting quantities against
//   // what was originally ordered, so it stays editable even when MR-linked.
// const isRevision = po.revisionNumber > 0;
// const itemsLocked = isCompleted || isCancelled || isBlocked || isSuperseded ||
//                      (!!po.linkedRequestNumber && !isRevision);
// const headerLocked = isCompleted || isCancelled || isBlocked || isSuperseded;

// // ── NEW: separate from itemsLocked. A revision on an MR-linked PO can
// // still EDIT its existing items (qty/rate correction against what the
// // MR originally approved), but must never let a brand-new, untracked
// // item get added — that item would have no MR approval behind it at
// // all. Manual (non-MR) POs are unaffected — they can always add items
// // as long as they're not itemsLocked.
// const canAddNewItem = !itemsLocked && !po.linkedRequestNumber;

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-6xl mx-auto space-y-5">

//         {/* Header */}
//         <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//           <div className="flex items-start justify-between mb-4">
//             <div className="flex items-center gap-3">
//               <button onClick={() => navigate('/international-po')}
//                 className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
//                 <ArrowLeft className="w-5 h-5" />
//               </button>
//               <div className={`border-l-4 pl-4 ${po.isInternational ? 'border-blue-600' : 'border-emerald-600'}`}>
//                 <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
//                   {po.isInternational
//                     ? <Globe2 className="w-6 h-6 text-blue-600" />
//                     : <Truck className="w-6 h-6 text-emerald-600" />}
//                   {po.poNo || `${po.isInternational ? 'International' : 'Local'} PO (Draft)`}
//                   {po.revisionNumber > 0 && (
//                     <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-1">
//                       Rev {po.revisionNumber}
//                     </span>
//                   )}
//                 </h1>
//                 <p className="text-gray-500 text-sm mt-1">
//                   {po.companyName} → {po.supplier?.name || 'No supplier selected'}
//                   {po.linkedRequestNumber && (
//                     <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
//                       <Package className="w-3 h-3" /> from {po.linkedRequestNumber}
//                     </span>
//                   )}
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-2">
//               <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
//                 <RefreshCw className="w-4 h-4" /> Refresh
//               </button>
//               <button onClick={() => window.open(`/international-po/${id}/print`, '_blank')}
//                 className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
//                 <Printer className="w-4 h-4" /> Print
//               </button>

//               {!headerLocked && (
//                 <button onClick={() => setShowEdit(true)}
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
//                   <Pencil className="w-4 h-4" /> Edit
//                 </button>
//               )}

//               {/* Block / Unblock — available on Draft or Completed, not on Cancelled/Superseded */}
//               {!isCancelled && !isSuperseded && !isBlocked && (
//                 <button onClick={() => changeStatus('Blocked', 'Block this PO? It will be held from further action until unblocked.')}
//                   disabled={actionLoading}
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
//                   <Ban className="w-4 h-4" /> Block
//                 </button>
//               )}
//             {isBlocked && (
//   <button onClick={() => changeStatus('Draft', 'Unblock this PO? It will return to its previous status.')}
//     disabled={actionLoading}
//     className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
//     <PlayCircle className="w-4 h-4" /> Unblock
//   </button>
// )}

//               {/* Return to Draft — only from Completed, and only if not yet revised
//               {isCompleted && !isSuperseded && (
//                 <button onClick={() => changeStatus('Draft', 'Return this PO to Draft for a quick correction? Use "Create Revision" instead if this needs a formal versioned change.')}
//                   disabled={actionLoading}
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50">
//                   <RotateCcw className="w-4 h-4" /> Return to Draft
//                 </button>
//               )} */}

//               {/* Create Revision — only from Completed, not yet revised */}
//               {isCompleted && !isSuperseded && (
//                 <button onClick={createRevision}
//                   disabled={actionLoading}
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50">
//                   <GitBranch className="w-4 h-4" /> Create Revision
//                 </button>
//               )}

//               {/* Cancel — permanent, not available once superseded or already cancelled */}
//               {!isCancelled && !isSuperseded && (
//                 <button onClick={() => changeStatus('Cancelled', 'Cancel this PO? This is permanent and cannot be undone.')}
//                   disabled={actionLoading}
//                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50">
//                   <X className="w-4 h-4" /> Cancel
//                 </button>
//               )}

//               {!headerLocked && (
//                 <button onClick={() => setShowComplete(true)}
//                   className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition">
//                   <CheckCircle2 className="w-4 h-4" /> Mark Complete
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="flex items-center gap-2 flex-wrap">
//             <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-600'}`}>
//               {po.status}
//             </span>
//             {po.parentPoNo && (
//               <span className="text-xs text-gray-400">
//                 Revised from{' '}
//                 <button onClick={() => navigate(`/international-po/${po.parentPoId}`)} className="text-indigo-600 hover:underline font-medium">
//                   {po.parentPoNo}
//                 </button>
//               </span>
//             )}
//             {po.supersededByPoNo && (
//               <span className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-3 py-1.5 flex items-center gap-1.5">
//                 <GitBranch className="w-3 h-3" />
//                 Superseded by{' '}
//                 <button onClick={() => navigate(`/international-po/${po.supersededByPoId}`)} className="underline font-medium">
//                   {po.supersededByPoNo}
//                 </button>
//               </span>
//             )}
//           </div>

//           {/* ── NEW — shows the reason typed in when this revision was created ── */}
//           {po.revisionReason && (
//             <p className="text-xs text-gray-400 mt-2 italic">Revision reason: {po.revisionReason}</p>
//           )}
//         </div>

//         {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
//           {/* Main column */}
//           <div className="lg:col-span-2 space-y-5">

//             {/* Items */}
//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//              <div className="flex items-center justify-between mb-4">
//   <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
//     <Package className="w-4 h-4" /> Items ({po.items?.length ?? 0})
//   </h2>
//   {canAddNewItem && (
//     <button onClick={() => setShowAddItem(true)}
//       className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
//       <Plus className="w-3.5 h-3.5" /> Add Item
//     </button>
//   )}
// </div>

//               {itemsLocked && !isCompleted && !isCancelled && !isBlocked && !isSuperseded && (
//                 <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">
//                   Items are locked to what was pulled from MR {po.linkedRequestNumber}. Create a new PO for any remaining quantity.
//                 </p>
//               )}

//               {/* ── NEW — tells the officer why items are editable on a revision ── */}
//              {!itemsLocked && isRevision && po.linkedRequestNumber && (
//   <p className="text-[11px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 mb-3">
//     This is a revision — adjust quantities to match what was actually confirmed/received.
//     Any reduced quantity automatically frees up remaining balance on MR {po.linkedRequestNumber}.
//     New items can't be added here since they wouldn't be traceable to the original MR — create a separate PO for anything not already on this list.
//   </p>
// )}
//               <div className="space-y-2">
//                 {(po.items ?? []).map((item: any) => (
//                   <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl gap-3">
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-gray-800 truncate">{item.itemName}</p>
//                       <p className="text-xs text-gray-400">{item.itemCode} · {item.uom}</p>
//                     </div>

//                     {/* ── CHANGED — qty/rate become editable inline whenever
//                         itemsLocked is false (covers both a fresh Draft PO and
//                         an unlocked revision) ── */}
//                     {!itemsLocked ? (
//                       <div className="flex items-center gap-2 shrink-0">
//                         <input type="number" min={0} step={1} defaultValue={item.qty}
//                           onBlur={e => updateItemQty(item.id, parseFloat(e.target.value) || 0, item.rate, item.discountAmount)}
//                           className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
//                         <input type="number" min={0} step="0.01" defaultValue={item.rate}
//                           onBlur={e => updateItemQty(item.id, item.qty, parseFloat(e.target.value) || 0, item.discountAmount)}
//                           className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
//                       </div>
//                     ) : (
//                       <p className="text-xs text-gray-400 shrink-0">{item.qty} {item.uom} · Rate {item.rate.toFixed(2)}</p>
//                     )}

//                     <div className="flex items-center gap-3 shrink-0">
//                       <span className="text-sm font-semibold text-gray-800">{po.currency} {item.amount.toFixed(2)}</span>
//                       {!itemsLocked && (
//                         <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500">
//                           <Trash2 className="w-3.5 h-3.5" />
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//                 {(!po.items || po.items.length === 0) && (
//                   <p className="text-center text-gray-300 text-sm py-8">No items added yet.</p>
//                 )}
//               </div>
//             </div>

//             {/* Terms */}
//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//               <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
//                 <FileText className="w-4 h-4" /> Terms &amp; Conditions
//               </h2>
//               <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans leading-relaxed">{po.termsAndConditions}</pre>
//             </div>
//           </div>

//           {/* Sidebar */}
//           <div className="space-y-5">
//             {/* Totals */}
//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//               <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
//               <div className="space-y-2 text-sm">
//                 <Row label="Sub Total" value={`${po.currency} ${po.subTotal?.toFixed(2)}`} />
//                 <Row label="Discount" value={`- ${po.currency} ${po.discountAmount?.toFixed(2)}`} />
//                 <Row label="Insurance" value={`+ ${po.currency} ${po.insuranceAmount?.toFixed(2)}`} />
//                 <Row label="Others" value={`+ ${po.currency} ${po.othersAmount?.toFixed(2)}`} />
//                 <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
//                   <span className="font-semibold text-gray-800">Total</span>
//                   <span className="font-bold text-blue-700">{po.currency} {po.totalAmount?.toFixed(2)}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Payment Details */}
//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//               <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
//                 <CreditCard className="w-4 h-4" /> Payment Details
//               </h2>
//               <div className="space-y-2 text-xs text-gray-500 mb-3">
//                 <Row label="Payment Type" value={po.paymentType || '—'} small />
//                 <Row label="Currency" value={po.currency || '—'} small />
//                 {po.advancePayment > 0 && <Row label="Advance Payment" value={`${po.currency} ${po.advancePayment.toFixed(2)}`} small />}
//                 <Row label="Payment Terms" value={po.paymentTermsText || '—'} small />
//                 <Row label="Bright PO No" value={po.brightPoNumber || 'Not set'} small />
//               </div>

//               {po.supplier && (po.supplier.bankName || po.supplier.bankAccountName || po.supplier.iban) && (
//                 <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-500">
//                   <p className="flex items-center gap-1.5 text-gray-600 font-medium mb-1">
//                     <Landmark className="w-3.5 h-3.5" /> Supplier Bank Details
//                   </p>
//                   <Row label="Account Name" value={po.supplier.bankAccountName || '—'} small />
//                   <Row label="Bank Name" value={po.supplier.bankName || '—'} small />
//                   <Row label="Bank Address" value={po.supplier.bankAddress || '—'} small />
//                   <Row label="IBAN" value={po.supplier.iban || '—'} small />
//                 </div>
//               )}
//             </div>

//             {/* Shipping */}
//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//               <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
//                 <Truck className="w-4 h-4" /> Delivery &amp; Shipping
//               </h2>
//               <div className="space-y-2 text-xs text-gray-500">
//                 {po.isInternational && (
//                   <>
//                     <Row label="Incoterm" value={po.incoterm || '—'} small />
//                     <Row label="Freight" value={po.modeOfFreight || '—'} small />
//                     <Row label="Origin" value={po.originCountry || '—'} small />
//                     <Row label="Destination" value={po.destinationPort || '—'} small />
//                   </>
//                 )}
//                 <Row label="Delivery Location" value={po.deliveryLocationName || '—'} small />
//                 <Row label="Project" value={po.projectName || '—'} small />
//                 <Row label="Requested By" value={po.requestedByName || '—'} small />
//               </div>
//             </div>

//             {po.supplier && (
//               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//                 <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
//                   <Building2 className="w-4 h-4" /> Supplier
//                 </h2>
//                 <p className="font-medium text-gray-800 text-sm">{po.supplier.name}</p>
//                 <p className="text-xs text-gray-400 font-mono">{po.supplier.supplierCode}</p>
//                 {po.supplier.email && <p className="text-xs text-gray-400 mt-2">{po.supplier.email}</p>}
//                 {po.supplier.mobile && <p className="text-xs text-gray-400">{po.supplier.mobile}</p>}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {showAddItem && (
//         <AddItemModal poId={id!} onClose={() => setShowAddItem(false)} onAdded={() => { setShowAddItem(false); load(); }} />
//       )}

//       {showEdit && (
//         <EditPoModal poId={id!} po={po} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />
//       )}

//       {showComplete && (
//         <CompletePoModal poId={id!} po={po} onClose={() => setShowComplete(false)} onCompleted={() => { setShowComplete(false); load(); }} />
//       )}
//     </div>
//   );
// }

// function Row({ label, value, small }: { label: string; value: any; small?: boolean }) {
//   return (
//     <div className="flex justify-between gap-3">
//       <span className={small ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
//       <span className={`text-right ${small ? 'text-gray-600' : 'text-gray-700 font-medium'}`}>{value}</span>
//     </div>
//   );
// }

// function AddItemModal({ poId, onClose, onAdded }: { poId: string; onClose: () => void; onAdded: () => void }) {
//   const [form, setForm] = useState({ freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0 });
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');

//   const handleSave = async () => {
//     setError('');
//     if (!form.freeTextItemName.trim()) return setError('Description is required.');
//     if (!form.qty || form.qty <= 0) return setError('Quantity must be greater than zero.');
//     setSaving(true);
//     try {
//       await api.post(`/international-po/${poId}/items`, form);
//       onAdded();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to add item.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
//           <h2 className="font-bold text-gray-800">Add Item</h2>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
//         </div>
//         <div className="p-5 space-y-3">
//           {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}
//           <div>
//             <label className="text-xs font-medium text-gray-500">Item Code</label>
//             <input value={form.freeTextItemCode} onChange={e => setForm(f => ({ ...f, freeTextItemCode: e.target.value }))}
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//           </div>
//           <div>
//             <label className="text-xs font-medium text-gray-500">Description *</label>
//             <input value={form.freeTextItemName} onChange={e => setForm(f => ({ ...f, freeTextItemName: e.target.value }))}
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//           </div>
//           <div className="grid grid-cols-3 gap-2">
//             <div>
//               <label className="text-xs font-medium text-gray-500">Qty</label>
//               <input type="number" min={0.01} step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: parseFloat(e.target.value) || 0 }))}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">UOM</label>
//               <input value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">Rate</label>
//               <input type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//           </div>
//         </div>
//         <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
//           <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
//           <button onClick={handleSave} disabled={saving}
//             className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
//             {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Item
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function EditPoModal({ poId, po, onClose, onSaved }: { poId: string; po: any; onClose: () => void; onSaved: () => void }) {
//   const [form, setForm] = useState({
//     poNo: po.poNo || '',
//     contactPerson: po.contactPerson || '',
//     forDeliveryName: po.forDeliveryName || '',
//     landlineEmail: po.landlineEmail || '',
//     mobile: po.mobile || '',
//     deliveryLocationId: po.deliveryLocationId || '',
//     paymentType: po.paymentType || 'Cash',
//     email: po.email || '',
//     originCountry: po.originCountry || '',
//     destinationPort: po.destinationPort || '',
//     incoterm: po.incoterm || '',
//     performaNo: po.performaNo || '',
//     modeOfFreight: po.modeOfFreight || '',
//     paymentTermsText: po.paymentTermsText || '',
//     advancePayment: po.advancePayment || 0,
//     discountAmount: po.discountAmount || 0,
//     insuranceAmount: po.insuranceAmount || 0,
//     othersAmount: po.othersAmount || 0,
//     termsAndConditions: po.termsAndConditions || '',
//     notes: po.notes || '',
//     brightPoNumber: po.brightPoNumber || '',
//   });
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');

//   const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

//    const handleSave = async () => {
//     setError('');
//     setSaving(true);
//     try {
//       // ── FIX: deliveryLocationId was carried in form state as '' (empty
//       // string) since there's no visible input for it here — sending '' to
//       // the backend's Guid? field fails JSON deserialization. Convert to
//       // null explicitly.
//       await api.put(`/international-po/${poId}`, {
//         ...form,
//         deliveryLocationId: form.deliveryLocationId || null,
//       });
//       onSaved();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to save changes.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
//           <h2 className="font-bold text-gray-800 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit PO Details</h2>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
//         </div>
//         <div className="p-5 space-y-4">
//           {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="text-xs font-medium text-gray-500">PO No</label>
//               <input value={form.poNo} onChange={e => set('poNo', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">Proforma No</label>
//               <input value={form.performaNo} onChange={e => set('performaNo', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="text-xs font-medium text-gray-500">Contact Person</label>
//               <input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">For Delivery (Contact)</label>
//               <input value={form.forDeliveryName} onChange={e => set('forDeliveryName', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">Mobile</label>
//               <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">Email</label>
//               <input value={form.email} onChange={e => set('email', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//           </div>

//           {po.isInternational && (
//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <label className="text-xs font-medium text-gray-500">Origin Country</label>
//                 <input value={form.originCountry} onChange={e => set('originCountry', e.target.value)}
//                   className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//               </div>
//               <div>
//                 <label className="text-xs font-medium text-gray-500">Destination</label>
//                 <input value={form.destinationPort} onChange={e => set('destinationPort', e.target.value)}
//                   className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//               </div>
//               <div>
//                 <label className="text-xs font-medium text-gray-500">Incoterm</label>
//                 <input value={form.incoterm} onChange={e => set('incoterm', e.target.value)}
//                   className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//               </div>
//               <div>
//                 <label className="text-xs font-medium text-gray-500">Mode of Freight</label>
//                 <input value={form.modeOfFreight} onChange={e => set('modeOfFreight', e.target.value)}
//                   className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//               </div>
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="text-xs font-medium text-gray-500">Payment Type</label>
//               <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
//                 {['Cash', 'Credit', 'LC'].map(p => <option key={p} value={p}>{p}</option>)}
//               </select>
//             </div>
//             <div>
//               <label className="text-xs font-medium text-gray-500">Payment Terms</label>
//               <input value={form.paymentTermsText} onChange={e => set('paymentTermsText', e.target.value)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//             </div>
//           </div>

//           <div className="grid grid-cols-4 gap-2">
//             <div>
//               <label className="text-[11px] text-gray-400">Advance Payment</label>
//               <input type="number" step="0.01" value={form.advancePayment} onChange={e => set('advancePayment', parseFloat(e.target.value) || 0)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
//             </div>
//             <div>
//               <label className="text-[11px] text-gray-400">Discount</label>
//               <input type="number" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', parseFloat(e.target.value) || 0)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
//             </div>
//             <div>
//               <label className="text-[11px] text-gray-400">Insurance</label>
//               <input type="number" step="0.01" value={form.insuranceAmount} onChange={e => set('insuranceAmount', parseFloat(e.target.value) || 0)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
//             </div>
//             <div>
//               <label className="text-[11px] text-gray-400">Others</label>
//               <input type="number" step="0.01" value={form.othersAmount} onChange={e => set('othersAmount', parseFloat(e.target.value) || 0)}
//                 className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
//             </div>
//           </div>

//           <div>
//             <label className="text-xs font-medium text-gray-500">Bright PO No</label>
//             <input value={form.brightPoNumber} onChange={e => set('brightPoNumber', e.target.value)}
//               placeholder="Fill in once entered into Bright ERP"
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//           </div>

//           <div>
//             <label className="text-xs font-medium text-gray-500">Notes</label>
//             <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//           </div>

//           <div>
//             <label className="text-xs font-medium text-gray-500">Terms &amp; Conditions</label>
//             <textarea value={form.termsAndConditions} onChange={e => set('termsAndConditions', e.target.value)} rows={5}
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono" />
//           </div>
//         </div>
//         <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
//           <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
//           <button onClick={handleSave} disabled={saving}
//             className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
//             {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function CompletePoModal({ poId, po, onClose, onCompleted }: { poId: string; po: any; onClose: () => void; onCompleted: () => void }) {
//   const [brightPoNumber, setBrightPoNumber] = useState(po.brightPoNumber || '');
//   const [poNo, setPoNo] = useState(po.poNo || '');   // ── NEW
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');

//   const handleComplete = async () => {
//     setError('');
//     // ── NEW: PO No required before completion
//     if (!poNo.trim()) {
//       setError('PO No is required before marking this PO as Completed.');
//       return;
//     }
//     setSaving(true);
//     try {
//       await api.put(`/international-po/${poId}`, {
//         poNo: poNo.trim(),   // ── CHANGED — was po.poNo, now the editable field
//         contactPerson: po.contactPerson,
//         forDeliveryName: po.forDeliveryName,
//         landlineEmail: po.landlineEmail,
//         mobile: po.mobile,
//         deliveryLocationId: po.deliveryLocationId,
//         paymentType: po.paymentType,
//         email: po.email,
//         originCountry: po.originCountry,
//         destinationPort: po.destinationPort,
//         incoterm: po.incoterm,
//         performaNo: po.performaNo,
//         modeOfFreight: po.modeOfFreight,
//         paymentTermsText: po.paymentTermsText,
//         advancePayment: po.advancePayment,
//         discountAmount: po.discountAmount,
//         insuranceAmount: po.insuranceAmount,
//         othersAmount: po.othersAmount,
//         termsAndConditions: po.termsAndConditions,
//         notes: po.notes,
//         brightPoNumber,
//       });
//       await api.put(`/international-po/${poId}/status`, { status: 'Completed' });
//       onCompleted();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || 'Failed to mark PO complete.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
//           <h2 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mark PO Complete</h2>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
//         </div>
//         <div className="p-5 space-y-3">
//           {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

//           {/* ── NEW: PO No field, only shown/required if not already set ── */}
//           <div>
//             <label className="text-xs font-medium text-gray-500">PO No *</label>
//             <input value={poNo} onChange={e => setPoNo(e.target.value)}
//               placeholder="e.g. SW00005/26"
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" autoFocus={!poNo} />
//             <p className="text-[10px] text-gray-400 mt-1">Required — this becomes the official PO number on the printed document.</p>
//           </div>

//           <p className="text-xs text-gray-500">
//             Once entered into Bright ERP, add the Bright PO Number here to close out this PO.
//           </p>
//           <div>
//             <label className="text-xs font-medium text-gray-500">Bright PO Number</label>
//             <input value={brightPoNumber} onChange={e => setBrightPoNumber(e.target.value)}
//               placeholder="e.g. BR-PO-2026-0456"
//               className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
//           </div>
//         </div>
//         <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
//           <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
//           <button onClick={handleComplete} disabled={saving}
//             className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50">
//             {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Mark Complete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// ===== FILE: pages/internationalPO/InternationalPODetail.tsx =====
// Save under: src/pages/internationalPO/InternationalPODetail.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Globe2, Truck, Plus, Trash2, Loader2, X,
  Building2, FileText, Printer, RefreshCw, Package,
  CreditCard, Landmark, Pencil, CheckCircle2, GitBranch,
  Ban, PlayCircle, RotateCcw
} from 'lucide-react';
import api from '../../api/client';

const STATUS_COLORS: Record<string, string> = {
  Draft:      'bg-gray-100 text-gray-600',
  Completed:  'bg-emerald-50 text-emerald-700',
  Cancelled:  'bg-red-50 text-red-700',
  Blocked:    'bg-amber-50 text-amber-700',
  Superseded: 'bg-indigo-50 text-indigo-700',
};

export default function InternationalPODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  // ── NEW — role detection. "Unpost"/"Post" (the Completed <-> Blocked
  // toggle) are Manager-only actions; everyone else only ever sees the
  // normal Block/Unblock behavior for non-Completed statuses.
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const userRoles: string[] = user.roles ?? [];
  const isManagerRole = userRoles.some(r => ['System Admin', 'Purchase Manager'].includes(r));

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/international-po/${id}`);
      setPo(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load PO.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const removeItem = async (itemId: string) => {
    if (!confirm('Remove this item line?')) return;
    try {
      await api.delete(`/international-po/${id}/items/${itemId}`);
      await load();
    } catch (err) { console.error(err); }
  };

  const updateItemQty = async (itemId: string, qty: number, rate: number, discountAmount: number) => {
    try {
      await api.put(`/international-po/${id}/items/${itemId}`, { qty, rate, discountAmount });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update item.');
    }
  };

  const changeStatus = async (status: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setError('');
    setActionLoading(true);
    try {
      await api.put(`/international-po/${id}/status`, { status });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const createRevision = async () => {
    const reason = prompt(`Reason for revising ${po.poNo}? (e.g. "Supplier short-supplied 5 of 10 qty")`);
    if (reason === null) return; // user cancelled the prompt
    if (!confirm(`Create a revision of ${po.poNo}? A new editable draft PO will be created, and this PO will be marked as superseded.`)) return;
    setError('');
    setActionLoading(true);
    try {
      const res = await api.post(`/international-po/${id}/create-revision`, { reason: reason.trim() || null });
      const newId = res.data?.data?.id;
      navigate(`/international-po/${newId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create revision.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  if (!po) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">{error || 'PO not found.'}</p>
    </div>
  );

  const isCompleted = po.status === 'Completed';
  const isCancelled = po.status === 'Cancelled';
  const isBlocked = po.status === 'Blocked';
  const isSuperseded = po.status === 'Superseded';

  const isRevision = po.revisionNumber > 0;
  const itemsLocked = isCompleted || isCancelled || isBlocked || isSuperseded ||
                       (!!po.linkedRequestNumber && !isRevision);
  const headerLocked = isCompleted || isCancelled || isBlocked || isSuperseded;

  const canAddNewItem = !itemsLocked && !po.linkedRequestNumber;

  // ── NEW — is this Blocked PO specifically an "Unposted" Completed PO
  // (as opposed to some other Draft/etc that got Blocked for an unrelated
  // reason)? Only this specific case gets the Post/Create Revision flow.
  const isUnposted = isBlocked && po.statusBeforeBlock === 'Completed';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/international-po')}
                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`border-l-4 pl-4 ${po.isInternational ? 'border-blue-600' : 'border-emerald-600'}`}>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {po.isInternational
                    ? <Globe2 className="w-6 h-6 text-blue-600" />
                    : <Truck className="w-6 h-6 text-emerald-600" />}
                  {po.poNo || `${po.isInternational ? 'International' : 'Local'} PO (Draft)`}
                  {po.revisionNumber > 0 && (
                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-1">
                      Rev {po.revisionNumber}
                    </span>
                  )}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {po.companyName} → {po.supplier?.name || 'No supplier selected'}
                  {po.linkedRequestNumber && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                      <Package className="w-3 h-3" /> from {po.linkedRequestNumber}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={() => window.open(`/international-po/${id}/print`, '_blank')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <Printer className="w-4 h-4" /> Print
              </button>

              {!headerLocked && (
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              )}

              {/* ── Block (normal, non-Completed statuses) — everyone, unchanged ── */}
              {!isCancelled && !isSuperseded && !isBlocked && !isCompleted && (
                <button onClick={() => changeStatus('Blocked', 'Block this PO? It will be held from further action until unblocked.')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
                  <Ban className="w-4 h-4" /> Block
                </button>
              )}

              {/* ── Unpost — Completed -> Blocked. Manager-only. This is the
                  ONLY way a Completed PO can be reopened for revision. ── */}
              {isCompleted && !isSuperseded && isManagerRole && (
                <button onClick={() => changeStatus('Blocked', 'Unpost this PO? This reopens it so a revision can be created. The PO stays locked until you Post it again or a revision is completed.')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
                  <Ban className="w-4 h-4" /> Unpost
                </button>
              )}

              {/* ── Unblock (normal, non-Completed-origin Blocked) — everyone, unchanged ── */}
              {isBlocked && !isUnposted && (
                <button onClick={() => changeStatus('Draft', 'Unblock this PO? It will return to its previous status.')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                  <PlayCircle className="w-4 h-4" /> Unblock
                </button>
              )}

              {/* ── Post — Blocked-that-came-from-Completed -> back to Completed.
                  Manager-only. Cancels out an Unpost if no revision was made. ── */}
              {isUnposted && isManagerRole && (
                <button onClick={() => changeStatus('Completed', 'Post this PO? It will be locked as Completed again.')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                  <PlayCircle className="w-4 h-4" /> Post
                </button>
              )}

              {/* ── Create Revision — only once a Manager has Unposted the PO.
                  Available to both officer and manager; the officer is the
                  one who typically does this after being authorized. ── */}
              {isUnposted && (
                <button onClick={createRevision}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50">
                  <GitBranch className="w-4 h-4" /> Create Revision
                </button>
              )}

              {/* Cancel — permanent, not available once superseded or already cancelled */}
              {!isCancelled && !isSuperseded && (
                <button onClick={() => changeStatus('Cancelled', 'Cancel this PO? This is permanent and cannot be undone.')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50">
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}

              {!headerLocked && (
                <button onClick={() => setShowComplete(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition">
                  <CheckCircle2 className="w-4 h-4" /> Mark Complete
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {isUnposted ? 'Unposted' : po.status}
            </span>
            {po.parentPoNo && (
              <span className="text-xs text-gray-400">
                Revised from{' '}
                <button onClick={() => navigate(`/international-po/${po.parentPoId}`)} className="text-indigo-600 hover:underline font-medium">
                  {po.parentPoNo}
                </button>
              </span>
            )}
            {po.supersededByPoNo && (
              <span className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" />
                Superseded by{' '}
                <button onClick={() => navigate(`/international-po/${po.supersededByPoId}`)} className="underline font-medium">
                  {po.supersededByPoNo}
                </button>
              </span>
            )}
          </div>

          {isUnposted && !isManagerRole && (
            <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 mt-2">
              This PO has been unposted by a manager — you can now create a revision.
            </p>
          )}

          {po.revisionReason && (
            <p className="text-xs text-gray-400 mt-2 italic">Revision reason: {po.revisionReason}</p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" /> Items ({po.items?.length ?? 0})
                </h2>
                {canAddNewItem && (
                  <button onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                )}
              </div>

              {itemsLocked && !isCompleted && !isCancelled && !isBlocked && !isSuperseded && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">
                  Items are locked to what was pulled from MR {po.linkedRequestNumber}. Create a new PO for any remaining quantity.
                </p>
              )}

              {!itemsLocked && isRevision && po.linkedRequestNumber && (
                <p className="text-[11px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 mb-3">
                  This is a revision — adjust quantities to match what was actually confirmed/received.
                  Any reduced quantity automatically frees up remaining balance on MR {po.linkedRequestNumber}.
                  New items can't be added here since they wouldn't be traceable to the original MR — create a separate PO for anything not already on this list.
                </p>
              )}

              <div className="space-y-2">
                {(po.items ?? []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.itemName}</p>
                      <p className="text-xs text-gray-400">{item.itemCode} · {item.uom}</p>
                    </div>

                    {!itemsLocked ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" min={0} step={1} defaultValue={item.qty}
                          onBlur={e => updateItemQty(item.id, parseFloat(e.target.value) || 0, item.rate, item.discountAmount)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="number" min={0} step="0.01" defaultValue={item.rate}
                          onBlur={e => updateItemQty(item.id, item.qty, parseFloat(e.target.value) || 0, item.discountAmount)}
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 shrink-0">{item.qty} {item.uom} · Rate {item.rate.toFixed(2)}</p>
                    )}

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-gray-800">{po.currency} {item.amount.toFixed(2)}</span>
                      {!itemsLocked && (
                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(!po.items || po.items.length === 0) && (
                  <p className="text-center text-gray-300 text-sm py-8">No items added yet.</p>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" /> Terms &amp; Conditions
              </h2>
              <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans leading-relaxed">{po.termsAndConditions}</pre>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Totals */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <Row label="Sub Total" value={`${po.currency} ${po.subTotal?.toFixed(2)}`} />
                <Row label="Discount" value={`- ${po.currency} ${po.discountAmount?.toFixed(2)}`} />
                <Row label="Insurance" value={`+ ${po.currency} ${po.insuranceAmount?.toFixed(2)}`} />
                <Row label="Others" value={`+ ${po.currency} ${po.othersAmount?.toFixed(2)}`} />
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="font-bold text-blue-700">{po.currency} {po.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Payment Details
              </h2>
              <div className="space-y-2 text-xs text-gray-500 mb-3">
                <Row label="Payment Type" value={po.paymentType || '—'} small />
                <Row label="Currency" value={po.currency || '—'} small />
                {po.advancePayment > 0 && <Row label="Advance Payment" value={`${po.currency} ${po.advancePayment.toFixed(2)}`} small />}
                <Row label="Payment Terms" value={po.paymentTermsText || '—'} small />
                <Row label="Bright PO No" value={po.brightPoNumber || 'Not set'} small />
              </div>

              {po.supplier && (po.supplier.bankName || po.supplier.bankAccountName || po.supplier.iban) && (
                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                  <p className="flex items-center gap-1.5 text-gray-600 font-medium mb-1">
                    <Landmark className="w-3.5 h-3.5" /> Supplier Bank Details
                  </p>
                  <Row label="Account Name" value={po.supplier.bankAccountName || '—'} small />
                  <Row label="Bank Name" value={po.supplier.bankName || '—'} small />
                  <Row label="Bank Address" value={po.supplier.bankAddress || '—'} small />
                  <Row label="IBAN" value={po.supplier.iban || '—'} small />
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Delivery &amp; Shipping
              </h2>
              <div className="space-y-2 text-xs text-gray-500">
                {po.isInternational && (
                  <>
                    <Row label="Incoterm" value={po.incoterm || '—'} small />
                    <Row label="Freight" value={po.modeOfFreight || '—'} small />
                    <Row label="Origin" value={po.originCountry || '—'} small />
                    <Row label="Destination" value={po.destinationPort || '—'} small />
                  </>
                )}
                <Row label="Delivery Location" value={po.deliveryLocationName || '—'} small />
                <Row label="Project" value={po.projectName || '—'} small />
                <Row label="Requested By" value={po.requestedByName || '—'} small />
              </div>
            </div>

            {po.supplier && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Supplier
                </h2>
                <p className="font-medium text-gray-800 text-sm">{po.supplier.name}</p>
                <p className="text-xs text-gray-400 font-mono">{po.supplier.supplierCode}</p>
                {po.supplier.email && <p className="text-xs text-gray-400 mt-2">{po.supplier.email}</p>}
                {po.supplier.mobile && <p className="text-xs text-gray-400">{po.supplier.mobile}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddItem && (
        <AddItemModal poId={id!} onClose={() => setShowAddItem(false)} onAdded={() => { setShowAddItem(false); load(); }} />
      )}

      {showEdit && (
        <EditPoModal poId={id!} po={po} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />
      )}

      {showComplete && (
        <CompletePoModal poId={id!} po={po} onClose={() => setShowComplete(false)} onCompleted={() => { setShowComplete(false); load(); }} />
      )}
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: any; small?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={small ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
      <span className={`text-right ${small ? 'text-gray-600' : 'text-gray-700 font-medium'}`}>{value}</span>
    </div>
  );
}

function AddItemModal({ poId, onClose, onAdded }: { poId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!form.freeTextItemName.trim()) return setError('Description is required.');
    if (!form.qty || form.qty <= 0) return setError('Quantity must be greater than zero.');
    setSaving(true);
    try {
      await api.post(`/international-po/${poId}/items`, form);
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Add Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-medium text-gray-500">Item Code</label>
            <input value={form.freeTextItemCode} onChange={e => setForm(f => ({ ...f, freeTextItemCode: e.target.value }))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description *</label>
            <input value={form.freeTextItemName} onChange={e => setForm(f => ({ ...f, freeTextItemName: e.target.value }))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Qty</label>
              <input type="number" min={0.01} step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: parseFloat(e.target.value) || 0 }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">UOM</label>
              <input value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Rate</label>
              <input type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Item
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPoModal({ poId, po, onClose, onSaved }: { poId: string; po: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    poNo: po.poNo || '',
    contactPerson: po.contactPerson || '',
    forDeliveryName: po.forDeliveryName || '',
    landlineEmail: po.landlineEmail || '',
    mobile: po.mobile || '',
    deliveryLocationId: po.deliveryLocationId || '',
    paymentType: po.paymentType || 'Cash',
    email: po.email || '',
    originCountry: po.originCountry || '',
    destinationPort: po.destinationPort || '',
    incoterm: po.incoterm || '',
    performaNo: po.performaNo || '',
    modeOfFreight: po.modeOfFreight || '',
    paymentTermsText: po.paymentTermsText || '',
    advancePayment: po.advancePayment || 0,
    discountAmount: po.discountAmount || 0,
    insuranceAmount: po.insuranceAmount || 0,
    othersAmount: po.othersAmount || 0,
    termsAndConditions: po.termsAndConditions || '',
    notes: po.notes || '',
    brightPoNumber: po.brightPoNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

   const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.put(`/international-po/${poId}`, {
        ...form,
        deliveryLocationId: form.deliveryLocationId || null,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit PO Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">PO No</label>
              <input value={form.poNo} onChange={e => set('poNo', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Proforma No</label>
              <input value={form.performaNo} onChange={e => set('performaNo', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Contact Person</label>
              <input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">For Delivery (Contact)</label>
              <input value={form.forDeliveryName} onChange={e => set('forDeliveryName', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mobile</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          {po.isInternational && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Origin Country</label>
                <input value={form.originCountry} onChange={e => set('originCountry', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Destination</label>
                <input value={form.destinationPort} onChange={e => set('destinationPort', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Incoterm</label>
                <input value={form.incoterm} onChange={e => set('incoterm', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Mode of Freight</label>
                <input value={form.modeOfFreight} onChange={e => set('modeOfFreight', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Type</label>
              <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {['Cash', 'Credit', 'LC'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Terms</label>
              <input value={form.paymentTermsText} onChange={e => set('paymentTermsText', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[11px] text-gray-400">Advance Payment</label>
              <input type="number" step="0.01" value={form.advancePayment} onChange={e => set('advancePayment', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400">Discount</label>
              <input type="number" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400">Insurance</label>
              <input type="number" step="0.01" value={form.insuranceAmount} onChange={e => set('insuranceAmount', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400">Others</label>
              <input type="number" step="0.01" value={form.othersAmount} onChange={e => set('othersAmount', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Bright PO No</label>
            <input value={form.brightPoNumber} onChange={e => set('brightPoNumber', e.target.value)}
              placeholder="Fill in once entered into Bright ERP"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Terms &amp; Conditions</label>
            <textarea value={form.termsAndConditions} onChange={e => set('termsAndConditions', e.target.value)} rows={5}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletePoModal({ poId, po, onClose, onCompleted }: { poId: string; po: any; onClose: () => void; onCompleted: () => void }) {
  const [brightPoNumber, setBrightPoNumber] = useState(po.brightPoNumber || '');
  const [poNo, setPoNo] = useState(po.poNo || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    setError('');
    if (!poNo.trim()) {
      setError('PO No is required before marking this PO as Completed.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/international-po/${poId}`, {
        poNo: poNo.trim(),
        contactPerson: po.contactPerson,
        forDeliveryName: po.forDeliveryName,
        landlineEmail: po.landlineEmail,
        mobile: po.mobile,
        deliveryLocationId: po.deliveryLocationId,
        paymentType: po.paymentType,
        email: po.email,
        originCountry: po.originCountry,
        destinationPort: po.destinationPort,
        incoterm: po.incoterm,
        performaNo: po.performaNo,
        modeOfFreight: po.modeOfFreight,
        paymentTermsText: po.paymentTermsText,
        advancePayment: po.advancePayment,
        discountAmount: po.discountAmount,
        insuranceAmount: po.insuranceAmount,
        othersAmount: po.othersAmount,
        termsAndConditions: po.termsAndConditions,
        notes: po.notes,
        brightPoNumber,
      });
      await api.put(`/international-po/${poId}/status`, { status: 'Completed' });
      onCompleted();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark PO complete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mark PO Complete</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-medium text-gray-500">PO No *</label>
            <input value={poNo} onChange={e => setPoNo(e.target.value)}
              placeholder="e.g. SW00005/26"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" autoFocus={!poNo} />
            <p className="text-[10px] text-gray-400 mt-1">Required — this becomes the official PO number on the printed document.</p>
          </div>

          <p className="text-xs text-gray-500">
            Once entered into Bright ERP, add the Bright PO Number here to close out this PO.
          </p>
          <div>
            <label className="text-xs font-medium text-gray-500">Bright PO Number</label>
            <input value={brightPoNumber} onChange={e => setBrightPoNumber(e.target.value)}
              placeholder="e.g. BR-PO-2026-0456"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleComplete} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}