import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Hello {user?.email}</h1>
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
