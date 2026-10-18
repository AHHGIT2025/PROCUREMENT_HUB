// Save under: src/pages/settings/MenuPermissions.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface MenuKeyEntry {
  key: string;
  label: string;
}

interface MatrixResponse {
  roles: Role[];
  menuKeys: MenuKeyEntry[];
  permissions: { roleId: string; menuKey: string }[];
}

// -- Groups and icons a new menu item can be added under. Kept as a fixed
// list here because AppLayout.tsx's sidebar groups (and the icon imports it
// already has) are still code -- a menu item just needs to slot into one of
// these existing groups/icons to appear with zero code changes. Adding a
// brand-new GROUP or a brand-new ICON still needs a small AppLayout.tsx edit.
const GROUP_OPTIONS = [
  { value: 'standalone',        label: 'Standalone (top-level, like Dashboard)' },
  { value: 'requests-group',    label: 'Purchase Request' },
  { value: 'approvals-group',   label: 'Approvals' },
  { value: 'materials-group',   label: 'Materials' },
  { value: 'procurement-group', label: 'Procurement' },
  { value: 'sourcing-group',    label: 'Sourcing' },
  { value: 'mid-standalone',    label: 'Standalone (own row, like Upload Center)' },
  { value: 'integration-suite', label: 'Integration Suite (inside Settings)' },
  { value: 'settings-group',    label: 'Settings' },
];

const ICON_OPTIONS = [
  'LayoutDashboard', 'ClipboardCheck', 'FileClock', 'ShieldCheck', 'FileText',
  'Boxes', 'Building2', 'Send', 'FileSpreadsheet', 'Globe2', 'Upload',
  'BarChart3', 'Users', 'GitBranch', 'FolderTree', 'Tag', 'Eye', 'Sparkles',
];

