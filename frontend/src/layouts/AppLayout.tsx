
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  Users,
} from 'lucide-react';

const links = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: [
      'System Admin', 'Requester', 'Manager',
      'IT Manager', 'Budget Manager', 'Asset Manager',
      'Finance Approver', 'Purchase Officer', 'Purchase Manager', // ✅ FIXED
      'CEO', 'Approver', 'Material Admin', 'Workflow Admin',
    ],
  },
  {
    to: '/purchase-requests',
    label: 'Purchase Requests',
    icon: FileClock,
    roles: ['System Admin'],
  },
  {
    to: '/create-request',
    label: 'Create Request',
    icon: ClipboardCheck,
    roles: ['Requester', 'System Admin'],
  },
  {
    to: '/my-requests',
    label: 'My Requests',
    icon: ClipboardCheck,
    roles: ['Requester', 'System Admin'],
  },
  {
    to: '/approvals',
    label: 'Approvals',
    icon: ShieldCheck,
    roles: [
      'Manager', 'IT Manager', 'Budget Manager',
      'Asset Manager', 'Finance Approver', 'Purchase Officer',
      'Purchase Manager', // ✅ FIXED
      'CEO', 'Approver', 'System Admin',
    ],
  },
  {
    to: '/materials',
    label: 'Materials',
    icon: Boxes,
    roles: ['Material Admin', 'System Admin'],
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: Building2,
    roles: ['Material Admin', 'System Admin'],
  },
  {
    to: '/procurement',
    label: 'Procurement Queue',
    icon: ClipboardCheck,
    roles: ['Purchase Officer', 'Procurement Officer', 'Purchase Manager', 'Manager', 'System Admin'], // ✅ FIXED
  },
  {
    to: '/upload-center',
    label: 'Upload Center',
    icon: Upload,
    roles: ['System Admin'],
  },
  {
    to: '/settings/item-category-flow',
    label: 'Category Flow',
    icon: GitBranch,
    roles: ['System Admin'],
  },
];

const integrationSuite = {
  label: 'Integration Suite',
  icon: Plug,
  roles: ['System Admin'],
  children: [
    {
      to: '/oracle-monitor',
      label: 'Oracle Monitor',
      icon: BarChart3,
      roles: ['System Admin'],
    },
    {
      to: '/item-categories',
      label: 'Item Categories',
      icon: Tag,
      roles: ['System Admin'],
    },
  ],
};

const settingsGroup = {
  label: 'Settings',
  icon: Settings,
  roles: ['System Admin'],
  children: [
    {
      to: '/workflows',
      label: 'Workflow',
      icon: GitBranch,
      roles: ['Workflow Admin', 'System Admin'],
    },
    {
      to: '/users',
      label: 'Users',
      icon: Users,
      roles: ['System Admin'],
    },
    {
      to: '/organization',
      label: 'Organization',
      icon: Building2,
      roles: ['System Admin'],
    },
    {
      to: '/settings/company-categories',
      label: 'Company Categories',
      icon: Building2,
      roles: ['System Admin'],
    },
    {
      to: '/audit-logs',
      label: 'Audit Log',
      icon: ShieldCheck,
      roles: ['System Admin'],
    },
  ],
};

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRoles: string[] = user.roles ?? [];

  const visibleSettingsChildren = settingsGroup.children.filter((c) =>
    c.roles.some((r) => userRoles.includes(r))
  
  );

  const visibleIntegrationChildren = integrationSuite.children.filter((c) =>
    c.roles.some((r) => userRoles.includes(r))
  );

  const showIntegrationSuite =
    integrationSuite.roles.some((r) => userRoles.includes(r)) &&
    visibleIntegrationChildren.length > 0;

  const showSettingsGroup =
    settingsGroup.roles.some((r) => userRoles.includes(r)) &&
    (visibleSettingsChildren.length > 0 || showIntegrationSuite);

  const isOnIntegrationPage = visibleIntegrationChildren.some((c) =>
    location.pathname.startsWith(c.to)
  );
  const isOnSettingsPage =
    visibleSettingsChildren.some((c) => location.pathname.startsWith(c.to)) ||
    isOnIntegrationPage;

  const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);
  const [integrationOpen, setIntegrationOpen] = useState(isOnIntegrationPage);

  useEffect(() => {
    if (isOnSettingsPage) setSettingsOpen(true);
    if (isOnIntegrationPage) setIntegrationOpen(true);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-slate-950 text-white p-5">
        <div className="mb-8">
          <div className="text-xl font-bold">Al Hattab Holding</div>
          <div className="text-xs text-slate-400">Procurement Hub</div>
        </div>

        <nav className="space-y-1">
          {links
            .filter((link) => link.roles.some((r) => userRoles.includes(r)))
            .map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex gap-3 items-center px-3 py-2 rounded-xl text-sm ${
                      isActive
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={17} />
                  {link.label}
                </NavLink>
              );
            })}

          {showSettingsGroup && (
            <div className="pt-1">
              <button
                onClick={() => setSettingsOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition ${
                  isOnSettingsPage
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <settingsGroup.icon size={17} />
                  {settingsGroup.label}
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${
                    settingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {settingsOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                  {visibleSettingsChildren.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex gap-3 items-center px-3 py-2 rounded-xl text-sm ${
                            isActive
                              ? 'bg-white text-slate-950'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`
                        }
                      >
                        <ChildIcon size={15} />
                        {child.label}
                      </NavLink>
                    );
                  })}

                  {showIntegrationSuite && (
                    <div>
                      <button
                        onClick={() => setIntegrationOpen((prev) => !prev)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition ${
                          isOnIntegrationPage
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <integrationSuite.icon size={15} />
                          {integrationSuite.label}
                        </span>
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${
                            integrationOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {integrationOpen && (
                        <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                          {visibleIntegrationChildren.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                className={({ isActive }) =>
                                  `flex gap-3 items-center px-3 py-2 rounded-xl text-sm ${
                                    isActive
                                      ? 'bg-white text-slate-950'
                                      : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                                  }`
                                }
                              >
                                <ChildIcon size={14} />
                                {child.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-7">
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

        <section className="p-7">
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
