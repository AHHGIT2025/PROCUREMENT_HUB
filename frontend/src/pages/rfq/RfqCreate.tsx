// ===== FILE: pages/rfq/RfqCreate.tsx (FULL REPLACE) =====
// Save under: src/pages/rfq/RfqCreate.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, ArrowLeft, Plus, Trash2, Loader2, Check,
  ListChecks, Users2, Info, Link2, CreditCard, Paperclip,
  ShieldCheck, Upload, Lightbulb, X
} from 'lucide-react';
import api from '../../api/client';

interface LineItem {
  itemDescription: string;
  specification: string;
  qty: number;
  uom: string;
}

const TABS = ['General', 'Items', 'Suppliers', 'Commercial Terms', 'Attachments', 'Approvals'] as const;
const DELIVERY_TERMS = ['EXW', 'FOB', 'FCA', 'CIP', 'CIF', 'CFR', 'DAP', 'DDP'];
const CURRENCIES = ['QAR', 'USD', 'EUR', 'GBP', 'AED'];

export default function RfqCreate() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [tab, setTab] = useState<typeof TABS[number]>('General');
  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<any>({
    title: '', companyId: user.companyId || '', closingDateTime: '',
    bidValidityDays: 90, sealedBid: true, technicalCommercialSeparation: false, notes: '',
    sourcePurchaseRequestId: '', currency: 'QAR', paymentTerms: '', deliveryTerms: 'DDP', deliveryLocationId: '',
  });

  const [items, setItems] = useState<LineItem[]>([]);
  const [newItem, setNewItem] = useState<LineItem>({ itemDescription: '', specification: '', qty: 1, uom: 'PCS' });

  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [prSearch, setPrSearch] = useState('');
  const [showPrDropdown, setShowPrDropdown] = useState(false);

  // Attachments are uploaded after the RFQ is created (need an id first) —
  // held here as a pending queue and flushed right after creation.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data?.data ?? r.data ?? [])).catch(console.error);
    api.get('/suppliers').then(r => setSuppliers(r.data?.data ?? [])).catch(console.error);
    api.get('/purchase-requests').then(r => setPurchaseRequests(r.data?.data ?? r.data ?? [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.companyId) return;
    api.get(`/delivery-locations/by-company/${form.companyId}`).then(r => setDeliveryLocations(r.data?.data ?? [])).catch(console.error);
  }, [form.companyId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addItem = () => {
    if (!newItem.itemDescription.trim() || newItem.qty <= 0) return;
    setItems(prev => [...prev, newItem]);
    setNewItem({ itemDescription: '', specification: '', qty: 1, uom: 'PCS' });
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.supplierCode ?? '').toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredPrs = purchaseRequests.filter((p: any) =>
    prSearch.length > 0 && (
      (p.requestNumber ?? '').toLowerCase().includes(prSearch.toLowerCase()) ||
      (p.company ?? '').toLowerCase().includes(prSearch.toLowerCase())
    )
  ).slice(0, 8);

  const selectedPr = purchaseRequests.find((p: any) => p.id === form.sourcePurchaseRequestId);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };
  const removePendingFile = (idx: number) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setTab('General'); return setError('RFQ Title is required.'); }
    if (!form.companyId) { setTab('General'); return setError('Company is required.'); }
    if (items.length === 0) { setTab('Items'); return setError('At least one item is required.'); }
    if (selectedSupplierIds.length === 0) { setTab('Suppliers'); return setError('Select at least one supplier to invite.'); }

    setSaving(true);
    try {
      const res = await api.post('/rfq', {
        ...form,
        sourcePurchaseRequestId: form.sourcePurchaseRequestId || null,
        deliveryLocationId: form.deliveryLocationId || null,
        closingDateTime: form.closingDateTime || null,
        items,
        supplierIds: selectedSupplierIds,
      });
      const newId = res.data?.data?.id;

      // Flush any picked attachments now that the RFQ exists
      for (const file of pendingFiles) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('companyId', '11111111-1111-1111-1111-111111111111');
          const uploadRes = await api.post('/attachments/upload', fd);
          const { storageKey, fileName } = uploadRes.data;
          await api.post(`/rfq/${newId}/attachments`, { fileName, storageKey });
        } catch (err) {
          console.error('Attachment upload failed', err);
        }
      }

      navigate(`/rfq/${newId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create RFQ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/rfq')} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="border-l-4 border-blue-600 pl-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  Create Request for Quotation
                  <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">DRAFT</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">RFQ number will be auto-assigned on save</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b border-gray-100 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {t}
                {t === 'Items' && items.length > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{items.length}</span>}
                {t === 'Suppliers' && selectedSupplierIds.length > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{selectedSupplierIds.length}</span>}
                {t === 'Attachments' && pendingFiles.length > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{pendingFiles.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* General tab */}
            {tab === 'General' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">RFQ Number</label>
                    <input disabled value="Auto-generated on save" placeholder="RFQ-2026-00001"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">RFQ Title *</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                      placeholder="e.g. IT Infrastructure Upgrade 2026"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Company *</label>
                    <select value={form.companyId} onChange={e => set('companyId', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Select company</option>
                      {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Source PR Reference
                    </label>
                    <input
                      value={selectedPr ? selectedPr.requestNumber : prSearch}
                      onChange={e => { setPrSearch(e.target.value); set('sourcePurchaseRequestId', ''); setShowPrDropdown(true); }}
                      onFocus={() => setShowPrDropdown(true)}
                      placeholder="Search PRs..."
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    {showPrDropdown && filteredPrs.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredPrs.map((p: any) => (
                          <button key={p.id} type="button"
                            onClick={() => { set('sourcePurchaseRequestId', p.id); setPrSearch(''); setShowPrDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                            <span className="font-medium text-gray-700">{p.requestNumber}</span>
                            <span className="text-gray-400 ml-2">{p.company}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Closing Date/Time</label>
                    <input type="datetime-local" value={form.closingDateTime} onChange={e => set('closingDateTime', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Bid Validity Period (days)</label>
                    <input type="number" value={form.bidValidityDays} onChange={e => set('bidValidityDays', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Submission Settings</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sealed Bid</p>
                        <p className="text-xs text-gray-400">Bids remain locked until closing time.</p>
                      </div>
                      <input type="checkbox" checked={form.sealedBid} onChange={e => set('sealedBid', e.target.checked)}
                        className="w-5 h-5 accent-blue-600" />
                    </label>
                    <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Technical/Commercial Separation</p>
                        <p className="text-xs text-gray-400">Separate envelopes for evaluation.</p>
                      </div>
                      <input type="checkbox" checked={form.technicalCommercialSeparation} onChange={e => set('technicalCommercialSeparation', e.target.checked)}
                        className="w-5 h-5 accent-blue-600" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            )}

            {/* Items tab */}
            {tab === 'Items' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <ListChecks className="w-4 h-4" /> RFQ Items
                </h2>

                {items.length > 0 && (
                  <div className="overflow-x-auto mb-4 rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Specification</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2">UOM</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((i, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-gray-800 font-medium">{i.itemDescription}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{i.specification || '—'}</td>
                            <td className="px-3 py-2 text-right">{i.qty}</td>
                            <td className="px-3 py-2">{i.uom}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end bg-gray-50 rounded-xl p-3">
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400">Description *</label>
                    <input value={newItem.itemDescription} onChange={e => setNewItem(v => ({ ...v, itemDescription: e.target.value }))}
                      className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400">Specification</label>
                    <input value={newItem.specification} onChange={e => setNewItem(v => ({ ...v, specification: e.target.value }))}
                      className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">Qty</label>
                    <input type="number" value={newItem.qty} onChange={e => setNewItem(v => ({ ...v, qty: parseFloat(e.target.value) || 0 }))}
                      className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">UOM</label>
                    <input value={newItem.uom} onChange={e => setNewItem(v => ({ ...v, uom: e.target.value }))}
                      className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <button onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            )}

            {/* Suppliers tab */}
            {tab === 'Suppliers' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <Users2 className="w-4 h-4" /> Invite Suppliers
                </h2>
                <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                  placeholder="Search suppliers..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {filteredSuppliers.map((s: any) => {
                    const selected = selectedSupplierIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSupplier(s.id)}
                        className={`flex items-center justify-between gap-2 text-left rounded-xl px-4 py-3 border transition ${
                          selected ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.supplierCode}</p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <p className="text-sm text-gray-300 col-span-2 text-center py-6">No suppliers found.</p>
                  )}
                </div>
                {selectedSupplierIds.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-4 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                    <Info className="w-3.5 h-3.5" /> {selectedSupplierIds.length} supplier(s) will be invited to quote.
                  </div>
                )}
              </div>
            )}

            {/* Commercial Terms tab */}
            {tab === 'Commercial Terms' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4" /> Commercial Terms
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Currency</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Delivery Terms (Incoterm)</label>
                    <select value={form.deliveryTerms} onChange={e => set('deliveryTerms', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      {DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Delivery Location</label>
                    <select value={form.deliveryLocationId} onChange={e => set('deliveryLocationId', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Select location</option>
                      {deliveryLocations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Payment Terms</label>
                    <input value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)}
                      placeholder="e.g. Net 60 days from invoice"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Attachments tab */}
            {tab === 'Attachments' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <Paperclip className="w-4 h-4" /> Attachments
                </h2>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">Click to upload files</span>
                  <span className="text-xs text-gray-300">Specs, drawings, budget docs — uploaded after RFQ is saved</span>
                  <input type="file" multiple className="hidden" onChange={handleFilePick} />
                </label>

                {pendingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {pendingFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium text-gray-700 flex-1 truncate">{f.name}</span>
                        <button onClick={() => removePendingFile(idx)} className="text-gray-300 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Approvals tab */}
            {tab === 'Approvals' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4" /> Approvals
                </h2>
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-700">
                    RFQ approval routing follows your company's standard workflow and will be triggered
                    automatically once this RFQ is issued. No manual configuration needed here.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Sourcing Progress</h2>
              <div className="space-y-4">
                {[
                  { n: 1, label: 'Draft Creation', sub: 'Current step', active: true },
                  { n: 2, label: 'Departmental Approval', sub: 'Pending issuance', active: false },
                  { n: 3, label: 'Bidding Phase', sub: `${form.bidValidityDays || 0} days window`, active: false },
                ].map(step => (
                  <div key={step.n} className="flex gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      step.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>{step.n}</div>
                    <div>
                      <p className={`text-sm font-medium ${step.active ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                      <p className="text-xs text-gray-400">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPr && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Linked Documents</h2>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                  <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{selectedPr.requestNumber}</p>
                    <p className="text-[10px] text-gray-400">{selectedPr.company}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5" /> Help &amp; Guidelines
              </h2>
              <p className="text-xs text-amber-700 leading-relaxed">
                Enable "Technical/Commercial Separation" for RFQs above QAR 100,000 as per standard
                procurement policy. Sealed bids stay locked until the closing time you set.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-6">
          <button onClick={() => navigate('/rfq')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Issue RFQ
          </button>
        </div>
      </div>
    </div>
  );
}
