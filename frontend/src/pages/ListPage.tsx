import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { StatusBadge } from '../components/Ui';
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Mail, Building2, Briefcase,
  UserCog, CheckCircle2, XCircle, Search, X, Crown,
  Package, FileText, Clock, Pencil, ImageIcon, Loader2,
} from "lucide-react";
import MaterialEdit from '../components/MaterialEdit';

const config: any = {
  materials: {
    title: 'Item Master',
    endpoint: '/materials',
    cols: ['materialCode', 'name', 'mainGroup', 'subGroup', 'source', 'uom', 'estimatedPrice'],
  },
  projects: {
    title: 'Project Master',
    endpoint: '/projects',
    cols: ['name', 'companyName', 'departmentName', 'source'],
  },
  requests: {
    title: 'Purchase Requests',
    endpoint: '/purchase-requests',
    cols: ['requestNumber', 'status', 'justification', 'totalAmount'],
  },
  approvals: {
    title: 'Pending Approvals',
    endpoint: '',
    cols: ['requestNumber', 'requesterName', 'companyName', 'stepName', 'totalAmount', 'daysWaiting'],
  },
  workflows: {
    title: 'Workflow Configuration',
    endpoint: '/workflows',
    cols: ['name', 'isDefault', 'companyId'],
  },
  organization: {
    title: 'Organization Management',
    endpoint: '/companies',
    cols: ['code', 'name', 'isOracleIntegrated', 'currency'],
  },
  users: {
    title: 'User Management',
    endpoint: '/users',
    cols: ['fullName', 'email', 'company', 'department', 'role']
  },
  uploads: {
    title: 'Upload Center',
    endpoint: '/uploads',
    cols: ['module', 'fileName', 'totalRows', 'successRows', 'errorRows'],
  },
  oracle: {
    title: 'Oracle Integration Monitor',
    endpoint: '/integration-logs',
    cols: ['direction', 'module', 'status', 'retryCount', 'message'],
  },
  audit: {
    title: 'Audit Logs',
    endpoint: '/audit-logs',
    cols: ['module', 'action', 'userName', 'details'],
  },
  notifications: {
    title: 'Notifications',
    endpoint: '/notifications',
    cols: ['title', 'message', 'isRead'],
  },
  settings: {
    title: 'Admin Settings',
    endpoint: '/companies',
    cols: ['code', 'name', 'isOracleIntegrated', 'currency'],
  },
};

const PILL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
];

const APPROVAL_STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_FILTER_MAP: Record<string, string> = {
  Draft: 'Draft',
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Returned: 'Returned',
  OracleReady: 'Oracle Ready',
};

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const fmtQ = (n: number) =>
  'QAR ' + Number(n ?? 0).toLocaleString('en-QA', { maximumFractionDigits: 2 });

