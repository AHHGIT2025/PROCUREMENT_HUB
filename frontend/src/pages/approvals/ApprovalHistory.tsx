// FILE: src/pages/approvals/ApprovalHistory.tsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import { FileText, Search, ChevronDown, ChevronUp, Package, Printer } from "lucide-react";

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
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch]       = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // NEW — "Current Status" modal, same pattern as the Requester's status
  // tracker (My Requests) and Approver's own status tracker.
  const [statusModal, setStatusModal]     = useState(false);
  const [statusData, setStatusData]       = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // ── Date filter ──────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<string>("all"); // all | today | 7d | month | 3m | custom
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  function applyPreset(preset: string) {
    setDatePreset(preset);
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "all") {
      setFromDate(""); setToDate("");
    } else if (preset === "today") {
      setFromDate(iso(today)); setToDate(iso(today));
    } else if (preset === "7d") {
      const past = new Date(today); past.setDate(past.getDate() - 7);
      setFromDate(iso(past)); setToDate(iso(today));
    } else if (preset === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(iso(first)); setToDate(iso(today));
    } else if (preset === "3m") {
      const past = new Date(today); past.setMonth(past.getMonth() - 3);
      setFromDate(iso(past)); setToDate(iso(today));
    }
    // "custom" — leave fromDate/toDate as whatever the user typed
  }

  useEffect(() => {
    api.get("/companies").then(r => setCompanies(r.data?.data ?? r.data ?? []));
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fromDate, toDate]);

  async function loadHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set("companyId", companyId);
      if (search.trim()) params.set("search", search.trim());
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const r = await api.get(`/approval-actions/my-history/${user.id}?${params.toString()}`);
      setHistory(r.data?.data ?? r.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadHistory();
  }

  // NEW — opens the print report for this request in a new tab, same as
  // the requester and approver pages do.
  function printRequest(requestId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    window.open(`/purchase-requests/${requestId}/print`, "_blank", "noopener,noreferrer");
  }

  // NEW — fetches the request's live current status/workflow trail on
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
            onChange={e => setSearch(e.target.value)}
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
            onChange={e => { setFromDate(e.target.value); setDatePreset("custom"); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setDatePreset("custom"); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
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
              {history.map((h: any) => (
                <>
                  <tr
                    key={h.id}
                    className={`hover:bg-gray-50 ${h.verifiedItems ? "cursor-pointer" : ""}`}
                    onClick={() => h.verifiedItems && setExpandedId(expandedId === h.id ? null : h.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">{h.requestNumber}</td>
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
                        {h.verifiedItems && (
                          <button onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700">
                            {expandedId === h.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === h.id && h.verifiedItems && (
                    <tr key={`${h.id}-detail`}>
                      <td colSpan={7} className="bg-gray-50 px-4 py-4">
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
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* NEW — Current Status modal, same workflow-tracker pattern used
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
