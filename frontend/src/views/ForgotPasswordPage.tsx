import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/layout/AuthCard";
import { useAuth } from "../context/AuthContext";
import { Mail as MailIcon, Info as InfoIcon } from "lucide-react";


function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const anyErr = err as any;
    return anyErr?.response?.data?.message || "Thao tác thất bại.";
  }
  return "Thao tác thất bại.";
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
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
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu"
      showBrand={false}
      topSlot={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeftIcon /> Quay lại
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MailIcon /> Email
          </label>
          <input
            className="w-full rounded-xl bg-slate-100/80 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu.vn"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Đang gửi..." : "Gửi hướng dẫn"}
        </button>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <InfoIcon />
            <span>Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút.</span>
          </div>
        </div>
      </form>
    </AuthCard>
  );
}


function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
