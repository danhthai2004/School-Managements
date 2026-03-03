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
import StudentProfilePage from "../views/school-admin/pages/StudentProfilePage";
import AccountManagement from "../views/school-admin/pages/AccountManagement";
import TeacherManagement from "../views/school-admin/pages/TeacherManagement";
import SubjectManagement from "../views/school-admin/pages/SubjectManagement";
import CombinationManagement from "../views/school-admin/pages/CombinationManagement";
import TeacherAssignment from "../views/school-admin/pages/TeacherAssignment";
import TimetableManagement from "../views/school-admin/pages/TimetableManagement";
import TimetableDetailView from "../views/school-admin/pages/TimetableDetailView";
import NotificationManagement from "../views/school-admin/pages/NotificationManagement";
import RoomManagement from "../views/school-admin/pages/RoomManagement";
import ExamSessionManagement from "../views/school-admin/pages/ExamSessionManagement";
import ExamSessionDetailPage from "../views/school-admin/pages/ExamSessionDetailPage";
import ReportsPage from "../views/school-admin/pages/ReportsPage";
import GuardianLayout from "../components/layout/GuardianLayout";
import GuardianNotification from "../views/guardian/GuardianNotification";
import StudentAttendance from "../views/guardian/StudentAttendance";
import StudentScore from "../views/guardian/StudentScore";
import StudentTimetable from "../views/guardian/StudentTimetable";
import GuardianDashboardPage from "../views/guardian/GuardianDashboardPage";

// Student
import StudentLayout from "../components/layout/StudentLayout";
import StudentOverviewPage from "../views/Student/StudentOverviewPage";
import StudentTimetablePage from "../views/Student/StudentTimetablePage";
import StudentExamSchedulePage from "../views/Student/StudentExamSchedulePage.tsx";
import StudentScoresPage from "../views/Student/StudentScoresPage";
import StudentAttendancePage from "../views/Student/StudentAttendancePage";
import StudentAnalysisPage from "../views/Student/StudentAnalysisPage";
import GuardianStudentExamSchedulePage from "../views/guardian/GuardianStudentExamSchedulePage.tsx";
import GuardianProfile from "../views/guardian/GuardianProfile.tsx";


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
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="teachers" element={<TeacherManagement />} />
        <Route path="accounts" element={<AccountManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="combinations" element={<CombinationManagement />} />
        <Route path="assignments" element={<TeacherAssignment />} />
        <Route path="schedule" element={<TimetableManagement />} />
        <Route path="schedule/:id" element={<TimetableDetailView />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="rooms" element={<RoomManagement />} />
        <Route path="exam-sessions" element={<ExamSessionManagement />} />
        <Route path="exam-sessions/:id" element={<ExamSessionDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route path="/guardian" element={
        <ProtectedRoute>
          <GuardianLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="" replace />} />
        <Route path="overview" element={<GuardianDashboardPage />} />
        <Route path="grading" element={<StudentScore />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="notification" element={<GuardianNotification />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="examschedule" element={<GuardianStudentExamSchedulePage />} />
        <Route path="profile" element={<GuardianProfile />} />
      </Route>

      <Route path="/student" element={
        <ProtectedRoute requiredRole="STUDENT">
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<StudentOverviewPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="exam-schedule" element={<StudentExamSchedulePage />} />
        <Route path="scores" element={<StudentScoresPage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="analysis" element={<StudentAnalysisPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
