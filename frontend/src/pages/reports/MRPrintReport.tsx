import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import api from "../../api/client";

interface ItemRow {
  id: string;
  materialCode: string;
  materialName: string;
  itemGroup: string | null;
  quantity: number;
  uom: string;
  estimatedUnitPrice: number;
  lineTotal: number;
  storeStatus: number;   // 0=NotChecked, 1=StockAvailable, 2=Partial, 3=NotAvailable
  availableQty: number;
  purchaseQty: number;
  storeRemarks: string | null;
}

interface ApprovalRow {
  stepOrder: number;
  status: string;        // PENDING | APPROVED | REJECTED | RETURNED | SKIPPED
  approverName: string;
  stepName: string;
  completedAt: string | null;
}

interface RequestDetail {
  id: string;
  requestNumber: string;
  status: string;
  currentStage: string;
  justification: string;
  totalAmount: number;
  createdAt: string;
  companyName: string;
  companyLogoUrl?: string | null;   // ✅ NEW
  projectName: string;
  departmentName: string;
  requestedBy: string;
  deliveryLocation?: string;
  contactNumber?: string;
  rejectionComment: { comment: string; action: string; stageName: string; byUser: string; at: string } | null;
  items: ItemRow[];
  approvals: ApprovalRow[];
}

const STORE_STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "Not Checked", color: "#94a3b8" },
  1: { label: "Fulfilled from Stock", color: "#10B981" },
  2: { label: "Partially from Stock", color: "#F59E0B" },
  3: { label: "Purchase Required", color: "#E11D48" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtQ(n: number) {
  return "QAR " + Number(n ?? 0).toLocaleString("en-QA", { minimumFractionDigits: 2 });
}

// ✅ NEW — same pattern used elsewhere (CreateRequest.tsx, ListPage.tsx) to
// resolve a relative /api/attachments/file/... path into a full URL.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://10.10.50.23:5000/api").replace(/\/api\/?$/, "");
function getLogoUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

export default function MRPrintReport() {
  const { id } = useParams();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;

  useEffect(() => {
    api.get(`/purchase-requests/${id}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>Loading report...</div>;
  }
  if (!data) {
    return <div style={{ padding: 60, textAlign: "center", color: "#DC2626", fontFamily: "Inter, sans-serif" }}>Request not found.</div>;
  }

  const overallStatus = data.status.toUpperCase();
  const grandTotal = data.items.reduce((sum, it) => {
    const qty = it.storeStatus > 0 ? it.purchaseQty : it.quantity;
    return sum + qty * it.estimatedUnitPrice;
  }, 0);

  // Only completed steps (APPROVED) get a signature box — pending/skipped
  // steps don't have a signer yet, so they're excluded from the printed
  // signature grid (this is what someone physically signs, after all).
  const signedSteps = data.approvals.filter(a => a.status === "APPROVED");

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F1F5F9", minHeight: "100vh" }}>

      {/* Screen-only toolbar — hidden on print */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 10, background: "white", borderBottom: "1px solid #E2E8F0",
        padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ fontSize: "14px", color: "#64748b" }}>Print Preview — {data.requestNumber}</div>
        <button onClick={() => window.print()} style={{
          padding: "8px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: 600,
          cursor: "pointer", background: "#1a2b4b", color: "white", border: "none"
        }}>🖨 Print</button>
      </div>

      {/* Printable sheet */}
      <div className="print-sheet" style={{
        maxWidth: "820px", margin: "24px auto", background: "white",
        padding: "40px 48px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
      }}>

        {/* Letterhead */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a2b4b", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* ✅ NEW — company logo, only rendered if one has been uploaded */}
            {data.companyLogoUrl && (
              <img
                src={getLogoUrl(data.companyLogoUrl)}
                alt={`${data.companyName} logo`}
                style={{ height: "90px", width: "auto", maxWidth: "220px", objectFit: "contain", flexShrink: 0 }}
              />
            )}
            <div>
              <div style={{ fontFamily: "Hanken Grotesk", fontSize: "20px", fontWeight: 700, color: "#0b1c30" }}>
                {data.companyName}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Al Hattab Holding — Procurement Hub</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.05em" }}>MATERIAL REQUEST</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px", fontWeight: 700, color: "#1a2b4b" }}>
              {data.requestNumber}
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div style={{
          display: "inline-block", padding: "5px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700,
          marginBottom: "20px",
          background: overallStatus === "APPROVED" ? "#ECFDF5" : overallStatus === "REJECTED" ? "#FEF2F2" :
                      overallStatus === "RETURNED" ? "#FFF7ED" : overallStatus === "FULFILLEDFROMSTOCK" ? "#EFF6FF" : "#FFFBEB",
          color: overallStatus === "APPROVED" ? "#047857" : overallStatus === "REJECTED" ? "#B91C1C" :
                 overallStatus === "RETURNED" ? "#9A3412" : overallStatus === "FULFILLEDFROMSTOCK" ? "#1D4ED8" : "#92400E",
        }}>
          {data.currentStage.toUpperCase()}
        </div>

        {/* Request meta grid — now includes Delivery Location + Contact Number */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px", fontSize: "13px", marginBottom: "24px" }}>
          <MetaRow label="Requested By" value={data.requestedBy} />
          <MetaRow label="Date" value={fmtDate(data.createdAt)} />
          <MetaRow label="Department" value={data.departmentName || "—"} />
          <MetaRow label="Project" value={data.projectName || "—"} />
          <MetaRow label="Delivery Location" value={data.deliveryLocation || "—"} />
          <MetaRow label="Contact Number" value={data.contactNumber || "—"} />
        </div>

        {data.justification && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "4px" }}>JUSTIFICATION</div>
            <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{data.justification}</div>
          </div>
        )}

        {/* Items table */}
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "8px" }}>
          ITEMS ({data.items.length})
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "24px" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
              <th style={th}>#</th>
              <th style={th}>Material</th>
              <th style={{ ...th, textAlign: "center" }}>Req. Qty</th>
              <th style={{ ...th, textAlign: "center" }}>Store Outcome</th>
              <th style={{ ...th, textAlign: "right" }}>Unit Price</th>
              <th style={{ ...th, textAlign: "right" }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => {
              const store = STORE_STATUS_LABEL[it.storeStatus] ?? STORE_STATUS_LABEL[0];
              const effectiveQty = it.storeStatus > 0 ? it.purchaseQty : it.quantity;
              return (
                <tr key={it.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: "#0b1c30" }}>{it.materialName}</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#94a3b8" }}>{it.materialCode}</div>
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{it.quantity} {it.uom}</td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: store.color }}>{store.label}</span>
                    {it.storeStatus === 2 && (
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{it.availableQty} in store / {it.purchaseQty} to buy</div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{it.estimatedUnitPrice.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{(effectiveQty * it.estimatedUnitPrice).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #1a2b4b" }}>
              <td colSpan={5} style={{ ...td, textAlign: "right", fontWeight: 700, paddingTop: "10px" }}>Grand Total</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, paddingTop: "10px", color: "#1a2b4b" }}>{fmtQ(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {data.rejectionComment && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px",
            padding: "12px 16px", marginBottom: "24px", fontSize: "12px"
          }}>
            <span style={{ fontWeight: 700, color: "#B91C1C" }}>{data.rejectionComment.action} at {data.rejectionComment.stageName}: </span>
            <span style={{ color: "#7F1D1D" }}>{data.rejectionComment.comment}</span>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "4px" }}>
              {data.rejectionComment.byUser} · {fmtDate(data.rejectionComment.at)}
            </div>
          </div>
        )}

        {/* ── SIGNATURE BLOCK ─────────────────────────────────────────────
            Matches the legacy paper MR format: each approved step becomes
            a column showing Designation (step name) / Approver Name /
            Approved Date-Time. Grid wraps 3-per-row (same as the old form).
        ── */}
        {signedSteps.length > 0 && (
          <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "2px solid #1a2b4b" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "16px" }}>
              APPROVAL SIGNATURES
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: "28px", columnGap: "16px" }}>
              {signedSteps.map(a => (
                <div key={a.stepOrder}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {a.stepName}
                  </div>
                  <div style={{ marginTop: "18px", borderTop: "1px solid #0b1c30", width: "90%" }} />
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0b1c30", marginTop: "6px" }}>
                    {a.approverName}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {fmtDate(a.completedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending/not-yet-approved steps — shown separately as a simple checklist
            so it's clear who still needs to sign before this MR is complete. */}
        {data.approvals.some(a => a.status === "PENDING") && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "8px" }}>
              AWAITING APPROVAL
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {data.approvals.filter(a => a.status === "PENDING").map(a => (
                <span key={a.stepOrder} style={{
                  fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px",
                  background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A"
                }}>
                  {a.stepName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px dashed #CBD5E1", fontSize: "10px", color: "#94a3b8" }}>
          Printed {fmtDate(new Date().toISOString())} — this is a system-generated record of the approval trail above.
        </div>

      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: "4px" }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ color: "#0b1c30", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 6px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "8px 6px", verticalAlign: "top" };
