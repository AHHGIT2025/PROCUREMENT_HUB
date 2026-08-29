// ===== FILE: pages/internationalPO/InternationalPOPrint.tsx =====
// Save under: src/pages/internationalPO/InternationalPOPrint.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Printer } from 'lucide-react';
import api from '../../api/client';

export default function InternationalPOPrint() {
  const { id } = useParams();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (!localStorage.getItem('token')) {
    window.location.href = '/login';
    return null;
  }

  useEffect(() => {
    api.get(`/international-po/${id}`)
      .then(r => setPo(r.data?.data ?? r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  if (!po) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">PO not found.</div>
  );

  const fmt = (n: number) => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const apiOrigin = (api.defaults?.baseURL || '').replace(/\/api\/?$/, '');
  const logoSrc = po.companyLogoUrl
    ? (po.companyLogoUrl.startsWith('http') ? po.companyLogoUrl : `${apiOrigin}${po.companyLogoUrl}`)
    : null;

  const signatories: { label: string; name?: string | null }[] = po.signatories ?? [];

  // same code+name+rate rows combine for print display only
  const combinedItems = (() => {
    const groups = new Map<string, any>();
    (po.items ?? []).forEach((item: any) => {
      const key = `${item.itemCode || ''}::${item.itemName || ''}::${item.rate}`;
      const existing = groups.get(key);
      if (existing) {
        existing.qty += item.qty;
        existing.amount += item.amount;
        existing.discountAmount += item.discountAmount ?? 0;
      } else {
        groups.set(key, { ...item, qty: item.qty, amount: item.amount, discountAmount: item.discountAmount ?? 0 });
      }
    });
    return Array.from(groups.values());
  })();

  const itemsDiscountTotal = combinedItems.reduce((sum: number, item: any) => sum + (item.discountAmount ?? 0), 0);
  const expenses: any[] = (po.expenses ?? []).filter((e: any) => e.amount > 0);

  const mrRefDisplay: string | null =
    po.linkedMrNumbers && po.linkedMrNumbers.length > 0
      ? po.linkedMrNumbers.join(', ')
      : po.linkedRequestNumber || po.mrReferenceNumber || null;

  const projectDisplay: string | null =
    po.projectNames && po.projectNames.length > 0
      ? po.projectNames.join(', ')
      : po.projectName || null;

  // ── shared label class for every field caption in this document —
  // bumped from font-semibold/text-gray-400 to font-bold/text-gray-500
  // and slightly larger so labels read clearly at print size instead of
  // fading next to the data below them.
  const labelCls = "text-[9.5px] font-bold text-gray-500 uppercase tracking-wide";

  return (
    <div className="bg-gray-100 min-h-screen py-6 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto mb-3 flex justify-end print:hidden">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none rounded-2xl print:rounded-none p-8 print:p-6 text-[13px] leading-snug">

        {/* Letterhead */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-gray-800">
          <div className="flex items-center gap-3">
            {logoSrc && (
            <img src={logoSrc} alt={po.companyName} className="h-16 w-auto max-w-[180px] object-contain" />
            )}
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{po.companyName}</h1>
              <p className="text-[10px] text-gray-500">
                {po.isInternational ? 'International Purchase Order' : 'Local Purchase Order'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 leading-tight">{po.poNo || 'DRAFT'}</p>
            <p className="text-[10px] text-gray-500">Date: {new Date(po.poDate).toLocaleDateString()}</p>
            {po.brightPoNumber && <p className="text-[10px] text-gray-500">Bright PO: {po.brightPoNumber}</p>}
          </div>
        </div>

        {/* Supplier / Delivery two-column block */}
        <div className="grid grid-cols-2 gap-6 py-3 border-b border-gray-200">
          <div>
            <p className={`${labelCls} mb-1`}>Supplier</p>
            <p className="font-semibold text-gray-800 text-[12px]">{po.supplier?.name}</p>
            <p className="text-[10px] text-gray-500 font-mono">{po.supplier?.supplierCode}</p>
            {po.supplier?.address && <p className="text-[10px] text-gray-500 mt-0.5">{po.supplier.address}</p>}
            {po.supplier?.contactPerson && <p className="text-[10px] text-gray-500">Attn: {po.supplier.contactPerson}</p>}
            {po.supplier?.email && <p className="text-[10px] text-gray-500">{po.supplier.email}</p>}
            {po.supplier?.mobile && <p className="text-[10px] text-gray-500">{po.supplier.mobile}</p>}
          </div>
          <div>
            <p className={`${labelCls} mb-1`}>Deliver To</p>
            <p className="text-[10px] text-gray-600">{po.deliveryLocationName || '—'}</p>
            {po.forDeliveryName && <p className="text-[10px] text-gray-500 mt-0.5">Attn: {po.forDeliveryName}</p>}
            {po.mobile && <p className="text-[10px] text-gray-500">{po.mobile}</p>}
            {projectDisplay && <p className="text-[10px] text-gray-500 mt-0.5">Project / Cost Center: {projectDisplay}</p>}
            {mrRefDisplay && <p className="text-[10px] text-gray-500">MR Ref: {mrRefDisplay}</p>}
            {/* ── NEW: Requester — who raised the underlying MR ── */}
            {po.requestedByName && <p className="text-[10px] text-gray-500">Requester: {po.requestedByName}</p>}
          </div>
        </div>

        {/* Shipping block — International only */}
        {po.isInternational && (
          <div className="grid grid-cols-4 gap-3 py-2 border-b border-gray-200 text-[10px]">
            <div>
              <p className={labelCls}>Origin</p>
              <p className="text-gray-700">{po.originCountry || '—'}</p>
            </div>
            <div>
              <p className={labelCls}>Destination</p>
              <p className="text-gray-700">{po.destinationPort || '—'}</p>
            </div>
            <div>
              <p className={labelCls}>Incoterm</p>
              <p className="text-gray-700">{po.incoterm || '—'}</p>
            </div>
            <div>
              <p className={labelCls}>Freight</p>
              <p className="text-gray-700">{po.modeOfFreight || '—'}</p>
            </div>
            {/* ── NEW: Container + Delivery Period ── */}
            <div>
              <p className={labelCls}>Container</p>
              <p className="text-gray-700">{po.containerDetails || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className={labelCls}>Delivery Period</p>
              <p className="text-gray-700">{po.deliveryPeriodText || '—'}</p>
            </div>
          </div>
        )}

        {/* Payment block */}
        <div className="grid grid-cols-4 gap-3 py-2 border-b border-gray-200 text-[10px]">
          <div>
            <p className={labelCls}>Payment Type</p>
            <p className="text-gray-700">{po.paymentType || '—'}</p>
          </div>
          <div>
            <p className={labelCls}>Currency</p>
            <p className="text-gray-700">{po.currency}</p>
          </div>
          <div>
            <p className={labelCls}>Payment Terms</p>
            <p className="text-gray-700">{po.paymentTermsText || '—'}</p>
          </div>
          <div>
            <p className={labelCls}>Proforma No</p>
            <p className="text-gray-700">{po.performaNo || '—'}</p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-[11px] mt-3">
          <thead>
            <tr className="border-b-2 border-gray-800 text-left">
              <th className="py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">Code</th>
              <th className="py-1.5 pr-2">Description</th>
              <th className="py-1.5 pr-2 text-right">Qty</th>
              <th className="py-1.5 pr-2">UOM</th>
              <th className="py-1.5 pr-2 text-right">Rate</th>
              <th className="py-1.5 pr-2 text-right">Discount</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {combinedItems.map((item: any, idx: number) => (
              <tr key={item.id ?? idx} className="border-b border-gray-100">
                <td className="py-1.5 pr-2 text-gray-400">{idx + 1}</td>
                <td className="py-1.5 pr-2 text-gray-500">{item.itemCode || '—'}</td>
                <td className="py-1.5 pr-2 text-gray-800">{item.itemName}</td>
                <td className="py-1.5 pr-2 text-right text-gray-700">{item.qty}</td>
                <td className="py-1.5 pr-2 text-gray-500">{item.uom}</td>
                <td className="py-1.5 pr-2 text-right text-gray-700">{fmt(item.rate)}</td>
                <td className="py-1.5 pr-2 text-right text-gray-700">{fmt(item.discountAmount)}</td>
                <td className="py-1.5 text-right font-medium text-gray-800">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          {itemsDiscountTotal > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={6} className="py-1.5 pr-2 text-right text-gray-500 font-medium">Items Discount Total</td>
                <td className="py-1.5 pr-2 text-right text-gray-700 font-medium">{fmt(itemsDiscountTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-2">
          <div className="w-64 text-[11px] space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Total PO Value</span><span>{po.currency} {fmt(po.subTotal)}</span>
            </div>

            {itemsDiscountTotal > 0 && (
              <div className="flex justify-between text-gray-500 text-[10px] pl-2">
                <span>— incl. items discount</span><span>- {po.currency} {fmt(itemsDiscountTotal)}</span>
              </div>
            )}

            {po.advancePayment > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Adv. Pmt.</span><span>{po.currency} {fmt(po.advancePayment)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Discount</span><span>- {po.currency} {fmt(po.discountAmount)}</span>
            </div>

            {(po.insuranceAmount ?? 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Insurance</span><span>+ {po.currency} {fmt(po.insuranceAmount)}</span>
              </div>
            )}
            {(po.othersAmount ?? 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Others</span><span>+ {po.currency} {fmt(po.othersAmount)}</span>
              </div>
            )}

            {expenses.map((e: any) => (
              <div key={e.id} className="flex justify-between text-gray-600">
                <span>{e.expenseDescription}</span><span>+ {po.currency} {fmt(e.amount)}</span>
              </div>
            ))}

            {(po.expensesTotal ?? 0) > 0 && (
              <div className="flex justify-between text-gray-400 text-[10px] pt-0.5 border-t border-dashed border-gray-200">
                <span>Expenses Subtotal</span><span>{po.currency} {fmt(po.expensesTotal)}</span>
              </div>
            )}

            <div className="flex justify-between pt-1.5 border-t-2 border-gray-800 font-bold text-gray-900 text-[12px]">
              <span>Net PO Value</span><span>{po.currency} {fmt(po.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Supplier bank details */}
        {po.supplier && (po.supplier.bankName || po.supplier.iban) && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className={`${labelCls} mb-1`}>Bank Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] text-gray-600">
              <div>Account Name: {po.supplier.bankAccountName || '—'}</div>
              <div>Bank Name: {po.supplier.bankName || '—'}</div>
              <div>Bank Address: {po.supplier.bankAddress || '—'}</div>
              <div>IBAN: {po.supplier.iban || '—'}</div>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className={`${labelCls} mb-1`}>Terms &amp; Conditions</p>
          <pre className="text-[8.5px] text-gray-500 whitespace-pre-wrap font-sans leading-snug">{po.termsAndConditions}</pre>
        </div>

        {/* Signatures */}
        {signatories.length > 0 && (
          <div className="grid grid-cols-3 gap-x-8 gap-y-10 mt-8 pt-6">
            {signatories.map((sig, i) => (
              <div key={i} className="text-center">
                <div className="h-10" />
                <div className="border-b border-gray-400 mb-1" />
                <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide">{sig.label}</p>
                <p className="text-[10px] text-gray-600">{sig.name}</p>
              </div>
            ))}
          </div>
        )}

      {/* Footer strip */}
        <div className="mt-8 pt-3 border-t-2 border-gray-800">
          <div className="flex items-start justify-between text-[8.5px] text-gray-500 gap-4">
            <div className="space-y-0.5">
              <p>Tel: 44775848 · Fax: 44775849 · P.O. Box: 4810</p>
              <p>Office Tel: 44731558 · Fax: 44723891</p>
              <p>Al-Maseela - Al-Jazera Al-Arabia St. Al Hattab Building</p>
              <p>Email: info@al-hattabgroup.com · www.al-hattabgroup.com</p>
            </div>
            <div className="border border-gray-300 rounded-full w-14 h-14 flex items-center justify-center text-center text-[6.5px] font-semibold text-gray-500 leading-tight shrink-0">
              ISO 9001:2015<br />CERTIFIED
            </div>
            <div className="space-y-0.5 text-right" dir="rtl">
              <p>تليفون: 44775848 - فاكس: 44775849 - ص.ب: 4810</p>
              <p>تليفون مكتب: 44731558 - فاكس: 44723891</p>
              <p>المسيلة - شارع الجزيرة العربية - مبنى الحطاب</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 text-[9px] text-gray-500">
            Prepared By: <span className="text-gray-700 font-medium">{po.requestedByName || '—'}</span>
            {' · '}{new Date(po.createdAt ?? po.poDate).toLocaleString()}
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
