import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathFor, useAuth } from '@m1/context/AuthContext';
import ForbiddenPage from '@m1/pages/ForbiddenPage';
import LoginPage from '@m1/pages/LoginPage';
import ProfilePage from '@m1/pages/ProfilePage';
import RegisterPage from '@m1/pages/RegisterPage';
import ProtectedRoute from '@m1/routing/ProtectedRoute';
import RoleGuard from '@m1/routing/RoleGuard';
import AppLayout from '@m4/layout/AppLayout';
import AdminSettingsPage from '@m4/pages/AdminSettingsPage';
import AlertsPage from '@m4/pages/AlertsPage';
import DashboardHome from '@m4/pages/DashboardHome';
import ForecastDashboard from '@m4/pages/ForecastDashboard';
import HeatmapPage from '@m4/pages/HeatmapPage';
import ReportsPage from '@m4/pages/ReportsPage';
import SupplierPerformancePage from '@m4/pages/SupplierPerformancePage';
import BranchesPage from './pages/BranchesPage';
import DrugsPage from './pages/DrugsPage';
import NotFoundPage from './pages/NotFoundPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import SalesPage from './pages/SalesPage';
import StockPage from './pages/StockPage';
import SupplierPortalPage from './pages/SupplierPortalPage';
import SuppliersPage from './pages/SuppliersPage';

const ADMIN = ['admin'];
const STAFF = ['admin', 'pharmacist'];
const SUPPLIER = ['supplier'];

function Home() {
  const { role } = useAuth();
  return <Navigate to={homePathFor(role)} replace />;
}

const guarded = (roles, el) => <RoleGuard roles={roles}>{el}</RoleGuard>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        {/* Module 4 (sample data) */}
        <Route path="/dashboard" element={guarded(STAFF, <DashboardHome />)} />
        <Route path="/forecast" element={guarded(STAFF, <ForecastDashboard />)} />
        <Route path="/heatmap" element={guarded(STAFF, <HeatmapPage />)} />
        <Route path="/alerts" element={guarded(STAFF, <AlertsPage />)} />
        <Route path="/reports" element={guarded(STAFF, <ReportsPage />)} />
        <Route path="/supplier-performance" element={guarded(ADMIN, <SupplierPerformancePage />)} />
        <Route path="/admin/settings" element={guarded(ADMIN, <AdminSettingsPage />)} />
        {/* Module 2 (live) */}
        <Route path="/drugs" element={guarded(STAFF, <DrugsPage />)} />
        <Route path="/stock" element={guarded(STAFF, <StockPage />)} />
        <Route path="/sales" element={guarded(STAFF, <SalesPage />)} />
        <Route path="/purchase-orders" element={guarded(STAFF, <PurchaseOrdersPage />)} />
        <Route path="/suppliers" element={guarded(ADMIN, <SuppliersPage />)} />
        <Route path="/branches" element={guarded(ADMIN, <BranchesPage />)} />
        <Route path="/supplier-portal" element={guarded(SUPPLIER, <SupplierPortalPage />)} />
        {/* Module 1 (live) */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
