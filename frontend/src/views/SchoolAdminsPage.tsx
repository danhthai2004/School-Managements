import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { systemService, type SchoolDto } from "../services/systemService";


function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const anyErr = err as any;
    return anyErr?.response?.data?.message || "Thao tác thất bại.";
  }
  return "Thao tác thất bại.";
}

export default function SchoolAdminsPage() {
  const { user, logout } = useAuth();

  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create school
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");

  // Create school admin
  const [schoolId, setSchoolId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");

  const isSystemAdmin = useMemo(() => user?.role === "SYSTEM_ADMIN", [user?.role]);

  const refreshSchools = async () => {
    const data = await systemService.listSchools();
    setSchools(data);
    if (!schoolId && data.length > 0) {
      setSchoolId(data[0].id);
    }
  };

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        if (!isSystemAdmin) return;
        await refreshSchools();
      } catch (e) {
        setError(extractMessage(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSystemAdmin]);

  if (!isSystemAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-2xl font-semibold">Không có quyền truy cập</h1>
            <p className="text-white/70 mt-2">
              Trang này chỉ dành cho <span className="font-medium text-white">SYSTEM_ADMIN</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/dashboard" className="rounded-xl bg-white text-slate-900 px-4 py-2 font-medium">
                Về Dashboard
              </Link>
              <button onClick={logout} className="rounded-xl bg-white/10 border border-white/10 px-4 py-2">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const created = await systemService.createSchool({
        name: schoolName.trim(),
        code: schoolCode.trim(),
      });
      setSchoolName("");
      setSchoolCode("");
      await refreshSchools();
      setSchoolId(created.id);
      setSuccess("Đã tạo school thành công.");
    } catch (e2) {
      setError(extractMessage(e2));
    }
  };

  const createSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await systemService.createSchoolAdmin({
        email: adminEmail.trim(),
        fullName: adminName.trim(),
        role: "SCHOOL_ADMIN",
        schoolId,
      });
      setAdminEmail("");
      setAdminName("");
      setSuccess(
        "Đã tạo SCHOOL_ADMIN. Temp password đã gửi qua email. Đăng nhập lần đầu sẽ yêu cầu OTP và đổi mật khẩu."
      );
    } catch (e2) {
      setError(extractMessage(e2));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">System Admin</h1>
            <p className="text-white/70">Hello {user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard" className="rounded-xl bg-white/10 border border-white/10 px-4 py-2">
              Dashboard
            </Link>
            <button onClick={logout} className="rounded-xl bg-white text-slate-900 px-4 py-2 font-medium">
              Logout
            </button>
          </div>
        </div>

        {loading ? <div className="mt-6">Loading...</div> : null}
        {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Tạo School</h2>
            <p className="text-white/70 text-sm mt-1">System admin tạo trường trước, sau đó tạo school admin cho trường.</p>

            <form onSubmit={createSchool} className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-white/80">School name</label>
                <input
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="FPT School"
                />
              </div>
              <div>
                <label className="text-sm text-white/80">School code</label>
                <input
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="FPT-HCM"
                />
              </div>
              <button className="w-full rounded-xl bg-white text-slate-900 py-2 font-medium">
                Create School
              </button>
            </form>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-white">Schools</h3>
              <div className="mt-2 space-y-2">
                {schools.length === 0 ? (
                  <div className="text-white/60 text-sm">Chưa có school nào.</div>
                ) : (
                  schools.map((s) => (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-white/60">{s.code}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Tạo School Admin</h2>
            <p className="text-white/70 text-sm mt-1">Tạo tài khoản SCHOOL_ADMIN, gửi temp password qua email.</p>

            <form onSubmit={createSchoolAdmin} className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-white/80">School</label>
                <select
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-950">
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-white/80">Email</label>
                <input
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="schooladmin@example.com"
                />
              </div>

              <div>
                <label className="text-sm text-white/80">Full name</label>
                <input
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nguyen Van A"
                />
              </div>

              <button className="w-full rounded-xl bg-white text-slate-900 py-2 font-medium" disabled={schools.length === 0}>
                Create School Admin
              </button>

              {schools.length === 0 ? (
                <div className="text-xs text-white/50">Bạn cần tạo ít nhất 1 school trước.</div>
              ) : null}
            </form>

            <div className="mt-4 text-xs text-white/50">
              Tip: nếu chưa cấu hình SMTP, backend sẽ log temp password/OTP trong logs để bạn test.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
