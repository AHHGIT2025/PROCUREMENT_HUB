import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import api from '../api/client';
import { useNavigate } from "react-router-dom";

const fmt  = (n: number) => Number(n ?? 0).toLocaleString('en-QA');
const fmtQ = (n: number) => 'QAR ' + Number(n ?? 0).toLocaleString('en-QA', { maximumFractionDigits: 0 });

const STATUS_STYLE: Record<string, string> = {
  'Draft':            'bg-slate-100 text-slate-600',
  'Submitted':        'bg-blue-100 text-blue-700',
  'Pending Approval': 'bg-amber-100 text-amber-700',
  'Approved':         'bg-emerald-100 text-emerald-700',
  'Rejected':         'bg-red-100 text-red-700',
  'Returned':         'bg-purple-100 text-purple-700',
  'Oracle Ready':     'bg-teal-100 text-teal-700',
};

const PROCUREMENT_ROLES = ['Procurement Officer', 'Procurement Manager'];

const APPROVER_ROLES = [
  'Manager', 'IT Manager', 'Budget Manager', 'Asset Manager',
  'Finance Approver',   'CEO', 'Approver',
  'Department Manager', 'Procurement Officer', 'Procurement Manager', 'SW-DM-Design', 'SW-DM-EX', 'SW-DM-FUR',
  'Company GM', 'Vice Chairman'
];

function isAdminRole(roles: string[])       { return roles.includes('System Admin'); }
function isApproverRole(roles: string[])    { return roles.some(r => APPROVER_ROLES.includes(r)); }
function isProcurementRole(roles: string[]) { return roles.some(r => PROCUREMENT_ROLES.includes(r)) && !isAdminRole(roles); }

function Badge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-gray-600">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold text-gray-800 ml-1">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── NEW: SAP-style welcome banner — date/day, time-of-day greeting, name,
// and role, with an optional action button on the right. Used at the top
// of every dashboard variant below instead of the old plain "Welcome, X"
// heading.
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, ';
  if (h < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}

