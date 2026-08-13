// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../api/client";
// import { Printer } from "lucide-react";

// export default function ApproverInbox() {

//   const user = JSON.parse(localStorage.getItem("user") || "{}");
//   const navigate = useNavigate();
//   const roles: string[] = user.roles || [];

//   const isAdmin    = roles.some(r => ["System Admin", "Holding Admin", "Company Admin"].includes(r));
//   const isApprover = roles.some(r => ["Manager", "Department Manager", "IT Manager",
//                                        "Budget Manager", "Finance Approver",
//                                        "Purchase Officer", "Procurement Officer",
//                                        "Purchase Manager",
//                                        "CEO", "Asset Manager", "Approver"].includes(r));

//   const [pendingList, setPendingList] = useState<any[]>([]);
//   const [allRequests, setAllRequests] = useState<any[]>([]);
//   const [loading, setLoading]         = useState(true);
//   const [activeTab, setActiveTab]     = useState<"pending" | "all">("pending");

//   const [prDetails, setPrDetails]   = useState<any>(null);
//   const [prLoading, setPrLoading]   = useState(false);
//   const [actionModal, setActionModal]     = useState(false);
//   const [selectedInstance, setSelectedInstance] = useState<any>(null);
//   const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "RETURN">("APPROVE");
//   const [comments, setComments]     = useState("");
//   const [actionLoading, setActionLoading] = useState(false);
//   const [actionMsg, setActionMsg]   = useState("");

//   const [statusModal, setStatusModal]   = useState(false);
//   const [statusData, setStatusData]     = useState<any>(null);
//   const [statusLoading, setStatusLoading] = useState(false);

//   useEffect(() => { loadData(); }, []);

// async function loadData() {
//   try {
//     setLoading(true);
//     // Always attempt — backend safely returns [] if nothing is assigned to this user.
//     // Gating this by role name was wrong: DEPARTMENT_MANAGER routing uses
//     // Users.ManagerId and doesn't require any specific Role.
//     const r = await api.get(`/approvals/pending/${user.id}`);
//     setPendingList(r.data.data || r.data || []);

//     if (isAdmin) {
//       const allR = await api.get("/purchase-requests");
//       setAllRequests(allR.data || []);
//     }
//   } catch (err) {
//     console.error(err);
//   } finally {
//     setLoading(false);
//   }
// }

//   async function openAction(instance: any, type: "APPROVE" | "REJECT" | "RETURN") {
//     setSelectedInstance(instance);
//     setActionType(type);
//     setComments("");
//     setActionMsg("");
//     setActionModal(true);
//     setPrDetails(null);
//     setPrLoading(true);
//     try {
//       const r = await api.get(`/purchase-requests/${instance.prId}`);
//       setPrDetails(r.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setPrLoading(false);
//     }
//   }

//   async function submitAction() {
//     if (!selectedInstance) return;
//     try {
//       setActionLoading(true);
//       await api.post(
//         `/approvals/${selectedInstance.instanceId}/${actionType.toLowerCase()}`,
//         { comments }
//       );
//       setActionMsg(
//         actionType === "APPROVE" ? "✅ Approved successfully." :
//         actionType === "REJECT"  ? "❌ Request rejected."      :
//                                    "↩️ Returned to requester."
//       );
//       setTimeout(() => { setActionModal(false); loadData(); }, 1500);
//     } catch (err: any) {
//       setActionMsg("❌ " + (err.response?.data?.message || "Action failed."));
//     } finally {
//       setActionLoading(false);
//     }
//   }

//   async function viewStatus(prId: string) {
//     try {
//       setStatusLoading(true);
//       setStatusModal(true);
//       setStatusData(null);
//       const r = await api.get(`/approvals/status/${prId}`);
//       setStatusData(r.data.data || r.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setStatusLoading(false);
//     }
//   }

//   function printRequest(prId: string, e?: React.MouseEvent) {
//     e?.stopPropagation();
//     window.open(`/purchase-requests/${prId}/print`, "_blank", "noopener,noreferrer");
//   }

//   function statusColor(status: string) {
//     switch (status) {
//       case "APPROVED":        return "bg-green-100 text-green-700 border-green-300";
//       case "REJECTED":        return "bg-red-100 text-red-700 border-red-300";
//       case "RETURNED":        return "bg-orange-100 text-orange-700 border-orange-300";
//       case "PENDING":         return "bg-yellow-100 text-yellow-700 border-yellow-300";
//       case "Approved":        return "bg-green-100 text-green-700 border-green-300";
//       case "Rejected":        return "bg-red-100 text-red-700 border-red-300";
//       case "PendingApproval": return "bg-yellow-100 text-yellow-700 border-yellow-300";
//       case "Submitted":       return "bg-blue-100 text-blue-700 border-blue-300";
//       case "Draft":           return "bg-gray-100 text-gray-700 border-gray-300";
//       default:                return "bg-gray-100 text-gray-600 border-gray-300";
//     }
//   }

