// ===== FILE: src/components/ApprovalHistoryModal.tsx =====
// Reusable "History" modal: shows every approval attempt of a request,
// who approved / returned / rejected, the reason, and how many times it
// was returned. Used from My Requests, Purchase Requests and Approvals.
//
// Usage:
//   {historyFor && (
//     <ApprovalHistoryModal
//       requestId={historyFor.id}
//       requestNumber={historyFor.no}
//       onClose={() => setHistoryFor(null)}
//     />
//   )}

import { useEffect, useState } from "react";
import { Printer, X, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import api from "../api/client";

interface HistoryEntry {
  stepOrder: number;
  stepName: string;
  action: string;
  personName: string;
  comments: string | null;
  actionDate: string | null;
  isPending: boolean;
}

interface HistoryAttempt {
  attemptNumber: number;
  outcome: string;
  startedAt: string;
  endedAt: string | null;
  entries: HistoryEntry[];
}

interface HistoryData {
  requestId: string;
  requestNumber: string;
  currentStatus: string;
  totalAttempts: number;
  returnCount: number;
  rejectCount: number;
  lastReturn: {
    stepName: string;
    returnedBy: string;
    comments: string | null;
    returnedAt: string;
  } | null;
  attempts: HistoryAttempt[];
}

function fmtDateTime(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Qatar",
  });
}

function prettyStep(name?: string) {
  if (!name) return "-";
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const OUTCOME_STYLE: Record<string, { label: string; cls: string }> = {
  RETURNED:    { label: "Returned",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
  REJECTED:    { label: "Rejected",    cls: "bg-red-100 text-red-700 border-red-200" },
  APPROVED:    { label: "Approved",    cls: "bg-green-100 text-green-700 border-green-200" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "APPROVE":
      return <CheckCircle2 size={16} className="text-green-600 shrink-0" />;
    case "RETURN":
      return <RotateCcw size={16} className="text-orange-600 shrink-0" />;
    case "REJECT":
      return <XCircle size={16} className="text-red-600 shrink-0" />;
    case "PENDING":
      return <Clock size={16} className="text-amber-500 shrink-0" />;
    default:
      return <CheckCircle2 size={16} className="text-gray-400 shrink-0" />;
  }
}

function actionLabel(action: string) {
  switch (action) {
    case "APPROVE": return "Approved";
    case "RETURN":  return "Returned";
    case "REJECT":  return "Rejected";
    case "PENDING": return "Pending";
    default:        return action;
  }
}

export default function ApprovalHistoryModal({
  requestId,
  requestNumber,
  onClose,
}: {
  requestId: string;
  requestNumber?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const r = await api.get(`/purchase-requests/${requestId}/approval-history`);
        if (!cancelled) setData(r.data?.data ?? r.data);
      } catch (err: any) {
        if (!cancelled)
          setError(err?.response?.data?.message || "Failed to load approval history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [requestId]);

  function printHistory() {
    window.open(`/purchase-requests/${requestId}/approval-history/print`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Approval History</h2>
            <p className="text-sm text-gray-400 mt-0.5">{data?.requestNumber || requestNumber || ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={printHistory}
              disabled={loading || !!error}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition disabled:opacity-40"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading && <div className="py-16 text-center text-gray-400">Loading history...</div>}

          {!loading && error && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  {data.totalAttempts} {data.totalAttempts === 1 ? "attempt" : "attempts"}
                </span>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                    data.returnCount > 0
                      ? "bg-orange-100 text-orange-700 border-orange-200"
                      : "bg-green-100 text-green-700 border-green-200"
                  }`}
                >
                  {data.returnCount === 0
                    ? "Never returned"
                    : `Returned ${data.returnCount} ${data.returnCount === 1 ? "time" : "times"}`}
                </span>
                {data.rejectCount > 0 && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                    Rejected
                  </span>
                )}
              </div>

              {/* Last return highlight */}
              {data.lastReturn && (
                <div className="flex gap-3 p-4 rounded-xl border bg-orange-50 border-orange-200">
                  <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-800">Last returned</p>
                    <p className="text-xs font-medium text-orange-700 mt-1">
                      {prettyStep(data.lastReturn.stepName)} &middot; {data.lastReturn.returnedBy || "-"} &middot;{" "}
                      {fmtDateTime(data.lastReturn.returnedAt)}
                    </p>
                    {data.lastReturn.comments && (
                      <p className="text-sm text-orange-900 mt-1.5 break-words">{data.lastReturn.comments}</p>
                    )}
                  </div>
                </div>
              )}

              {data.attempts.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">
                  No approval activity yet. This request has not been submitted for approval.
                </div>
              )}

              {/* Attempts */}
              {data.attempts.map((attempt) => {
                const style = OUTCOME_STYLE[attempt.outcome] ?? OUTCOME_STYLE.IN_PROGRESS;
                return (
                  <div key={attempt.attemptNumber} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Attempt {attempt.attemptNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Started {fmtDateTime(attempt.startedAt)}
                          {attempt.endedAt ? ` · Ended ${fmtDateTime(attempt.endedAt)}` : ""}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.cls}`}>
                        {style.label}
                      </span>
                    </div>

                    <ul className="divide-y divide-gray-100">
                      {attempt.entries.map((e, idx) => (
                        <li
                          key={`${attempt.attemptNumber}-${idx}`}
                          className={`flex gap-3 px-4 py-3 ${
                            e.action === "RETURN" ? "bg-orange-50/60" : e.action === "REJECT" ? "bg-red-50/60" : ""
                          }`}
                        >
                          <div className="mt-0.5"><ActionIcon action={e.action} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-x-3">
                              <p className="text-sm font-semibold text-gray-800">
                                {prettyStep(e.stepName)}
                                <span className="font-normal text-gray-500"> &middot; {actionLabel(e.action)}</span>
                              </p>
                              <p className="text-xs text-gray-400">
                                {e.isPending ? "Waiting" : fmtDateTime(e.actionDate)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {e.isPending ? "Waiting for" : "By"} {e.personName || "-"}
                            </p>
                            {e.comments && (
                              <p className="text-sm text-gray-700 mt-1.5 break-words">
                                <span className="font-medium">Comment:</span> {e.comments}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
