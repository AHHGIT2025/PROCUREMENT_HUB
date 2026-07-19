// ===== FILE: pages/internationalPO/InternationalPODetail.tsx =====
// Save under: src/pages/internationalPO/InternationalPODetail.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Globe2, Plus, Trash2, Star, Check, Loader2, X,
  Building2, Truck, FileText, Printer, RefreshCw, Award, Package
} from 'lucide-react';
import api from '../../api/client';

const STATUS_FLOW = ['Draft', 'QuotesCollected', 'SupplierSelected', 'Finalized', 'SentToBright', 'Completed'];
const STATUS_COLORS: Record<string, string> = {
  Draft:            'bg-gray-100 text-gray-600',
  QuotesCollected:  'bg-amber-50 text-amber-700',
  SupplierSelected: 'bg-blue-50 text-blue-700',
  Finalized:        'bg-indigo-50 text-indigo-700',
  SentToBright:     'bg-purple-50 text-purple-700',
  Completed:        'bg-emerald-50 text-emerald-700',
  Cancelled:        'bg-red-50 text-red-700',
};

export default function InternationalPODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddItem, setShowAddItem] = useState(false);
  const [quoteModal, setQuoteModal] = useState<{ itemId: string | null } | null>(null);

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

  useEffect(() => {
    load();
    api.get('/suppliers').then(r => setSuppliers(r.data?.data ?? [])).catch(console.error);
  }, [id]);

  const selectQuote = async (quoteId: string) => {
    try {
      await api.post(`/international-po/${id}/quotes/${quoteId}/select`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to select quote.');
    }
  };

  const removeQuote = async (quoteId: string) => {
    if (!confirm('Remove this quote?')) return;
    try {
      await api.delete(`/international-po/${id}/quotes/${quoteId}`);
      await load();
    } catch (err) { console.error(err); }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('Remove this item line?')) return;
    try {
      await api.delete(`/international-po/${id}/items/${itemId}`);
      await load();
    } catch (err) { console.error(err); }
  };

  const changeStatus = async (status: string) => {
    if (!confirm(`Change status to "${status}"?`)) return;
    try {
      await api.put(`/international-po/${id}/status`, { status });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const submitForApproval = async () => {
    if (!confirm('Submit this International PO for approval? It will be sent to the first approver in the chain.')) return;
    try {
      const res = await api.post(`/international-po/${id}/submit-for-approval`);
      alert(res.data?.message || 'Submitted for approval.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit for approval.');
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

  const statusIdx = STATUS_FLOW.indexOf(po.status);
  const isCancelled = po.status === 'Cancelled';
  // ✅ NEW — once submitted for approval (or approved), item lines are
  // locked. Editing a PO's contents after it's gone into the approval
  // chain would make the approved amounts meaningless. To adjust items
  // after this point, create a new PO instead.
  // ✅ CHANGED: items are also locked whenever this PO is linked to an
  // approved MR — items must only be what was pulled from that MR, no
  // adding arbitrary new lines later. (Still locked separately once the
  // PO itself goes into approval, for non-MR-linked POs.)
  const itemsLocked = ['PendingApproval', 'Approved'].includes(po.status) || !!po.linkedRequestNumber;

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
              <div className="border-l-4 border-blue-600 pl-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Globe2 className="w-6 h-6 text-blue-600" />
                  {po.poNo || 'International PO (Draft)'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {po.companyName} → {po.supplier?.name || 'No supplier selected'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                <Printer className="w-4 h-4" /> Print
              </button>
              {po.status === 'Draft' && (
                <button onClick={submitForApproval}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
                  <Award className="w-4 h-4" /> Submit for Approval
                </button>
              )}
            </div>
          </div>

          {/* Status stepper */}
          {!isCancelled ? (
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <button onClick={() => changeStatus(s)}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-medium transition ${
                      i <= statusIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}>
                    {s}
                  </button>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`h-0.5 w-3 shrink-0 ${i < statusIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Cancelled</span>
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
                {!itemsLocked && (
                  <button onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                )}
              </div>

              {itemsLocked && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">
                  {po.linkedRequestNumber
                    ? `Items are locked to what was pulled from MR ${po.linkedRequestNumber}. Create a new PO for any remaining quantity.`
                    : 'Items are locked once submitted for approval. Create a new PO if more items need to be added.'}
                </p>
              )}

              <div className="space-y-4">
                {(po.items ?? []).map((item: any) => (
                  <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                        <p className="text-xs text-gray-400">{item.itemCode} · {item.qty} {item.uom} · Rate {item.rate.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-800">{po.currency} {item.amount.toFixed(2)}</span>
                        {!itemsLocked && (
                          <>
                            <button onClick={() => setQuoteModal({ itemId: item.id })}
                              className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap">+ Quote</button>
                            <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Per-item quotes comparison */}
                    {item.quotes?.length > 0 && (
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[...item.quotes].sort((a: any, b: any) => a.convertedPriceQar - b.convertedPriceQar).map((q: any, idx: number) => (
                          <QuoteCard key={q.id} quote={q} isBest={idx === 0} onSelect={() => selectQuote(q.id)} onRemove={() => removeQuote(q.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!po.items || po.items.length === 0) && (
                  <p className="text-center text-gray-300 text-sm py-8">No items added yet.</p>
                )}
              </div>
            </div>

            {/* Whole-PO quotes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Whole-PO Vendor Quotes
                </h2>
                <button onClick={() => setQuoteModal({ itemId: null })}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Quote
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Use this to compare vendors for the entire PO at once (applies rate to all items without their own per-item quote selected).</p>

              {po.quotes?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...po.quotes].sort((a: any, b: any) => a.convertedPriceQar - b.convertedPriceQar).map((q: any, idx: number) => (
                    <QuoteCard key={q.id} quote={q} isBest={idx === 0} onSelect={() => selectQuote(q.id)} onRemove={() => removeQuote(q.id)} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-300 text-sm py-6">No whole-PO quotes yet.</p>
              )}
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

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Shipping Details
              </h2>
              <div className="space-y-2 text-xs text-gray-500">
                <Row label="Incoterm" value={po.incoterm} small />
                <Row label="Freight" value={po.modeOfFreight} small />
                <Row label="Cargo Type" value={po.typeOfCargo} small />
                <Row label="Origin" value={po.originCountry || '—'} small />
                <Row label="Destination" value={po.destinationPort || '—'} small />
                <Row label="Delivery Location" value={po.deliveryLocationName || '—'} small />
                <Row label="Project" value={po.projectName || '—'} small />
                <Row label="Requested By" value={po.requestedByName || '—'} small />
                <Row label="Bright PO No" value={po.brightPoNumber || 'Not set'} small />
              </div>
            </div>

            {po.supplier && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Selected Supplier</h2>
                <p className="font-medium text-gray-800 text-sm">{po.supplier.name}</p>
                <p className="text-xs text-gray-400 font-mono">{po.supplier.supplierCode}</p>
                {po.supplier.rating && (
                  <div className="flex items-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={14} className={i <= po.supplier.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'} />
                    ))}
                  </div>
                )}
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

      {quoteModal && (
        <AddQuoteModal
          poId={id!}
          itemId={quoteModal.itemId}
          suppliers={suppliers}
          currency={po.currency}
          onClose={() => setQuoteModal(null)}
          onAdded={() => { setQuoteModal(null); load(); }}
        />
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

function QuoteCard({ quote, isBest, onSelect, onRemove }: { quote: any; isBest: boolean; onSelect: () => void; onRemove: () => void }) {
  return (
    <div className={`rounded-xl border p-3 transition ${
      quote.isSelected ? 'border-emerald-300 bg-emerald-50' : isBest ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{quote.supplierName}</p>
          <p className="text-xs text-gray-400">{quote.currency} {quote.unitPrice.toFixed(2)} · QAR {quote.convertedPriceQar.toFixed(2)}</p>
          {quote.leadTimeDays != null && <p className="text-[10px] text-gray-400">{quote.leadTimeDays} days lead time</p>}
        </div>
        {isBest && !quote.isSelected && (
          <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
            <Award className="w-2.5 h-2.5" /> Best
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {quote.isSelected ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="w-3.5 h-3.5" /> Selected
          </span>
        ) : (
          <button onClick={onSelect} className="text-xs font-medium text-blue-600 hover:underline">Select Winner</button>
        )}
        <button onClick={onRemove} className="text-xs text-gray-300 hover:text-red-500 ml-auto">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
              <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: parseFloat(e.target.value) || 0 }))}
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

function AddQuoteModal({ poId, itemId, suppliers, currency, onClose, onAdded }: {
  poId: string; itemId: string | null; suppliers: any[]; currency: string; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({
    supplierId: '', unitPrice: 0, currency, exchangeRateToQar: 1, leadTimeDays: '', validityDate: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!form.supplierId) return setError('Supplier is required.');
    if (form.unitPrice <= 0) return setError('Unit price must be greater than zero.');
    setSaving(true);
    try {
      await api.post(`/international-po/${poId}/quotes`, {
        ...form,
        internationalPoItemId: itemId,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
        validityDate: form.validityDate || null,
      });
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add quote.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Add Vendor Quote {itemId ? '(this item)' : '(whole PO)'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-medium text-gray-500">Supplier *</label>
            <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Unit Price *</label>
              <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {['USD', 'EUR', 'QAR', 'GBP', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Exchange Rate → QAR</label>
            <input type="number" step="0.0001" value={form.exchangeRateToQar} onChange={e => setForm(f => ({ ...f, exchangeRateToQar: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Lead Time (days)</label>
              <input type="number" value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Valid Until</label>
              <input type="date" value={form.validityDate} onChange={e => setForm(f => ({ ...f, validityDate: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Quote
          </button>
        </div>
      </div>
    </div>
  );
}
