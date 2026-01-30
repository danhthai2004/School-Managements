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

import SchoolAdminLayout from "../views/school-admin/SchoolAdminLayout";
import DashboardOverview from "../views/school-admin/pages/DashboardOverview";
import ClassManagement from "../views/school-admin/pages/ClassManagement";
import ClassDetailView from "../views/school-admin/pages/ClassDetailView";
import StudentManagement from "../views/school-admin/pages/StudentManagement";
import AccountManagement from "../views/school-admin/pages/AccountManagement";
import TeacherManagement from "../views/school-admin/pages/TeacherManagement";
import SubjectManagement from "../views/school-admin/pages/SubjectManagement";
import CombinationManagement from "../views/school-admin/pages/CombinationManagement";
import TeacherAssignment from "../views/school-admin/pages/TeacherAssignment";
import TimetableManagement from "../views/school-admin/pages/TimetableManagement";
import TimetableDetailView from "../views/school-admin/pages/TimetableDetailView";



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

      <Route path="/school-admin" element={
        <ProtectedRoute>
          <SchoolAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardOverview />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="classes/:id" element={<ClassDetailView />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="teachers" element={<TeacherManagement />} />
        <Route path="accounts" element={<AccountManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="combinations" element={<CombinationManagement />} />
        <Route path="assignments" element={<TeacherAssignment />} />
        <Route path="schedule" element={<TimetableManagement />} />
        <Route path="schedule/:id" element={<TimetableDetailView />} />

      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
