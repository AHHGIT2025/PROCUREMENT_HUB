// src/pages/settings/MenuPermissions.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface MatrixResponse {
  roles: Role[];
  menuKeys: string[];
  permissions: { roleId: string; menuKey: string }[];
}

const MENU_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'purchase-requests': 'Purchase Requests',
  'create-request': 'Create Request',
  'my-requests': 'My Requests',
  'approvals': 'Approvals',
  'approval-history': 'My Approval History',
  'materials': 'Materials',
  'projects': 'Projects',
  'procurement': 'Procurement Queue',
  'upload-center': 'Upload Center',
  'category-flow': 'Category Flow',
  'oracle-monitor': 'Oracle Monitor',
  'item-categories': 'Item Categories',
  'workflows': 'Workflow',
  'users': 'Users',
  'organization': 'Organization',
  'audit-logs': 'Audit Log',
};

export default function MenuPermissions() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuKeys, setMenuKeys] = useState<string[]>([]);
  const [grantedSet, setGrantedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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
        <button onClick={loadMatrix}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border rounded-xl px-3 py-2 hover:bg-gray-50 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

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
                <th key={mk} className="sticky top-0 z-20 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-b whitespace-nowrap">
                  {MENU_LABELS[mk] ?? mk}
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
                  const k = key(role.id, mk);
                  const granted = grantedSet.has(k);
                  const isSaving = savingKey === k;
                  return (
                    <td key={mk} className="px-3 py-3 text-center border-b border-gray-50">
                      <button
                        onClick={() => toggle(role.id, mk)}
                        disabled={isSaving}
                        title={`${granted ? 'Remove' : 'Grant'} ${MENU_LABELS[mk] ?? mk} for ${role.name}`}
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
