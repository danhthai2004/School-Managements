import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../views/LoginPage";
import VerifyPage from "../views/VerifyPage";
import NewPasswordPage from "../views/NewPasswordPage";
import ForgotPasswordPage from "../views/ForgotPasswordPage";
import DashboardPage from "../views/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";

// System Admin
import SystemLayout from "../components/layout/SystemLayout";
import SystemOverviewPage from "../views/system/SystemOverviewPage";
import SystemUsersPage from "../views/system/SystemUsersPage";
import PendingDeletePage from "../views/system/PendingDeletePage";
import SchoolsListPage from "../views/system/SchoolsListPage";
import SchoolDetailsPage from "../views/system/SchoolDetailsPage";
import NotificationsPage from "../views/system/NotificationsPage";
import ActivityLogsPage from "../views/system/ActivityLogsPage";


export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/new-password" element={<NewPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* System Admin Routes */}
      <Route
        path="/system"
        element={
          <ProtectedRoute requiredRole="SYSTEM_ADMIN">
            <SystemLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/system/overview" replace />} />
        <Route path="overview" element={<SystemOverviewPage />} />
        <Route path="users" element={<SystemUsersPage />} />
        <Route path="users/pending" element={<PendingDeletePage />} />
        <Route path="schools" element={<SchoolsListPage />} />
        <Route path="schools/:id" element={<SchoolDetailsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
