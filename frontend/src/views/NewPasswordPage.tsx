import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/layout/AuthCard";
import { useAuth } from "../context/AuthContext";
import { Eye as EyeIcon, Info as InfoIcon } from "lucide-react";


function extractMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const anyErr = err as any;
    return anyErr?.response?.data?.message || "Đổi mật khẩu thất bại.";
  }
  return "Đổi mật khẩu thất bại.";
}

function checkPassword(pw: string) {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export default function NewPasswordPage() {
  const navigate = useNavigate();
  const { getResetToken, finalizePassword } = useAuth();
  const resetToken = getResetToken();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rules = useMemo(() => checkPassword(pw), [pw]);
  const ok = rules.len && rules.upper && rules.lower && rules.digit && rules.special && pw === pw2;

  if (!resetToken) {
    return (
      <AuthCard title="Create new password" subtitle="Bạn cần xác minh OTP trước.">
        <Link className="underline text-white" to="/verify">Đi tới Verify</Link>
      </AuthCard>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ok) {
      setError("Mật khẩu chưa đạt yêu cầu hoặc không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await finalizePassword(pw);
      if (res.status === "AUTHENTICATED") {
        navigate("/dashboard");
      } else {
        setError(res.message || "Không xác định.");
      }
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const Rule = ({ passed, text }: { passed: boolean; text: string }) => (
    <li className={passed ? "text-emerald-300" : "text-white/60"}>{passed ? "✓ " : "• "}{text}</li>
  );

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);


  return (
    <AuthCard
      title="🔐 Tạo mật khẩu mới"
      showBrand={false}
      maxWidthClass="max-w-lg"
      subtitle=""
    >
      <div className="text-sm font-semibold text-blue-600">
        {/** nếu muốn phân biệt 2 trạng thái: set bằng sessionStorage khi vào flow */}
        {sessionStorage.getItem("flow") === "FORGOT" ? "Bạn đã quên mật khẩu." : "Đây là lần đầu tiên bạn đăng nhập."}
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Vui lòng tạo mật khẩu mới để bảo mật tài khoản. Mật khẩu mạnh giúp bảo vệ thông tin của bạn.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={show1 ? "text" : "password"}
              className="w-full rounded-xl bg-slate-100/80 px-4 py-3 pr-11 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Nhập mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => setShow1((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <EyeIcon />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
          <div className="relative">
            <input
              type={show2 ? "text" : "password"}
              className="w-full rounded-xl bg-slate-100/80 px-4 py-3 pr-11 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/30"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => setShow2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <EyeIcon />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold text-slate-500">Yêu cầu mật khẩu:</div>
          <ul className="mt-2 space-y-2">
            <Rule passed={rules.len} text="Ít nhất 8 ký tự" />
            <Rule passed={rules.upper} text="Chứa chữ in hoa (A-Z)" />
            <Rule passed={rules.lower} text="Chứa chữ thường (a-z)" />
            <Rule passed={rules.digit} text="Chứa số (0-9)" />
            <Rule passed={rules.special} text="Chứa ký tự đặc biệt (!@#$%...)" />
          </ul>
        </div>

        <button
          disabled={!ok || loading}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {loading ? "Đang lưu..." : "Tạo mật khẩu và đăng nhập"}
        </button>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <InfoIcon />
            <div>
              <div className="font-semibold">Lưu ý bảo mật:</div>
              <ul className="mt-2 space-y-1 text-blue-700/90">
                <li>Chọn mật khẩu mạnh và dễ nhớ</li>
                <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                <li>Bạn có thể đổi mật khẩu bất kỳ lúc nào trong Cài đặt</li>
                <li>Nếu quên mật khẩu, sử dụng chức năng “Quên mật khẩu”</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </AuthCard>
  );

}
