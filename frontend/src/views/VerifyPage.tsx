import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/layout/AuthCard";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { ArrowLeft as ArrowLeftIcon, AlertTriangle as WarnIcon } from "lucide-react";


function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const anyErr = err as any;
    return anyErr?.response?.data?.message || "Xác minh thất bại.";
  }
  return "Xác minh thất bại.";
}

export default function VerifyPage() {
  const navigate = useNavigate();
  const { getPendingChallenge, setResetToken } = useAuth();
  const pending = getPendingChallenge();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!pending?.challengeId) {
    return (
      <AuthCard title="Verify" subtitle="Không tìm thấy yêu cầu xác minh.">
        <Link className="underline text-white" to="/login">Quay lại đăng nhập</Link>
      </AuthCard>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authService.verifyOtp(pending.challengeId, code.trim());
      setResetToken(res.resetToken);
      navigate("/new-password");
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setResending(true);
    try {
      await authService.resendCode(pending.challengeId);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard
      title="Xác minh tài khoản"
      subtitle="Mã xác minh 6 chữ số đã được gửi đến email:"
      showBrand
      topSlot={
        <div className="flex justify-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeftIcon /> Quay lại
          </Link>
        </div>
      }
    >
      <div className="mb-3">
        <div className="text-sm font-medium text-blue-600 underline underline-offset-4">
          {pending?.emailMasked || "....@...."}
        </div>
        <div className="mt-1 text-xs text-amber-600">
          Vui lòng kiểm tra hộp thư đến hoặc spam
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Mã xác minh</label>
          <input
            className="w-full rounded-xl bg-slate-100/80 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập 6 chữ số"
            inputMode="numeric"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? "Đang xác nhận..." : "Xác nhận"}
        </button>

        <button
          type="button"
          disabled={resending}
          onClick={resend}
          className="w-full text-sm text-slate-600 hover:text-slate-900 disabled:opacity-60"
        >
          Gửi lại mã xác minh
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <WarnIcon />
            <span>Mã xác minh có hiệu lực trong 5 phút. Nếu không nhận được email, vui lòng kiểm tra hộp thư spam.</span>
          </div>
        </div>
      </form>
    </AuthCard>
  );

}
