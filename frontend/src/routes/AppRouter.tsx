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

// Shared pages
const DashboardPage = lazy(() => import("../views/DashboardPage"));
const ProfileSettingsPage = lazy(() => import("../views/shared/settings/ProfileSettingsPage"));

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
const ClassDetailView = lazy(() => import("../views/school-admin/pages/ClassDetailView"));
const StudentManagement = lazy(() => import("../views/school-admin/pages/StudentManagement"));
const StudentProfilePage = lazy(() => import("../views/school-admin/pages/StudentProfilePage"));
const AccountManagement = lazy(() => import("../views/school-admin/pages/AccountManagement"));
const TeacherManagement = lazy(() => import("../views/school-admin/pages/TeacherManagement"));
const SubjectManagement = lazy(() => import("../views/school-admin/pages/SubjectManagement"));
const CombinationManagement = lazy(() => import("../views/school-admin/pages/CombinationManagement"));
const TeacherAssignment = lazy(() => import("../views/school-admin/pages/TeacherAssignment"));
const TimetableManagement = lazy(() => import("../views/school-admin/pages/TimetableManagement"));
const TimetableDetailView = lazy(() => import("../views/school-admin/pages/TimetableDetailView"));
const TimetableAdjustPage = lazy(() => import("../views/school-admin/pages/TimetableAdjustPage"));
const TimetableSettings = lazy(() => import("../views/school-admin/pages/TimetableSettings"));
const AttendanceManagement = lazy(() => import("../views/school-admin/pages/AttendanceManagement"));
const FacePhotoManagement = lazy(() => import("../views/school-admin/pages/FacePhotoManagement"));
const NotificationManagement = lazy(() => import("../views/school-admin/pages/NotificationManagement"));
const RoomManagement = lazy(() => import("../views/school-admin/pages/RoomManagement"));
const ExamSessionManagement = lazy(() => import("../views/school-admin/pages/ExamSessionManagement"));
const ExamSessionDetailPage = lazy(() => import("../views/school-admin/pages/ExamSessionDetailPage"));
const ReportsPage = lazy(() => import("../views/school-admin/pages/ReportsPage"));
const SemesterConfigPage = lazy(() => import("../views/school-admin/pages/SemesterConfigPage"));
const RiskDashboardPage = lazy(() => import("../views/school-admin/pages/RiskDashboardPage"));

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
const TeacherExamSchedulePage = lazy(() => import("../views/teacher/pages/TeacherExamSchedulePage"));
const ClassRiskManagementPage = lazy(() => import("../views/teacher/pages/ClassRiskManagementPage"));

// Guardian pages
const GuardianLayout = lazy(() => import("../components/layout/GuardianLayout"));
const GuardianDashboardPage = lazy(() => import("../views/guardian/GuardianDashboardPage"));
const GuardianNotification = lazy(() => import("../views/guardian/GuardianNotification"));
const GuardianProfile = lazy(() => import("../views/guardian/GuardianProfile"));
const GuardianStudentExamSchedulePage = lazy(() => import("../views/guardian/GuardianStudentExamSchedulePage"));
const StudentAttendance = lazy(() => import("../views/guardian/StudentAttendance"));
const StudentScore = lazy(() => import("../views/guardian/StudentScore"));
const StudentTimetable = lazy(() => import("../views/guardian/GuardianTimetablePage"));

// Student pages
const StudentLayout = lazy(() => import("../components/layout/StudentLayout"));
const StudentOverviewPage = lazy(() => import("../views/Student/StudentOverviewPage"));
const StudentTimetablePage = lazy(() => import("../views/Student/StudentTimetablePage"));
const StudentExamSchedulePage = lazy(() => import("../views/Student/StudentExamSchedulePage"));
const StudentScoresPage = lazy(() => import("../views/Student/StudentScoresPage"));
const StudentAttendancePage = lazy(() => import("../views/Student/StudentAttendancePage"));
const StudentAnalysisPage = lazy(() => import("../views/Student/StudentAnalysisPage"));
const MyRiskAnalyticsPage = lazy(() => import("../views/Student/MyRiskAnalyticsPage"));

export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />

        {/* Auth Dashboard Redirect */}
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
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<SystemOverviewPage />} />
          <Route path="users" element={<SystemUsersPage />} />
          <Route path="users/pending" element={<PendingDeletePage />} />
          <Route path="schools" element={<SchoolsListPage />} />
          <Route path="schools/pending" element={<PendingDeleteSchoolsPage />} />
          <Route path="schools/:id" element={<SchoolDetailsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
        </Route>

        {/* School Admin Routes */}
        <Route
          path="/school-admin"
          element={
            <ProtectedRoute requiredRole="SCHOOL_ADMIN">
              <SchoolAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="classes/:id" element={<ClassDetailView />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="students/:id" element={<StudentProfilePage />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="subjects" element={<SubjectManagement />} />
          <Route path="combinations" element={<CombinationManagement />} />
          <Route path="assignments" element={<TeacherAssignment />} />
          <Route path="schedule" element={<TimetableManagement />} />
          <Route path="schedule/:id" element={<TimetableDetailView />} />
          <Route path="schedule/:id/adjust" element={<TimetableAdjustPage />} />
          <Route path="timetable-settings" element={<TimetableSettings />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="face-photos" element={<FacePhotoManagement />} />
          <Route path="notifications" element={<NotificationManagement />} />
          <Route path="rooms" element={<RoomManagement />} />
          <Route path="exam-sessions" element={<ExamSessionManagement />} />
          <Route path="exam-sessions/:id" element={<ExamSessionDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="semesters" element={<SemesterConfigPage />} />
          <Route path="risk-analytics" element={<RiskDashboardPage />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
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
          <Route path="students/:id" element={<StudentProfilePage />} />
          <Route path="schedule" element={<TeacherSchedulePage />} />
          <Route path="attendance" element={<TeacherAttendancePage />} />
          <Route path="grades" element={<TeacherGradesPage />} />
          <Route path="class-map" element={<TeacherClassMapPage />} />
          <Route path="reports" element={<TeacherReportsPage />} />
          <Route path="notifications" element={<TeacherNotificationsPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
          <Route path="exam-schedule" element={<TeacherExamSchedulePage />} />
          <Route path="risk-analytics" element={<ClassRiskManagementPage />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
        </Route>

        {/* Guardian Routes */}
        <Route
          path="/guardian"
          element={
            <ProtectedRoute requiredRole="GUARDIAN">
              <GuardianLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<GuardianDashboardPage />} />
          <Route path="grading" element={<StudentScore />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="notification" element={<GuardianNotification />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="examschedule" element={<GuardianStudentExamSchedulePage />} />
          <Route path="profile" element={<GuardianProfile />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<StudentOverviewPage />} />
          <Route path="timetable" element={<StudentTimetablePage />} />
          <Route path="exam-schedule" element={<StudentExamSchedulePage />} />
          <Route path="scores" element={<StudentScoresPage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="analysis" element={<StudentAnalysisPage />} />
          <Route path="risk-analytics" element={<MyRiskAnalyticsPage />} />
          <Route path="profile" element={<ProfileSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
