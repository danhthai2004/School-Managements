import React from "react";
import { Link } from "react-router-dom";

function Brand() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-blue-600 grid place-items-center shadow-sm">
        {/* book icon */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold tracking-tight text-slate-900">ISS</div>
        <div className="text-sm text-slate-500">Hệ thống quản lý giáo dục</div>
      </div>
    </div>
  );
}

export default function AuthCard({
  title,
  subtitle,
  children,
  topSlot,
  showBrand = true,
  maxWidthClass = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  topSlot?: React.ReactNode;
  showBrand?: boolean;
  maxWidthClass?: string; // "max-w-md" | "max-w-lg" ...
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_-10%,#dbeafe_0%,transparent_60%),radial-gradient(900px_circle_at_10%_20%,#e0f2fe_0%,transparent_55%),linear-gradient(#f8fbff,#eef5ff)]" />
      <div className="relative z-10 min-h-screen px-4 py-10 flex flex-col items-center justify-center">
        {showBrand ? <div className="mb-8"><Brand /></div> : null}

        <div className={`w-full ${maxWidthClass}`}>
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
            <div className="px-8 pt-7 pb-6">
              {topSlot ? <div className="mb-4">{topSlot}</div> : null}


              <h1 className="text-center text-xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>
              ) : null}
            </div>

            <div className="px-8 pb-8">{children}</div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            <div>© 2026 ISS. Hệ thống quản lý thông tin trường học</div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 border border-slate-200">
                {/* tiny icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M4 10h16" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 10v10h12V10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 10V6a3 3 0 0 1 6 0v4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span>Dành cho các trường THPT</span>
            </div>
          </div>
        </div>

        {/* quick back to login link for empty pages if needed */}
        <div className="sr-only">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
