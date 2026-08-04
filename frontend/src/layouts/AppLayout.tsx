import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

import {
  Bell,
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  ChevronDown,
  FileClock,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Plug,
  Settings,
  ShieldCheck,
  Tag,
  Upload,
  FileText,
  Users,
  FolderTree,
  Send,
  Globe2,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';

// ── NEW: idle-timeout constants — 10 minutes of no mouse/keyboard/touch
// activity anywhere in the app logs the user out automatically. Active
// work (typing, clicking, scrolling) resets the timer, so a user who is
// actually working never gets logged out mid-task.
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

// const IDLE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes
// const IDLE_TIMEOUT_MS = 5 * 60 * 1000;    // 5 minutes
// const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes
const IDLE_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

// ── Standalone top-level items ───────────────────────────────────────────────
const standaloneLinks = [
  {
    to: '/dashboard',
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
];

// ── Requests group ("Purchase Request") ─────────────────────────────────────
const requestsGroup = {
  key: 'requests-group',
  label: 'Purchase Request',
  icon: FileClock,
  children: [
    { to: '/create-request', key: 'create-request', label: 'Create Purchase Request', icon: ClipboardCheck },
    { to: '/my-requests', key: 'my-requests', label: 'My Requests', icon: ClipboardCheck },
    { to: '/purchase-requests', key: 'purchase-requests', label: 'Purchase Requests', icon: FileClock },
  ],
};

// ── Approvals group — NEW, highlighted like Sourcing ────────────────────────
const approvalsGroup = {
  key: 'approvals-group',
  label: 'Approvals',
  icon: ShieldCheck,
  children: [
    { to: '/approvals', key: 'approvals', label: 'My Approvals', icon: ShieldCheck },
    { to: '/approval-history', key: 'approval-history', label: 'Approval History', icon: FileText },
  ],
};

// ── Materials group ───────────────────────────────────────────────────────────
const materialsGroup = {
  key: 'materials-group',
  label: 'Materials',
  icon: Boxes,
  children: [
    { to: '/materials', key: 'materials', label: 'Materials', icon: Boxes },
    { to: '/projects', key: 'projects', label: 'Projects', icon: Building2 },
  ],
};

// ── Procurement group ─────────────────────────────────────────────────────────
const procurementGroup = {
  key: 'procurement-group',
  label: 'Procurement',
  icon: ClipboardCheck,
  children: [
    { to: '/procurement', key: 'procurement', label: 'Procurement Queue', icon: ClipboardCheck },
    { to: '/procurement/indent-transfer', key: 'indent-transfer', label: 'Transfer to Bright ERP', icon: Send },
  ],
};

// ── Sourcing group (RFQ + International PO + Suppliers) — highlighted ──────
const sourcingGroup = {
  key: 'sourcing-group',
  label: 'Sourcing',
  icon: Sparkles,
  children: [
    { to: '/rfq', key: 'rfq', label: 'RFQ', icon: FileSpreadsheet },
    { to: '/international-po', key: 'international-po', label: 'PO Management', icon: Globe2 },
    { to: '/suppliers', key: 'suppliers', label: 'Suppliers', icon: Building2 },
  ],
};

// ── Standalone items (own team / own heading) ────────────────────────────────
const midStandaloneLinks = [
  {
    to: '/store-verification',
    key: 'store-verification',
    label: 'Store Verification',
    icon: Boxes,
  },
  {
    to: '/upload-center',
    key: 'upload-center',
    label: 'Upload Center',
    icon: Upload,
  },
];

// ── Integration Suite (nested inside Settings) ───────────────────────────────
const integrationSuite = {
  key: 'integration-suite',
  label: 'Integration Suite',
  icon: Plug,
  children: [
    { to: '/oracle-monitor', key: 'oracle-monitor', label: 'Oracle Monitor', icon: BarChart3 },
  ],
};

// ── Settings group ────────────────────────────────────────────────────────────
const settingsGroup = {
  key: 'settings-group',
  label: 'Settings',
  icon: Settings,
  children: [
    { to: '/organization', key: 'organization', label: 'Organization', icon: Building2 },
    { to: '/departments', key: 'departments', label: 'Departments', icon: Building2 },
    { to: '/users', key: 'users', label: 'Users', icon: Users },
    { to: '/settings/roles', key: 'roles', label: 'Roles', icon: ShieldCheck },
    { to: '/workflows', key: 'workflows', label: 'Workflow', icon: GitBranch },
    { to: '/settings/item-category-flow', key: 'category-flow', label: 'Category Flow', icon: FolderTree },
    { to: '/settings/company-categories', key: 'company-categories', label: 'Company Categories', icon: Tag },
    { to: '/settings/menu-permissions', key: 'menu-permissions', label: 'Menu Permissions', icon: ShieldCheck },
    { to: '/audit-logs', key: 'audit-logs', label: 'Audit Log', icon: ShieldCheck },
  ],
};

// ── Generic collapsible group component ──────────────────────────────────────
function NavGroup({
  group, isOpen, onToggle, isActive, visibleChildren, nested, highlighted,
}: {
  group: { label: string; icon: any };
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  visibleChildren: React.ReactNode;
  nested?: boolean;
  highlighted?: boolean;
}) {
  const GroupIcon = group.icon;
  return (
    <div className={nested ? '' : 'pt-1'}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition ${
          highlighted
            ? isActive
              ? 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-200 ring-1 ring-amber-400/40'
              : 'text-amber-200/90 bg-amber-400/5 hover:bg-amber-400/10 ring-1 ring-amber-400/20'
            : isActive
            ? 'bg-slate-800 text-white'
            : nested
            ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center gap-3">
          <GroupIcon size={nested ? 15 : 17} className={highlighted ? 'text-amber-400' : ''} />
          {group.label}
          {highlighted && (
            <span className="text-[9px] font-bold tracking-wide bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full">
              NEW
            </span>
          )}
        </span>
        <ChevronDown
          size={nested ? 13 : 15}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className={`mt-1 ml-4 pl-3 space-y-1 border-l ${highlighted ? 'border-amber-400/30' : 'border-slate-800'}`}>
          {visibleChildren}
        </div>
      )}
    </div>
  );
}

function ChildLink({ to, label, icon: Icon, size = 15, highlighted }: { to: string; label: string; icon: any; size?: number; highlighted?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex gap-3 items-center px-3 py-2 rounded-xl text-sm transition ${
          isActive
            ? highlighted
              ? 'bg-amber-400 text-slate-900 font-medium'
              : 'bg-white text-slate-950'
            : highlighted
            ? 'text-amber-100/80 hover:bg-amber-400/10 hover:text-amber-100'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`
      }
    >
      <Icon size={size} />
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ── NEW — idle-timeout logout. Runs once for the whole authenticated
  // app (AppLayout wraps every protected route). Resets on any real user
  // activity; if 10 full minutes pass with none, the session is cleared
  // and the user is bounced to /login. This is separate from the JWT's
  // own expiry — it's purely about the browser sitting idle.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const doIdleLogout = () => {
      localStorage.clear();
      nav('/login', { replace: true });
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(doIdleLogout, IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();
    IDLE_ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetIdleTimer));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      IDLE_ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [nav]);

  // ── Dynamic menu permissions ───────────────────────────────────────────
  const [allowedMenuKeys, setAllowedMenuKeys] = useState<string[]>([]);
  const [menusLoaded, setMenusLoaded] = useState(false);

  useEffect(() => {
    api.get('/menu-permissions/my-menus')
      .then(r => setAllowedMenuKeys(r.data?.data ?? r.data ?? []))
      .catch(() => setAllowedMenuKeys([]))
      .finally(() => setMenusLoaded(true));
  }, []);

  const canSee = (key: string) => allowedMenuKeys.includes(key);

  const visibleRequests    = requestsGroup.children.filter(c => canSee(c.key));
  const visibleApprovals   = approvalsGroup.children.filter(c => canSee(c.key));
  const visibleMaterials   = materialsGroup.children.filter(c => canSee(c.key));
  const visibleProcurement = procurementGroup.children.filter(c => canSee(c.key));
  const visibleSourcing    = sourcingGroup.children.filter(c => canSee(c.key));

  const visibleSettings    = settingsGroup.children.filter(c => canSee(c.key));
  const visibleIntegration = integrationSuite.children.filter(c => canSee(c.key));
  const visibleStandalone  = standaloneLinks.filter(l => canSee(l.key));
  const visibleMidStandalone = midStandaloneLinks.filter(l => canSee(l.key));

  const showRequests    = visibleRequests.length > 0;
  const showApprovals   = visibleApprovals.length > 0;
  const showMaterials   = visibleMaterials.length > 0;
  const showProcurement = visibleProcurement.length > 0;
  const showSourcing    = visibleSourcing.length > 0;
  const showIntegration = visibleIntegration.length > 0;
  const showSettings    = visibleSettings.length > 0 || showIntegration;

  const isOnRequestsPage    = visibleRequests.some(c => location.pathname.startsWith(c.to));
  const isOnApprovalsPage   = visibleApprovals.some(c => location.pathname.startsWith(c.to));
  const isOnMaterialsPage   = visibleMaterials.some(c => location.pathname.startsWith(c.to));
  const isOnProcurementPage = visibleProcurement.some(c => location.pathname.startsWith(c.to));
  const isOnSourcingPage    = visibleSourcing.some(c => location.pathname.startsWith(c.to));
  const isOnIntegrationPage = visibleIntegration.some(c => location.pathname.startsWith(c.to));
  const isOnSettingsPage    = visibleSettings.some(c => location.pathname.startsWith(c.to)) || isOnIntegrationPage;

  const [requestsOpen, setRequestsOpen]     = useState(isOnRequestsPage);
  const [approvalsOpen, setApprovalsOpen]   = useState(isOnApprovalsPage);
  const [materialsOpen, setMaterialsOpen]   = useState(isOnMaterialsPage);
  const [procurementOpen, setProcurementOpen] = useState(isOnProcurementPage);
  const [sourcingOpen, setSourcingOpen]     = useState(isOnSourcingPage);
  const [settingsOpen, setSettingsOpen]     = useState(isOnSettingsPage);
  const [integrationOpen, setIntegrationOpen] = useState(isOnIntegrationPage);

  useEffect(() => {
    if (isOnRequestsPage) setRequestsOpen(true);
    if (isOnApprovalsPage) setApprovalsOpen(true);
    if (isOnMaterialsPage) setMaterialsOpen(true);
    if (isOnProcurementPage) setProcurementOpen(true);
    if (isOnSourcingPage) setSourcingOpen(true);
    if (isOnSettingsPage) setSettingsOpen(true);
    if (isOnIntegrationPage) setIntegrationOpen(true);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!menusLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-slate-950 text-white p-5 overflow-y-auto">
        <div className="mb-8">
          <div className="text-xl font-bold">Al Hattab Holding</div>
          <div className="text-xs text-slate-400">Procurement Hub</div>
        </div>

        <nav className="space-y-1">
          {/* Dashboard */}
          {visibleStandalone.map(link => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex gap-3 items-center px-3 py-2 rounded-xl text-sm ${
                    isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={17} />
                {link.label}
              </NavLink>
            );
          })}

          {/* Requests group */}
          {showRequests && (
            <NavGroup
              group={requestsGroup}
              isOpen={requestsOpen}
              onToggle={() => setRequestsOpen(p => !p)}
              isActive={isOnRequestsPage}
              visibleChildren={visibleRequests.map(c => (
                <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} />
              ))}
            />
          )}

          {/* Approvals group — NEW, highlighted like Sourcing */}
          {showApprovals && (
            <NavGroup
              group={approvalsGroup}
              isOpen={approvalsOpen}
              onToggle={() => setApprovalsOpen(p => !p)}
              isActive={isOnApprovalsPage}
              highlighted
              visibleChildren={visibleApprovals.map(c => (
                <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} highlighted />
              ))}
            />
          )}

          {/* Materials group */}
          {showMaterials && (
            <NavGroup
              group={materialsGroup}
              isOpen={materialsOpen}
              onToggle={() => setMaterialsOpen(p => !p)}
              isActive={isOnMaterialsPage}
              visibleChildren={visibleMaterials.map(c => (
                <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} />
              ))}
            />
          )}

          {/* Procurement group */}
          {showProcurement && (
            <NavGroup
              group={procurementGroup}
              isOpen={procurementOpen}
              onToggle={() => setProcurementOpen(p => !p)}
              isActive={isOnProcurementPage}
              visibleChildren={visibleProcurement.map(c => (
                <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} />
              ))}
            />
          )}

          {/* Sourcing group — highlighted, new module */}
          {showSourcing && (
            <NavGroup
              group={sourcingGroup}
              isOpen={sourcingOpen}
              onToggle={() => setSourcingOpen(p => !p)}
              isActive={isOnSourcingPage}
              highlighted
              visibleChildren={visibleSourcing.map(c => (
                <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} highlighted />
              ))}
            />
          )}

          {/* Store Verification, Upload Center — standalone, own team */}
          {visibleMidStandalone.map(link => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex gap-3 items-center px-3 py-2 rounded-xl text-sm ${
                    isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={17} />
                {link.label}
              </NavLink>
            );
          })}

          {/* Settings group */}
          {showSettings && (
            <NavGroup
              group={settingsGroup}
              isOpen={settingsOpen}
              onToggle={() => setSettingsOpen(p => !p)}
              isActive={isOnSettingsPage}
              visibleChildren={
                <>
                  {visibleSettings.map(c => (
                    <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} />
                  ))}
                  {showIntegration && (
                    <NavGroup
                      group={integrationSuite}
                      isOpen={integrationOpen}
                      onToggle={() => setIntegrationOpen(p => !p)}
                      isActive={isOnIntegrationPage}
                      nested
                      visibleChildren={visibleIntegration.map(c => (
                        <ChildLink key={c.to} to={c.to} label={c.label} icon={c.icon} size={14} />
                      ))}
                    />
                  )}
                </>
              }
            />
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-7 shrink-0 sticky top-0 z-30">
          <div>
            <div className="font-semibold">Enterprise Procurement Management</div>
            <div className="text-xs text-slate-500">
              Material requests, approvals, uploads, and Oracle integration
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <NotificationBell userId={user.id} />
            <span className="text-sm">{user.fullName || 'User'}</span>
            <button
              className="btn bg-slate-100"
              onClick={() => {
                localStorage.clear();
                nav('/login');
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <section className="p-7 overflow-x-auto">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  async function loadNotifications() {
    try {
      const r = await api.get(`/notifications?userId=${userId}`);
      const data = r.data.data ?? r.data ?? [];
      setNotifications(data);
      setUnread(data.filter((n: any) => !n.isRead).length);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.put(`/notifications/mark-all-read?userId=${userId}`);
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  async function markOne(id: string) {
    try {
      await api.put(`/notifications/${id}/mark-read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
              ) : (
                notifications.slice(0, 20).map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markOne(n.id)}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString('en-QA', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}