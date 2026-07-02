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

function ProtectedLayout() {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/materials"        element={<ListPage type="materials" />} />
          <Route path="/materials/create" element={<MaterialCreate />} />
          <Route path="/projects"         element={<ListPage type="projects" />} />
          <Route path="/projects/create"  element={<ProjectCreate />} />
          <Route path="/purchase-requests" element={<ListPage type="requests" />} />
          <Route path="/create-request"   element={<CreateRequest />} />
          <Route path="/my-requests"      element={<MyRequests />} />
          <Route path="/approvals"        element={<ApproverInbox />} />
          <Route path="/procurement" element={<ProcurementQueue />} />
          <Route path="/workflows"        element={<WorkflowList />} />
          <Route path="/workflows/create" element={<WorkflowBuilder />} />
          <Route path="/workflows/:id/edit" element={<WorkflowBuilder />} />
          <Route path="/organization"     element={<ListPage type="organization" />} />
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