//   const actionColors = {
//     APPROVE: { bg: "bg-green-600 hover:bg-green-700", text: "text-green-700", light: "bg-green-50 border-green-200" },
//     REJECT:  { bg: "bg-red-600 hover:bg-red-700",     text: "text-red-700",   light: "bg-red-50 border-red-200"     },
//     RETURN:  { bg: "bg-orange-500 hover:bg-orange-600", text: "text-orange-600", light: "bg-orange-50 border-orange-200" },
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto space-y-6">

//         {/* HEADER */}
//         <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
//           <div className="flex items-center justify-between flex-wrap gap-4">
//             <div className="border-l-4 border-blue-600 pl-4">
//               <h1 className="text-3xl font-bold text-gray-800">
//                 {isAdmin ? "Purchase Requests" : "My Approval Inbox"}
//               </h1>
//               <p className="text-gray-500 mt-1">
//                 {isAdmin
//                   ? "Manage all requests across companies"
//                   : "Requests pending your approval decision"}
//               </p>
//             </div>
//             <div className="flex gap-3">
//               {pendingList.length > 0 && (
//                 <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
//                   <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
//                   <span className="text-sm font-semibold text-yellow-700">
//                     {pendingList.length} Pending
//                   </span>
//                 </div>
//               )}
//               {isAdmin && (
//                 <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
//                   <span className="text-sm font-semibold text-blue-700">
//                     {allRequests.length} Total
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* TABS */}
//         {isAdmin && (
//           <div className="flex gap-2">
//             {[
//               { key: "pending", label: "My Pending",    count: pendingList.length },
//               { key: "all",     label: "All Requests",  count: allRequests.length },
//             ].map((tab) => (
//               <button
//                 key={tab.key}
//                 onClick={() => setActiveTab(tab.key as any)}
//                 className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 ${
//                   activeTab === tab.key
//                     ? "bg-blue-600 text-white shadow-sm"
//                     : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 {tab.label}
//                 {tab.count > 0 && (
//                   <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
//                     activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
//                   }`}>
//                     {tab.count}
//                   </span>
//                 )}
//               </button>
//             ))}
//           </div>
//         )}

//         {/* LOADING */}
//         {loading && (
//           <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
//             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
//             <p className="text-gray-400 text-sm">Loading...</p>
//           </div>
//         )}

//         {/* PENDING APPROVALS */}
//         {!loading && (activeTab === "pending" || !isAdmin) && (
//           <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-1 h-6 bg-yellow-500 rounded-full" />
//                 <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
//                 {pendingList.length > 0 && (
//                   <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full border border-yellow-200 font-semibold">
//                     {pendingList.length}
//                   </span>
//                 )}
//               </div>
//               <button onClick={loadData} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
//                 🔄 Refresh
//               </button>
//             </div>

//             {pendingList.length === 0 ? (
//               <div className="text-center py-16">
//                 <div className="text-5xl mb-3">✅</div>
//                 <p className="text-gray-500 font-medium">All caught up!</p>
//                 <p className="text-gray-400 text-sm mt-1">No pending approvals</p>
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="bg-gray-50 border-b border-gray-100">
//                       {["Request No", "Requester", "Company", "Project", "Step", "Amount", "Waiting", "Actions"].map(h => (
//                         <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {pendingList.map((item: any, idx: number) => (
//                       <tr key={item.instanceId}
//                         className={`border-b border-gray-50 hover:bg-blue-50/30 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
//                         <td className="px-4 py-3.5">
//                           <span className="font-mono font-semibold text-blue-700 text-sm">{item.requestNumber}</span>
//                         </td>
//                         <td className="px-4 py-3.5">
//                           <div className="flex items-center gap-2">
//                             <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
//                               {item.requesterName?.charAt(0)}
//                             </div>
//                             <span className="text-sm text-gray-700 font-medium">{item.requesterName}</span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3.5 text-sm text-gray-600">{item.companyName}</td>
//                         <td className="px-4 py-3.5 text-sm text-gray-500">{item.projectName || "-"}</td>
//                         <td className="px-4 py-3.5">
//                           <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
//                             <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                               {item.stepOrder}
//                             </span>
//                             {item.stepName}
//                           </span>
//                         </td>
//                         <td className="px-4 py-3.5">
//                           <span className="font-semibold text-gray-800 text-sm">QAR {item.totalAmount?.toFixed(2)}</span>
//                         </td>
//                         <td className="px-4 py-3.5">
//                           <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
//                             item.daysWaiting > 2 ? "bg-red-100 text-red-700 border border-red-200" :
//                             item.daysWaiting > 0 ? "bg-orange-100 text-orange-700 border border-orange-200" :
//                                                    "bg-green-100 text-green-700 border border-green-200"
//                           }`}>
//                             {item.daysWaiting === 0 ? "⚡ Today" : `⏱ ${item.daysWaiting}d`}
//                           </span>
//                         </td>
//                         {/* <td className="px-4 py-3.5">
//                           <div className="flex items-center gap-1.5">
//                             <button onClick={() => viewStatus(item.prId)}
//                               className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200">
//                               👁 View
//                             </button>
//                             <button onClick={(e) => printRequest(item.prId, e)}
//                               title="Print MR"
//                               className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-200 flex items-center gap-1">
//                               <Printer size={12} /> Print
//                             </button>
//                             <button onClick={() => openAction(item, "APPROVE")}
//                               className="px-2.5 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
//                               ✓ Approve
//                             </button>
//                             <button onClick={() => openAction(item, "RETURN")}
//                               className="px-2.5 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition">
//                               ↩ Return
//                             </button>
//                             <button onClick={() => openAction(item, "REJECT")}
//                               className="px-2.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
//                               ✕ Reject
//                             </button>
//                           </div>
//                         </td> */}
//                         <td className="px-4 py-3.5">
//   <div className="flex items-center gap-1.5">
//     <button onClick={() => viewStatus(item.prId)}
//       className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200">
//       👁 View
//     </button>
//     <button onClick={(e) => printRequest(item.prId, e)}
//       title="Print MR"
//       className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-200 flex items-center gap-1">
//       <Printer size={12} /> Print
//     </button>
//     {item.approverType === "STORE_VERIFICATION" ? (
//       <button onClick={() => navigate("/store-verification")}
//         className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
//         📦 Verify Stock
//       </button>
//     ) : (
//       <>
//         <button onClick={() => openAction(item, "APPROVE")}
//           className="px-2.5 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
//           ✓ Approve
//         </button>
//         <button onClick={() => openAction(item, "RETURN")}
//           className="px-2.5 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition">
//           ↩ Return
//         </button>
//         <button onClick={() => openAction(item, "REJECT")}
//           className="px-2.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
//           ✕ Reject
//         </button>
//       </>
//     )}
//   </div>
// </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}