export default function MenuPermissions() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuKeys, setMenuKeys] = useState<MenuKeyEntry[]>([]);
  const [grantedSet, setGrantedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // -- NEW: Add Menu Item form state --
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [newGroup, setNewGroup] = useState(GROUP_OPTIONS[0].value);
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const key = (roleId: string, menuKey: string) => `${roleId}::${menuKey}`;

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/menu-permissions/matrix');
      const data: MatrixResponse = res.data?.data ?? res.data;
      setRoles(data.roles);
      setMenuKeys(data.menuKeys);
      setGrantedSet(new Set(data.permissions.map(p => key(p.roleId, p.menuKey))));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load menu permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  async function toggle(roleId: string, menuKey: string) {
    const k = key(roleId, menuKey);
    setSavingKey(k);
    setError(null);

    // Optimistic update
    setGrantedSet(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });

    try {
      await api.post('/menu-permissions/toggle', { roleId, menuKey });
    } catch (e: any) {
      // Revert on failure
      setGrantedSet(prev => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k); else next.add(k);
        return next;
      });
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update permission.');
    } finally {
      setSavingKey(null);
    }
  }

  // -- NEW: submit the Add Menu Item form. Only wires an existing page's
  // route into the sidebar/permission system -- it doesn't create pages.
  async function addMenuItem() {
    if (!newKey.trim() || !newLabel.trim() || !newRoute.trim()) {
      setAddError('Key, Label, and Route are all required.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await api.post('/menu-permissions/items', {
        menuKey: newKey.trim(),
        label: newLabel.trim(),
        route: newRoute.trim(),
        iconName: newIcon,
        groupKey: newGroup,
      });
      setNewKey('');
      setNewLabel('');
      setNewRoute('');
      setNewGroup(GROUP_OPTIONS[0].value);
      setNewIcon(ICON_OPTIONS[0]);
      setShowAddForm(false);
      await loadMatrix();
    } catch (e: any) {
      setAddError(e?.response?.data?.message ?? e?.message ?? 'Failed to add menu item.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
      <RefreshCw size={20} className="animate-spin" />
      <span>Loading menu permissions…</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 min-w-0">
      <div className="flex items-start justify-between border-b pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Menu Permissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Control which sidebar menus each role can see. Changes apply immediately —
              no code changes or redeploy needed.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddForm(p => !p)}
            className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-3 py-2 transition">
            <Plus size={14} /> Add Menu Item
          </button>
          <button onClick={loadMatrix}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* -- NEW: Add Menu Item form -- */}
      {showAddForm && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">Add Menu Item</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Wires an already-built page's route into the sidebar and permission matrix.
              The page itself must already exist in the app — this doesn't create one.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Menu Key *</label>
              <input value={newKey} onChange={e => setNewKey(e.target.value)}
                placeholder="e.g. company-followup"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Label *</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Company Follow-Up"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Route *</label>
              <input value={newRoute} onChange={e => setNewRoute(e.target.value)}
                placeholder="e.g. /company-followup"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Sidebar Group *</label>
              <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {GROUP_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Icon *</label>
              <select value={newIcon} onChange={e => setNewIcon(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Cancel</button>
            <button onClick={addMenuItem} disabled={adding}
              className="px-5 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition">
              {adding ? 'Adding...' : 'Add Menu Item'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* ── Scrollable matrix container ───────────────────────────────
          max-h + overflow-y-auto here (instead of letting the whole page
          scroll) is what makes `sticky top-0` on the header row actually
          work reliably, and keeps very tall role lists from pushing the
          page header out of view too. */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-auto max-h-[75vh]">
        <table className="text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-r whitespace-nowrap">
                Role
              </th>
              {menuKeys.map(mk => (
                <th key={mk.key} className="sticky top-0 z-20 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-b whitespace-nowrap">
                  {mk.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50 transition">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-800 border-r whitespace-nowrap">
                  {role.name}
                </td>
                {menuKeys.map(mk => {
                  const k = key(role.id, mk.key);
                  const granted = grantedSet.has(k);
                  const isSaving = savingKey === k;
                  return (
                    <td key={mk.key} className="px-3 py-3 text-center border-b border-gray-50">
                      <button
                        onClick={() => toggle(role.id, mk.key)}
                        disabled={isSaving}
                        title={`${granted ? 'Remove' : 'Grant'} ${mk.label} for ${role.name}`}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md transition disabled:opacity-50"
                      >
                        {isSaving ? (
                          <RefreshCw size={14} className="animate-spin text-gray-400" />
                        ) : granted ? (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-gray-300" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// // src/pages/settings/MenuPermissions.tsx
// import { useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../../api/client';
// import { RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

// interface Role {
//   id: string;
//   name: string;
// }

// interface MatrixResponse {
//   roles: Role[];
//   menuKeys: string[];
//   permissions: { roleId: string; menuKey: string }[];
// }

// const MENU_LABELS: Record<string, string> = {
//   'dashboard': 'Dashboard',
//   'purchase-requests': 'Purchase Requests',
//   'create-request': 'Create Request',
//   'my-requests': 'My Requests',
//   'approvals': 'Approvals',
//   'approval-history': 'My Approval History',
//   'materials': 'Materials',
//   'projects': 'Projects',
//   'procurement': 'Procurement Queue',
//   'upload-center': 'Upload Center',
//   'category-flow': 'Category Flow',
//   'oracle-monitor': 'Oracle Monitor',
//   'item-categories': 'Item Categories',
//   'workflows': 'Workflow',
//   'users': 'Users',
//   'organization': 'Organization',
//   'audit-logs': 'Audit Log',
// };

// export default function MenuPermissions() {
//   const navigate = useNavigate();
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [menuKeys, setMenuKeys] = useState<string[]>([]);
//   const [grantedSet, setGrantedSet] = useState<Set<string>>(new Set());
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [savingKey, setSavingKey] = useState<string | null>(null);

//   const key = (roleId: string, menuKey: string) => `${roleId}::${menuKey}`;

//   const loadMatrix = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await api.get('/menu-permissions/matrix');
//       const data: MatrixResponse = res.data?.data ?? res.data;
//       setRoles(data.roles);
//       setMenuKeys(data.menuKeys);
//       setGrantedSet(new Set(data.permissions.map(p => key(p.roleId, p.menuKey))));
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load menu permissions.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadMatrix(); }, [loadMatrix]);

//   async function toggle(roleId: string, menuKey: string) {
//     const k = key(roleId, menuKey);
//     setSavingKey(k);
//     setError(null);

//     // Optimistic update
//     setGrantedSet(prev => {
//       const next = new Set(prev);
//       if (next.has(k)) next.delete(k); else next.add(k);
//       return next;
//     });

//     try {
//       await api.post('/menu-permissions/toggle', { roleId, menuKey });
//     } catch (e: any) {
//       // Revert on failure
//       setGrantedSet(prev => {
//         const next = new Set(prev);
//         if (next.has(k)) next.delete(k); else next.add(k);
//         return next;
//       });
//       setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update permission.');
//     } finally {
//       setSavingKey(null);
//     }
//   }

//   if (loading) return (
//     <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
//       <RefreshCw size={20} className="animate-spin" />
//       <span>Loading menu permissions…</span>
//     </div>
//   );

//   return (
//     <div className="space-y-6 pb-10 min-w-0">
//       <div className="flex items-start justify-between border-b pb-4">
//         <div className="flex items-start gap-3">
//           <button
//             onClick={() => navigate(-1)}
//             className="mt-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition"
//           >
//             <ArrowLeft size={14} /> Back
//           </button>
//           <div>
//             <h1 className="text-2xl font-semibold text-gray-900">Menu Permissions</h1>
//             <p className="text-sm text-gray-500 mt-0.5">
//               Control which sidebar menus each role can see. Changes apply immediately —
//               no code changes or redeploy needed.
//             </p>
//           </div>
//         </div>
//         <button onClick={loadMatrix}
//           className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
//           <RefreshCw size={14} /> Refresh
//         </button>
//       </div>

//       {error && (
//         <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
//           <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
//         </div>
//       )}

//       {/* ── Scrollable matrix container ───────────────────────────────
//           max-h + overflow-y-auto here (instead of letting the whole page
//           scroll) is what makes `sticky top-0` on the header row actually
//           work reliably, and keeps very tall role lists from pushing the
//           page header out of view too. */}
//       <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-auto max-h-[75vh]">
//         <table className="text-sm border-collapse">
//           <thead className="sticky top-0 z-20">
//             <tr>
//               <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-r whitespace-nowrap">
//                 Role
//               </th>
//               {menuKeys.map(mk => (
//                 <th key={mk} className="sticky top-0 z-20 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-b whitespace-nowrap">
//                   {MENU_LABELS[mk] ?? mk}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {roles.map(role => (
//               <tr key={role.id} className="hover:bg-gray-50 transition">
//                 <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-800 border-r whitespace-nowrap">
//                   {role.name}
//                 </td>
//                 {menuKeys.map(mk => {
//                   const k = key(role.id, mk);
//                   const granted = grantedSet.has(k);
//                   const isSaving = savingKey === k;
//                   return (
//                     <td key={mk} className="px-3 py-3 text-center border-b border-gray-50">
//                       <button
//                         onClick={() => toggle(role.id, mk)}
//                         disabled={isSaving}
//                         title={`${granted ? 'Remove' : 'Grant'} ${MENU_LABELS[mk] ?? mk} for ${role.name}`}
//                         className="inline-flex items-center justify-center w-6 h-6 rounded-md transition disabled:opacity-50"
//                       >
//                         {isSaving ? (
//                           <RefreshCw size={14} className="animate-spin text-gray-400" />
//                         ) : granted ? (
//                           <CheckCircle2 size={18} className="text-emerald-600" />
//                         ) : (
//                           <span className="w-4 h-4 rounded border border-gray-300" />
//                         )}
//                       </button>
//                     </td>
//                   );
//                 })}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
