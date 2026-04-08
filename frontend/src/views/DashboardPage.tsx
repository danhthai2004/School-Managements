import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect SCHOOL_ADMIN to their dedicated dashboard
  useEffect(() => {
    if (user?.role === "SCHOOL_ADMIN") {
      navigate("/school-admin/dashboard", { replace: true });
    } else if (user?.role === "SYSTEM_ADMIN") {
      navigate("/system/overview", { replace: true });
    } else if (user?.role === "GUARDIAN") {
      navigate("/guardian/overview", {replace: true})
    } else if (user?.role === "STUDENT"){
      navigate("/student/overview",{ replace: true});
    } else if (user?.role === "TEACHER") {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [user?.role, navigate]);

  // If SCHOOL_ADMIN, show loading while redirecting
  if (user?.role === "SCHOOL_ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Hello {user?.email}</h1>
          <p className="text-white/70 mt-2">
            Role: <span className="font-medium text-white">{user?.role}</span>
            {user?.schoolCode ? (
              <>
                {" "}
                • School: <span className="font-medium text-white">{user.schoolCode}</span>
              </>
            ) : null}
          </p>

          <button
            onClick={logout}
            className="mt-6 rounded-xl bg-white text-slate-900 px-4 py-2 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
