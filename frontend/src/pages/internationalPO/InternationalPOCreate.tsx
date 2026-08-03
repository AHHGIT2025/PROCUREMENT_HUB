
// ===== FILE: pages/internationalPO/InternationalPOCreate.tsx =====
// Save under: src/pages/internationalPO/InternationalPOCreate.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Globe2, Plus, Trash2, Building2, Truck, CreditCard,
  MapPin, FileText, ArrowLeft, Loader2, Ship, Plane, Package, Lock, RefreshCw
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
const FREIGHT_MODES = ['Air', 'Sea', 'Land'];

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'QAR', 'AED', 'SAR', 'KWD', 'BHD', 'OMR', 'JOD',
  'INR', 'PKR', 'CNY', 'JPY', 'CHF', 'TRY', 'EGP', 'LBP', 'CAD', 'AUD',
  'SGD', 'MYR', 'THB', 'ZAR', 'NGN',
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

  // ── NEW — role-based visibility. Managers/System Admin/Purchase Manager
  // see every approved MR (they're the ones assigning work out). Everyone
  // else (e.g. Purchase Officer) only ever sees MRs assigned to them.
  const userRoles: string[] = user.roles ?? [];
  const isManagerRole = userRoles.some(r => ['System Admin', 'Manager', 'Purchase Manager'].includes(r));

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [prSearch, setPrSearch] = useState('');
  const [showPrDropdown, setShowPrDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

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
    deliveryLocationText: '',
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
    typeOfCargo: '',
    paymentTermsText: '',
    termsAndConditions: DEFAULT_TERMS,
  });

  const [items, setItems] = useState<LineItem[]>([]);
  const [newItem, setNewItem] = useState<LineItem>({
    freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0,
  });
  const [prItems, setPrItems] = useState<any[]>([]);
  const [pullQty, setPullQty] = useState<Record<string, number>>({});
  const [pullChecked, setPullChecked] = useState<Record<string, boolean>>({});
  const [loadingPrItems, setLoadingPrItems] = useState(false);

  const isLinkedToMr = !!form.linkedPurchaseRequestId;

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data?.data ?? r.data ?? [])).catch(console.error);
    api.get('/suppliers').then(r => setSuppliers(r.data?.data ?? [])).catch(console.error);
    // ── CHANGED — was '/purchase-requests', which returned every approved
    // MR to everyone regardless of who it was assigned to. This now uses
    // the same queue the Procurement page already uses, which carries
    // assignedToId + canUpdatePO — needed to restrict an officer to only
    // their own assigned MRs (see approvedPrs filter below).
     api.get('/procurement/queue').then(r => setPurchaseRequests(r.data?.data ?? r.data ?? [])).catch(console.error);
  }, []);

  // If opened from Procurement Queue's "Convert to PO" flow with a chosen
  // type (?type=local|international), preset the toggle.
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'local') setForm((f: any) => ({ ...f, isInternational: false }));
    if (type === 'international') setForm((f: any) => ({ ...f, isInternational: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If opened with ?prId=... auto-select that MR once the PR list has loaded.
  useEffect(() => {
    const prId = searchParams.get('prId');
    if (prId && purchaseRequests.length > 0) {
      setForm((f: any) => ({ ...f, linkedPurchaseRequestId: prId }));
    }
  }, [purchaseRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once an MR is linked, auto-fill and lock Company + Project from the
  // MR itself. The officer doesn't choose these independently — they're
  // inherited from the already-approved request.
  useEffect(() => {
    if (!form.linkedPurchaseRequestId) return;
    const pr = purchaseRequests.find((p: any) => p.id === form.linkedPurchaseRequestId);
    if (pr) {
      setForm((f: any) => ({
        ...f,
        companyId: pr.companyId || f.companyId,
        projectId: pr.projectId || f.projectId,
      }));
    }
  }, [form.linkedPurchaseRequestId, purchaseRequests]);

  useEffect(() => {
    if (!form.companyId) return;
    api.get(`/projects`).then(r => {
      const all = r.data?.data ?? r.data ?? [];
      setProjects(all.filter((p: any) => p.companyId === form.companyId));
    }).catch(console.error);
  }, [form.companyId]);

  useEffect(() => {
    if (!form.linkedPurchaseRequestId) { setPrItems([]); setPullQty({}); setPullChecked({}); return; }
    setLoadingPrItems(true);
    api.get(`/purchase-requests/${form.linkedPurchaseRequestId}/items`)
      .then(r => {
        const list = r.data?.data ?? [];
        setPrItems(list);
        const qtyDefaults: Record<string, number> = {};
        const checkedDefaults: Record<string, boolean> = {};
        list.forEach((pi: any) => {
          qtyDefaults[pi.id] = pi.remainingQty ?? pi.qty;
          checkedDefaults[pi.id] = false;
        });
        setPullQty(qtyDefaults);
        setPullChecked(checkedDefaults);
      })
      .catch(console.error)
      .finally(() => setLoadingPrItems(false));
  }, [form.linkedPurchaseRequestId]);

  const pullSelectedPrItems = () => {
    const toAdd: LineItem[] = prItems
      .filter(pi => pullChecked[pi.id] && (pullQty[pi.id] ?? 0) > 0)
      .map(pi => ({
        freeTextItemCode: pi.materialCode || '',
        freeTextItemName: pi.materialName || '',
        qty: Math.min(pullQty[pi.id], pi.remainingQty ?? pi.qty),
        uom: pi.uom || 'PCS',
        rate: 0,
        discountAmount: 0,
        sourcePurchaseRequestItemId: pi.id,
      }))
      .filter(li => li.qty > 0);
    setItems(prev => [...prev, ...toAdd]);
    setPullChecked(prev => {
      const next = { ...prev };
      toAdd.forEach(li => { if (li.sourcePurchaseRequestItemId) next[li.sourcePurchaseRequestItemId] = false; });
      return next;
    });
  };

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  // ── CHANGED — role-gated. Managers see every approved MR (status field
  // from the queue endpoint: "Approved" / "Oracle Ready" / "PO Issued", all
  // of which mean "approved or beyond"). Everyone else only sees MRs
  // assigned to them, and only while there's still unconverted quantity.
  const approvedPrs = purchaseRequests.filter((p: any) =>
    isManagerRole || (p.assignedToId === user.id && p.canUpdatePO)
  );

  // ── CHANGED — p.company -> p.companyName (queue endpoint's field name)
  const filteredPrs = approvedPrs.filter((p: any) =>
    prSearch.length > 0 &&
    ((p.requestNumber ?? '').toLowerCase().includes(prSearch.toLowerCase()) ||
     (p.companyName ?? '').toLowerCase().includes(prSearch.toLowerCase()))
  ).slice(0, 8);

  const selectedPr = purchaseRequests.find((p: any) => p.id === form.linkedPurchaseRequestId);
  const selectedCompany = companies.find((c: any) => c.id === form.companyId);
  // ── CHANGED — dropped the selectedPr?.project fallback; the queue
  // endpoint doesn't return a "project" string field, only projectId,
  // which already flows into form.projectId and resolves against the
  // loaded projects list below.
  const selectedProject = projects.find((p: any) => p.id === form.projectId);

  const selectedSupplier = suppliers.find((s: any) => s.id === form.supplierId);
  const filteredSuppliers = suppliers.filter((s: any) =>
    supplierSearch.length > 0 &&
    (s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
     s.supplierCode?.toLowerCase().includes(supplierSearch.toLowerCase()))
  ).slice(0, 10);

  const addItem = () => {
    if (!newItem.freeTextItemName.trim() || newItem.qty <= 0) return;
    setItems(prev => [...prev, newItem]);
    setNewItem({ freeTextItemCode: '', freeTextItemName: '', qty: 1, uom: 'PCS', rate: 0, discountAmount: 0 });
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: 'qty' | 'rate' | 'discountAmount', value: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: round2(value) } : item));
  };

  const subTotal = round2(items.reduce((sum, i) => sum + (i.qty * i.rate - i.discountAmount), 0));

  const resetPage = () => {
    window.location.href = '/international-po/create';
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.companyId) return setError('Company is required.');
    if (!form.supplierId) return setError('Supplier is required.');
    if (items.length === 0) return setError('Add at least one item before creating the PO.');

    setSaving(true);
    try {
      const { isInternational, deliveryLocationText, ...payload } = form;
      const res = await api.post('/international-po', {
        ...payload,
        isInternational,
        forDeliveryName: payload.forDeliveryName,
        deliveryLocationId: null,
        deliveryLocationName: deliveryLocationText || null,
        linkedPurchaseRequestId: payload.linkedPurchaseRequestId || null,
        projectId: payload.projectId || null,
        requestedById: user.id,
        items: items.map(i => ({ ...i, qty: round2(i.qty), rate: round2(i.rate), discountAmount: round2(i.discountAmount) })),
      });
      const newId = res.data?.data?.id;
      navigate(`/international-po/${newId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create International PO.');
    } finally {
      setSaving(false);
    }
  };

  const anyChecked = Object.values(pullChecked).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/international-po')}
                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`border-l-4 pl-4 ${form.isInternational ? 'border-blue-600' : 'border-emerald-600'}`}>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {form.isInternational
                    ? <Globe2 className="w-6 h-6 text-blue-600" />
                    : <Truck className="w-6 h-6 text-emerald-600" />}
                  New Purchase Order
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {isLinkedToMr
                    ? `Converting ${selectedPr?.requestNumber || 'MR'} to a PO`
                    : 'Set up the PO details below'}
                </p>
              </div>
            </div>
            {isLinkedToMr && (
              <button onClick={resetPage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                <RefreshCw className="w-4 h-4" /> Refresh / Change MR
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Company / Supplier */}
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm p-6 bg-gradient-to-br from-blue-50/40 to-white">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4" /> Company &amp; Supplier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Company — locked when converting from an MR */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                Company * {isLinkedToMr && <Lock className="w-3 h-3 text-gray-400" />}
              </label>
              {isLinkedToMr ? (
                <div className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600">
                  {selectedCompany?.name || '—'}
                </div>
              ) : (
                <select value={form.companyId} onChange={e => set('companyId', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select company</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Supplier — type-to-filter search box */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500">Supplier *</label>
              <input
                value={selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.supplierCode})` : supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); set('supplierId', ''); setShowSupplierDropdown(true); }}
                onFocus={() => { if (form.supplierId) set('supplierId', ''); setShowSupplierDropdown(true); }}
                placeholder="Type supplier name or code..."
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              {showSupplierDropdown && !form.supplierId && filteredSuppliers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.map((s: any) => (
                    <button key={s.id} type="button"
                      onClick={() => { set('supplierId', s.id); setSupplierSearch(''); setShowSupplierDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <span className="text-gray-400 ml-2 font-mono">{s.supplierCode}</span>
                    </button>
                  ))}
                </div>
              )}
              {showSupplierDropdown && !form.supplierId && supplierSearch.length > 0 && filteredSuppliers.length === 0 && (
                <p className="text-[11px] text-gray-400 mt-1">No supplier matches "{supplierSearch}".</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">PO No (optional)</label>
              <input value={form.poNo} onChange={e => set('poNo', e.target.value)}
                placeholder="e.g. SH60/26"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            {/* MR Reference — locked/read-only once selected */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                MR Reference {isLinkedToMr && <Lock className="w-3 h-3 text-gray-400" />}
              </label>
              {isLinkedToMr ? (
                <div className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600">
                  {selectedPr?.requestNumber || '—'}
                </div>
              ) : (
                <>
                  <input
                    value={prSearch}
                    onChange={e => { setPrSearch(e.target.value); set('linkedPurchaseRequestId', ''); setShowPrDropdown(true); }}
                    onFocus={() => setShowPrDropdown(true)}
                    placeholder={isManagerRole ? "Search approved MR/PR..." : "Search your assigned MR/PR..."}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  {showPrDropdown && filteredPrs.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredPrs.map((p: any) => (
                        <button key={p.id} type="button"
                          onClick={() => { set('linkedPurchaseRequestId', p.id); setPrSearch(''); setShowPrDropdown(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                          <span className="font-medium text-gray-700">{p.requestNumber}</span>
                          <span className="text-gray-400 ml-2">{p.companyName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showPrDropdown && prSearch.length > 0 && filteredPrs.length === 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {isManagerRole ? `No approved MR matches "${prSearch}".` : `No assigned MR matches "${prSearch}".`}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {isManagerRole
                      ? 'Only Approved MRs show up here.'
                      : 'Only MRs assigned to you with remaining quantity show up here.'}
                    {' '}If this PO isn't linked to a system MR, leave blank and type a reference below instead.
                  </p>
                  <input value={form.mrReferenceNumber} onChange={e => set('mrReferenceNumber', e.target.value)}
                    placeholder="or type Bright MR number manually"
                    className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </>
              )}
            </div>

            {/* Project — locked when the linked MR already has one, otherwise editable */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                Project {isLinkedToMr && selectedProject && <Lock className="w-3 h-3 text-gray-400" />}
              </label>
              {isLinkedToMr && selectedProject ? (
                <div className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600">
                  {selectedProject.name}
                </div>
              ) : (
                <select value={form.projectId} onChange={e => set('projectId', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">— None —</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Proforma No</label>
              <input value={form.performaNo} onChange={e => set('performaNo', e.target.value)}
                placeholder="e.g. PI-2026-0456"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* PO Type */}
        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-6 bg-gradient-to-br from-indigo-50/40 to-white">
          <label className="text-xs font-semibold text-indigo-700 mb-2 block uppercase tracking-wide">PO Type *</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => set('isInternational', false)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition border-2 ${
                !form.isInternational ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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

        {/* Delivery */}
        <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-6 bg-gradient-to-br from-purple-50/40 to-white">
          <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4" /> Delivery Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Delivery Location</label>
              <input value={form.deliveryLocationText} onChange={e => set('deliveryLocationText', e.target.value)}
                placeholder="Type delivery location / site"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">For Delivery (Contact)</label>
              <input value={form.forDeliveryName} onChange={e => set('forDeliveryName', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mobile</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Contact Person (Supplier side)</label>
              <input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Landline / Email (Supplier)</label>
              <input value={form.landlineEmail} onChange={e => set('landlineEmail', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
        </div>

        {/* Shipping — International only */}
        {form.isInternational && (
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-6 bg-gradient-to-br from-sky-50/40 to-white">
          <h2 className="text-sm font-semibold text-sky-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Ship className="w-4 h-4" /> Shipping &amp; Incoterm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Origin Country</label>
              <input value={form.originCountry} onChange={e => set('originCountry', e.target.value)}
                placeholder="e.g. GERMANY"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Destination</label>
              <input value={form.destinationPort} onChange={e => set('destinationPort', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Incoterm</label>
              <select value={form.incoterm} onChange={e => set('incoterm', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {INCOTERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mode of Freight</label>
              <div className="mt-1 flex gap-2">
                {FREIGHT_MODES.map(m => (
                  <button key={m} type="button" onClick={() => set('modeOfFreight', m)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition ${
                      form.modeOfFreight === m ? 'bg-sky-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {m === 'Air' && <Plane className="w-3.5 h-3.5" />}
                    {m === 'Sea' && <Ship className="w-3.5 h-3.5" />}
                    {m === 'Land' && <Truck className="w-3.5 h-3.5" />}
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-sm p-6 bg-gradient-to-br from-emerald-50/40 to-white">
          <h2 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4" /> Currency &amp; Payment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Type</label>
              <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {['Cash', 'Credit', 'LC'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Payment Terms</label>
              <input value={form.paymentTermsText} onChange={e => set('paymentTermsText', e.target.value)}
                placeholder="e.g. CREDIT 60 DAYS FROM INVOICE DATE"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-6 bg-gradient-to-br from-amber-50/30 to-white">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" /> Items
            {items.length > 0 && (
              <span className="ml-1 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                {items.length} line{items.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>

          {/* MR Items */}
          {isLinkedToMr && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Items from {selectedPr?.requestNumber}
                </p>
                <button onClick={pullSelectedPrItems}
                  disabled={!anyChecked}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" /> Add Selected
                </button>
              </div>
              {loadingPrItems ? (
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading MR items...
                </p>
              ) : prItems.length === 0 ? (
                <p className="text-xs text-gray-400">No items found on this MR.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {prItems.map((pi: any) => {
                    const remaining = pi.remainingQty ?? pi.qty;
                    const fullyAllocated = remaining <= 0;
                    const checked = pullChecked[pi.id] ?? false;
                    return (
                      <div key={pi.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${fullyAllocated ? 'bg-gray-50 border-gray-100 opacity-60' : checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                        <input type="checkbox"
                          checked={checked}
                          disabled={fullyAllocated}
                          onChange={e => setPullChecked(prev => ({ ...prev, [pi.id]: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-300 shrink-0" />
                        <span className="text-xs text-gray-500 font-mono w-20 shrink-0">{pi.materialCode}</span>
                        <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{pi.materialName}</span>
                        <span className={`text-[10px] shrink-0 ${fullyAllocated ? 'text-gray-400' : 'text-gray-500'}`}>
                          {pi.allocatedQty > 0 && `${pi.allocatedQty} allocated · `}
                          {fullyAllocated ? 'fully allocated' : `${remaining} ${pi.uom} left of ${pi.qty}`}
                        </span>
                        <input type="number" min={0} max={remaining} step={1}
                          value={pullQty[pi.id] ?? 0}
                          disabled={fullyAllocated || !checked}
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
                Check the items you want on this PO, adjust the quantity if needed — partial, full,
                or split across 2-3 POs is fine. Set the actual PO price for each item in the table below.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto mb-4 rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">UOM</th>
                    <th className="px-3 py-2 text-right">Rate (PO price)</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((i, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40 transition">
                      <td className="px-3 py-2 text-gray-500">{i.freeTextItemCode || '—'}</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">{i.freeTextItemName}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={0} step={1} value={i.qty}
                          onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      </td>
                      <td className="px-3 py-2">{i.uom}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={0} step="0.01" value={i.rate}
                          onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="Enter price"
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={0} step="0.01" value={i.discountAmount}
                          onChange={e => updateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{round2(i.qty * i.rate - i.discountAmount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100/60">
                    <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-700">Sub Total</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-700">{form.currency} {subTotal.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {isLinkedToMr ? (
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
                  <input type="number" step={1} value={newItem.qty}
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
                    className="w-full flex items-center justify-center gap-1 bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-amber-700 transition">
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
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
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
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              form.isInternational ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Draft
          </button>
        </div>
      </div>
    </div>
  );
}