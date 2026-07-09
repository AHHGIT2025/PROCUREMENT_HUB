// FILE: src/pages/approvals/ApprovalHistory.tsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import { FileText, Search, ChevronDown, ChevronUp, Package } from "lucide-react";

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
                <th className="w-10"></th>
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
                    <td className="px-4 py-3">
                      {h.verifiedItems && (
                        expandedId === h.id
                          ? <ChevronUp size={16} className="text-gray-400" />
                          : <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </td>
                  </tr>

                  {expandedId === h.id && h.verifiedItems && (
                    <tr key={`${h.id}-detail`}>
                      <td colSpan={6} className="bg-gray-50 px-4 py-4">
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
    </div>
  );
}