//         {/* ALL REQUESTS — admin */}
//         {!loading && isAdmin && activeTab === "all" && (
//           <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-1 h-6 bg-blue-600 rounded-full" />
//                 <h2 className="text-lg font-semibold text-gray-800">All Purchase Requests</h2>
//               </div>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead>
//                   <tr className="bg-gray-50 border-b border-gray-100">
//                     {["Request No", "Company", "Requested By", "Status", "Amount", "Date", ""].map(h => (
//                       <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {allRequests.map((r: any, idx: number) => (
//                     <tr key={r.id}
//                       className={`border-b border-gray-50 hover:bg-gray-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
//                       <td className="px-4 py-3.5">
//                         <span className="font-mono font-semibold text-blue-700 text-sm">{r.requestNumber}</span>
//                       </td>
//                       <td className="px-4 py-3.5 text-sm text-gray-600">{r.company || r.companyName}</td>
//                       <td className="px-4 py-3.5 text-sm text-gray-700">{r.requestedBy || "-"}</td>
//                       <td className="px-4 py-3.5">
//                         <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(r.status?.toString())}`}>
//                           {r.status?.toString()}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3.5 font-semibold text-sm text-gray-800">QAR {r.totalAmount?.toFixed(2)}</td>
//                       <td className="px-4 py-3.5 text-sm text-gray-400">
//                         {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
//                       </td>
//                       <td className="px-4 py-3.5">
//                         <div className="flex items-center gap-1">
//                           <button onClick={() => viewStatus(r.id)}
//                             className="text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-200">
//                             👁 Track
//                           </button>
//                           <button onClick={(e) => printRequest(r.id, e)}
//                             title="Print MR"
//                             className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200 flex items-center gap-1">
//                             <Printer size={12} /> Print
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//       </div>

//       {/* ACTION MODAL */}
//       {actionModal && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className={`p-5 border-b border-gray-100 flex items-center justify-between ${
//               actionType === "APPROVE" ? "bg-green-50" : actionType === "REJECT" ? "bg-red-50" : "bg-orange-50"
//             }`}>
//               <h2 className={`text-lg font-bold ${actionColors[actionType].text}`}>
//                 {actionType === "APPROVE" ? "✅ Approve Request" :
//                  actionType === "REJECT"  ? "❌ Reject Request"  : "↩️ Return for Correction"}
//               </h2>
//               <div className="flex items-center gap-2">
//                 {selectedInstance && (
//                   <button onClick={(e) => printRequest(selectedInstance.prId, e)}
//                     className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition">
//                     <Printer size={13} /> Print
//                   </button>
//                 )}
//                 <button onClick={() => setActionModal(false)}
//                   className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 transition">✕</button>
//               </div>
//             </div>

//             <div className="p-5 space-y-5">
//               {prLoading ? (
//                 <div className="text-center py-10">
//                   <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
//                   <p className="text-gray-400 text-sm">Loading request details...</p>
//                 </div>
//               ) : (
//                 <>
//                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
//                     {[
//                       { label: "Request No",        value: prDetails?.requestNumber,                     icon: "📋" },
//                       { label: "Company",           value: prDetails?.companyName,                       icon: "🏢" },
//                       { label: "Department",        value: prDetails?.departmentName,                    icon: "🏬" },
//                       { label: "Project",           value: prDetails?.projectName || "-",                icon: "🏗️" },
//                       { label: "Requester",         value: prDetails?.requestedBy,                       icon: "👤" },
//                       { label: "Total Amount",      value: `QAR ${prDetails?.totalAmount?.toFixed(2)}`, icon: "💰" },
//                       { label: "Delivery Location", value: prDetails?.deliveryLocation || "-",           icon: "📍" },
//                       { label: "Contact Number",    value: prDetails?.contactNumber || "-",              icon: "📞" },
//                     ].map((f) => (
//                       <div key={f.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
//                         <div className="text-xs text-gray-400 mb-0.5">{f.icon} {f.label}</div>
//                         <div className="font-semibold text-sm text-gray-800">{f.value}</div>
//                       </div>
//                     ))}
//                   </div>

