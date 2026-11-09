// ===== FILE: src/pages/approvals/ApprovalHistoryPrint.tsx =====
// Printable "Approval & Return History" report for one request.
// Route (outside ProtectedLayout, same pattern as MRPrintReport):
//   /purchase-requests/:id/approval-history/print

import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import api from "../../api/client";

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

function fmtDate(d?: string | null) {
  if (!d) return "—";
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
  if (!name) return "—";
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

const ACTION_COLOR: Record<string, string> = {
  APPROVE: "#059669",
  RETURN:  "#D97706",
  REJECT:  "#DC2626",
  PENDING: "#64748B",
};

const OUTCOME_LABEL: Record<string, { label: string; color: string }> = {
  RETURNED:    { label: "RETURNED",    color: "#D97706" },
  REJECTED:    { label: "REJECTED",    color: "#DC2626" },
  APPROVED:    { label: "APPROVED",    color: "#059669" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "#2563EB" },
};

export default function ApprovalHistoryPrint() {
  const { id } = useParams();
  const [data, setData] = useState<HistoryData | null>(null);
  const [requester, setRequester] = useState<{ requestedBy?: string; departmentName?: string; projectName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [historyRes, prRes] = await Promise.all([
          api.get(`/purchase-requests/${id}/approval-history`),
          api.get(`/purchase-requests/${id}`).catch(() => null),
        ]);
        if (cancelled) return;
        setData(historyRes.data?.data ?? historyRes.data);
        if (prRes) {
          const pr = prRes.data?.data ?? prRes.data;
          setRequester({
            requestedBy: pr?.requestedBy,
            departmentName: pr?.departmentName,
            projectName: pr?.projectName,
          });
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  function handlePrint() {
    const originalTitle = document.title;
    if (data) document.title = `MR ${data.requestNumber} - Approval History`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>Loading report...</div>;
  }
  if (!data) {
    return <div style={{ padding: 60, textAlign: "center", color: "#DC2626", fontFamily: "Inter, sans-serif" }}>Approval history not found.</div>;
  }

  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700,
    color: "#475569", background: "#F1F5F9", borderBottom: "1px solid #CBD5E1",
    textTransform: "uppercase", letterSpacing: 0.4,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, color: "#1E293B",
    borderBottom: "1px solid #E2E8F0", verticalAlign: "top",
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, Arial, sans-serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 794, margin: "0 auto", padding: "16px 0", textAlign: "right" }}>
        <button
          onClick={handlePrint}
          style={{
            background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Print
        </button>
      </div>

      <div
        className="sheet"
        style={{
          width: 794, maxWidth: "100%", margin: "0 auto 40px", background: "#fff",
          padding: "36px 40px", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <div style={{ borderBottom: "2px solid #1E293B", paddingBottom: 12, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, letterSpacing: 1 }}>AL HATTAB HOLDING — PROCUREMENT HUB</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>
            Approval &amp; Return History
          </div>
        </div>

        {/* Request info */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
          <tbody>
            <tr>
              <td style={{ ...td, width: "22%", color: "#64748B", fontWeight: 600 }}>Request No.</td>
              <td style={{ ...td, width: "28%", fontWeight: 700 }}>{data.requestNumber}</td>
              <td style={{ ...td, width: "22%", color: "#64748B", fontWeight: 600 }}>Current Status</td>
              <td style={{ ...td, width: "28%", fontWeight: 700 }}>{data.currentStatus}</td>
            </tr>
            <tr>
              <td style={{ ...td, color: "#64748B", fontWeight: 600 }}>Requested By</td>
              <td style={td}>{requester?.requestedBy || "—"}</td>
              <td style={{ ...td, color: "#64748B", fontWeight: 600 }}>Department</td>
              <td style={td}>{requester?.departmentName || "—"}</td>
            </tr>
            <tr>
              <td style={{ ...td, color: "#64748B", fontWeight: 600 }}>Total Attempts</td>
              <td style={{ ...td, fontWeight: 700 }}>{data.totalAttempts}</td>
              <td style={{ ...td, color: "#64748B", fontWeight: 600 }}>Times Returned</td>
              <td style={{ ...td, fontWeight: 700, color: data.returnCount > 0 ? "#D97706" : "#059669" }}>
                {data.returnCount}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Last return */}
        {data.lastReturn && (
          <div style={{ border: "1px solid #FDBA74", background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9A3412" }}>Last returned</div>
            <div style={{ fontSize: 12, color: "#9A3412", marginTop: 3 }}>
              {prettyStep(data.lastReturn.stepName)} · {data.lastReturn.returnedBy || "—"} · {fmtDate(data.lastReturn.returnedAt)}
            </div>
            {data.lastReturn.comments && (
              <div style={{ fontSize: 12, color: "#431407", marginTop: 5 }}>{data.lastReturn.comments}</div>
            )}
          </div>
        )}

        {/* Attempts */}
        {data.attempts.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748B", padding: "12px 0" }}>
            No approval activity recorded for this request.
          </div>
        )}

        {data.attempts.map((attempt) => {
          const outcome = OUTCOME_LABEL[attempt.outcome] ?? OUTCOME_LABEL.IN_PROGRESS;
          return (
            <div key={attempt.attemptNumber} style={{ marginBottom: 20, pageBreakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                  Attempt {attempt.attemptNumber}
                  <span style={{ fontWeight: 400, color: "#64748B", fontSize: 11 }}>
                    {"  "}Started {fmtDate(attempt.startedAt)}
                    {attempt.endedAt ? ` · Ended ${fmtDate(attempt.endedAt)}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: outcome.color }}>{outcome.label}</div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #CBD5E1" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "22%" }}>Step</th>
                    <th style={{ ...th, width: "13%" }}>Action</th>
                    <th style={{ ...th, width: "20%" }}>By</th>
                    <th style={{ ...th, width: "20%" }}>Date &amp; Time</th>
                    <th style={th}>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {attempt.entries.map((e, idx) => (
                    <tr key={idx} style={{ background: e.action === "RETURN" ? "#FFF7ED" : e.action === "REJECT" ? "#FEF2F2" : "transparent" }}>
                      <td style={td}>{prettyStep(e.stepName)}</td>
                      <td style={{ ...td, fontWeight: 700, color: ACTION_COLOR[e.action] ?? "#1E293B" }}>
                        {actionLabel(e.action)}
                      </td>
                      <td style={td}>{e.personName || "—"}</td>
                      <td style={td}>{e.isPending ? "Waiting" : fmtDate(e.actionDate)}</td>
                      <td style={td}>{e.comments || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <div style={{ marginTop: 24, fontSize: 10, color: "#94A3B8", borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
          Generated from Procurement Hub on {fmtDate(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}
