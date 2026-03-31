import {Link, NavLink, Outlet, useNavigate} from "react-router-dom";
import {useAuth} from "../../context/AuthContext";
import {useEffect, useState} from "react";
import {
  LockIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "./SystemIcons";
import NotificationBell from "./NotificationBell";
import {
  AttendanceIcon,
  OverviewIcon,
  ScoreIcon,
  TimetableIcon,
} from "../../views/guardian/GuardianIcons";
import {CircleUserRound} from "lucide-react";
import {guardianService} from "../../services/guardianService.ts";
import type {StudentDto} from "../../services/schoolAdminService.ts";
import type {TimetableDto} from "../../services/guardianService.ts";

export type StudentDataProp = {
  student: StudentDto,
  timetable: TimetableDto[]
}

export default function GuardianLayout() {
  const {user, logout} = useAuth();
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
    {to: "/guardian/overview", label: "Tổng quan", icon: <OverviewIcon/>},
    {
      to: "/guardian/timetable",
      label: "Thời khóa biểu",
      icon: <TimetableIcon/>,
    },
    {
      to: "/guardian/examschedule",
      label: "Lịch kiểm tra",
      icon: <TimetableIcon/>,
    },
    {
      to: "/guardian/grading",
      label: "Điểm số",
      icon: <ScoreIcon/>
    },
    {
      to: "/guardian/attendance",
      label: "Chuyên cần",
      icon: <AttendanceIcon/>,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="animate-fade-in-up min-h-screen bg-gray-50 mb-4">
      {/* Sidebar - Fixed */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo & Toggle */}
        <div
          className={`p-4 border-b border-gray-200 ${
            !sidebarCollapsed ? "h-16 flex items-center" : ""
          }`}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mở rộng"
              >
                <MenuIcon/>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Link
                  to="/guardian/overview"
                  className="flex items-center gap-3"
                >
                  <div>
                    <h1 className="font-bold text-lg text-[#f59e0b]">
                      IMSGuardian
                    </h1>
                    <p className="text-xs text-gray-500">SchoolIMS</p>
                  </div>
                </Link>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Thu gọn"
              >
                <MenuIcon/>
              </button>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 text-sm text-gray-500 transition-opacity duration-200 opacity-100">
            <div className="p-4 bg-[#fffbeb] flex rounded-xl shadow-sm items-center">
              <CircleUserRound/>
              <div className="ml-4">
                <p className="font text-black">{student?.fullName}</p>
                <p className="text-sm">{student?.currentClassName}</p>
              </div>
            </div>
          </div>
        )}

        <hr className="border-gray-200"/>
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive}) => `
                flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm
                ${
                isActive
                  ? "bg-yellow-50 text-[#f59e0b] font-medium"
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
            className={`w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <LogoutIcon/>
            {!sidebarCollapsed && (
              <span className="font-medium">Đăng xuất</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center sticky top-0 z-30">
          <div className="flex items-center justify-between w-full">
            {/* Search */}
            <div className="relative w-96">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon/>
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
                    <p className="text-xs text-gray-500">Guardian</p>
                  </div>
                  <div
                    className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
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
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <UserIcon/>
                        <Link to="/guardian/profile">
                          <span>Thông tin cá nhân</span>
                        </Link>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <LockIcon/>
                        <span>Đổi mật khẩu</span>
                      </button>
                      <div className="border-t border-gray-100 my-1"/>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogoutIcon/>
                        <span>Đăng xuất</span>
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
          <Outlet context={{student, timetable}}/>
        </div>
      </main>
    </div>
  );
}