// ===== FILE: src/pages/PurchaseRequest/MyRequests.tsx =====
import { useEffect, useState } from "react";
import { useNavigate ,useSearchParams } from "react-router-dom";
import api from "../../api/client";
import {
  FileText, Paperclip, AlertTriangle,
  Clock, CheckCircle2, XCircle, RotateCcw, Calendar, Printer, Download
} from "lucide-react";
 
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://10.10.50.23:5000/api").replace(/\/api\/?$/, "");
function getFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
function isImage(fileName?: string) {
  if (!fileName) return false;
  return IMAGE_EXTS.includes(fileName.toLowerCase().slice(fileName.lastIndexOf(".")));
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "Draft":           return "bg-gray-100 text-gray-700 border border-gray-300";
    case "Submitted":       return "bg-blue-100 text-blue-700 border border-blue-300";
    case "PendingApproval": return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    case "Approved":        return "bg-green-100 text-green-700 border border-green-300";
    case "Rejected":        return "bg-red-100 text-red-700 border border-red-300";
    case "Returned":        return "bg-orange-100 text-orange-700 border border-orange-300";
    case "OracleReady":     return "bg-purple-100 text-purple-700 border border-purple-300";
    case "OraclePosted":    return "bg-indigo-100 text-indigo-700 border border-indigo-300";
    default:                return "bg-gray-100 text-gray-600 border border-gray-300";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "Approved":        return <CheckCircle2 size={13} className="inline mr-1" />;
    case "Rejected":        return <XCircle size={13} className="inline mr-1" />;
    case "Returned":        return <RotateCcw size={13} className="inline mr-1" />;
    case "PendingApproval": return <Clock size={13} className="inline mr-1" />;
    default:                return null;
  }
}

const STATUS_FILTERS = ["ALL","Draft","PendingApproval","Approved","Rejected","Returned","OracleReady","OraclePosted"];
const QUICK_DATES = [
  { key: "today",   label: "Today" },
  { key: "week",    label: "Last 7 Days" },
  { key: "month",   label: "This Month" },
  { key: "3months", label: "Last 3 Months" },
];