//                   <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
//                     <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
//                       {selectedInstance?.stepOrder}
//                     </div>
//                     <div>
//                       <div className="text-xs text-blue-500 font-medium">Your Approval Step</div>
//                       <div className="font-semibold text-blue-800">{selectedInstance?.stepName}</div>
//                     </div>
//                   </div>

//                   {prDetails?.justification && (
//                     <div className="bg-white border border-gray-200 rounded-xl p-4">
//                       <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Business Justification</div>
//                       <p className="text-sm text-gray-700 leading-relaxed">{prDetails.justification}</p>
//                     </div>
//                   )}

//                   <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
//                     <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
//                       <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
//                         📦 Items ({prDetails?.items?.length || 0})
//                       </span>
//                     </div>
//                     <table className="w-full text-sm">
//                       <thead>
//                         <tr className="border-b border-gray-100">
//                           <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">#</th>
//                           <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">Material</th>
//                           <th className="text-center px-4 py-2.5 text-xs text-gray-400 font-medium">Qty</th>
//                           <th className="text-center px-4 py-2.5 text-xs text-gray-400 font-medium">UOM</th>
//                           <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Unit Price</th>
//                           <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Total</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {prDetails?.items?.map((item: any, i: number) => (
//                           <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
//                             <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
//                             <td className="px-4 py-2.5">
//                               <div className="font-medium text-gray-800">{item.materialCode}</div>
//                               <div className="text-xs text-gray-400">{item.materialName}</div>
//                             </td>
//                            <td className="px-4 py-2.5 text-center text-gray-700">
//   <div>{item.quantity}</div>
//   {item.storeStatus === 1 && (
//     <div className="text-[11px] text-green-600 font-medium mt-0.5">
//       ✓ Fully in stock
//     </div>
//   )}
//   {item.storeStatus === 2 && (
//     <div className="text-[11px] text-orange-600 font-medium mt-0.5">
//       {item.availableQty} available, {item.purchaseQty} to purchase
//     </div>
//   )}
//   {item.storeStatus === 3 && (
//     <div className="text-[11px] text-red-600 font-medium mt-0.5">
//       0 in stock, {item.purchaseQty} to purchase
//     </div>
//   )}
// </td>
//                             <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{item.uom}</td>
//                             <td className="px-4 py-2.5 text-right text-gray-700">{Number(item.estimatedUnitPrice).toFixed(2)}</td>
//                             <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
//                               {(Number(item.quantity) * Number(item.estimatedUnitPrice)).toFixed(2)}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                       <tfoot>
//                         <tr className="bg-blue-50 border-t border-blue-100">
//                           <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Grand Total</td>
//                           <td className="px-4 py-3 text-right font-bold text-blue-700">QAR {prDetails?.totalAmount?.toFixed(2)}</td>
//                         </tr>
//                       </tfoot>
//                     </table>
//                   </div>

//                   {prDetails?.approvals?.length > 0 && (
//                     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
//                       <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
//                         <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🔄 Approval History</span>
//                       </div>
//                       <div className="p-3 space-y-2">
//                         {prDetails.approvals.map((a: any, i: number) => (
//                           <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
//                             a.status === "APPROVED" ? "bg-green-50 border-green-200"   :
//                             a.status === "REJECTED" ? "bg-red-50 border-red-200"       :
//                             a.status === "RETURNED" ? "bg-orange-50 border-orange-200" :
//                             a.status === "PENDING"  ? "bg-yellow-50 border-yellow-200" :
//                                                       "bg-gray-50 border-gray-100"
//                           }`}>
//                             <div className="flex items-center gap-3">
//                               <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
//                                 a.status === "APPROVED" ? "bg-green-600" : a.status === "REJECTED" ? "bg-red-600" :
//                                 a.status === "RETURNED" ? "bg-orange-500" : a.status === "PENDING" ? "bg-yellow-500" : "bg-gray-400"
//                               }`}>
//                                 {a.status === "APPROVED" ? "✓" : a.stepOrder}
//                               </div>
//                               <div>
//                                 <div className="font-medium text-gray-800 text-sm">{a.stepName}</div>
//                                 <div className="text-xs text-gray-500">👤 {a.approverName || "Pending"}</div>
//                               </div>
//                             </div>
//                             <div className="text-right">
//                               <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
//                               {a.completedAt && (
//                                 <div className="text-xs text-gray-400 mt-1">
//                                   {new Date(a.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </>
//               )}

//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">
//                   Comments
//                   {actionType !== "APPROVE" && <span className="text-red-500 ml-1 font-normal">* Required</span>}
//                 </label>
//                 <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
//                   placeholder={
//                     actionType === "APPROVE" ? "Optional comments..." :
//                     actionType === "REJECT"  ? "Reason for rejection..." : "What needs to be corrected..."
//                   }
//                   className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
//                 />
//               </div>