function GreetingBanner({ name, roles, action }: { name: string; roles: string[]; action?: React.ReactNode }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const primaryRole = roles?.[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-6 py-5 sm:px-7 sm:py-6 shadow-sm">
      {/* decorative circles, purely visual */}
      <div className="pointer-events-none absolute -right-8 -top-10 w-40 h-40 bg-white/10 rounded-full" />
      <div className="pointer-events-none absolute right-20 -bottom-14 w-28 h-28 bg-white/10 rounded-full" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-blue-100 uppercase tracking-wide">{dateStr}</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            {greetingWord()}{name}!
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-sm text-blue-100">Great to see you .</p>
            {primaryRole && (
              <span className="text-[10px] font-semibold bg-white/20 text-white rounded-full px-2.5 py-0.5">
                {/* {primaryRole} */}
              </span>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

function ProcurementDashboard({ d, name, roles, userId }: { d: any; name: string; roles: string[]; userId: string }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  useEffect(() => {
    api.get('/procurement/queue')
      .then(r => setQueue(r.data?.data ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingQueue(false));
  }, []);

  const pending = queue.filter(x => x.poStatus === 'PENDING');
  const issued  = queue.filter(x => x.poStatus === 'ISSUED');
  const myTasks = queue.filter(x =>
  (x.assignmentStatus === 'ASSIGNED' || x.assignmentStatus === 'IN_PROGRESS') &&
  x.assignedToId === userId
);

  return (
    <div className="space-y-6 pb-8">
      <GreetingBanner name={name} roles={roles} action={
        <button onClick={() => navigate('/procurement')}
          className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition">
          Open Procurement Queue
        </button>
      } />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total in Queue', value: queue.length,   color: 'border-blue-400',    note: 'All requests' },
          { label: 'PO Pending',     value: pending.length, color: 'border-amber-400',   note: 'Awaiting PO issue' },
          { label: 'PO Issued',      value: issued.length,  color: 'border-emerald-400', note: 'Issued in Bright' },
          { label: 'My Tasks',       value: myTasks.length, color: 'border-purple-400',  note: 'Assigned to me' },
        ].map(c => (
          <div key={c.label} onClick={() => navigate('/procurement')}
            className={`bg-white rounded-2xl border-l-4 ${c.color} shadow-sm p-5 cursor-pointer hover:shadow-md transition`}>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.note}</p>
          </div>
        ))}
      </div>
 {!roles.includes('Purchase Manager') && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            My Assigned Tasks
            {myTasks.length > 0 && (
              <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{myTasks.length}</span>
            )}
          </h2>
          <button onClick={() => navigate('/procurement')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        {loadingQueue ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : myTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm font-medium text-gray-500">No tasks assigned to you</p>
            <p className="text-xs text-gray-400 mt-1">Check back later or contact your manager</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map((item: any) => (
              <div key={item.id} onClick={() => navigate('/procurement')}
                className="border border-purple-100 bg-purple-50 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{item.requestNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.companyName} — {item.requesterName}</p>
                  {item.assignmentNote && <p className="text-xs text-purple-600 mt-0.5 italic">Note: {item.assignmentNote}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800">QAR {Number(item.totalAmount).toLocaleString()}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.assignmentStatus === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.assignmentStatus === 'IN_PROGRESS' ? 'In Progress' : 'Assigned'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Pending PO Update
            {pending.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
            )}
          </h2>
          <button onClick={() => navigate('/procurement')} className="text-xs text-blue-600 hover:underline">Go to Queue</button>
        </div>
        {loadingQueue ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm font-medium text-emerald-600">All POs updated!</p>
            <p className="text-xs text-gray-400 mt-1">No pending PO updates at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left py-2 px-1 font-semibold">Request No</th>
                  <th className="text-left py-2 px-1 font-semibold hidden sm:table-cell">Company</th>
                  <th className="text-left py-2 px-1 font-semibold hidden md:table-cell">Assigned To</th>
                  <th className="text-right py-2 px-1 font-semibold">Amount</th>
                  <th className="text-center py-2 px-1 font-semibold">Task Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 8).map((req: any) => (
                  <tr key={req.id} onClick={() => navigate('/procurement')}
                    className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
                    <td className="py-3 px-1 font-mono font-semibold text-blue-700 text-xs">{req.requestNumber}</td>
                    <td className="py-3 px-1 text-gray-500 text-xs hidden sm:table-cell">{req.companyName}</td>
                    <td className="py-3 px-1 text-gray-500 text-xs hidden md:table-cell">
                      {req.assignedToName ?? <span className="text-gray-300 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-1 text-right font-semibold text-gray-800 text-xs">QAR {Number(req.totalAmount).toLocaleString()}</td>
                    <td className="py-3 px-1 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        req.assignmentStatus === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                        req.assignmentStatus === 'ASSIGNED'    ? 'bg-blue-100 text-blue-700' :
                        req.assignmentStatus === 'COMPLETED'   ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{req.assignmentStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RequesterDashboard({ d, name, roles }: { d: any; name: string; roles: string[] }) {
  const navigate = useNavigate();
  const cards = [
    { label: 'Total',    value: fmt(d.myRequestsTotal   ?? 0), color: 'border-blue-400',  note: 'All requests',      nav: '/my-requests' },
    { label: 'Draft',    value: fmt(d.myRequestsDraft   ?? 0), color: 'border-slate-400', note: 'Not submitted',     nav: '/my-requests?filter=Draft' },
    { label: 'Pending',  value: fmt(d.myRequestsPending ?? 0), color: 'border-amber-400', note: 'Awaiting approval', nav: '/my-requests?filter=PendingApproval' },
    { label: 'Approved', value: fmt(d.approvedCount     ?? 0), color: 'border-green-400', note: 'Completed',         nav: '/my-requests?filter=Approved' },
    { label: 'Rejected', value: fmt(d.rejectedCount     ?? 0), color: 'border-red-400',   note: 'Needs attention',   nav: '/my-requests?filter=Rejected' },
  ];
  return (
    <div className="space-y-6 pb-8">
      <GreetingBanner name={name} roles={roles} action={
        <button onClick={() => navigate('/create-request')}
          className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition">
          + New Request
        </button>
      } />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} onClick={() => navigate(c.nav)}
            className={`bg-white rounded-2xl border-l-4 ${c.color} shadow-sm p-5 cursor-pointer hover:shadow-md transition`}>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.note}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">My Recent Requests</h2>
          <button onClick={() => navigate('/my-requests')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        {(d.recentRequests ?? []).length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm mb-3">You have not created any requests yet.</p>
            <button onClick={() => navigate('/create-request')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition">
              Create First Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left py-2 px-1 font-semibold">Request No</th>
                  <th className="text-left py-2 px-1 font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-right py-2 px-1 font-semibold">Amount</th>
                  <th className="text-center py-2 px-1 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.recentRequests ?? []).map((req: any) => (
                  <tr key={req.id} onClick={() => navigate('/my-requests')}
                    className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
                    <td className="py-3 px-1 font-semibold text-gray-800">{req.requestNumber}</td>
                    <td className="py-3 px-1 text-gray-400 text-xs hidden sm:table-cell">
                      {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-3 px-1 text-right font-semibold text-gray-800">{fmtQ(req.totalAmount)}</td>
                    <td className="py-3 px-1 text-center"><Badge status={req.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApproverDashboard({ d, name, roles }: { d: any; name: string; roles: string[] }) {
  const navigate = useNavigate();
  const myPending = d.myPendingApprovals ?? 0;
  const pendingQueue: any[] = d.pendingApprovalQueue ?? [];

  const statCards = [
    { label: 'Pending My Action', value: fmt(myPending),                                  color: 'border-red-400',     note: 'Needs your decision', nav: '/approvals' },
    { label: 'Total Approved',    value: fmt(d.approvedCount ?? d.approvedRequests ?? 0), color: 'border-emerald-400', note: 'Approved requests',   nav: '/purchase-requests?filter=Approved' },
    { label: 'Total Requests',    value: fmt(d.totalRequests ?? 0),                       color: 'border-blue-400',    note: 'Across company',      nav: '/purchase-requests' },
  ];

  return (
    <div className="space-y-6 pb-8">
      <GreetingBanner name={name} roles={roles} action={
        <button onClick={() => navigate('/approvals')}
          className="relative bg-white text-amber-700 hover:bg-amber-50 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition">
          Go to Approvals
          {myPending > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {myPending}
            </span>
          )}
        </button>
      } />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {statCards.map(c => (
          <div key={c.label} onClick={() => navigate(c.nav)}
            className={`bg-white rounded-2xl border-l-4 ${c.color} shadow-sm p-5 cursor-pointer hover:shadow-md transition`}>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Pending Approvals
            {myPending > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{myPending}</span>
            )}
          </h2>
          <button onClick={() => navigate('/approvals')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        {myPending === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQueue.map((item: any) => (
              <div key={item.instanceId} onClick={() => navigate('/approvals')}
                className="border border-amber-100 bg-amber-50 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{item.requestNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.requesterName} — {item.stepName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800">{fmtQ(item.totalAmount)}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {item.daysWaiting === 0 ? 'Today' : `${item.daysWaiting}d waiting`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Recent Requests</h2>
          <button onClick={() => navigate('/purchase-requests')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left py-2 px-1 font-semibold">Request No</th>
                <th className="text-left py-2 px-1 font-semibold hidden sm:table-cell">Requester</th>
                <th className="text-right py-2 px-1 font-semibold">Amount</th>
                <th className="text-center py-2 px-1 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(d.recentRequests ?? []).slice(0, 8).map((req: any) => (
                <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 px-1 font-semibold text-gray-800">{req.requestNumber}</td>
                  <td className="py-3 px-1 text-gray-500 text-xs hidden sm:table-cell">{req.requesterName}</td>
                  <td className="py-3 px-1 text-right font-semibold text-gray-800">{fmtQ(req.totalAmount)}</td>
                  <td className="py-3 px-1 text-center"><Badge status={req.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ d, name, roles }: { d: any; name: string; roles: string[] }) {
  const navigate = useNavigate();
  const statusChart:    any[] = d.statusChart    ?? [];
  const monthlyTrend:   any[] = d.monthlyTrend   ?? [];
  const recentRequests: any[] = d.recentRequests ?? [];
  const topCompanies:   any[] = d.topCompanies   ?? [];

  const topCards = [
    { label: 'Total Requests',   value: fmt(d.totalRequests ?? 0),                       color: 'border-blue-400',    nav: '/purchase-requests' },
    { label: 'Draft',            value: fmt(d.draftCount ?? 0),                          color: 'border-slate-400',   nav: '/purchase-requests?filter=Draft' },
    { label: 'Pending',          value: fmt(d.pendingCount ?? d.pendingApprovals ?? 0),  color: 'border-amber-400',   nav: '/purchase-requests?filter=PendingApproval' },
    { label: 'Approved',         value: fmt(d.approvedCount ?? d.approvedRequests ?? 0), color: 'border-emerald-400', nav: '/purchase-requests?filter=Approved' },
    { label: 'Rejected',         value: fmt(d.rejectedCount ?? 0),                       color: 'border-red-400',     nav: '/purchase-requests?filter=Rejected' },
    { label: 'Returned',         value: fmt(d.returnedCount ?? 0),                       color: 'border-purple-400',  nav: '/purchase-requests?filter=Returned' },
  ];

  return (
    <div className="space-y-7 pb-8">
      <GreetingBanner name={name} roles={roles} />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {topCards.map(c => (
          <div key={c.label} onClick={() => navigate(c.nav)}
            className={`bg-white rounded-2xl border-l-4 ${c.color} shadow-sm p-4 cursor-pointer hover:shadow-md transition`}>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-2">{c.value}</p>
          </div>
        ))}
        {/* Total Value — display only, not clickable (no single filtered page makes sense for a sum) */}
        <div className="bg-white rounded-2xl border-l-4 border-purple-400 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Total Value</p>
          <p className="text-xl font-bold text-gray-900 mt-2">{fmtQ(d.totalValue ?? 0)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Requests by Status</h2>
          {statusChart.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChart} barSize={30} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
                  {statusChart.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color ?? '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend (Last 6 Months)</h2>
          {monthlyTrend.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="pending"  name="Pending"  stroke="#f59e0b" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Requests</h2>
            <button onClick={() => navigate('/purchase-requests')} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left py-2 px-1 font-semibold">Request No</th>
                  <th className="text-left py-2 px-1 font-semibold hidden sm:table-cell">Company</th>
                  <th className="text-left py-2 px-1 font-semibold hidden md:table-cell">Requester</th>
                  <th className="text-right py-2 px-1 font-semibold">Amount</th>
                  <th className="text-center py-2 px-1 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req: any) => (
                  <tr key={req.id} onClick={() => navigate('/purchase-requests')}
                    className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
                    <td className="py-3 px-1">
                      <p className="font-semibold text-gray-800">{req.requestNumber}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-1 text-gray-500 text-xs hidden sm:table-cell">{req.companyName}</td>
                    <td className="py-3 px-1 text-gray-500 text-xs hidden md:table-cell">{req.requesterName}</td>
                    <td className="py-3 px-1 text-right font-semibold text-gray-800">{fmtQ(req.totalAmount)}</td>
                    <td className="py-3 px-1 text-center"><Badge status={req.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Companies by Value</h2>
            {topCompanies.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {topCompanies.map((c: any, i: number) => {
                  const maxVal = topCompanies[0]?.totalValue || 1;
                  const pct = Math.round(((c.totalValue ?? 0) / maxVal) * 100);
                  return (
                    <div key={c.name ?? i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[130px]">
                          <span className="text-gray-400 mr-1">#{i + 1}</span>{c.name}
                        </span>
                        <span className="text-xs font-bold text-gray-700">{fmtQ(c.totalValue ?? 0)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Value Summary</h2>
            <div className="space-y-2">
              {[
                { label: 'Total Value',    v: fmtQ(d.totalValue    ?? 0), cls: 'text-gray-800' },
                { label: 'Approved Value', v: fmtQ(d.approvedValue ?? 0), cls: 'text-emerald-600' },
              ].map(x => (
                <div key={x.label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{x.label}</span>
                  <span className={`text-sm font-bold ${x.cls}`}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {d.generatedAt && (
        <p className="text-right text-xs text-gray-300">
          Updated: {new Date(d.generatedAt).toLocaleString('en-GB')}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [d, setD]             = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard')
      .then(r => { setD(r.data?.data ?? r.data); setLoading(false); })
      .catch(err => {
        const msg = err.response?.data?.message || err.response?.statusText || err.message || 'Unknown error';
        setError(`${err.response?.status ?? 'Network'} - ${msg}`);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      <div className="bg-white p-10 rounded-2xl shadow-sm border text-center text-gray-400 text-sm animate-pulse">
        Loading dashboard...
      </div>
    </div>
  );

  if (error) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <p className="font-semibold text-red-700 mb-1">Unable to load dashboard</p>
        <p className="text-sm font-mono text-red-600 bg-red-100 rounded p-2">{error}</p>
      </div>
    </div>
  );

  if (!d) return null;

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const userRoles: string[] = user.roles ?? d.userRoles ?? [];
  const firstName = (user.fullName ?? user.email ?? 'there').split(' ')[0];

  if (isAdminRole(userRoles))       return <AdminDashboard       d={d} name={firstName} roles={userRoles} />;
if (isProcurementRole(userRoles)) return <ProcurementDashboard d={d} name={firstName} roles={userRoles} userId={user.id} />;
  if (isApproverRole(userRoles))    return <ApproverDashboard    d={d} name={firstName} roles={userRoles} />;
  return                                   <RequesterDashboard   d={d} name={firstName} roles={userRoles} />;
}