function fmtDate(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://10.10.50.23:5000/api").replace(/\/api\/?$/, "");
function getLogoUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

export default function ListPage({ type }: { type: string }) {

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [searchParams] = useSearchParams();

  const c = type === 'approvals'
    ? { ...config[type], endpoint: `/approvals/pending/${user.id}` }
    : config[type];

  const navigate = useNavigate();

  const [rows, setRows]                   = useState<any[]>([]);
  const [search, setSearch]               = useState(() => {
    if (type === 'requests') {
      const urlFilter = searchParams.get('filter');
      if (urlFilter) return STATUS_FILTER_MAP[urlFilter] ?? urlFilter;
    }
    return "";
  });
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter]       = useState("");
  const [sourceFilter, setSourceFilter]   = useState("");

  // NEW — hides deactivated users from the list by default. Toggle to
  // reveal them (e.g. to reactivate someone later).
  const [showInactive, setShowInactive]   = useState(false);

  const [reqCompanyFilter, setReqCompanyFilter] = useState("");
  const [reqCompanies, setReqCompanies]         = useState<any[]>([]);
  const [dateFrom, setDateFrom]                 = useState("");
  const [dateTo, setDateTo]                     = useState("");
  const [quickDate, setQuickDate]               = useState("");

  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [accessMap, setAccessMap]             = useState<Record<string, any[]>>({});
  const [accessLoading, setAccessLoading]     = useState<string | null>(null);
  const [detailMap, setDetailMap]             = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading]     = useState<string | null>(null);
  const [matDetailMap, setMatDetailMap]       = useState<Record<string, any>>({});
  const [matDetailLoading, setMatDetailLoading] = useState<string | null>(null);

  const [matCompanyId, setMatCompanyId]     = useState("");
  const [matPage, setMatPage]               = useState(1);
  const [matTotal, setMatTotal]             = useState(0);
  const [matTotalPages, setMatTotalPages]   = useState(0);
  const [matLoading, setMatLoading]         = useState(false);
  const [matCompanies, setMatCompanies]     = useState<any[]>([]);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    code: '', name: '', currency: 'QAR', isOracleIntegrated: false,
  });
  const [companyFormError, setCompanyFormError] = useState<string | null>(null);
  const [companyFormSaving, setCompanyFormSaving] = useState(false);

  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const logoFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (type === "materials") {
      api.get("/companies").then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        setMatCompanies(list);
      });
      setRows([]);
      setMatTotal(0);
      setMatCompanyId("");
      setMatPage(1);
    } else if (c?.endpoint) {
      api.get(c.endpoint).then(r => setRows(r.data?.data ?? r.data ?? []));
    }
    if (type === "requests") {
      api.get("/companies").then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        setReqCompanies(list);
      });
    }
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (type !== "materials" || !matCompanyId) return;
    setMatLoading(true);
    api.get("/materials", {
      params: { companyId: matCompanyId, page: matPage, pageSize: 50, search: search || undefined }
    })
      .then(r => {
        setRows(r.data.items ?? []);
        setMatTotal(r.data.total ?? 0);
        setMatTotalPages(r.data.totalPages ?? 0);
      })
      .finally(() => setMatLoading(false));
  }, [type, matCompanyId, matPage, search]);

  function reloadMaterials() {
    if (!matCompanyId) return;
    setMatLoading(true);
    api.get("/materials", {
      params: { companyId: matCompanyId, page: matPage, pageSize: 50, search: search || undefined }
    })
      .then(r => {
        setRows(r.data.items ?? []);
        setMatTotal(r.data.total ?? 0);
        setMatTotalPages(r.data.totalPages ?? 0);
      })
      .finally(() => setMatLoading(false));
  }

  function reloadOrganization() {
    if (!c?.endpoint) return;
    api.get(c.endpoint).then(r => setRows(r.data?.data ?? r.data ?? []));
  }

  function triggerLogoUpload(companyId: string) {
    logoFileInputRefs.current[companyId]?.click();
  }

  async function handleLogoFileChange(companyId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingLogoId(companyId);
      await api.post(`/companies/${companyId}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      reloadOrganization();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogoId(null);
      e.target.value = "";
    }
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setCompanyFormError(null);

    if (!companyForm.code.trim())     return setCompanyFormError('Company Code is required.');
    if (!companyForm.name.trim())     return setCompanyFormError('Company Name is required.');
    if (!companyForm.currency.trim()) return setCompanyFormError('Currency is required.');

    const existingWithHolding = rows.find(r => (r.holdingId ?? r.HoldingId));
    const holdingId = existingWithHolding?.holdingId ?? existingWithHolding?.HoldingId;

    if (!holdingId) {
      return setCompanyFormError(
        'Could not determine HoldingId from existing companies. At least one company must already exist.'
      );
    }

    setCompanyFormSaving(true);
    try {
      await api.post('/companies', {
        code: companyForm.code.trim().toUpperCase(),
        name: companyForm.name.trim(),
        currency: companyForm.currency.trim().toUpperCase(),
        isOracleIntegrated: companyForm.isOracleIntegrated,
        holdingId,
      });
      setCompanyForm({ code: '', name: '', currency: 'QAR', isOracleIntegrated: false });
      setShowAddCompany(false);
      reloadOrganization();
    } catch (e: any) {
      setCompanyFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to create company.');
    } finally {
      setCompanyFormSaving(false);
    }
  }

  const createRoutes: any = {
    users: "/users/create",
    materials: "/materials/create",
    projects: "/projects/create",
    requests: "/create-request"
  };

  const isOrganization = type === "organization" || type === "settings";

  function applyQuickDate(key: string) {
    if (quickDate === key) {
      setQuickDate(""); setDateFrom(""); setDateTo("");
      return;
    }
    const now = new Date();
    const fmtD = (d: Date) => d.toISOString().slice(0, 10);
    setQuickDate(key);
    if (key === "today") {
      setDateFrom(fmtD(now)); setDateTo(fmtD(now));
    } else if (key === "week") {
      const s = new Date(now); s.setDate(now.getDate() - 7);
      setDateFrom(fmtD(s)); setDateTo(fmtD(now));
    } else if (key === "month") {
      const s = new Date(now); s.setDate(1);
      setDateFrom(fmtD(s)); setDateTo(fmtD(now));
    } else if (key === "3months") {
      const s = new Date(now); s.setMonth(now.getMonth() - 3);
      setDateFrom(fmtD(s)); setDateTo(fmtD(now));
    }
  }

  function clearReqFilters() {
    setSearch(""); setReqCompanyFilter(""); setDateFrom(""); setDateTo(""); setQuickDate("");
  }

  const filteredRows = rows
    .filter(r => type !== "users" || showInactive || (r.isActive ?? r.IsActive) !== false)
    .filter(r => type !== "users" || !companyFilter || r.company === companyFilter)
    .filter(r => type !== "users" || !roleFilter || r.role === roleFilter)
    .filter(r => type !== "materials" || !sourceFilter || r.source === sourceFilter)
    .filter(r => type !== "requests" || !reqCompanyFilter || r.company === reqCompanyFilter)
    .filter(r => type !== "requests" || !dateFrom || new Date(r.createdAt) >= new Date(dateFrom))
    .filter(r => type !== "requests" || !dateTo || new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"))
    .filter(r =>
      type === "materials" ||
      !search ||
      Object.values(r).some(val =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );

  const userCompanies = type === "users" ? [...new Set(rows.map(r => r.company))] : [];
  const userRoles     = type === "users" ? [...new Set(rows.map(r => r.role))]    : [];
  const hasActiveFilters = !!(search || companyFilter || roleFilter || sourceFilter || reqCompanyFilter || dateFrom || dateTo);

  async function toggleExpandUser(rowId: string) {
    if (expandedId === rowId) { setExpandedId(null); return; }
    setExpandedId(rowId);
    if (!accessMap[rowId]) {
      try {
        setAccessLoading(rowId);
        const res = await api.get(`/companies/user/${rowId}`);
        setAccessMap(prev => ({ ...prev, [rowId]: res.data?.data ?? res.data ?? [] }));
      } catch {
        setAccessMap(prev => ({ ...prev, [rowId]: [] }));
      } finally {
        setAccessLoading(null);
      }
    }
  }

  async function toggleExpandRequest(rowId: string) {
    if (expandedId === rowId) { setExpandedId(null); return; }
    setExpandedId(rowId);
    if (!detailMap[rowId]) {
      try {
        setDetailLoading(rowId);
        const res = await api.get(`/purchase-requests/${rowId}`);
        setDetailMap(prev => ({ ...prev, [rowId]: res.data }));
      } catch {
        setDetailMap(prev => ({ ...prev, [rowId]: null }));
      } finally {
        setDetailLoading(null);
      }
    }
  }

  async function toggleExpandMaterial(rowId: string) {
    if (expandedId === rowId) { setExpandedId(null); return; }
    setExpandedId(rowId);
    if (!matDetailMap[rowId]) {
      try {
        setMatDetailLoading(rowId);
        const res = await api.get(`/materials/${rowId}`);
        setMatDetailMap(prev => ({ ...prev, [rowId]: res.data }));
      } catch {
        setMatDetailMap(prev => ({ ...prev, [rowId]: null }));
      } finally {
        setMatDetailLoading(null);
      }
    }
  }

  const isUsers      = type === "users";
  const isRequests   = type === "requests";
  const isMaterials  = type === "materials";
  const isExpandable = isUsers || isRequests || isMaterials;

  function handleRowClick(rowId: string) {
    if (isUsers)     toggleExpandUser(rowId);
    if (isRequests)  toggleExpandRequest(rowId);
    if (isMaterials) toggleExpandMaterial(rowId);
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{c.title}</h1>
            <p className="text-gray-500 text-sm">Search, review, and manage records</p>
          </div>
        </div>
        {createRoutes[type] && (
          <button
            onClick={() => navigate(createRoutes[type])}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium text-sm"
          >
            + New
          </button>
        )}
        {isOrganization && (
          <button
            onClick={() => { setShowAddCompany(true); setCompanyFormError(null); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium text-sm"
          >
            + Add Company
          </button>
        )}
      </div>

      {showAddCompany && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">Add Company</h3>
              <button onClick={() => setShowAddCompany(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveCompany} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Company Code</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. DIM01"
                  value={companyForm.code}
                  onChange={e => setCompanyForm(f => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Company Name</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Dimora"
                  value={companyForm.name}
                  onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Currency</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="QAR"
                  value={companyForm.currency}
                  onChange={e => setCompanyForm(f => ({ ...f, currency: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={companyForm.isOracleIntegrated}
                  onChange={e => setCompanyForm(f => ({ ...f, isOracleIntegrated: e.target.checked }))}
                />
                Oracle Integrated (this company syncs from Bright ERP)
              </label>

              {companyFormError && <p className="text-red-600 text-xs">{companyFormError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={companyFormSaving}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                  {companyFormSaving ? 'Saving…' : 'Save Company'}
                </button>
                <button type="button"
                  onClick={() => setShowAddCompany(false)}
                  className="text-sm px-4 py-2 rounded-xl border hover:bg-gray-100 transition">
                  Cancel
                </button>
              </div>

              {companyForm.isOracleIntegrated && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Note: after saving, go to <strong>Oracle Monitor → Branch → Company Mappings</strong> to map
                  this company's Bright branch ID, then run a sync.
                </p>
              )}

              {isOrganization && (
                <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  Logo upload is available on the company row after saving.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            placeholder="Search..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (type === "materials") setMatPage(1);
            }}
          />
        </div>

        {type === "users" && (
          <>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
              <option value="">All Companies</option>
              {userCompanies.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {userRoles.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2.5 rounded-xl border border-gray-200 bg-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </>
        )}

        {type === "requests" && (
          <>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition min-w-[200px]"
              value={reqCompanyFilter} onChange={e => setReqCompanyFilter(e.target.value)}>
              <option value="">All Companies</option>
              {reqCompanies.map((c: any) => (
                <option key={c.id ?? c.Id} value={c.name ?? c.Name}>{c.name ?? c.Name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "7 Days" },
                { key: "month", label: "This Month" },
                { key: "3months", label: "3 Months" },
              ].map(q => (
                <button key={q.key} onClick={() => applyQuickDate(q.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    quickDate === q.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}>
                  {q.label}
                </button>
              ))}
              <input type="date" value={dateFrom} max={dateTo || undefined}
                onChange={e => { setDateFrom(e.target.value); setQuickDate(""); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={dateTo} min={dateFrom || undefined}
                onChange={e => { setDateTo(e.target.value); setQuickDate(""); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
            </div>
          </>
        )}

        {type === "materials" && (
          <>
            <select
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[240px]"
              value={matCompanyId}
              onChange={e => { setMatCompanyId(e.target.value); setMatPage(1); }}
            >
              <option value="">— Select Company to load items —</option>
              {matCompanies.map((c: any) => (
                <option key={c.id ?? c.Id} value={c.id ?? c.Id}>
                  {c.code ?? c.Code} — {c.name ?? c.Name}
                </option>
              ))}
            </select>
            {matTotal > 0 && (
              <span className="text-xs text-gray-400 whitespace-nowrap">{matTotal.toLocaleString()} items</span>
            )}
            {matLoading && (
              <span className="text-xs text-blue-500 flex items-center gap-1">
                <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                Loading…
              </span>
            )}
          </>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setCompanyFilter(""); setRoleFilter(""); setSourceFilter(""); clearReqFilters(); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition ml-auto"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {type === "materials" && !matCompanyId && !matLoading && (
        <div className="text-center py-16 text-gray-400">
          <Package size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Select a company above to load items.</p>
        </div>
      )}

      {(type !== "materials" || matCompanyId) && (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {isExpandable && <th className="px-3 py-3 w-8"></th>}
                {isOrganization && <th className="px-4 py-3 text-left w-20">Logo</th>}
                {c.cols.map((x: string) => (
                  <th key={x} className="px-4 py-3 text-left">
                    {x.replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
                {isUsers && <th className="px-4 py-3 text-left">Access</th>}
                {isUsers && <th className="px-4 py-3 w-16"></th>}
                {isMaterials && <th className="px-4 py-3 w-16"></th>}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={c.cols.length + (isUsers ? 3 : isExpandable ? 1 : 0) + (isMaterials ? 1 : 0) + (isOrganization ? 1 : 0)}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    {isMaterials && matLoading ? "Loading items…" : "No data found"}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  const rowId      = r.id ?? r.Id ?? String(i);
                  const isOpen     = isExpandable && expandedId === rowId;
                  const accessList = accessMap[rowId];
                  const detail     = detailMap[rowId];
                  const matDetail  = matDetailMap[rowId];
                  const totalCols  = c.cols.length
                    + (isUsers ? 3 : isExpandable ? 1 : 0)
                    + (isMaterials ? 1 : 0)
                    + (isOrganization ? 1 : 0);

                  const logoUrl = r.logoUrl ?? r.LogoUrl;

                  return (
                    <>
                      <tr
                        key={rowId}
                        onClick={() => handleRowClick(rowId)}
                        className={`border-t hover:bg-blue-50 ${isExpandable ? 'cursor-pointer' : ''} ${isOpen ? 'bg-blue-50/60' : ''}`}
                      >
                        {isExpandable && (
                          <td className="px-3 py-3 text-gray-400">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                        )}

                        {isOrganization && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              ref={el => { logoFileInputRefs.current[rowId] = el; }}
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              className="hidden"
                              onChange={e => handleLogoFileChange(rowId, e)}
                            />
                            <button
                              type="button"
                              onClick={() => triggerLogoUpload(rowId)}
                              title={logoUrl ? "Click to replace logo" : "Click to upload logo"}
                              className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-blue-400 transition relative"
                            >
                              {uploadingLogoId === rowId ? (
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                              ) : logoUrl ? (
                                <img src={getLogoUrl(logoUrl)} alt={r.name ?? r.Name ?? "Logo"} className="w-full h-full object-contain" />
                              ) : (
                                <ImageIcon size={16} className="text-gray-300" />
                              )}
                            </button>
                          </td>
                        )}

                        {c.cols.map((col: string) => {
                          const v = r[col];
                          return (
                            <td key={col} className="px-4 py-3">
                              {col.toLowerCase().includes("status") ? (
                                <StatusBadge value={v} />
                              ) : col.toLowerCase().includes("amount") ? (
                                fmtQ(v)
                              ) : (
                                String(v ?? "-")
                              )}
                            </td>
                          );
                        })}

                        {isUsers && (
                          <td className="px-4 py-3">
                            {accessList ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Building2 size={12} />
                                {accessList.length} {accessList.length === 1 ? 'company' : 'companies'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                <Building2 size={12} /> View
                              </span>
                            )}
                          </td>
                        )}

                        {isUsers && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/users/edit/${rowId}`)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </td>
                        )}

                        {isMaterials && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditMaterialId(rowId)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </td>
                        )}
                      </tr>

                      {isOpen && isMaterials && (
                        <tr key={`${rowId}-mat`} className="border-t border-b border-blue-100">
                          <td colSpan={totalCols} className="px-6 py-4 bg-gradient-to-br from-blue-50/30 via-white to-white">
                            {matDetailLoading === rowId ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : !matDetail ? (
                              <p className="text-sm text-gray-400 text-center py-4">Unable to load item details.</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                  <p className="text-xs text-gray-400 mb-1">Item Code</p>
                                  <p className="text-sm font-semibold text-gray-800 font-mono">{matDetail.itemCode ?? '-'}</p>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                  <p className="text-xs text-gray-400 mb-1">Source</p>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                    ${matDetail.sourceType === 'ORACLE'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                    {matDetail.sourceType === 'ORACLE' ? '🔄 Oracle Synced' : '✏️ Manual'}
                                  </span>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                  <p className="text-xs text-gray-400 mb-1">Created</p>
                                  <p className="text-sm font-semibold text-gray-800">{fmtDate(matDetail.createdAt)}</p>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                  <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {matDetail.updatedAt ? fmtDate(matDetail.updatedAt) : 'Not modified'}
                                  </p>
                                </div>

                                {matDetail.description && matDetail.description.trim() !== '' && (
                                  <div className="col-span-2 md:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <p className="text-xs text-gray-400 mb-1">Description</p>
                                    <p className="text-sm text-gray-700">{matDetail.description}</p>
                                  </div>
                                )}

                                {matDetail.hasActiveMRs && (
                                  <div className="col-span-2 md:col-span-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2 items-center">
                                    <span className="text-lg">⚠️</span>
                                    <p className="text-sm text-amber-800">
                                      This item is used in <strong>{matDetail.activeMRCount}</strong> active request(s).
                                      Group and UOM cannot be changed until those requests are completed.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {isOpen && isUsers && (
                        <tr key={`${rowId}-user`} className="border-t border-b border-indigo-100">
                          <td colSpan={totalCols} className="px-6 py-6 bg-gradient-to-br from-indigo-50/50 via-white to-white">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                                  <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm flex-shrink-0">
                                    {getInitials(r.fullName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{r.fullName}</p>
                                    <p className="text-xs text-gray-400">{r.role ?? '-'}</p>
                                  </div>
                                  <div className="ml-auto flex-shrink-0">
                                    {(r.isActive ?? r.IsActive) ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={12} /> Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                        <XCircle size={12} /> Inactive
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {[
                                    { icon: <Mail size={14} />, bg: 'bg-blue-50 text-blue-600', label: 'Email', val: r.email },
                                    { icon: <Briefcase size={14} />, bg: 'bg-amber-50 text-amber-600', label: 'Department', val: r.department },
                                    { icon: <Crown size={14} />, bg: 'bg-emerald-50 text-emerald-600', label: 'Primary Company', val: r.company },
                                  ].map(({ icon, bg, label, val }) => (
                                    <div key={label} className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-gray-400">{label}</p>
                                        <p className="text-sm text-gray-700 font-medium truncate">{val ?? '-'}</p>
                                      </div>
                                    </div>
                                  ))}
                                  {r.manager && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                        <UserCog size={14} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-gray-400">Reports To</p>
                                        <p className="text-sm text-gray-700 font-medium truncate">{r.manager}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Accessible Companies / Divisions</p>
                                  {accessList && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {accessList.length}
                                    </span>
                                  )}
                                </div>
                                {accessLoading === rowId ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : accessList && accessList.length > 0 ? (
                                  <div className="flex flex-wrap gap-2.5">
                                    {accessList.map((comp: any, idx: number) => {
                                      const compName = comp.name ?? comp.Name;
                                      const isPrimary = compName === r.company;
                                      return (
                                        <span key={comp.id ?? comp.Id}
                                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition ${isPrimary ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : PILL_COLORS[idx % PILL_COLORS.length]}`}>
                                          <Building2 size={14} className={isPrimary ? 'text-indigo-200' : ''} />
                                          {compName}
                                          {isPrimary && <span className="text-[10px] bg-indigo-500 text-indigo-50 px-1.5 py-0.5 rounded-full font-semibold">Primary</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Building2 size={28} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No additional company access</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isOpen && isRequests && (
                        <tr key={`${rowId}-req`} className="border-t border-b border-blue-100">
                          <td colSpan={totalCols} className="px-6 py-6 bg-gradient-to-br from-blue-50/40 via-white to-white">
                            {detailLoading === rowId ? (
                              <div className="flex items-center justify-center py-10">
                                <div className="w-6 h-6 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : !detail ? (
                              <p className="text-center py-8 text-sm text-gray-400">Unable to load request details.</p>
                            ) : (
                              <div className="space-y-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  {[
                                    { label: 'Company', val: detail.companyName },
                                    { label: 'Requested By', val: detail.requestedBy },
                                    { label: 'Project', val: detail.projectName ?? 'No Project' },
                                    { label: 'Current Stage', val: detail.currentStage, blue: true },
                                  ].map(({ label, val, blue }: any) => (
                                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                                      <p className={`text-sm font-semibold truncate ${blue ? 'text-blue-700' : 'text-gray-800'}`}>{val ?? '-'}</p>
                                    </div>
                                  ))}
                                </div>
                                {detail.justification && (
                                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                                    <p className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">Justification</p>
                                    <p className="text-sm text-gray-700">{detail.justification}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                  <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Package size={14} />
                                      </div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items ({detail.items?.length ?? 0})</p>
                                    </div>
                                    {detail.items?.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                                              <th className="text-left py-2 pr-2 font-semibold">Item</th>
                                              <th className="text-right py-2 px-2 font-semibold">Qty</th>
                                              <th className="text-left py-2 px-2 font-semibold">UOM</th>
                                              <th className="text-right py-2 pl-2 font-semibold">Unit Price</th>
                                              <th className="text-right py-2 pl-2 font-semibold">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detail.items.map((it: any, idx: number) => (
                                              <tr key={it.id ?? idx} className="border-b border-gray-50 last:border-0">
                                                <td className="py-2.5 pr-2">
                                                  <p className="font-medium text-gray-800 text-sm">{it.materialName ?? '-'}</p>
                                                  <p className="text-xs text-gray-400 font-mono">{it.materialCode ?? ''}</p>
                                                </td>
                                                <td className="py-2.5 px-2 text-right text-gray-700">{it.quantity}</td>
                                                <td className="py-2.5 px-2 text-gray-500">{it.uom ?? '-'}</td>
                                                <td className="py-2.5 pl-2 text-right text-gray-700">{fmtQ(it.estimatedUnitPrice)}</td>
                                                <td className="py-2.5 pl-2 text-right font-semibold text-gray-800">
                                                  {fmtQ((it.quantity ?? 0) * (it.estimatedUnitPrice ?? 0))}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr>
                                              <td colSpan={4} className="pt-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                                              <td className="pt-3 text-right text-base font-bold text-gray-800">{fmtQ(detail.totalAmount)}</td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 py-4 text-center">No items found.</p>
                                    )}
                                  </div>
                                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <FileText size={14} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval History</p>
                                       {detail.workflowName ? (
  <p className="text-xs text-purple-600 font-medium truncate">
    Flow: {detail.workflowName}
    {detail.workflowCode && (
      <span className="text-gray-400 font-normal"> ({detail.workflowCode})</span>
    )}
    <br />
    {detail.totalWorkflowSteps ? ` · Step ${detail.approvals?.length ?? 0} of ${detail.totalWorkflowSteps}` : ""}
  </p>
) : (
  <p className="text-xs text-red-500 font-medium">⚠️ No workflow matched this request</p>
)}

                                      </div>
                                    </div>
                                    {detail.approvals?.length > 0 ? (
                                      <div className="space-y-2.5">
                                        {detail.approvals.map((a: any, idx: number) => (
                                          <div key={idx} className="border border-gray-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400">STEP {a.stepOrder}</span>
                                                <span className="text-sm font-medium text-gray-800">{a.stepName ?? '-'}</span>
                                              </div>
                                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${APPROVAL_STATUS_STYLE[a.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                {a.status}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                              <span>{a.approverName ?? '-'}</span>
                                              {a.completedAt && (
                                                <span className="flex items-center gap-1">
                                                  <Clock size={11} />
                                                  {new Date(a.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 py-4 text-center">No approval history.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>

          {isMaterials && matTotalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-400">
                Page {matPage} of {matTotalPages} · {matTotal.toLocaleString()} total items
              </p>
              <div className="flex gap-2">
                <button disabled={matPage <= 1} onClick={() => setMatPage(p => p - 1)}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition">← Prev</button>
                <button disabled={matPage >= matTotalPages} onClick={() => setMatPage(p => p + 1)}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editMaterialId && (
        <MaterialEdit
          itemId={editMaterialId}
          onClose={() => setEditMaterialId(null)}
          onSaved={() => { setEditMaterialId(null); reloadMaterials(); }}
        />
      )}

    </div>
  );
}
