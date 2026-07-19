// ===== FILE: pages/internationalPO/InternationalPOCreate.tsx =====
// Save under: src/pages/internationalPO/InternationalPOCreate.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Globe2, Plus, Trash2, Building2, Truck, CreditCard,
  MapPin, FileText, ArrowLeft, Loader2, Ship, Plane
} from 'lucide-react';
import api from '../../api/client';

interface LineItem {
  freeTextItemCode: string;
  freeTextItemName: string;
  qty: number;
  uom: string;
  rate: number;
  discountAmount: number;
  sourcePurchaseRequestItemId?: string;
}

const INCOTERMS = ['EXW', 'FOB', 'FCA', 'CIP', 'CIF', 'CFR', 'DAP', 'DDP'];
const CARGO_TYPES = ['FCL', 'LCL'];
const FREIGHT_MODES = ['Air', 'Sea', 'Land'];

const DEFAULT_TERMS =
`1. Supplier to submit to Buyer the original shipping documents (B/L, Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet etc) in Five working days Before Shipment Arrival.

2. In case of imposing Delay Charges on Shipment (Liner Demurrage and/or Port Storage Charges) due to Late receipt of the Original shipping Documents by Buyer in less than five working days, Such Delay Charges shall be Charged to the Account of Supplier.

3. Draft copy of Shipping Documents (B/L Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet ...etc) should be provided to Buyer before dispatching the shipment form supplier.

4. The following condition to be mentioned in the BL: (14 days free at port of discharge). Shipment delay charges shall be to the account of supplier in case of failure to submit the B/L with a statement.

5. Shipping documents to mention correct information about material (Such as: Item Description, Price, Weight, Volume, Dimensions.. etc). In case of providing incorrect / wrong information in the shipping documents and accordingly incurring penalty / demurrage / port storage charges. Such charges shall be back charged to the account of Supplier.`;