//               {actionMsg && (
//                 <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
//                   actionMsg.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-200" :
//                   actionMsg.startsWith("❌") ? "bg-red-100 text-red-700 border border-red-200"       :
//                                                "bg-orange-100 text-orange-700 border border-orange-200"
//                 }`}>
//                   {actionMsg}
//                 </div>
//               )}

//               <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
//                 <button onClick={() => setActionModal(false)} disabled={actionLoading}
//                   className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
//                   Cancel
//                 </button>
//                 <button onClick={submitAction}
//                   disabled={actionLoading || (actionType !== "APPROVE" && !comments.trim())}
//                   className={`px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${actionColors[actionType].bg}`}>
//                   {actionLoading ? (
//                     <span className="flex items-center gap-2">
//                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                       Processing...
//                     </span>
//                   ) : (
//                     actionType === "APPROVE" ? "✅ Confirm Approve" :
//                     actionType === "REJECT"  ? "❌ Confirm Reject"  : "↩ Confirm Return"
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* STATUS MODAL */}
//       {statusModal && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
//               <h2 className="text-lg font-bold text-gray-800">📊 Workflow Tracker</h2>
//               <button onClick={() => setStatusModal(false)}
//                 className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition">✕</button>
//             </div>
//             <div className="p-5">
//               {statusLoading ? (
//                 <div className="text-center py-10">
//                   <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
//                   <p className="text-gray-400 text-sm">Loading...</p>
//                 </div>
//               ) : statusData ? (
//                 <div className="space-y-5">
//                   <div className="grid grid-cols-3 gap-3">
//                     <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
//                       <div className="text-gray-400 text-xs mb-1">Request No</div>
//                       <div className="font-bold text-gray-800">{statusData.requestNumber}</div>
//                     </div>
//                     <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
//                       <div className="text-gray-400 text-xs mb-1">Status</div>
//                       <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(statusData.status)}`}>
//                         {statusData.status}
//                       </span>
//                     </div>
//                     <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
//                       <div className="text-gray-400 text-xs mb-1">Current Step</div>
//                       <div className="font-semibold text-gray-800 text-xs">{statusData.currentStep || "—"}</div>
//                     </div>
//                   </div>
//                   <div className="relative">
//                     <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 z-0" />
//                     <div className="space-y-3 relative z-10">
//                       {statusData.steps?.map((step: any, index: number) => (
//                         <div key={index} className="flex gap-4">
//                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ${
//                             step.isCurrent ? "bg-yellow-500 text-white ring-4 ring-yellow-100" :
//                             step.isDone    ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
//                           }`}>
//                             {step.isDone ? "✓" : step.stepOrder}
//                           </div>
//                           <div className={`flex-1 border rounded-xl p-4 mb-1 ${
//                             step.isCurrent ? "border-yellow-300 bg-yellow-50" :
//                             step.isDone    ? "border-green-200 bg-green-50"   : "border-gray-200 bg-gray-50"
//                           }`}>
//                             <div className="flex items-center justify-between flex-wrap gap-2">
//                               <div>
//                                 <div className="font-semibold text-gray-800 text-sm">{step.stepName}</div>
//                                 <div className="text-xs text-gray-500 mt-0.5">👤 {step.approverName}</div>
//                               </div>
//                               <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(step.status)}`}>
//                                 {step.status}
//                               </span>
//                             </div>
//                             {step.comments && (
//                               <div className="mt-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
//                                 💬 {step.comments}
//                               </div>
//                             )}
//                             {step.actedAt && (
//                               <div className="mt-1.5 text-xs text-gray-400">
//                                 🕐 {new Date(step.actedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-center py-10 text-gray-400">No workflow data found.</div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }

 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { Printer } from "lucide-react";

export default function ApproverInbox() {

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const roles: string[] = user.roles || [];

  const isAdmin    = roles.some(r => ["System Admin", "Holding Admin", "Company Admin"].includes(r));
  const isApprover = roles.some(r => ["Manager", "Department Manager", "IT Manager",
                                       "Budget Manager", "Finance Approver",
                                       "Purchase Officer", "Procurement Officer",
                                       "Purchase Manager",
                                       "CEO", "Asset Manager", "Approver"].includes(r));

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"pending" | "all">("pending");

  const [prDetails, setPrDetails]   = useState<any>(null);
  const [prLoading, setPrLoading]   = useState(false);
  const [actionModal, setActionModal]     = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "RETURN">("APPROVE");
  const [comments, setComments]     = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]   = useState("");

  const [statusModal, setStatusModal]   = useState(false);
  const [statusData, setStatusData]     = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // NEW - inline Assign, offered right after an Approve action fully
  // completes a request's workflow (i.e. this was the last approval step,
  // usually Purchase/Procurement Manager). Saves the manager a separate
  // trip to Procurement Queue for the common case of assigning immediately
  // after their own final approval.
  const [assignModal, setAssignModal]     = useState(false);
  const [assignPrId, setAssignPrId]       = useState<string>("");
  const [assignRequestNumber, setAssignRequestNumber] = useState<string>("");
  const [teamMembers, setTeamMembers]     = useState<any[]>([]);
  const [assignTo, setAssignTo]           = useState("");
  const [assignNote, setAssignNote]       = useState("");
  const [assignSaving, setAssignSaving]   = useState(false);
  const [assignMsg, setAssignMsg]         = useState("");

  useEffect(() => { loadData(); }, []);

