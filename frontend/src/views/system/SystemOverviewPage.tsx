import { useEffect, useState } from "react";
import { systemService } from "../../services/systemService";
import {
  SchoolIcon,
  UsersIcon,
  StudentIcon,
  UploadIcon,
  ActivityIcon,
} from "../../components/layout/SystemIcons";

export default function SystemOverviewPage() {
  const [totalSchools, setTotalSchools] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [schoolsPage, usersPage, studentsPage] = await Promise.all([
          systemService.listSchools(0, 1),
          systemService.listUsers({ page: 0, size: 1 }),
          systemService.listUsers({ role: "STUDENT", page: 0, size: 1 }),
        ]);
        setTotalSchools(schoolsPage.totalElements);
        setTotalUsers(usersPage.totalElements);
        setTotalStudents(studentsPage.totalElements);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // const studentCount = users.filter((u) => u.role === "STUDENT").length; // replaced by direct fetch above

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">
          {getGreeting()}, Admin! 👋
        </h2>
        <p className="text-blue-100">Quản lý hệ thống trường học toàn diện</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Tổng số trường"
          value={totalSchools}
          icon={<SchoolIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Tổng số tài khoản"
          value={totalUsers}
          icon={<UsersIcon className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Số học sinh"
          value={totalStudents}
          icon={<StudentIcon className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Thao tác nhanh</h2>
        <p className="text-gray-500 text-sm mb-4">Các chức năng thường dùng</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="Tải lên Excel"
            description="Import danh sách học sinh/giáo viên"
            icon={<UploadIcon className="w-6 h-6" />}
            href="/system/users"
            color="blue"
          />
          <QuickAction
            title="Quản lý tài khoản"
            description="Xem, chỉnh sửa tài khoản người dùng"
            icon={<UsersIcon className="w-6 h-6" />}
            href="/system/users"
            color="gray"
          />
          <QuickAction
            title="Báo cáo hoạt động"
            description="Xem lịch sử thao tác"
            icon={<ActivityIcon className="w-6 h-6" />}
            href="/system/activity-logs"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "blue" | "gray";
}) {
  const bgClass =
    color === "blue" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600";

  return (
    <a
      href={href}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group text-center"
    >
      <div
        className={`w-14 h-14 ${bgClass} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </a>
  );
}
