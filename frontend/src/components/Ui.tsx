import React from 'react';
export function Card({children,className=''}:{children:React.ReactNode;className?:string}){return <div className={`card p-5 ${className}`}>{children}</div>}

export function StatusBadge({ value }: { value: any }) {
  
  const statusMap: any = {
    1: "Draft",
    2: "Submitted",
    3: "PendingApproval",
    4: "Approved",
    5: "Rejected",
    6: "Returned",
    7: "OracleReady"
  };

  // ✅ Convert number → text
  const text = typeof value === "number" ? statusMap[value] : value;

  const v = String(text || "").toLowerCase();

  const cls =
    v.includes("approved") || v.includes("success")
      ? "bg-emerald-100 text-emerald-700"
      : v.includes("reject") || v.includes("fail")
      ? "bg-red-100 text-red-700"
      : v.includes("oracle")
      ? "bg-blue-100 text-blue-700"
      : v.includes("draft")
      ? "bg-slate-100 text-slate-700"
      : "bg-amber-100 text-amber-700";

  return <span className={`badge ${cls}`}>{text}</span>;
}

export function DataTable({columns,rows}:{columns:string[];rows:any[]}){return <div className="overflow-auto"><table className="table w-full"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c}>{String(r[c] ?? r[c[0].toLowerCase()+c.slice(1)] ?? '')}</td>)}</tr>)}</tbody></table></div>}
