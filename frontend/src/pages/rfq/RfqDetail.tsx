// ===== FILE: pages/rfq/RfqDetail.tsx =====
// Save under: src/pages/rfq/RfqDetail.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileSpreadsheet, Loader2, Plus, X, Award, TrendingDown,
  Users2, ListChecks, CheckCircle2, Paperclip, Info, Trophy
} from 'lucide-react';
import api from '../../api/client';

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Issued:    'bg-amber-50 text-amber-700',
  Closed:    'bg-blue-50 text-blue-700',
  Awarded:   'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

export default function RfqDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rfq/${id}`);
      setRfq(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load RFQ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const issueRfq = async () => {
    if (!confirm('Issue this RFQ? Invited suppliers can then be asked to quote.')) return;
    try {
      await api.post(`/rfq/${id}/issue`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to issue RFQ.');
    }
  };

  const selectWinner = async (quotationId: string) => {
    if (!confirm('Award this RFQ to this supplier? This finalizes the sourcing decision.')) return;
    try {
      await api.post(`/rfq/${id}/quotations/${quotationId}/select`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to select winner.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  if (!rfq) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">{error || 'RFQ not found.'}</p>
    </div>
  );

  const quotationTotals: Record<string, number> = {};
  (rfq.quotations ?? []).forEach((q: any) => {
    const itemsTotal = (q.items ?? []).reduce((sum: number, qi: any) => sum + qi.lineTotal, 0);
    quotationTotals[q.id] = itemsTotal + (q.freightAmount ?? 0);
  });
  const sortedQuotations = [...(rfq.quotations ?? [])].sort((a, b) => quotationTotals[a.id] - quotationTotals[b.id]);
  const lowestBid = sortedQuotations.length > 0 ? quotationTotals[sortedQuotations[0].id] : null;
  const highestBid = sortedQuotations.length > 0 ? Math.max(...sortedQuotations.map(q => quotationTotals[q.id])) : null;
  const estSavings = (lowestBid != null && highestBid != null && highestBid > lowestBid) ? highestBid - lowestBid : 0;
  const savingsPct = highestBid ? ((estSavings / highestBid) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/rfq')} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="border-l-4 border-blue-600 pl-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  {rfq.rfqNumber}
                </h1>
                <p className="text-gray-500 text-sm mt-1">{rfq.title} · {rfq.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[rfq.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {rfq.status}
              </span>
              {rfq.status === 'Draft' && (
                <button onClick={issueRfq}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
                  Issue RFQ
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users2 className="w-4 h-4 text-blue-500" />} label="Suppliers Invited" value={String((rfq.invitedSuppliers ?? []).length)} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Quotations Received" value={String((rfq.quotations ?? []).length)} />
          <StatCard icon={<TrendingDown className="w-4 h-4 text-indigo-500" />} label="Lowest Bid" value={lowestBid != null ? `${rfq.currency ?? 'QAR'} ${lowestBid.toFixed(2)}` : '—'} />
          <StatCard icon={<Award className="w-4 h-4 text-amber-500" />} label="Est. Savings" value={estSavings > 0 ? `${rfq.currency ?? 'QAR'} ${estSavings.toFixed(2)} (${savingsPct}%)` : '—'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4" /> RFQ Items ({(rfq.items ?? []).length})
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Spec</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(rfq.items ?? []).map((i: any) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2 text-gray-800 font-medium">{i.itemDescription}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{i.specification || '—'}</td>
                        <td className="px-3 py-2 text-right">{i.qty}</td>
                        <td className="px-3 py-2">{i.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical & Financial Comparison Matrix */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Technical &amp; Financial Comparison
                </h2>
                <button onClick={() => setShowQuoteModal(true)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Quotation
                </button>
              </div>

              {sortedQuotations.length === 0 ? (
                <p className="text-center text-gray-300 text-sm py-10">No quotations received yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedQuotations.map((q: any, idx: number) => {
                    const total = quotationTotals[q.id];
                    const isLowest = idx === 0;
                    return (
                      <div key={q.id} className={`rounded-xl border p-4 transition ${
                        q.isSelected ? 'border-emerald-300 bg-emerald-50' : isLowest ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'
                      }`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold text-gray-800 flex items-center gap-2">
                              {q.supplierName}
                              {isLowest && !q.isSelected && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <Award className="w-2.5 h-2.5" /> LOWEST BID
                                </span>
                              )}
                              {q.isSelected && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> AWARDED
                                </span>
                              )}
                            </p>
                            {q.technicalScore != null && (
                              <div className="mt-2 w-48">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                  <span>Technical Score</span><span>{q.technicalScore}/100</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${q.technicalScore}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-gray-800">{q.currency} {total.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400">incl. freight {q.currency} {q.freightAmount.toFixed(2)}</p>
                          </div>
                        </div>

                        {q.notes && <p className="text-xs text-gray-500 mb-3">{q.notes}</p>}

                        <div className="flex items-center justify-between">
                          <div className="flex gap-3 text-xs text-gray-400">
                            {(q.items ?? []).length} item(s) priced
                          </div>
                          {!q.isSelected && rfq.status !== 'Awarded' && rfq.status !== 'Cancelled' && (
                            <button onClick={() => selectWinner(q.id)}
                              className="text-xs font-medium text-blue-600 hover:underline">Award to this supplier</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">RFQ Details</h2>
              <div className="space-y-2 text-xs text-gray-500">
                <Row label="Closing" value={rfq.closingDateTime ? new Date(rfq.closingDateTime).toLocaleString() : '—'} />
                <Row label="Bid Validity" value={rfq.bidValidityDays ? `${rfq.bidValidityDays} days` : '—'} />
                <Row label="Sealed Bid" value={rfq.sealedBid ? 'Yes' : 'No'} />
                <Row label="Tech/Comm Separation" value={rfq.technicalCommercialSeparation ? 'Yes' : 'No'} />
                <Row label="Currency" value={rfq.currency || '—'} />
                <Row label="Delivery Terms" value={rfq.deliveryTerms || '—'} />
                <Row label="Delivery Location" value={rfq.deliveryLocationName || '—'} />
                <Row label="Payment Terms" value={rfq.paymentTerms || '—'} />
                {rfq.sourcePrNumber && <Row label="Source PR" value={rfq.sourcePrNumber} />}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users2 className="w-4 h-4" /> Invited Suppliers
              </h2>
              <div className="space-y-2">
                {(rfq.invitedSuppliers ?? []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{s.supplierName}</span>
                    <span className="text-[10px] text-gray-400">{s.status}</span>
                  </div>
                ))}
                {(rfq.invitedSuppliers ?? []).length === 0 && (
                  <p className="text-xs text-gray-300">No suppliers invited.</p>
                )}
              </div>
            </div>

            {(rfq.attachments ?? []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Attachments
                </h2>
                <div className="space-y-2">
                  {rfq.attachments.map((a: any) => (
                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 truncate block">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" /> {a.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {rfq.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Info className="w-3.5 h-3.5" /> Notes
                </h2>
                <p className="text-xs text-amber-700">{rfq.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showQuoteModal && (
        <AddQuotationModal
          rfqId={id!}
          items={rfq.items ?? []}
          suppliers={rfq.invitedSuppliers ?? []}
          currency={rfq.currency || 'QAR'}
          onClose={() => setShowQuoteModal(false)}
          onAdded={() => { setShowQuoteModal(false); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">{icon}<span>{label}</span></div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-600 text-right">{value}</span>
    </div>
  );
}

function AddQuotationModal({ rfqId, items, suppliers, currency, onClose, onAdded }: {
  rfqId: string; items: any[]; suppliers: any[]; currency: string; onClose: () => void; onAdded: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [freightAmount, setFreightAmount] = useState(0);
  const [technicalScore, setTechnicalScore] = useState('');
  const [notes, setNotes] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!supplierId) return setError('Select a supplier.');
    const quoteItems = items
      .filter(i => prices[i.id] > 0)
      .map(i => ({ rfqItemId: i.id, unitPrice: prices[i.id] }));
    if (quoteItems.length === 0) return setError('Enter at least one item price.');

    setSaving(true);
    try {
      await api.post(`/rfq/${rfqId}/quotations`, {
        supplierId, currency, freightAmount,
        technicalScore: technicalScore ? parseFloat(technicalScore) : null,
        notes, items: quoteItems,
      });
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">Add Supplier Quotation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-medium text-gray-500">Supplier *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="">Select supplier</option>
              {suppliers.map((s: any) => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Item Unit Prices</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {items.map((i: any) => (
                <div key={i.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1 truncate">{i.itemDescription}</span>
                  <input type="number" step="0.01" placeholder="0.00"
                    value={prices[i.id] ?? ''}
                    onChange={e => setPrices(p => ({ ...p, [i.id]: parseFloat(e.target.value) || 0 }))}
                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Freight Amount</label>
              <input type="number" step="0.01" value={freightAmount} onChange={e => setFreightAmount(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Technical Score (0-100)</label>
              <input type="number" min="0" max="100" value={technicalScore} onChange={e => setTechnicalScore(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Quotation
          </button>
        </div>
      </div>
    </div>
  );
}
