import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../views/LoginPage";
import VerifyPage from "../views/VerifyPage";
import NewPasswordPage from "../views/NewPasswordPage";
import ForgotPasswordPage from "../views/ForgotPasswordPage";
import DashboardPage from "../views/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";
import SchoolAdminsPage from "../views/SchoolAdminsPage";
import SchoolAdminDashboard from "../views/school-admin/SchoolAdminDashboard";


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

      <Route
        path="/school-admin"
        element={<Navigate to="/school-admin/dashboard" replace />}
      />

      <Route
        path="/school-admin/dashboard"
        element={
          <ProtectedRoute>
            <SchoolAdminDashboard />
          </ProtectedRoute>
        }
      />


      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
