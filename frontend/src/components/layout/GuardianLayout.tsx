import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  GraduationCap,
  UserCheck,
  Menu,
  Search,
  LogOut,
  UserCircle,
  Lock
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { guardianService } from "../../services/guardianService.ts";
import type { StudentDto } from "../../services/schoolAdminService.ts";
import type { TimetableDto } from "../../services/guardianService.ts";

export type StudentDataProp = {
  student: StudentDto,
  timetable: TimetableDto[]
}

export default function GuardianLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [student, setStudent] = useState<StudentDto | null>(null);
  const [timetable, setTimetable] = useState<TimetableDto[]>([]);

  function timetableSort(slots: TimetableDto[]): TimetableDto[] {
    const dayRank: Record<string, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    return [...slots].sort((a, b) => {
      // 1️⃣ Sort by day first
      const dayComparison = dayRank[a.dayOfWeek] - dayRank[b.dayOfWeek];
      if (dayComparison !== 0) {
        return dayComparison;
      }

      // 2️⃣ If same day, sort by slot
      return a.slot - b.slot;
    });
  }

  function fetchStudentInfo() {
    guardianService.getStudentInfo().then((data) => {
      setStudent(data);
    })
  }

  useEffect(() => {
    fetchStudentInfo();
  }, []);

  useEffect(() => {
    // Safeguard clause (no timetable obtained if student doesn't exist yet)
    if (!student || !student?.currentClassName) return;

    guardianService
      .getTimetableInfo(student.id)
      .then((data) => {
        // console.table(data);
        const curData = timetableSort(data);
        // Stream choose the class
        console.log("Timetable After Sort");
        // console.table(curData);
        setTimetable(curData);
      });
  }, [student]);


  const navItems = [
    { to: "/guardian/overview", label: "Tổng quan", icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
    {
      to: "/guardian/timetable",
      label: "Thời khóa biểu",
      icon: <Calendar size={20} strokeWidth={1.5} />,
    },
    {
      to: "/guardian/examschedule",
      label: "Lịch kiểm tra",
      icon: <CalendarClock size={20} strokeWidth={1.5} />,
    },
    {
      to: "/guardian/grading",
      label: "Điểm số",
      icon: <GraduationCap size={20} strokeWidth={1.5} />
    },
    {
      to: "/guardian/attendance",
      label: "Chuyên cần",
      icon: <UserCheck size={20} strokeWidth={1.5} />,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"
          }`}
      >
        {/* Logo & Toggle */}
        <div
          className={`p-4 border-b border-gray-200 ${!sidebarCollapsed ? "h-16 flex items-center" : ""
            }`}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mở rộng"
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Link to="/guardian/overview" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-gray-900">SchoolIMS</h1>
                    <p className="text-xs text-gray-500">Guardian Portal</p>
                  </div>
                </Link>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Thu gọn"
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="px-3 py-3 text-sm text-gray-500 transition-all duration-300">
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 flex rounded-xl shadow-sm items-center hover:bg-indigo-50 transition-colors group cursor-default">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                <UserCircle size={22} strokeWidth={1.5} />
              </div>
              <div className="ml-3">
                <p className="font-semibold text-indigo-900 leading-tight text-sm">{student?.fullName}</p>
                <p className="text-[11px] text-indigo-500 mt-0.5">{student?.currentClassName}</p>
              </div>
            </div>
          </div>
        )}

        <hr className="border-gray-100" />
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm
                ${isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Đăng xuất" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-sm group ${sidebarCollapsed ? "justify-center" : ""
              }`}
          >
            <LogOut size={20} strokeWidth={1.5} className="text-red-400 group-hover:text-red-600 transition-colors" />
            {!sidebarCollapsed && (
              <span className="font-medium">Đăng xuất</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 animate-fade-in-up ${sidebarCollapsed ? "ml-20" : "ml-64"
          }`}
      >
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center sticky top-0 z-30">
          <div className="flex items-center justify-between w-full">
            {/* Search */}
            <div className="relative w-96">
              <input
                type="text"
                placeholder="Tìm kiếm thông tin học sinh..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} strokeWidth={1.5} />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <NotificationBell />

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-2 py-1 transition-colors"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.fullName || user?.email}
                    </p>
                    <p className="text-xs text-gray-500">Phụ huynh</p>
                  </div>
                  <div
                    className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold shadow-inner">
                    {(user?.fullName || user?.email || "S")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all group"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <UserCircle size={20} strokeWidth={1.5} className="text-gray-400 group-hover:text-indigo-600" />
                        <Link to="/guardian/profile" className="flex-1 text-left">
                          <span>Thông tin cá nhân</span>
                        </Link>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all group"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Lock size={20} strokeWidth={1.5} className="text-gray-400 group-hover:text-indigo-600" />
                        <span className="flex-1 text-left">Đổi mật khẩu</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all group"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut size={20} strokeWidth={1.5} className="text-red-400 group-hover:text-red-600" />
                        <span className="flex-1 text-left">Đăng xuất</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8">
          <Outlet context={{ student, timetable }} />
        </div>
      </main>
    </div>
  );
}