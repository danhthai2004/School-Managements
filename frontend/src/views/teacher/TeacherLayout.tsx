import { useState, useEffect } from "react";
import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationDropdown from "../../components/common/NotificationDropdown";
import { teacherService } from "../../services/teacherService";
import type { TeacherProfile } from "../../services/teacherService";
import {
    LayoutDashboard,
    Users,
    LayoutGrid,
    Calendar,
    CalendarClock,
    UserCheck,
    GraduationCap,
    Bell,
    Settings,
    Menu,
    LogOut,
    UserCircle,
    Lock,
    SquareActivity,
    BarChart3
} from "lucide-react";

export default function TeacherLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeacherProfile();
    }, []);

    const fetchTeacherProfile = async () => {
        try {
            const profile = await teacherService.getProfile();
            setTeacherProfile(profile);
        } catch (error) {
            console.error("Failed to fetch teacher profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Common menu items for all teachers
    const commonMenuItems = [
        { path: "/teacher/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
        { path: "/teacher/schedule", label: "Thời khóa biểu", icon: <Calendar size={20} strokeWidth={1.5} /> },
        { path: "/teacher/exam-schedule", label: "Lịch thi", icon: <CalendarClock size={20} strokeWidth={1.5} /> },
        { path: "/teacher/attendance", label: "Điểm danh", icon: <UserCheck size={20} strokeWidth={1.5} /> },
        { path: "/teacher/grades", label: "Nhập điểm", icon: <GraduationCap size={20} strokeWidth={1.5} /> },
        { path: "/teacher/class-map", label: "Sơ đồ lớp", icon: <LayoutGrid size={20} strokeWidth={1.5} /> },
        { path: "/teacher/reports", label: "Báo cáo", icon: <BarChart3 size={20} strokeWidth={1.5} /> },
        { path: "/teacher/notifications", label: "Thông báo", icon: <Bell size={20} strokeWidth={1.5} /> },
    ];

    // Additional menu items for homeroom teachers only
    const homeroomOnlyMenuItems = [
        { path: "/teacher/students", label: "Học sinh", icon: <Users size={20} strokeWidth={1.5} /> },
        { path: "/teacher/risk-analytics", label: "AI phân tích học tập", icon: <SquareActivity size={20} strokeWidth={1.5} /> },
        { path: "/teacher/settings", label: "Cài đặt lớp", icon: <Settings size={20} strokeWidth={1.5} /> },
    ];

    // Build menu based on teacher type
    const menuItems = teacherProfile?.isHomeroomTeacher
        ? [
            commonMenuItems[0], // Tổng quan
            ...homeroomOnlyMenuItems,
            ...commonMenuItems.slice(1), // Rest of common items
        ]
        : commonMenuItems;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                {/* Logo & Toggle */}
                <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${!sidebarCollapsed ? 'h-16 flex items-center' : ''}`}>
                    {sidebarCollapsed ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(false)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <Menu size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Link to="/teacher/dashboard" className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="font-bold text-lg text-gray-900 dark:text-white leading-none">SchoolIMS</h1>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1 font-semibold">Teacher Portal</p>
                                    </div>
                                </Link>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <Menu size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Homeroom badge */}
                {!sidebarCollapsed && teacherProfile?.isHomeroomTeacher && (
                    <div className="mx-4 my-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">Giáo viên chủ nhiệm</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100 truncate">{teacherProfile.homeroomClassName}</p>
                    </div>
                )}

                {/* Menu */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm group
                                ${isActive
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                                }
                                ${sidebarCollapsed ? 'justify-center' : ''}
                            `}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            <span className={`${sidebarCollapsed ? '' : 'group-hover:scale-110'} transition-transform duration-200`}>
                                {item.icon}
                            </span>
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleLogout}
                        title={sidebarCollapsed ? 'Đăng xuất' : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-sm group ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} strokeWidth={1.5} className="text-red-400 group-hover:text-red-600 transition-colors" />
                        {!sidebarCollapsed && <span className="font-medium">Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                {/* Header */}
                <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-8 flex items-center sticky top-0 z-30 justify-end gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    <NotificationDropdown role="teacher" />

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg pr-2 py-1 transition-colors group"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.fullName || user?.email}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-bold mt-1">
                                    {teacherProfile?.isHomeroomTeacher ? 'Giáo viên chủ nhiệm' : 'Giáo viên'}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-gray-700 group-hover:ring-blue-100 dark:group-hover:ring-blue-900 transition-all shadow-sm">
                                {(user?.fullName || user?.email || "T").charAt(0).toUpperCase()}
                            </div>
                        </button>

                        {profileDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{user?.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <Link
                                        to="/teacher/profile"
                                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    >
                                        <UserCircle size={18} strokeWidth={1.5} />
                                        <span>Thông tin cá nhân</span>
                                    </Link>
                                    <Link
                                        to="/teacher/profile"
                                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    >
                                        <Lock size={18} strokeWidth={1.5} />
                                        <span>Đổi mật khẩu</span>
                                    </Link>
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                                    <button
                                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        onClick={() => {
                                            setProfileDropdownOpen(false);
                                            handleLogout();
                                        }}
                                    >
                                        <LogOut size={18} strokeWidth={1.5} />
                                        <span className="font-semibold">Đăng xuất</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-8">
                    <Outlet context={{ teacherProfile }} />
                </div>
            </main>
        </div>
    );
}