export default function InternationalPOCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [prSearch, setPrSearch] = useState('');
  const [showPrDropdown, setShowPrDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<any>({
    isInternational: true,
    companyId: user.companyId || '',
    supplierId: '',
    poNo: '',
    linkedPurchaseRequestId: '',
    mrReferenceNumber: '',
    contactPerson: '',
    forDeliveryName: '',
    landlineEmail: '',
    mobile: '',
    deliveryLocationId: '',
    projectId: '',
    paymentType: 'Cash',
    email: '',
    originCountry: '',
    destinationPort: 'DOHA, QATAR',
    incoterm: 'CIP',
    performaNo: '',
    currency: 'USD',
    exchangeRate: 1,
    modeOfFreight: 'Air',
    typeOfCargo: 'LCL',
    paymentTermsText: '',
    termsAndConditions: DEFAULT_TERMS,
  });

  const [items, setItems] = useState<LineItem[]>([]);
  const [newItem, setNewItem] = useState<LineItem>({
    freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0,
  });
  const [prItems, setPrItems] = useState<any[]>([]);
  const [pullQty, setPullQty] = useState<Record<string, number>>({});
  const [loadingPrItems, setLoadingPrItems] = useState(false);

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data?.data ?? r.data ?? [])).catch(console.error);
    api.get('/suppliers').then(r => setSuppliers(r.data?.data ?? [])).catch(console.error);
    api.get('/purchase-requests').then(r => setPurchaseRequests(r.data?.data ?? r.data ?? [])).catch(console.error);
  }, []);

  // ✅ NEW — if opened from Procurement Queue's "Convert to PO" button
  // (?prId=... in the URL), auto-select that MR once the PR list has loaded.
  // ✅ NEW — if opened from Procurement Queue's "Convert to PO" flow with a
  // chosen type (?type=local|international), preset the toggle so the
  // officer doesn't have to click it again.
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'local') setForm((f: any) => ({ ...f, isInternational: false }));
    if (type === 'international') setForm((f: any) => ({ ...f, isInternational: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prId = searchParams.get('prId');
    if (prId && purchaseRequests.length > 0) {
      setForm((f: any) => ({ ...f, linkedPurchaseRequestId: prId }));
    }
  }, [purchaseRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.companyId) return;
    api.get(`/delivery-locations/by-company/${form.companyId}`).then(r => setDeliveryLocations(r.data?.data ?? [])).catch(console.error);
    api.get(`/projects`).then(r => {
      const all = r.data?.data ?? r.data ?? [];
      setProjects(all.filter((p: any) => p.companyId === form.companyId));
    }).catch(console.error);
  }, [form.companyId]);

  useEffect(() => {
    if (!form.linkedPurchaseRequestId) { setPrItems([]); setPullQty({}); return; }
    setLoadingPrItems(true);
    api.get(`/purchase-requests/${form.linkedPurchaseRequestId}/items`)
      .then(r => {
        const list = r.data?.data ?? [];
        setPrItems(list);
        // default: pre-fill each item's qty box with its full remaining qty
        const defaults: Record<string, number> = {};
        list.forEach((pi: any) => { defaults[pi.id] = pi.remainingQty ?? pi.qty; });
        setPullQty(defaults);
      })
      .catch(console.error)
      .finally(() => setLoadingPrItems(false));
  }, [form.linkedPurchaseRequestId]);

  const pullSelectedPrItems = () => {
    const toAdd: LineItem[] = prItems
      .filter(pi => (pullQty[pi.id] ?? 0) > 0)
      .map(pi => ({
        freeTextItemCode: pi.materialCode || '',
        freeTextItemName: pi.materialName || '',
        qty: Math.min(pullQty[pi.id], pi.remainingQty ?? pi.qty),
        uom: pi.uom || 'PCS',
        rate: pi.estimatedUnitPrice || 0,
        discountAmount: 0,
        sourcePurchaseRequestItemId: pi.id,
      }))
      .filter(li => li.qty > 0);
    setItems(prev => [...prev, ...toAdd]);
    // reset pulled items' qty boxes to 0 so they don't get double-added
    setPullQty(prev => {
      const next = { ...prev };
      toAdd.forEach(li => { if (li.sourcePurchaseRequestItemId) next[li.sourcePurchaseRequestItemId] = 0; });
      return next;
    });
  };

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const approvedPrs = purchaseRequests.filter((p: any) => (p.status ?? '').toLowerCase() === 'approved');
  const filteredPrs = approvedPrs.filter((p: any) =>
    prSearch.length > 0 &&
    ((p.requestNumber ?? '').toLowerCase().includes(prSearch.toLowerCase()) ||
     (p.company ?? '').toLowerCase().includes(prSearch.toLowerCase()))
  ).slice(0, 8);

  const selectedPr = purchaseRequests.find((p: any) => p.id === form.linkedPurchaseRequestId);

  const addItem = () => {
    if (!newItem.freeTextItemName.trim() || newItem.qty <= 0) return;
    setItems(prev => [...prev, newItem]);
    setNewItem({ freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0 });
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subTotal = items.reduce((sum, i) => sum + (i.qty * i.rate - i.discountAmount), 0);

  const handleSubmit = async () => {
    setError('');
    if (!form.companyId) return setError('Company is required.');
    if (!form.supplierId) return setError('Supplier is required.');

    setSaving(true);
    try {
      const { isInternational, ...payload } = form;
      const res = await api.post('/international-po', {
        ...payload,
        linkedPurchaseRequestId: payload.linkedPurchaseRequestId || null,
        deliveryLocationId: payload.deliveryLocationId || null,
        projectId: payload.projectId || null,
        requestedById: user.id,
        items: items.map(i => ({ ...i })),
      });
      const newId = res.data?.data?.id;
      navigate(`/international-po/${newId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create International PO.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/international-po')}
              className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-blue-600" />
                New International Purchase Order
              </h1>
              <p className="text-gray-500 text-sm mt-1">Set up the PO, then collect and compare vendor quotes</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Local / International toggle */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="text-xs font-medium text-gray-500 mb-2 block">PO Type *</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => set('isInternational', false)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition border-2 ${
                !form.isInternational ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>
              <Truck className="w-4 h-4" /> Local
            </button>
            <button type="button" onClick={() => set('isInternational', true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition border-2 ${
                form.isInternational ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>
              <Globe2 className="w-4 h-4" /> International
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {form.isInternational
              ? 'Shipping, incoterm, and freight details will be collected below.'
              : 'Local order — shipping fields are hidden and not required.'}
          </p>
        </div>

        {/* Company / Supplier */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4" /> Company &amp; Supplier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Company *</label>
              <select value={form.companyId} onChange={e => set('companyId', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select company</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Supplier *</label>
              <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select supplier</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">PO No (optional)</label>
              <input value={form.poNo} onChange={e => set('poNo', e.target.value)}
                placeholder="e.g. SH60/26"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-gray-500">MR Reference (Approved PRs only)</label>
              <input
                value={selectedPr ? selectedPr.requestNumber : prSearch}
                onChange={e => { setPrSearch(e.target.value); set('linkedPurchaseRequestId', ''); setShowPrDropdown(true); }}
                onFocus={() => setShowPrDropdown(true)}
                placeholder="Search approved MR/PR..."
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              {showPrDropdown && filteredPrs.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredPrs.map((p: any) => (
                    <button key={p.id} type="button"
                      onClick={() => { set('linkedPurchaseRequestId', p.id); setPrSearch(''); setShowPrDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-700">{p.requestNumber}</span>
                      <span className="text-gray-400 ml-2">{p.company}</span>
                    </button>
                  ))}
                </div>
              )}
              {showPrDropdown && prSearch.length > 0 && filteredPrs.length === 0 && (
                <p className="text-[11px] text-gray-400 mt-1">No approved MR matches "{prSearch}".</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Only Approved MRs show up here. If this PO isn't linked to a system MR, leave blank
                and type a reference below instead.
              </p>
              <input value={form.mrReferenceNumber} onChange={e => set('mrReferenceNumber', e.target.value)}
                placeholder="or type Bright MR number manually"
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Project</label>
              <select value={form.projectId} onChange={e => set('projectId', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">— None —</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Proforma No</label>
              <input value={form.performaNo} onChange={e => set('performaNo', e.target.value)}
                placeholder="e.g. PI-2026-0456"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4" /> Delivery Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Delivery Location</label>
              <select value={form.deliveryLocationId} onChange={e => set('deliveryLocationId', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select location</option>
                {deliveryLocations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">For Delivery (Contact)</label>
              <input value={form.forDeliveryName} onChange={e => set('forDeliveryName', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mobile</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Contact Person (Supplier side)</label>
              <input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Landline / Email (Supplier)</label>
              <input value={form.landlineEmail} onChange={e => set('landlineEmail', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Shipping */}
        {form.isInternational && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Ship className="w-4 h-4" /> Shipping &amp; Incoterm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Origin Country</label>
              <input value={form.originCountry} onChange={e => set('originCountry', e.target.value)}
                placeholder="e.g. GERMANY"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Destination</label>
              <input value={form.destinationPort} onChange={e => set('destinationPort', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Incoterm</label>
              <select value={form.incoterm} onChange={e => set('incoterm', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {INCOTERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mode of Freight</label>
              <div className="mt-1 flex gap-2">
                {FREIGHT_MODES.map(m => (
                  <button key={m} type="button" onClick={() => set('modeOfFreight', m)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition ${
                      form.modeOfFreight === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {m === 'Air' && <Plane className="w-3.5 h-3.5" />}
                    {m === 'Sea' && <Ship className="w-3.5 h-3.5" />}
                    {m === 'Land' && <Truck className="w-3.5 h-3.5" />}
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Type of Cargo</label>
              <div className="mt-1 flex gap-2">
                {CARGO_TYPES.map(c => (
                  <button key={c} type="button" onClick={() => set('typeOfCargo', c)}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      form.typeOfCargo === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4" /> Currency &amp; Payment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {['USD', 'EUR', 'QAR', 'GBP', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Exchange Rate (to QAR)</label>
              <input type="number" step="0.0001" value={form.exchangeRate}
                onChange={e => set('exchangeRate', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Type</label>
              <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {['Cash', 'Credit', 'LC'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Terms</label>
              <input value={form.paymentTermsText} onChange={e => set('paymentTermsText', e.target.value)}
                placeholder="e.g. CREDIT 60 DAYS FROM INVOICE DATE"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" /> Items
          </h2>

          {/* MR Items — pick from the linked approved MR */}
          {form.linkedPurchaseRequestId && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Items from {selectedPr?.requestNumber}
                </p>
                <button onClick={pullSelectedPrItems}
                  disabled={!Object.values(pullQty).some(q => q > 0)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" /> Add Selected
                </button>
              </div>
              {loadingPrItems ? (
                <p className="text-xs text-gray-400">Loading MR items...</p>
              ) : prItems.length === 0 ? (
                <p className="text-xs text-gray-400">No items found on this MR.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {prItems.map((pi: any) => {
                    const remaining = pi.remainingQty ?? pi.qty;
                    const fullyAllocated = remaining <= 0;
                    return (
                      <div key={pi.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${fullyAllocated ? 'bg-gray-50 opacity-50' : 'bg-white'}`}>
                        <span className="text-xs text-gray-500 font-mono w-20 shrink-0">{pi.materialCode}</span>
                        <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{pi.materialName}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {pi.allocatedQty > 0 && `${pi.allocatedQty} allocated · `}
                          {remaining} {pi.uom} left of {pi.qty}
                        </span>
                        <input type="number" min={0} max={remaining} step="0.01"
                          value={pullQty[pi.id] ?? 0}
                          disabled={fullyAllocated}
                          onChange={e => {
                            const v = Math.min(parseFloat(e.target.value) || 0, remaining);
                            setPullQty(prev => ({ ...prev, [pi.id]: v }));
                          }}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right shrink-0 disabled:bg-gray-100" />
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                Adjust the quantity per item — you don't have to bring in the full amount.
                The rest stays available for another Local/International PO from the same MR.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto mb-4 rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">UOM</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-gray-500">{i.freeTextItemCode || '—'}</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">{i.freeTextItemName}</td>
                      <td className="px-3 py-2 text-right">{i.qty}</td>
                      <td className="px-3 py-2">{i.uom}</td>
                      <td className="px-3 py-2 text-right">{i.rate.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{i.discountAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">{(i.qty * i.rate - i.discountAmount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/50">
                    <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-600">Sub Total</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">{form.currency} {subTotal.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ✅ CHANGED: manual free-text item entry only shown when this PO
              is NOT linked to an MR. Once linked, items must come from the
              MR's own lines (via the grid above) — no adding arbitrary new
              items that weren't part of the approved request. */}
          {form.linkedPurchaseRequestId ? (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
              This PO is linked to an approved MR — items can only be pulled from that MR's lines above.
              Manual item entry is disabled to keep this PO traceable to what was actually approved.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end bg-gray-50 rounded-xl p-3">
                <div className="col-span-1">
                  <label className="text-[11px] text-gray-400">Item Code</label>
                  <input value={newItem.freeTextItemCode}
                    onChange={e => setNewItem(v => ({ ...v, freeTextItemCode: e.target.value }))}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400">Description *</label>
                  <input value={newItem.freeTextItemName}
                    onChange={e => setNewItem(v => ({ ...v, freeTextItemName: e.target.value }))}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400">Qty</label>
                  <input type="number" value={newItem.qty}
                    onChange={e => setNewItem(v => ({ ...v, qty: parseFloat(e.target.value) || 0 }))}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400">UOM</label>
                  <input value={newItem.uom}
                    onChange={e => setNewItem(v => ({ ...v, uom: e.target.value }))}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400">Rate</label>
                  <input type="number" step="0.01" value={newItem.rate}
                    onChange={e => setNewItem(v => ({ ...v, rate: parseFloat(e.target.value) || 0 }))}
                    className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <button onClick={addItem}
                    className="w-full flex items-center justify-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Items can also be added after creating the PO — you don't need every line finalized now.
              </p>
            </>
          )}
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Terms &amp; Conditions</h2>
          <textarea value={form.termsAndConditions} onChange={e => set('termsAndConditions', e.target.value)}
            rows={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-6">
          <button onClick={() => navigate('/international-po')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Draft
          </button>
        </div>
      </div>
    </div>
  );
}
