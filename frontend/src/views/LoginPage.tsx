import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/layout/AuthCard";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";
import { useAuth } from "../context/AuthContext";

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
}

function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    // axios error
    const axiosErr = err as AxiosErrorLike;
    return axiosErr?.response?.data?.message || "Đăng nhập thất bại.";
  }
  return "Đăng nhập thất bại.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.status === "AUTHENTICATED") {
        const role = res.user?.role;
        console.log("Login success, role:", role);
        if (role === "SYSTEM_ADMIN") {
          navigate("/system/overview");
        } else if (role === "SCHOOL_ADMIN") {
          navigate("/school-admin/dashboard");
        } else if (role === "TEACHER") {
          navigate("/teacher/dashboard");
        } else {
          // For other roles (STUDENT, GUARDIAN, etc.)
          navigate("/login");
        }
        return;
      }


      if (res.status === "OTP_REQUIRED") {
        navigate("/verify");
        return;
      }
      setError(res.message || "Không xác định.");
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle(idToken);
      if (res.status === "AUTHENTICATED") {
        const role = res.user?.role;
        if (role === "SYSTEM_ADMIN") {
          navigate("/system/overview");
        } else if (role === "SCHOOL_ADMIN") {
          navigate("/school-admin/dashboard");
        } else if (role === "TEACHER") {
          navigate("/teacher/dashboard");
        } else {
          navigate("/login");
        }
        return;
      }
      if (res.status === "OTP_REQUIRED") {
        navigate("/verify");
        return;
      }
      setError(res.message || "Không xác định.");
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Đăng nhập" subtitle="Sử dụng email được cấp bởi trường" showBrand>

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="email-input" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MailIcon /> Email
          </label>
          <input
            id="email-input"
            type="email"
            className="w-full rounded-xl bg-slate-100/80 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@school.edu.vn"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password-input" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <LockIcon /> Mật khẩu
          </label>
          <input
            id="password-input"
            type="password"
            className="w-full rounded-xl bg-slate-100/80 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-slate-600 hover:text-slate-900">
            Quên mật khẩu?
          </Link>
        </div>
      </form>

      {/* Google login */}
      <div className="mt-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">hoặc</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className={"mt-4 " + (loading ? "pointer-events-none opacity-60" : "")}>
          <GoogleLoginButton
            onIdToken={onGoogle}
            onError={(msg) => setError(msg)}
          />
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Nếu bạn đăng nhập Google bằng email không tồn tại trong hệ thống, bạn sẽ bị chặn.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <InfoIcon />
          <div>
            <div className="font-semibold">Hướng dẫn đăng nhập lần đầu:</div>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-blue-700/90">
              <li>Sử dụng email của bạn</li>
              <li>Nhập mật khẩu mặc định (được gửi qua email)</li>
              <li>Nhận mã xác minh 6 số gửi về email của bạn</li>
              <li>Tạo mật khẩu mới để bảo mật tài khoản</li>
            </ol>
          </div>
        </div>
      </div>
    </AuthCard>
  );


}


function MailIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
      <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10h12v10H6z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