async function loadData() {
  try {
    setLoading(true);
    const r = await api.get(`/approvals/pending/${user.id}`);
    setPendingList(r.data.data || r.data || []);

    if (isAdmin) {
      const allR = await api.get("/purchase-requests");
      setAllRequests(allR.data || []);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

  async function openAction(instance: any, type: "APPROVE" | "REJECT" | "RETURN") {
    setSelectedInstance(instance);
    setActionType(type);
    setComments("");
    setActionMsg("");
    setActionModal(true);
    setPrDetails(null);
    setPrLoading(true);
    try {
      const r = await api.get(`/purchase-requests/${instance.prId}`);
      setPrDetails(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPrLoading(false);
    }
  }

  async function submitAction() {
    if (!selectedInstance) return;
    try {
      setActionLoading(true);
      const res = await api.post(
        `/approvals/${selectedInstance.instanceId}/${actionType.toLowerCase()}`,
        { comments }
      );
      setActionMsg(
        actionType === "APPROVE" ? "✅ Approved successfully." :
        actionType === "REJECT"  ? "❌ Request rejected."      :
                                   "↩️ Returned to requester."
      );

      // NEW - if this Approve just completed the whole workflow, offer
      // to assign the request to a Procurement Officer right here.
      const completed = !!(res?.data?.data?.completed ?? res?.data?.completed);
      const prIdForAssign = selectedInstance.prId;
      const requestNumberForAssign = selectedInstance.requestNumber;

      setTimeout(() => {
        setActionModal(false);
        loadData();
        if (actionType === "APPROVE" && completed) {
          openAssign(prIdForAssign, requestNumberForAssign);
        }
      }, 1500);
    } catch (err: any) {
      setActionMsg("❌ " + (err.response?.data?.message || "Action failed."));
    } finally {
      setActionLoading(false);
    }
  }

  // NEW - opens the inline Assign modal for a fully-approved request.
  async function openAssign(prId: string, requestNumber: string) {
    setAssignPrId(prId);
    setAssignRequestNumber(requestNumber);
    setAssignTo("");
    setAssignNote("");
    setAssignMsg("");
    setAssignModal(true);
    try {
      const t = await api.get("/procurement/team-members");
      setTeamMembers(t.data?.data ?? t.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  // NEW - same call the Procurement Queue page uses.
  async function saveAssign() {
    if (!assignTo) { setAssignMsg("Please select a team member."); return; }
    try {
      setAssignSaving(true);
      await api.post(`/procurement/${assignPrId}/assign`, {
        assignedToId: assignTo,
        note: assignNote,
      });
      setAssignMsg("✅ Assigned successfully.");
      setTimeout(() => setAssignModal(false), 1200);
    } catch (err: any) {
      setAssignMsg("❌ " + (err.response?.data?.message || "Failed to assign."));
    } finally {
      setAssignSaving(false);
    }
  }

  async function viewStatus(prId: string) {
    try {
      setStatusLoading(true);
      setStatusModal(true);
      setStatusData(null);
      const r = await api.get(`/approvals/status/${prId}`);
      setStatusData(r.data.data || r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  }

  function printRequest(prId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    window.open(`/purchase-requests/${prId}/print`, "_blank", "noopener,noreferrer");
  }

  function statusColor(status: string) {
    switch (status) {
      case "APPROVED":        return "bg-green-100 text-green-700 border-green-300";
      case "REJECTED":        return "bg-red-100 text-red-700 border-red-300";
      case "RETURNED":        return "bg-orange-100 text-orange-700 border-orange-300";
      case "PENDING":         return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Approved":        return "bg-green-100 text-green-700 border-green-300";
      case "Rejected":        return "bg-red-100 text-red-700 border-red-300";
      case "PendingApproval": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Submitted":       return "bg-blue-100 text-blue-700 border-blue-300";
      case "Draft":           return "bg-gray-100 text-gray-700 border-gray-300";
      default:                return "bg-gray-100 text-gray-600 border-gray-300";
    }
  }

  const actionColors = {
    APPROVE: { bg: "bg-green-600 hover:bg-green-700", text: "text-green-700", light: "bg-green-50 border-green-200" },
    REJECT:  { bg: "bg-red-600 hover:bg-red-700",     text: "text-red-700",   light: "bg-red-50 border-red-200"     },
    RETURN:  { bg: "bg-orange-500 hover:bg-orange-600", text: "text-orange-600", light: "bg-orange-50 border-orange-200" },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <h1 className="text-3xl font-bold text-gray-800">
                {isAdmin ? "Purchase Requests" : "My Approval Inbox"}
              </h1>
              <p className="text-gray-500 mt-1">
                {isAdmin
                  ? "Manage all requests across companies"
                  : "Requests pending your approval decision"}
              </p>
            </div>
            <div className="flex gap-3">
              {pendingList.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-yellow-700">
                    {pendingList.length} Pending
                  </span>
                </div>
              )}
              {isAdmin && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  <span className="text-sm font-semibold text-blue-700">
                    {allRequests.length} Total
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        {isAdmin && (
          <div className="flex gap-2">
            {[
              { key: "pending", label: "My Pending",    count: pendingList.length },
              { key: "all",     label: "All Requests",  count: allRequests.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        )}

        {/* PENDING APPROVALS */}
        {!loading && (activeTab === "pending" || !isAdmin) && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-yellow-500 rounded-full" />
                <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
                {pendingList.length > 0 && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full border border-yellow-200 font-semibold">
                    {pendingList.length}
                  </span>
                )}
              </div>
              <button onClick={loadData} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                🔄 Refresh
              </button>
            </div>

            {pendingList.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-gray-400 text-sm mt-1">No pending approvals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Request No", "Requester", "Company", "Project", "Step", "Amount", "Waiting", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map((item: any, idx: number) => (
                      <tr key={item.instanceId}
                        className={`border-b border-gray-50 hover:bg-blue-50/30 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-semibold text-blue-700 text-sm">{item.requestNumber}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {item.requesterName?.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-700 font-medium">{item.requesterName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{item.companyName}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{item.projectName || "-"}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                            <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {item.stepOrder}
                            </span>
                            {item.stepName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-gray-800 text-sm">QAR {item.totalAmount?.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            item.daysWaiting > 2 ? "bg-red-100 text-red-700 border border-red-200" :
                            item.daysWaiting > 0 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                                   "bg-green-100 text-green-700 border border-green-200"
                          }`}>
                            {item.daysWaiting === 0 ? "⚡ Today" : `⏱ ${item.daysWaiting}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
  <div className="flex items-center gap-1.5">
    <button onClick={() => viewStatus(item.prId)}
      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200">
      👁 View
    </button>
    <button onClick={(e) => printRequest(item.prId, e)}
      title="Print MR"
      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-200 flex items-center gap-1">
      <Printer size={12} /> Print
    </button>
    {item.approverType === "STORE_VERIFICATION" ? (
      <button onClick={() => navigate("/store-verification")}
        className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
        📦 Verify Stock
      </button>
    ) : (
      <>
        <button onClick={() => openAction(item, "APPROVE")}
          className="px-2.5 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
          ✓ Approve
        </button>
        <button onClick={() => openAction(item, "RETURN")}
          className="px-2.5 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition">
          ↩ Return
        </button>
        <button onClick={() => openAction(item, "REJECT")}
          className="px-2.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
          ✕ Reject
        </button>
      </>
    )}
  </div>
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ALL REQUESTS — admin */}
        {!loading && isAdmin && activeTab === "all" && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue-600 rounded-full" />
                <h2 className="text-lg font-semibold text-gray-800">All Purchase Requests</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Request No", "Company", "Requested By", "Status", "Amount", "Date", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allRequests.map((r: any, idx: number) => (
                    <tr key={r.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-semibold text-blue-700 text-sm">{r.requestNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{r.company || r.companyName}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-700">{r.requestedBy || "-"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(r.status?.toString())}`}>
                          {r.status?.toString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-sm text-gray-800">QAR {r.totalAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => viewStatus(r.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-200">
                            👁 Track
                          </button>
                          <button onClick={(e) => printRequest(r.id, e)}
                            title="Print MR"
                            className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200 flex items-center gap-1">
                            <Printer size={12} /> Print
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

      {/* ACTION MODAL */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className={`p-5 border-b border-gray-100 flex items-center justify-between ${
              actionType === "APPROVE" ? "bg-green-50" : actionType === "REJECT" ? "bg-red-50" : "bg-orange-50"
            }`}>
              <h2 className={`text-lg font-bold ${actionColors[actionType].text}`}>
                {actionType === "APPROVE" ? "✅ Approve Request" :
                 actionType === "REJECT"  ? "❌ Reject Request"  : "↩️ Return for Correction"}
              </h2>
              <div className="flex items-center gap-2">
                {selectedInstance && (
                  <button onClick={(e) => printRequest(selectedInstance.prId, e)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition">
                    <Printer size={13} /> Print
                  </button>
                )}
                <button onClick={() => setActionModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 transition">✕</button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {prLoading ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading request details...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Request No",        value: prDetails?.requestNumber,                     icon: "📋" },
                      { label: "Company",           value: prDetails?.companyName,                       icon: "🏢" },
                      { label: "Department",        value: prDetails?.departmentName,                    icon: "🏬" },
                      { label: "Project",           value: prDetails?.projectName || "-",                icon: "🏗️" },
                      { label: "Requester",         value: prDetails?.requestedBy,                       icon: "👤" },
                      { label: "Total Amount",      value: `QAR ${prDetails?.totalAmount?.toFixed(2)}`, icon: "💰" },
                      { label: "Delivery Location", value: prDetails?.deliveryLocation || "-",           icon: "📍" },
                      { label: "Contact Number",    value: prDetails?.contactNumber || "-",              icon: "📞" },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-0.5">{f.icon} {f.label}</div>
                        <div className="font-semibold text-sm text-gray-800">{f.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedInstance?.stepOrder}
                    </div>
                    <div>
                      <div className="text-xs text-blue-500 font-medium">Your Approval Step</div>
                      <div className="font-semibold text-blue-800">{selectedInstance?.stepName}</div>
                    </div>
                  </div>

                  {prDetails?.justification && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Business Justification</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{prDetails.justification}</p>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        📦 Items ({prDetails?.items?.length || 0})
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">#</th>
                          <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">Material</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-400 font-medium">Qty</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-400 font-medium">UOM</th>
                          <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Unit Price</th>
                          <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prDetails?.items?.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-800">{item.materialCode}</div>
                              <div className="text-xs text-gray-400">{item.materialName}</div>
                            </td>
                           <td className="px-4 py-2.5 text-center text-gray-700">
  <div>{item.quantity}</div>
  {item.storeStatus === 1 && (
    <div className="text-[11px] text-green-600 font-medium mt-0.5">
      ✓ Fully in stock
    </div>
  )}
  {item.storeStatus === 2 && (
    <div className="text-[11px] text-orange-600 font-medium mt-0.5">
      {item.availableQty} available, {item.purchaseQty} to purchase
    </div>
  )}
  {item.storeStatus === 3 && (
    <div className="text-[11px] text-red-600 font-medium mt-0.5">
      0 in stock, {item.purchaseQty} to purchase
    </div>
  )}
</td>
                            <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{item.uom}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{Number(item.estimatedUnitPrice).toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                              {(Number(item.quantity) * Number(item.estimatedUnitPrice)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 border-t border-blue-100">
                          <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Grand Total</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">QAR {prDetails?.totalAmount?.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {prDetails?.approvals?.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🔄 Approval History</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {prDetails.approvals.map((a: any, i: number) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                            a.status === "APPROVED" ? "bg-green-50 border-green-200"   :
                            a.status === "REJECTED" ? "bg-red-50 border-red-200"       :
                            a.status === "RETURNED" ? "bg-orange-50 border-orange-200" :
                            a.status === "PENDING"  ? "bg-yellow-50 border-yellow-200" :
                                                      "bg-gray-50 border-gray-100"
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                a.status === "APPROVED" ? "bg-green-600" : a.status === "REJECTED" ? "bg-red-600" :
                                a.status === "RETURNED" ? "bg-orange-500" : a.status === "PENDING" ? "bg-yellow-500" : "bg-gray-400"
                              }`}>
                                {a.status === "APPROVED" ? "✓" : a.stepOrder}
                              </div>
                              <div>
                                <div className="font-medium text-gray-800 text-sm">{a.stepName}</div>
                                <div className="text-xs text-gray-500">👤 {a.approverName || "Pending"}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
                              {a.completedAt && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(a.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comments
                  {actionType !== "APPROVE" && <span className="text-red-500 ml-1 font-normal">* Required</span>}
                </label>
                <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === "APPROVE" ? "Optional comments..." :
                    actionType === "REJECT"  ? "Reason for rejection..." : "What needs to be corrected..."
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {actionMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  actionMsg.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-200" :
                  actionMsg.startsWith("❌") ? "bg-red-100 text-red-700 border border-red-200"       :
                                               "bg-orange-100 text-orange-700 border border-orange-200"
                }`}>
                  {actionMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button onClick={() => setActionModal(false)} disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
                  Cancel
                </button>
                <button onClick={submitAction}
                  disabled={actionLoading || (actionType !== "APPROVE" && !comments.trim())}
                  className={`px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${actionColors[actionType].bg}`}>
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    actionType === "APPROVE" ? "✅ Confirm Approve" :
                    actionType === "REJECT"  ? "❌ Confirm Reject"  : "↩ Confirm Return"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">📊 Workflow Tracker</h2>
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
                            {step.actedAt && (
                              <div className="mt-1.5 text-xs text-gray-400">
                                🕐 {new Date(step.actedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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

      {/* NEW - ASSIGN MODAL - offered automatically right after an
          Approve action fully completes a request's workflow. Same
          endpoint/behaviour as the Procurement Queue's Assign action. */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-emerald-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-emerald-700">✅ Request Fully Approved</h2>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {assignRequestNumber} — assign it to a Procurement Officer now?
                </p>
              </div>
              <button onClick={() => setAssignModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 transition">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— Select team member —</option>
                  {teamMembers.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
                <textarea rows={2} value={assignNote} onChange={e => setAssignNote(e.target.value)}
                  placeholder="Any instructions for the assignee..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {assignMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  assignMsg.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-200" :
                                               "bg-red-100 text-red-700 border border-red-200"
                }`}>
                  {assignMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button onClick={() => setAssignModal(false)} disabled={assignSaving}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
                  Skip — I'll assign later
                </button>
                <button onClick={saveAssign} disabled={assignSaving || !assignTo}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {assignSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Assigning...
                    </span>
                  ) : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

