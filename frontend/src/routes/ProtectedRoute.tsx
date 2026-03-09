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

  console.log("[ProtectedRoute] Role check:", { required: requiredRole, actual: user.role, path: window.location.pathname });
  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    console.warn("[ProtectedRoute] Role mismatch! Redirecting to /dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
