import { useEffect, useState } from "react";
import api from "../../api/client";

interface PendingItem {
  instanceId: string;
  prId: string;
  requestNumber: string;
  requesterName: string;
  companyName: string;
  projectName: string;
  totalAmount: number;
  stepName: string;
  approverType: string;
  stepOrder: number;
  dueDate: string | null;
  daysWaiting: number;
}

interface VerifyItem {
  id: string;
  materialCode: string;
  materialName: string;
  uom: string;
  requestedQty: number;
  storeStatus: number;
  availableQty: number;
  storeRemarks: string;
  touched: boolean;
}

const STATUS_OPTIONS = [
  { value: 1, label: "Stock Available", color: "#10B981" },
  { value: 2, label: "Partially Available", color: "#F59E0B" },
  { value: 3, label: "Not Available", color: "#E11D48" },
];

function statusMeta(value: number) {
  return STATUS_OPTIONS.find(s => s.value === value);
}

export default function StoreKeeperWindow() {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selected, setSelected] = useState<PendingItem | null>(null);
  const [items, setItems] = useState<VerifyItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setLoadingList(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      // Store Verification steps arrive in the SAME pending-approvals feed
      // as any other approval — filtered here to just this step type.
      const r = await api.get(`/approvals/pending/${user.id}`);
      const all: PendingItem[] = r.data?.data || r.data || [];
      setPending(all.filter(p => p.approverType === "STORE_VERIFICATION"));
    } finally {
      setLoadingList(false);
    }
  }

  async function openRequest(req: PendingItem) {
    setSelected(req);
    setError("");
    setSuccessMsg("");
    setLoadingItems(true);
    try {
      const r = await api.get(`/approvals/store-verification/${req.instanceId}/items`);
      const raw = r.data?.data || r.data || [];
      setItems(raw.map((it: any) => ({
        id: it.id,
        materialCode: it.materialCode,
        materialName: it.materialName,
        uom: it.uom,
        requestedQty: it.requestedQty,
        storeStatus: 0,
        availableQty: 0,
        storeRemarks: "",
        touched: false,
      })));
    } finally {
      setLoadingItems(false);
    }
  }

  function updateLocal(itemId: string, patch: Partial<VerifyItem>) {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...patch, touched: true } : it));
  }

  async function handleSubmit() {
    if (!selected) return;
    const unverified = items.filter(i => !i.touched);
    if (unverified.length > 0) {
      setError(`${unverified.length} item(s) still need a stock check before submitting.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const r = await api.post(`/approvals/store-verification/${selected.instanceId}`, {
        items: items.map(i => ({
          itemId: i.id,
          storeStatus: i.storeStatus,
          availableQty: i.availableQty,
          storeRemarks: i.storeRemarks,
        })),
      });
      setSuccessMsg(r.data?.message || "Store verification submitted.");
      setSelected(null);
      setItems([]);
      loadPending();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not submit store verification.");
    } finally {
      setSubmitting(false);
    }
  }

  const allTouched = items.length > 0 && items.every(i => i.touched);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "32px" }}>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Hanken Grotesk", fontSize: "24px", fontWeight: 600, color: "#0b1c30", marginBottom: "4px" }}>
          Store Verification
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Check stock before the request continues through approval.
        </p>
      </div>

      {successMsg && (
        <div style={{
          background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px",
          padding: "12px 16px", marginBottom: "20px", color: "#047857", fontSize: "14px"
        }}>{successMsg}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "360px 1fr" : "1fr", gap: "24px" }}>

        {/* ── PENDING LIST ─────────────────────────────────────── */}
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", fontSize: "13px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Awaiting Store Check ({pending.length})
          </div>
          {loadingList ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📦</div>
              <div style={{ color: "#64748b", fontSize: "14px" }}>Nothing waiting on store check right now.</div>
            </div>
          ) : pending.map(req => (
            <div
              key={req.instanceId}
              onClick={() => openRequest(req)}
              style={{
                padding: "16px 20px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                background: selected?.instanceId === req.instanceId ? "#eff4ff" : "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", fontWeight: 600, color: "#1a2b4b" }}>
                  {req.requestNumber}
                </span>
                {req.daysWaiting > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "#FFFBEB", color: "#92400E" }}>
                    {req.daysWaiting}d waiting
                  </span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "#0b1c30", marginTop: "4px" }}>{req.companyName}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                {req.requesterName} · {req.stepName}
              </div>
            </div>
          ))}
        </div>

        {/* ── ITEM VERIFICATION ───────────────────────────────── */}
        {selected && (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 700, color: "#1a2b4b" }}>
                  {selected.requestNumber}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{selected.companyName} · {selected.requesterName}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                border: "1px solid #E2E8F0", background: "white", borderRadius: "4px",
                padding: "6px 12px", fontSize: "13px", color: "#64748b", cursor: "pointer"
              }}>Close</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <a
                href={`/purchase-requests/${selected.prId}/print`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 600,
                  background: "#1a2b4b", color: "white", textDecoration: "none"
                }}
              >
                🖨 Print MR before collecting from store
              </a>
            </div>

            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px",
                padding: "10px 14px", marginBottom: "16px", color: "#DC2626", fontSize: "13px"
              }}>{error}</div>
            )}

            {loadingItems ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>Loading items...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {items.map(item => {
                  const meta = statusMeta(item.storeStatus);
                  const purchaseQty = item.requestedQty - item.availableQty;

                  function chooseStatus(status: number) {
                    // ✅ FIX: explicit button click always marks `touched = true`,
                    // regardless of whether the resulting value differs from the
                    // current default. This fixes the bug where an item with no
                    // stock (Available Qty correctly staying at 0) never fired the
                    // input's onChange, so it silently never counted as verified.
                    if (status === 1) {
                      // Stock Available — full requested quantity
                      updateLocal(item.id, { storeStatus: 1, availableQty: item.requestedQty });
                    } else if (status === 3) {
                      // Not Available — nothing in store
                      updateLocal(item.id, { storeStatus: 3, availableQty: 0 });
                    } else {
                      // Partially Available — keep current qty (or 0) as the
                      // starting point; the qty field becomes editable below.
                      updateLocal(item.id, { storeStatus: 2 });
                    }
                  }

                  return (
                    <div key={item.id} style={{
                      border: `1px solid ${item.touched ? "#D1FAE5" : "#E2E8F0"}`,
                      background: item.touched ? "#F0FDF9" : "#f8fafc",
                      borderRadius: "8px", padding: "16px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#0b1c30" }}>{item.materialName}</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{item.materialCode}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>Requested</div>
                          <div style={{ fontWeight: 700, fontSize: "16px", color: "#0b1c30" }}>{item.requestedQty} {item.uom}</div>
                        </div>
                      </div>

                      {/* ✅ NEW — explicit status buttons, one MUST be clicked */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => chooseStatus(opt.value)}
                            style={{
                              flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px",
                              fontWeight: 600, cursor: "pointer",
                              border: item.storeStatus === opt.value ? `2px solid ${opt.color}` : "1px solid #E2E8F0",
                              background: item.storeStatus === opt.value ? `${opt.color}15` : "white",
                              color: item.storeStatus === opt.value ? opt.color : "#64748b",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "12px", alignItems: "end" }}>
                        <div>
                          <label style={labelStyle}>Available in Store</label>
                          <input
                            type="number"
                            min={0}
                            max={item.requestedQty}
                            value={item.availableQty}
                            disabled={item.storeStatus === 1 || item.storeStatus === 3}
                            onChange={e => {
                              const val = Math.max(0, Math.min(item.requestedQty, Number(e.target.value)));
                              updateLocal(item.id, { availableQty: val });
                            }}
                            style={{
                              ...inputStyle,
                              background: (item.storeStatus === 1 || item.storeStatus === 3) ? "#f1f5f9" : "white"
                            }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Needs Purchase</label>
                          <div style={{ ...inputStyle, background: "#f1f5f9", display: "flex", alignItems: "center" }}>
                            {purchaseQty} {item.uom}
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Remarks (optional)</label>
                          <input
                            value={item.storeRemarks}
                            onChange={e => updateLocal(item.id, { storeRemarks: e.target.value })}
                            placeholder="e.g. 2 units damaged, excluded"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {meta && (
                        <div style={{ marginTop: "12px" }}>
                          <span style={{
                            fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
                            background: `${meta.color}15`, color: meta.color
                          }}>{meta.label}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSubmit}
                disabled={!allTouched || submitting}
                style={{
                  padding: "10px 24px", borderRadius: "4px", fontSize: "14px", fontWeight: 600,
                  cursor: allTouched ? "pointer" : "not-allowed",
                  background: allTouched ? "#10B981" : "#E2E8F0",
                  color: allTouched ? "white" : "#94a3b8", border: "none"
                }}
              >
                {submitting ? "Submitting..." : allTouched ? "Submit & Continue Flow" : `Check all items first (${items.filter(i => i.touched).length}/${items.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600,
  color: "#64748b", marginBottom: "4px", letterSpacing: "0.02em"
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: "4px",
  border: "1px solid #E2E8F0", fontSize: "13px", color: "#0b1c30",
  background: "white", outline: "none", boxSizing: "border-box" as const,
  fontFamily: "Inter, sans-serif", height: "36px"
};