export default function MyRequests() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  const [requests,        setRequests]        = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState("ALL");
  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [quickDate,       setQuickDate]       = useState("");
  const [dateError,       setDateError]       = useState("");
  const [openView,        setOpenView]        = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsLoading,  setDetailsLoading]  = useState(false);
  const [toast,           setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  // ── NEW: image preview lightbox state ──
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

useEffect(() => {
  const urlFilter = searchParams.get("filter");
  if (urlFilter) setFilter(urlFilter);
  loadRequests();
}, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const r    = await api.get(`/purchase-requests/user/${user.id}`);
      const list = r.data?.data ?? r.data ?? [];
      setRequests(Array.isArray(list) ? list : []);
    } catch { showToast("Failed to load requests", "error"); }
    finally  { setLoading(false); }
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Print — opens the same print report used by Store Keeper / Approver ───
  function printRequest(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    window.open(`/purchase-requests/${id}/print`, "_blank", "noopener,noreferrer");
  }

  // ── Quick date filter ─────────────────────────────────────────────────────
  function applyQuickDate(key: string) {
    if (quickDate === key) {
      setQuickDate(""); setDateFrom(""); setDateTo(""); setDateError("");
      return;
    }
    const now = new Date();
    const fmt  = (d: Date) => d.toISOString().slice(0, 10);
    setQuickDate(key);
    setDateError("");
    if (key === "today") {
      setDateFrom(fmt(now)); setDateTo(fmt(now));
    } else if (key === "week") {
      const s = new Date(now); s.setDate(now.getDate() - 7);
      setDateFrom(fmt(s)); setDateTo(fmt(now));
    } else if (key === "month") {
      const s = new Date(now); s.setDate(1);
      setDateFrom(fmt(s)); setDateTo(fmt(now));
    } else if (key === "3months") {
      const s = new Date(now); s.setMonth(now.getMonth() - 3);
      setDateFrom(fmt(s)); setDateTo(fmt(now));
    }
  }

  // ── Date change handlers ──────────────────────────────────────────────────
  function handleDateFromChange(val: string) {
    setDateFrom(val);
    setQuickDate("");
    if (dateTo && val > dateTo) {
      setDateTo("");
      setDateError("'From' date is after 'To' date — 'To' cleared.");
      setTimeout(() => setDateError(""), 3000);
    } else {
      setDateError("");
    }
  }

  function handleDateToChange(val: string) {
    setDateTo(val);
    setQuickDate("");
    if (dateFrom && val < dateFrom) {
      setDateError("'To' date cannot be before 'From' date.");
      setTimeout(() => setDateError(""), 3000);
    } else {
      setDateError("");
    }
  }

  function clearDateFilter() {
    setDateFrom(""); setDateTo(""); setQuickDate(""); setDateError("");
  }

  // ── View modal ────────────────────────────────────────────────────────────
  async function viewRequest(id: string) {
    try {
      setOpenView(true); setDetailsLoading(true);
      const r = await api.get(`/purchase-requests/${id}`);
      setSelectedRequest(r.data?.data ?? r.data);
    } catch { showToast("Failed to load details", "error"); setOpenView(false); }
    finally  { setDetailsLoading(false); }
  }

  async function submitRequest(id: string) {
    if (!confirm("Submit this request for approval?")) return;
    try {
      setSubmitting(true);
      await api.post(`/purchase-requests/${id}/submit`);
      showToast("Submitted successfully!", "success");
      setOpenView(false); await loadRequests();
    } catch (err: any) { showToast(err?.response?.data?.message || "Submit failed", "error"); }
    finally { setSubmitting(false); }
  }

  async function deleteRequest(id: string) {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    try {
      setDeleting(true);
      await api.delete(`/purchase-requests/${id}`);
      showToast("Draft deleted", "success");
      setOpenView(false); await loadRequests();
    } catch (err: any) { showToast(err?.response?.data?.message || "Delete failed", "error"); }
    finally { setDeleting(false); }
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = requests.filter(x => {
    if (filter !== "ALL" && x.status !== filter) return false;
    if (dateFrom && new Date(x.createdAt) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(x.createdAt) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const counts: Record<string, number> = { ALL: requests.length };
  requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>{toast.msg}</div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex items-center justify-between">
          <div className="border-l-4 border-blue-600 pl-4">
            <h1 className="text-2xl font-bold text-gray-800">My Purchase Requests</h1>
            <p className="text-gray-500 text-sm mt-1">Track your requests, drafts and approval status</p>
          </div>
          <button onClick={() => navigate("/create-request")}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            + New Request
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">

          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                  filter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}>
                {f === "ALL" ? "All" : f}
                {(counts[f] ?? 0) > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    filter === f ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
                  }`}>{counts[f]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 font-medium">Date:</span>

            {QUICK_DATES.map(q => (
              <button key={q.key} onClick={() => applyQuickDate(q.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  quickDate === q.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}>
                {q.label}
              </button>
            ))}

            <span className="text-gray-300 text-xs mx-1">|</span>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={e => handleDateFromChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-600"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={e => handleDateToChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-600"
              />
              {hasDateFilter && (
                <button onClick={clearDateFilter}
                  className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition">
                  ✕ Clear
                </button>
              )}
              {dateError && (
                <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                  ⚠ {dateError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 text-gray-400">
            Loading requests...
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No requests found</p>
            {hasDateFilter && <p className="text-gray-400 text-sm mt-1">Try clearing the date filter</p>}
            <button onClick={() => navigate("/create-request")}
              className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-blue-700 transition">
              Create New Request
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Request List</h2>
              <span className="text-sm text-gray-400">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {hasDateFilter && <span className="ml-1 text-blue-500">(filtered)</span>}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Request No","Company","Project","Status & Stage","Date","Amount (QAR)","Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap text-sm">{r.requestNumber}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-sm">{r.companyName || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate text-sm" title={r.projectName}>{r.projectName || "—"}</td>

                      {/* Status & Stage — merged single column */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${statusBadgeClass(r.status)}`}>
                            {statusIcon(r.status)}{r.status}
                          </span>
                          {r.status === "PendingApproval" && r.currentPendingStage && (
                            <span className="text-xs text-amber-600 pl-1 flex items-center gap-1">
                              <span>↳</span> Awaiting: <span className="font-medium">{r.currentPendingStage.trim()}</span>
                            </span>
                          )}
                          {r.status === "Returned" && r.currentPendingStage && (
                            <span className="text-xs text-orange-600 pl-1 flex items-center gap-1">
                              <span>↳</span> Returned at: <span className="font-medium">{r.currentPendingStage.trim()}</span>
                            </span>
                          )}
                          {r.status === "Rejected" && r.currentPendingStage && (
                            <span className="text-xs text-red-500 pl-1 flex items-center gap-1">
                              <span>↳</span> Rejected at: <span className="font-medium">{r.currentPendingStage.trim()}</span>
                            </span>
                          )}
                          {r.status === "Approved" && (
                            <span className="text-xs text-green-600 pl-1">↳ Fully Approved ✓</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-sm">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap text-sm">
                        {Number(r.totalAmount || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => viewRequest(r.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline">
                            View
                          </button>
                          <button onClick={(e) => printRequest(r.id, e)}
                            title="Print MR"
                            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium text-sm hover:underline">
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {openView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Purchase Request Details</h2>
                {selectedRequest && (
                  <p className="text-sm text-gray-400 mt-0.5">
                    {selectedRequest.requestNumber} &nbsp;·&nbsp;
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(selectedRequest.status)}`}>
                      {statusIcon(selectedRequest.status)}{selectedRequest.status}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selectedRequest && (
                  <button onClick={(e) => printRequest(selectedRequest.id, e)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition">
                    <Printer size={14} /> Print
                  </button>
                )}
                <button onClick={() => { setOpenView(false); setSelectedRequest(null); }}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {detailsLoading && <div className="py-16 text-center text-gray-400">Loading details...</div>}

              {!detailsLoading && selectedRequest && (() => {
                const req = selectedRequest;
                return (
                  <>
                    {/* Pending Stage Banner */}
                    {req.status === "PendingApproval" && req.currentPendingStage && (
                      <div className="flex gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200">
                        <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Awaiting Approval</p>
                          <p className="text-sm text-amber-700 mt-0.5">
                            Currently pending: <span className="font-semibold">{req.currentPendingStage.trim()}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reject / Return Banner */}
                    {req.rejectionComment && (req.status === "Rejected" || req.status === "Returned") && (
                      <div className={`flex gap-3 p-4 rounded-xl border ${
                        req.status === "Rejected" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"
                      }`}>
                        <AlertTriangle size={18} className={
                          req.status === "Rejected" ? "text-red-500 shrink-0 mt-0.5" : "text-orange-500 shrink-0 mt-0.5"
                        } />
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${req.status === "Rejected" ? "text-red-800" : "text-orange-800"}`}>
                            {req.status === "Rejected" ? "Request Rejected" : "Request Returned for Correction"}
                          </p>
                          {req.rejectionComment.stageName && (
                            <p className={`text-xs font-medium mt-1 ${req.status === "Rejected" ? "text-red-600" : "text-orange-600"}`}>
                              At stage: <span className="font-semibold">{req.rejectionComment.stageName.trim()}</span>
                            </p>
                          )}
                          <p className={`text-sm mt-1 ${req.status === "Rejected" ? "text-red-700" : "text-orange-700"}`}>
                            By: <span className="font-medium">{req.rejectionComment.byUser}</span>
                            &nbsp;·&nbsp;
                            {new Date(req.rejectionComment.at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                          </p>
                          {req.rejectionComment.comment && (
                            <div className={`mt-2 px-3 py-2.5 rounded-lg text-sm ${
                              req.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                            }`}>
                              <span className="font-medium">Reason: </span>
                              <span className="italic">"{req.rejectionComment.comment}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Request No",       value: req.requestNumber },
                        { label: "Company",          value: req.companyName },
                        { label: "Project",          value: req.projectName    || "—" },
                        { label: "Department",       value: req.departmentName || "—" },
                        { label: "Requested By",     value: req.requestedBy },
                        { label: "Date",             value: new Date(req.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) },
                        { label: "Total (QAR)",      value: Number(req.totalAmount || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 }) },
                        { label: "Status",           value: req.status },
                        { label: "Delivery Location", value: req.deliveryLocation || "—" },
                        { label: "Contact Number",    value: req.contactNumber || "—" },
                        ...(req.assignedToName ? [{ label: "Assigned To (Procurement)", value: req.assignedToName }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className="font-semibold text-gray-800 text-sm">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Business Justification */}
                    {req.justification && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-500 mb-1 uppercase tracking-wide">Business Justification</p>
                        <p className="text-sm text-blue-900">{req.justification}</p>
                      </div>
                    )}

                    {/* Items Table */}
                    {req.items?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-blue-500" />
                          Items ({req.items.length})
                        </h3>
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                {["#","Code","Material Name","Qty","UOM","Unit Price","Total","Required","Item Justification","Attachment"].map(h => (
                                  <th key={h} className="text-left px-3 py-2.5 text-gray-500 font-medium whitespace-nowrap text-xs">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {req.items.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-3 text-gray-400 text-xs">{idx + 1}</td>
                                  <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{item.materialCode}</td>
                                  <td className="px-3 py-3 text-gray-800 font-medium max-w-[180px]">{item.materialName}</td>
                                  <td className="px-3 py-3 font-semibold text-gray-800">{item.quantity}</td>
                                  <td className="px-3 py-3 text-gray-500">{item.uom}</td>
                                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                                    {Number(item.estimatedUnitPrice || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">
                                    {Number(item.lineTotal || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                                    {item.requiredDate ? new Date(item.requiredDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) : "—"}
                                  </td>
                                  <td className="px-3 py-3 text-gray-600 text-xs max-w-[160px]">
                                    {item.justification ? <span className="italic">{item.justification}</span> : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-3 py-3">
                                    {item.attachmentUrl ? (
                                      isImage(item.attachmentFileName) ? (
                                        <button type="button"
                                          onClick={() => setPreviewImage({ url: getFileUrl(item.attachmentUrl), name: item.attachmentFileName })}
                                          className="block">
                                          <img src={getFileUrl(item.attachmentUrl)} alt={item.attachmentFileName}
                                            className="h-10 w-10 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition cursor-pointer" />
                                        </button>
                                      ) : (
                                        <a href={getFileUrl(item.attachmentUrl)} target="_blank" rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                                          <Paperclip size={12} />{item.attachmentFileName || "File"}
                                        </a>
                                      )
                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                              <tr>
                                <td colSpan={6} className="px-3 py-3 text-right font-semibold text-gray-600 text-sm">Grand Total:</td>
                                <td className="px-3 py-3 font-bold text-blue-700 text-sm">
                                  QAR {Number(req.totalAmount || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                                </td>
                                <td colSpan={3} />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Approval Trail */}
                    {req.approvals?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Approval Trail</h3>
                        <div className="space-y-2">
                          {req.approvals.map((a: any, idx: number) => (
                            <div key={idx} className={`flex items-center gap-4 p-3.5 rounded-xl border ${
                              a.status === "APPROVED" ? "bg-green-50 border-green-100"
                              : a.status === "REJECTED" ? "bg-red-50 border-red-100"
                              : a.status === "RETURNED" ? "bg-orange-50 border-orange-100"
                              : "bg-gray-50 border-gray-100"
                            }`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                a.status === "APPROVED"  ? "bg-green-600 text-white"
                                : a.status === "REJECTED" ? "bg-red-600 text-white"
                                : a.status === "RETURNED" ? "bg-orange-500 text-white"
                                : "bg-gray-300 text-gray-600"
                              }`}>{a.stepOrder}</div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{a.stepName}</p>
                                <p className="text-xs text-gray-500">{a.approverName}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  a.status === "APPROVED"  ? "bg-green-100 text-green-700"
                                  : a.status === "REJECTED" ? "bg-red-100 text-red-700"
                                  : a.status === "RETURNED" ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-500"
                                }`}>{a.status}</span>
                                {a.completedAt && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(a.completedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            {!detailsLoading && selectedRequest && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50 rounded-b-2xl">
                <button onClick={() => { setOpenView(false); setSelectedRequest(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-100 transition">
                  Close
                </button>
                <div className="flex gap-3">
                  {selectedRequest.canDelete && (
                    <button onClick={() => deleteRequest(selectedRequest.id)} disabled={deleting}
                      className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition disabled:opacity-50">
                      {deleting ? "Deleting..." : "Delete Draft"}
                    </button>
                  )}
                  {selectedRequest.canEdit && (
                    <button onClick={() => { setOpenView(false); navigate(`/create-request?edit=${selectedRequest.id}`); }}
                      className="px-5 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm hover:bg-blue-50 transition">
                      Edit Request
                    </button>
                  )}
                  {selectedRequest.canSubmit && selectedRequest.status === "Draft" && (
                    <button onClick={() => submitRequest(selectedRequest.id)} disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                      {submitting ? "Submitting..." : "Submit for Approval"}
                    </button>
                  )}
                  {selectedRequest.status === "Returned" && (
                    <button onClick={() => submitRequest(selectedRequest.id)} disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50">
                      {submitting ? "Resubmitting..." : "Resubmit Request"}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── NEW: Image preview lightbox — opens attachment images in-page
          with a preview, and a separate explicit Download button. Avoids
          relying on the browser's default file-open behavior, which was
          triggering a download instead of a preview for some server
          response configurations. ── */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-6"
          onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-10 right-0 flex items-center gap-3">
              <a href={previewImage.url} download={previewImage.name}
                className="flex items-center gap-1.5 text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                onClick={e => e.stopPropagation()}>
                <Download size={14} /> Download
              </a>
              <button onClick={() => setPreviewImage(null)}
                className="text-white text-3xl leading-none hover:text-gray-300 transition">
                ✕
              </button>
            </div>
            <img src={previewImage.url} alt={previewImage.name}
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <p className="text-center text-white text-sm mt-3">{previewImage.name}</p>
          </div>
        </div>
      )}

    </div>
  );
}