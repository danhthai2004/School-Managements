import { useEffect, useState } from "react";
import { systemService, type SchoolDto, type UserListDto } from "../../services/systemService";

export default function SystemOverviewPage() {
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [schoolsData, usersData] = await Promise.all([
          systemService.listSchools(),
          systemService.listUsers(),
        ]);
        setSchools(schoolsData);
        setUsers(usersData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const studentCount = users.filter((u) => u.role === "STUDENT").length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, Admin! 👋
        </h1>
        <p className="text-slate-500 mt-1">Quản lý hệ thống trường học toàn diện</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Tổng số trường"
          value={schools.length}
          icon={<SchoolIcon />}
          color="blue"
        />
        <StatCard
          title="Tổng số tài khoản"
          value={users.length}
          icon={<UsersIcon />}
          color="emerald"
        />
        <StatCard
          title="Số học sinh"
          value={studentCount}
          icon={<StudentIcon />}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Thao tác nhanh</h2>
        <p className="text-slate-500 text-sm mb-4">Các chức năng thường dùng</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="Tải lên Excel"
            description="Import danh sách học sinh/giáo viên"
            icon={<UploadIcon />}
            href="/system/users"
          />
          <QuickAction
            title="Quản lý tài khoản"
            description="Xem, chỉnh sửa tài khoản người dùng"
            icon={<UsersIcon />}
            href="/system/users"
          />
          <QuickAction
            title="Báo cáo hoạt động"
            description="Xem lịch sử thao tác"
            icon={<ActivityIcon />}
            href="/system/activity-logs"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} grid place-items-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, icon, href }: { title: string; description: string; icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="block p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 grid place-items-center text-slate-600 mb-3">
          {icon}
        </div>
        <h3 className="font-medium text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
    </a>
  );
}

// Icons
function SchoolIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M10 10h4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
