import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";

// ==================== LAZY LOADED PAGES ====================
// Auth pages
const LoginPage = lazy(() => import("../views/LoginPage"));
const VerifyPage = lazy(() => import("../views/VerifyPage"));
const NewPasswordPage = lazy(() => import("../views/NewPasswordPage"));
const ForgotPasswordPage = lazy(() => import("../views/ForgotPasswordPage"));

// System Admin pages
const SystemLayout = lazy(() => import("../components/layout/SystemLayout"));
const SystemOverviewPage = lazy(() => import("../views/system/SystemOverviewPage"));
const SystemUsersPage = lazy(() => import("../views/system/SystemUsersPage"));
const PendingDeletePage = lazy(() => import("../views/system/PendingDeletePage"));
const SchoolsListPage = lazy(() => import("../views/system/SchoolsListPage"));
const SchoolDetailsPage = lazy(() => import("../views/system/SchoolDetailsPage"));
const PendingDeleteSchoolsPage = lazy(() => import("../views/system/PendingDeleteSchoolsPage"));
const NotificationsPage = lazy(() => import("../views/system/NotificationsPage"));
const ActivityLogsPage = lazy(() => import("../views/system/ActivityLogsPage"));

// School Admin pages
const SchoolAdminLayout = lazy(() => import("../views/school-admin/SchoolAdminLayout"));
const DashboardOverview = lazy(() => import("../views/school-admin/pages/DashboardOverview"));
const ClassManagement = lazy(() => import("../views/school-admin/pages/ClassManagement"));
const StudentManagement = lazy(() => import("../views/school-admin/pages/StudentManagement"));
const AccountManagement = lazy(() => import("../views/school-admin/pages/AccountManagement"));
const TeacherManagement = lazy(() => import("../views/school-admin/pages/TeacherManagement"));
const SubjectManagement = lazy(() => import("../views/school-admin/pages/SubjectManagement"));
const CombinationManagement = lazy(() => import("../views/school-admin/pages/CombinationManagement"));
const TeacherAssignment = lazy(() => import("../views/school-admin/pages/TeacherAssignment"));
const TimetableManagement = lazy(() => import("../views/school-admin/pages/TimetableManagement"));
const TimetableDetailView = lazy(() => import("../views/school-admin/pages/TimetableDetailView"));
const TimetableSettings = lazy(() => import("../views/school-admin/pages/TimetableSettings"));

// Teacher pages
const TeacherLayout = lazy(() => import("../views/teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("../views/teacher/pages/TeacherDashboard"));
const TeacherStudentListPage = lazy(() => import("../views/teacher/pages/StudentListPage"));
const TeacherSchedulePage = lazy(() => import("../views/teacher/pages/SchedulePage"));
const TeacherAttendancePage = lazy(() => import("../views/teacher/pages/AttendancePage"));
const TeacherGradesPage = lazy(() => import("../views/teacher/pages/GradesPage"));
const TeacherClassMapPage = lazy(() => import("../views/teacher/pages/ClassMapPage"));
const TeacherReportsPage = lazy(() => import("../views/teacher/pages/ReportsPage"));
const TeacherNotificationsPage = lazy(() => import("../views/teacher/pages/NotificationsPage"));
const TeacherSettingsPage = lazy(() => import("../views/teacher/pages/SettingsPage"));


export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />

        {/* Legacy /dashboard route - redirect to login */}
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />

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
          <Route path="schools/pending" element={<PendingDeleteSchoolsPage />} />
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
          <Route path="students" element={<StudentManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="subjects" element={<SubjectManagement />} />
          <Route path="combinations" element={<CombinationManagement />} />
          <Route path="assignments" element={<TeacherAssignment />} />
          <Route path="schedule" element={<TimetableManagement />} />
          <Route path="schedule/:id" element={<TimetableDetailView />} />
          <Route path="timetable-settings" element={<TimetableSettings />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudentListPage />} />
          <Route path="schedule" element={<TeacherSchedulePage />} />
          <Route path="attendance" element={<TeacherAttendancePage />} />
          <Route path="grades" element={<TeacherGradesPage />} />
          <Route path="class-map" element={<TeacherClassMapPage />} />
          <Route path="reports" element={<TeacherReportsPage />} />
          <Route path="notifications" element={<TeacherNotificationsPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
