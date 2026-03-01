import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check role if required - redirect to appropriate dashboard
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to the user's own dashboard based on their actual role
    const redirectPath = getRoleDefaultPath(user.role);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
}

// Helper function to get default path for each role
function getRoleDefaultPath(role: string): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "/system/overview";
    case "SCHOOL_ADMIN":
      return "/school-admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    default:
      return "/login";
  }
}
