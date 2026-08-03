import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import WorkflowList    from "./pages/workflows/WorkflowList";
import WorkflowBuilder from "./pages/workflows/WorkflowBuilder";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CompanyCategoryOverview from './pages/settings/CompanyCategoryOverview';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import AppLayout      from './layouts/AppLayout';
import ListPage       from './pages/ListPage';
import CreateRequest  from './pages/PurchaseRequest/CreateRequest';
import MyRequests     from './pages/PurchaseRequest/MyRequests';
import CreateUser     from './pages/users/CreateUser';
import EditUser       from './pages/users/EditUser';
import MaterialCreate from './pages/materials/MaterialCreate';
import ProjectCreate  from './pages/projects/ProjectCreate';
import ApproverInbox  from './pages/approvals/ApproverInbox';
import ProcurementQueue from './pages/procurement/ProcurementQueue';
import OracleMonitor from './pages/settings/OracleMonitor';
import ItemCategoryFlowManager from './pages/settings/ItemCategoryFlowManager';
import RolesManager from './pages/Roles/RolesManager';
import DepartmentsManager from './pages/departments/DepartmentsManager';
import StoreKeeperWindow from './pages/store/Storekeeperwindow';
import MRPrintReport from './pages/reports/MRPrintReport';
import MenuPermissions from './pages/settings/ManuPermissions';
import IndentTransfer from './pages/procurement/IndentTransfer';
import ApprovalHistory from './pages/approvals/ApprovalHistory';
import InternationalPOList from './pages/internationalPO/InternationalPOList';
import InternationalPOCreate from './pages/internationalPO/InternationalPOCreate';
import SuppliersManager from './pages/suppliers/SuppliersManager';
import RfqList from './pages/rfq/RfqList';
import RfqCreate from './pages/rfq/RfqCreate';
import RfqDetail from './pages/rfq/RfqDetail';
import InternationalPODetail from './pages/internationalPO/InternationalPODetail';
import InternationalPOPrint from './pages/internationalPO/InternationalPOPrint';
 
// ...
   
function ProtectedLayout() {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        {/* ✅ MOVED — print route sits OUTSIDE ProtectedLayout so no
            sidebar/header wraps it. MRPrintReport.tsx has its own
            token check internally, so auth is still enforced. */}
          <Route path="/purchase-requests/:id/print" element={<MRPrintReport />} />

        {/* ✅ MOVED — International PO print route also sits OUTSIDE
            ProtectedLayout, same pattern as MRPrintReport, so no
            sidebar/header wraps the printable document. */}
        <Route path="/international-po/:id/print" element={<InternationalPOPrint />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/settings/menu-permissions" element={<MenuPermissions />} />
          <Route path="/materials"        element={<ListPage type="materials" />} />
          <Route path="/materials/create" element={<MaterialCreate />} />
          <Route path="/projects"         element={<ListPage type="projects" />} />
          <Route path="/projects/create"  element={<ProjectCreate />} />
          <Route path="/purchase-requests" element={<ListPage type="requests" />} />
          <Route path="/create-request"   element={<CreateRequest />} />
          <Route path="/my-requests"      element={<MyRequests />} />
          <Route path="/approvals"        element={<ApproverInbox />} />
          <Route path="/approval-history" element={<ApprovalHistory />} />
          <Route path="/procurement" element={<ProcurementQueue />} />
         <Route path="/procurement/indent-transfer" element={<IndentTransfer />} />
         <Route path="/international-po" element={<InternationalPOList />} />
<Route path="/international-po/create" element={<InternationalPOCreate />} />
<Route path="/international-po/:id" element={<InternationalPODetail />} />
 
<Route path="/suppliers" element={<SuppliersManager />} />
<Route path="/rfq" element={<RfqList />} />
<Route path="/rfq/create" element={<RfqCreate />} />
<Route path="/rfq/:id" element={<RfqDetail />} />

// ...
<Route path="/approval-history" element={<ApprovalHistory />} />
          <Route path="/workflows"        element={<WorkflowList />} />
          <Route path="/workflows/create" element={<WorkflowBuilder />} />
          <Route path="/store-verification" element={<StoreKeeperWindow />} />
          <Route path="/workflows/:id/edit" element={<WorkflowBuilder />} />
          <Route path="/organization"     element={<ListPage type="organization" />} />
          <Route path="/settings/roles" element={<RolesManager />} />
          <Route path="/departments" element={<DepartmentsManager />} />
          <Route path="/users"            element={<ListPage type="users" />} />
          <Route path="/users/create"     element={<CreateUser />} />
          <Route path="/users/edit/:id"   element={<EditUser />} />
          <Route path="/upload-center"    element={<ListPage type="uploads" />} />
          <Route path="/oracle-monitor" element={<OracleMonitor />} />
          <Route path="/settings/item-category-flow" element={<ItemCategoryFlowManager />} />
          <Route path="/settings/company-categories" element={<CompanyCategoryOverview />} />
          
          <Route path="/audit-logs"       element={<ListPage type="audit" />} />
          <Route path="/notifications"    element={<ListPage type="notifications" />} />
          <Route path="/settings"         element={<ListPage type="settings" />} />

        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);