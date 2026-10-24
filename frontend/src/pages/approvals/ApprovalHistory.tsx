// FILE: src/pages/approvals/ApprovalHistory.tsx
import { Fragment, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { FileText, Search, ChevronDown, ChevronUp, Package, Printer, Paperclip, RotateCcw } from "lucide-react";

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

// Local-time yyyy-mm-dd (toISOString() gives the UTC date, which is the wrong
// day for Qatar (UTC+3) between 00:00 and 03:00).
function toLocalIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ACTION_LABELS: Record<string, { text: string; className: string }> = {
  APPROVE:        { text: "Approved",        className: "bg-emerald-100 text-emerald-700" },
  REJECT:         { text: "Rejected",        className: "bg-red-100 text-red-700" },
  RETURN:         { text: "Returned",        className: "bg-amber-100 text-amber-700" },
  STORE_VERIFIED: { text: "Store Verified",  className: "bg-blue-100 text-blue-700" },
};

function actionBadge(actionType: string) {
  const meta = ACTION_LABELS[actionType] ?? { text: actionType, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${meta.className}`}>
      {meta.text}
    </span>
  );
}

export default function ApprovalHistory() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [history, setHistory]     = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch]       = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // "Current Status" modal, same pattern as the Requester's status
  // tracker (My Requests) and Approver's own status tracker.
  const [statusModal, setStatusModal]     = useState(false);
  const [statusData, setStatusData]       = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // ── Date filter ──────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<string>("all"); // all | today | 7d | month | 3m | custom
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  // Bumped whenever a reload is needed but none of the effect's other
  // dependencies changed (e.g. clicking "All Time" while already on All Time,
  // or clearing the search box).
  const [reloadKey, setReloadKey] = useState(0);
  // Only the latest request is allowed to update the screen.
  const requestSeq = useRef(0);

  function applyPreset(preset: string) {
    setDatePreset(preset);
    const today = new Date();
    let from = "";
    let to = "";

    if (preset === "today") {
      from = toLocalIso(today);
      to = toLocalIso(today);
    } else if (preset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      from = toLocalIso(past);
      to = toLocalIso(today);
    } else if (preset === "month") {
      from = toLocalIso(new Date(today.getFullYear(), today.getMonth(), 1));
      to = toLocalIso(today);
    } else if (preset === "3m") {
      // clamp the day so e.g. 31 May - 3 months = 28/29 Feb, not 3 March
      const past = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      const lastDay = new Date(past.getFullYear(), past.getMonth() + 1, 0).getDate();
      past.setDate(Math.min(today.getDate(), lastDay));
      from = toLocalIso(past);
      to = toLocalIso(today);
    }
    // "all" => from/to stay empty

    // If the dates are unchanged the effect would not fire, so force a reload.
    if (from === fromDate && to === toDate) {
      setReloadKey(k => k + 1);
    } else {
      setFromDate(from);
      setToDate(to);
    }
  }

  function resetAllFilters() {
    setCompanyId("");
    setSearch("");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
    setReloadKey(k => k + 1);
  }

  useEffect(() => {
    api.get("/companies")
      .then(r => setCompanies(r.data?.data ?? r.data ?? []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fromDate, toDate, reloadKey]);

  async function loadHistory() {
    if (!user?.id) {
      setHistory([]);
      setLoading(false);
      setLoadError("User session not found. Please log out and log in again.");
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError("");
    try {
      // If From is later than To, swap them for the request.
      let from = fromDate;
      let to = toDate;
      if (from && to && from > to) {
        [from, to] = [to, from];
      }

      const params = new URLSearchParams();
      if (companyId) params.set("companyId", companyId);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("fromDate", from);
      if (to) params.set("toDate", to);

      const qs = params.toString();
      const r = await api.get(`/approval-actions/my-history/${user.id}${qs ? `?${qs}` : ""}`);
      if (seq !== requestSeq.current) return; // a newer request superseded this one

      const payload = r.data?.data ?? r.data ?? [];
      setHistory(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setHistory([]);
      setLoadError(err?.response?.data?.message || "Failed to load approval history.");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadHistory();
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    // Clearing the box should immediately bring the full list back.
    if (value.trim() === "" && search.trim() !== "") {
      setReloadKey(k => k + 1);
    }
  }

  // opens the print report for this request in a new tab, same as
  // the requester and approver pages do.
  function printRequest(requestId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    window.open(`/purchase-requests/${requestId}/print`, "_blank", "noopener,noreferrer");
  }

  // fetches the request's live current status/workflow trail on
  // demand (same endpoint the Requester's and Approver's status trackers
  // already use), so this page shows where the request actually stands
  // right now, not just the one action this user took on it.
  async function viewStatus(requestId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      setStatusLoading(true);
      setStatusModal(true);
      setStatusData(null);
      const r = await api.get(`/approvals/status/${requestId}`);
      setStatusData(r.data.data || r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case "APPROVED": case "Approved":        return "bg-green-100 text-green-700 border-green-300";
      case "REJECTED": case "Rejected":        return "bg-red-100 text-red-700 border-red-300";
      case "RETURNED":                          return "bg-orange-100 text-orange-700 border-orange-300";
      case "PENDING": case "PendingApproval":   return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Submitted":                         return "bg-blue-100 text-blue-700 border-blue-300";
      case "Draft":                             return "bg-gray-100 text-gray-700 border-gray-300";
      default:                                  return "bg-gray-100 text-gray-600 border-gray-300";
    }
  }

  const filtersActive = !!(companyId || search.trim() || fromDate || toDate);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText size={22} className="text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800">My Approval History</h1>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-gray-200 rounded-xl p-4"
      >
        <select
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Companies</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by request number..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Search
        </button>

        {filtersActive && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 py-2 rounded-lg transition"
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </form>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { key: "all",   label: "All Time" },
          { key: "today", label: "Today" },
          { key: "7d",    label: "Last 7 Days" },
          { key: "month", label: "This Month" },
          { key: "3m",    label: "Last 3 Months" },
        ].map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              datePreset === p.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setDatePreset(e.target.value || toDate ? "custom" : "all"); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setDatePreset(e.target.value || fromDate ? "custom" : "all"); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : loadError ? (
          <div className="p-8 text-center text-red-500 text-sm">{loadError}</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No approval actions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Request No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Comments</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Current Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h: any) => {
                const hasAttachments = Array.isArray(h.attachments) && h.attachments.length > 0;
                const hasVerified = Array.isArray(h.verifiedItems) && h.verifiedItems.length > 0;
                const isExpandable = hasVerified || hasAttachments;
                return (
                <Fragment key={h.id}>
                  <tr
                    className={`hover:bg-gray-50 ${isExpandable ? "cursor-pointer" : ""}`}
                    onClick={() => isExpandable && setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {h.requestNumber}
                      {/* small paperclip badge when the request's items have
                          attachment(s), regardless of what action this row
                          represents — a quick visual cue before expanding. */}
                      {hasAttachments && (
                        <span title={`${h.attachments.length} attachment(s)`}
                          className="inline-flex items-center gap-0.5 ml-2 text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-1.5 py-0.5">
                          <Paperclip size={10} /> {h.attachments.length}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{h.companyName}</td>
                    <td className="px-4 py-3">{actionBadge(h.actionType)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{h.comments || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(h.actionDate).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => viewStatus(h.requestId, e)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        👁 Check status
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => printRequest(h.requestId, e)}
                          title="Print MR"
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2 py-1.5 rounded-lg transition">
                          <Printer size={12} /> Print
                        </button>
                        {isExpandable && (
                          <button onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700">
                            {expandedId === h.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === h.id && isExpandable && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-4 py-4 space-y-4">
                        {hasVerified && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500">
                              <Package size={14} /> Store Verification Details
                            </div>
                            <table className="w-full text-xs bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left px-3 py-2">Material</th>
                                  <th className="text-right px-3 py-2">Requested</th>
                                  <th className="text-right px-3 py-2">Available</th>
                                  <th className="text-right px-3 py-2">To Purchase</th>
                                  <th className="text-left px-3 py-2">Status</th>
                                  <th className="text-left px-3 py-2">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {h.verifiedItems.map((it: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2">
                                      <span className="font-medium">{it.materialCode}</span>
                                      <span className="text-gray-400"> — {it.materialName}</span>
                                    </td>
                                    <td className="text-right px-3 py-2">{it.requestedQty}</td>
                                    <td className="text-right px-3 py-2">{it.availableQty}</td>
                                    <td className="text-right px-3 py-2">{it.purchaseQty}</td>
                                    <td className="px-3 py-2">{it.storeStatus}</td>
                                    <td className="px-3 py-2 text-gray-500">{it.storeRemarks || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Attachments — shown whenever the request's
                            items have one, independent of action type. */}
                        {hasAttachments && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500">
                              <Paperclip size={14} /> Attachments
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {h.attachments.map((att: any, idx: number) => (
                                <a key={idx} href={getFileUrl(att.attachmentUrl)} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-2 hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                                  {isImage(att.attachmentFileName) ? (
                                    <img src={getFileUrl(att.attachmentUrl)} alt={att.attachmentFileName}
                                      className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0" />
                                  ) : (
                                    <Paperclip size={14} className="text-gray-400 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{att.materialCode} — {att.materialName}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{att.attachmentFileName || "File"}</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Current Status modal, same workflow-tracker pattern used
          elsewhere in the app (My Requests, My Approvals). */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">📊 Current Status</h2>
              <button onClick={() => setStatusModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition">✕</button>
            </div>
            <div className="p-5">
              {statusLoading ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading...</p>
                </div>
              ) : statusData ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                      <div className="text-gray-400 text-xs mb-1">Request No</div>
                      <div className="font-bold text-gray-800">{statusData.requestNumber}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                      <div className="text-gray-400 text-xs mb-1">Status</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(statusData.status)}`}>
                        {statusData.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                      <div className="text-gray-400 text-xs mb-1">Current Step</div>
                      <div className="font-semibold text-gray-800 text-xs">{statusData.currentStep || "—"}</div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 z-0" />
                    <div className="space-y-3 relative z-10">
                      {statusData.steps?.map((step: any, index: number) => (
                        <div key={index} className="flex gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ${
                            step.isCurrent ? "bg-yellow-500 text-white ring-4 ring-yellow-100" :
                            step.isDone    ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                          }`}>
                            {step.isDone ? "✓" : step.stepOrder}
                          </div>
                          <div className={`flex-1 border rounded-xl p-4 mb-1 ${
                            step.isCurrent ? "border-yellow-300 bg-yellow-50" :
                            step.isDone    ? "border-green-200 bg-green-50"   : "border-gray-200 bg-gray-50"
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">{step.stepName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">👤 {step.approverName}</div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(step.status)}`}>
                                {step.status}
                              </span>
                            </div>
                            {step.comments && (
                              <div className="mt-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                💬 {step.comments}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">No workflow data found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}