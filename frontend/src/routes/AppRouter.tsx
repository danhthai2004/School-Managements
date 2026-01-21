import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../views/LoginPage";
import VerifyPage from "../views/VerifyPage";
import NewPasswordPage from "../views/NewPasswordPage";
import ForgotPasswordPage from "../views/ForgotPasswordPage";
import DashboardPage from "../views/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";
import SchoolAdminsPage from "../views/SchoolAdminsPage";
import SchoolAdminLayout from "../views/school-admin/SchoolAdminLayout";
import DashboardOverview from "../views/school-admin/pages/DashboardOverview";
import ClassManagement from "../views/school-admin/pages/ClassManagement";
import StudentManagement from "../views/school-admin/pages/StudentManagement";


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

      <Route
        path="/school-admins"
        element={
          <ProtectedRoute>
            <SchoolAdminsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/school-admin" element={
        <ProtectedRoute>
          <SchoolAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardOverview />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="students" element={<StudentManagement />} />
      </Route>


      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
