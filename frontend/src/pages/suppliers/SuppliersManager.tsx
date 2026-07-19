// ===== FILE: pages/suppliers/SuppliersManager.tsx =====
// Save under: src/pages/suppliers/SuppliersManager.tsx

import { useEffect, useState } from 'react';
import {
  Building2, Plus, Search, Star, X, Upload, FileText, Trash2,
  Loader2, Save, Globe2, Phone, Mail, MapPin, Landmark, Tag
} from 'lucide-react';
import api from '../../api/client';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  country: string | null;
  address: string | null;
  contactPerson: string | null;
  landline: string | null;
  email: string | null;
  mobile: string | null;
  defaultCurrency: string | null;
  bankAccountName: string | null;
  bankAddress: string | null;
  bankName: string | null;
  iban: string | null;
  sourceType: string;
  rating?: number | null;
  companyId?: string | null;
  companyName?: string | null;
  isActive: boolean;
}

interface SupplierDoc {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  notes: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

const DOC_TYPES = ['Trade License', 'Certificate', 'Bank Letter', 'Other'];
const SOURCE_BADGES: Record<string, { label: string; cls: string }> = {
  ORACLE_HQ: { label: 'Oracle HQ', cls: 'bg-blue-50 text-blue-700' },
  ORACLE_FMCG: { label: 'Oracle FMCG', cls: 'bg-purple-50 text-purple-700' },
  MANUAL: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
};

function Stars({ value, onChange, size = 16 }: { value: number | null | undefined; onChange?: (v: number) => void; size?: number }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={i <= v ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'}
          />
        </button>
      ))}
      {!value && !onChange && <span className="text-xs text-gray-300 ml-1">Not rated</span>}
    </div>
  );
}

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { top: search ? 100 : 60 };
      if (search) params.search = search;
      if (companyFilter) params.companyId = companyFilter;
      const res = await api.get('/suppliers', { params });
      setSuppliers(res.data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data?.data ?? r.data ?? [])).catch(console.error);
  }, []);

  // ✅ CHANGED: debounced server-side search instead of loading all 6500+
  // suppliers on every render — this was the actual cause of the slow load.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search, companyFilter]);

  const filtered = suppliers.filter(s =>
    sourceFilter === 'ALL' || s.sourceType === sourceFilter
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Suppliers
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Vendor master — Oracle-synced &amp; manually added suppliers
              </p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, code, country..."
                className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">All Companies</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'ORACLE_HQ', 'ORACLE_FMCG', 'MANUAL'].map(s => (
                <button key={s} onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    sourceFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{s === 'ALL' ? 'All' : (SOURCE_BADGES[s]?.label ?? s)}</button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} suppliers {!search && !companyFilter && '(showing first 60 — search or pick a company to narrow down)'}
            </span>
          </div>
        </div>

        {/* Grid of supplier cards */}
        {loading ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 text-sm font-medium">No suppliers found.</p>
            <p className="text-gray-300 text-xs mt-1">Sync from Oracle Monitor, or click "Add Supplier".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => {
              const badge = SOURCE_BADGES[s.sourceType] ?? { label: s.sourceType, cls: 'bg-gray-100 text-gray-600' };
              return (
                <div key={s.id} onClick={() => setDetailId(s.id)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 cursor-pointer transition group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate group-hover:text-blue-700 transition">{s.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{s.supplierCode}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    {s.country && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {s.country}</p>}
                    {s.mobile && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.mobile}</p>}
                    {s.email && <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" /> {s.email}</p>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Stars value={s.rating} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <SupplierFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {detailId && (
        <SupplierDetailPanel
          supplierId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CREATE MODAL
// ═══════════════════════════════════════════════════════════════════
function SupplierFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    supplierCode: '', name: '', country: '', address: '', contactPerson: '',
    landline: '', email: '', mobile: '', defaultCurrency: 'USD',
    bankAccountName: '', bankAddress: '', bankName: '', iban: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) return setError('Supplier name is required.');
    if (!form.supplierCode.trim()) return setError('Supplier code is required.');
    setSaving(true);
    try {
      await api.post('/suppliers', { ...form, sourceType: 'MANUAL', isActive: true });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Add Supplier
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Supplier Code *</label>
              <input value={form.supplierCode} onChange={e => set('supplierCode', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Supplier Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Default Currency</label>
              <select value={form.defaultCurrency} onChange={e => set('defaultCurrency', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {['USD', 'EUR', 'QAR', 'GBP', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Contact Person</label>
              <input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Mobile</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Landline</label>
              <input value={form.landline} onChange={e => set('landline', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> Bank Details (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Bank Name</label>
                <input value={form.bankName} onChange={e => set('bankName', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Account Name</label>
                <input value={form.bankAccountName} onChange={e => set('bankAccountName', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">IBAN</label>
                <input value={form.iban} onChange={e => set('iban', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Bank Address</label>
                <input value={form.bankAddress} onChange={e => set('bankAddress', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Supplier
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL / EDIT SLIDE-OVER
// ═══════════════════════════════════════════════════════════════════
function SupplierDetailPanel({ supplierId, onClose, onChanged }: {
  supplierId: string; onClose: () => void; onChanged: () => void;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [docs, setDocs] = useState<SupplierDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploadType, setUploadType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        api.get(`/suppliers/${supplierId}`),
        api.get(`/suppliers/${supplierId}/documents`),
      ]);
      const s = sRes.data?.data ?? sRes.data;
      setSupplier(s);
      setForm(s);
      setDocs(dRes.data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [supplierId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleRating = async (value: number) => {
    setSupplier(s => s ? { ...s, rating: value } : s);
    try {
      await api.put(`/suppliers/${supplierId}/rating`, { rating: value });
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/suppliers/${supplierId}`, form);
      setEditing(false);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companyId', '11111111-1111-1111-1111-111111111111'); // sentinel "Suppliers" bucket — not a real company
      const uploadRes = await api.post('/attachments/upload', fd);
      const { storageKey, fileName } = uploadRes.data;

      await api.post(`/suppliers/${supplierId}/documents`, {
        documentType: uploadType,
        fileName,
        storageKey,
      });
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to upload document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await api.delete(`/suppliers/documents/${docId}`);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl">
        {loading || !supplier ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-800 truncate">{supplier.name}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{supplier.supplierCode}</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X className="w-5 h-5" /></button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Stars value={supplier.rating} onChange={handleRating} size={20} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${(SOURCE_BADGES[supplier.sourceType] ?? { cls: 'bg-gray-100 text-gray-600' }).cls}`}>
                  {(SOURCE_BADGES[supplier.sourceType] ?? { label: supplier.sourceType }).label}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Details */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-medium hover:underline">Edit</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(false); setForm(supplier); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline disabled:opacity-50">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                  )}
                </div>

                {!editing ? (
                  <div className="space-y-2.5 text-sm">
                    {supplier.country && <p className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {supplier.country}</p>}
                    {supplier.address && <p className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {supplier.address}</p>}
                    {supplier.contactPerson && <p className="flex items-center gap-2 text-gray-600"><Tag className="w-4 h-4 text-gray-400" /> {supplier.contactPerson}</p>}
                    {supplier.mobile && <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {supplier.mobile}</p>}
                    {supplier.landline && <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {supplier.landline} (landline)</p>}
                    {supplier.email && <p className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" /> {supplier.email}</p>}
                    {supplier.defaultCurrency && <p className="flex items-center gap-2 text-gray-600"><Globe2 className="w-4 h-4 text-gray-400" /> {supplier.defaultCurrency}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      ['country', 'Country'], ['address', 'Address'], ['contactPerson', 'Contact Person'],
                      ['mobile', 'Mobile'], ['landline', 'Landline'], ['email', 'Email'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-gray-500">{label}</label>
                        <input value={form[key] ?? ''} onChange={e => set(key, e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank details */}
              {(supplier.bankName || supplier.iban || editing) && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> Bank Details
                  </h3>
                  {!editing ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      {supplier.bankName && <p>{supplier.bankName}</p>}
                      {supplier.bankAccountName && <p className="text-gray-500 text-xs">{supplier.bankAccountName}</p>}
                      {supplier.iban && <p className="font-mono text-xs">{supplier.iban}</p>}
                      {supplier.bankAddress && <p className="text-gray-400 text-xs">{supplier.bankAddress}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ['bankName', 'Bank Name'], ['bankAccountName', 'Account Name'],
                        ['iban', 'IBAN'], ['bankAddress', 'Bank Address'],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs font-medium text-gray-500">{label}</label>
                          <input value={form[key] ?? ''} onChange={e => set(key, e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Documents
                </h3>

                <div className="flex gap-2 mb-3">
                  <select value={uploadType} onChange={e => setUploadType(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className={`flex-1 flex items-center justify-center gap-1.5 border-2 border-dashed rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition ${
                    uploading ? 'border-blue-200 bg-blue-50 text-blue-500' : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>

                {docs.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-4">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map(d => (
                      <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a href={d.fileUrl} target="_blank" rel="noreferrer"
                            className="text-xs font-medium text-gray-700 hover:text-blue-600 truncate block">{d.fileName}</a>
                          <p className="text-[10px] text-gray-400">{d.documentType} · {new Date(d.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => handleDeleteDoc(d.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
