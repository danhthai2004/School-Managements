import { useState, useEffect } from "react";
import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import NotificationBell from "../../components/layout/NotificationBell";
import { teacherService } from "../../services/teacherService";
import type { TeacherProfile } from "../../services/teacherService";
import {
    LayoutDashboard,
    Users,
    LayoutGrid,
    Calendar,
    UserCheck,
    GraduationCap,
    Bell,
    Menu,
    LogOut,
    UserCircle,
    Lock,
    SquareActivity,
    Camera
} from "lucide-react";

export default function TeacherLayout() {
    const { user, logout } = useAuth();

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
        { path: "/teacher/attendance", label: "Điểm danh", icon: <UserCheck size={20} strokeWidth={1.5} /> },
        { path: "/teacher/grades", label: "Nhập điểm", icon: <GraduationCap size={20} strokeWidth={1.5} /> },
        { path: "/teacher/notifications", label: "Thông báo", icon: <Bell size={20} strokeWidth={1.5} /> },
    ];

    // Additional menu items for homeroom teachers only
    const homeroomOnlyMenuItems = [
        { path: "/teacher/students", label: "Học sinh", icon: <Users size={20} strokeWidth={1.5} /> },
        { path: "/teacher/class-map", label: "Sơ đồ lớp", icon: <LayoutGrid size={20} strokeWidth={1.5} /> },
        { path: "/teacher/face-data", label: "Dữ liệu khuôn mặt", icon: <Camera size={20} strokeWidth={1.5} /> },
        { path: "/teacher/risk-analytics", label: "AI phân tích học tập", icon: <SquareActivity size={20} strokeWidth={1.5} /> },
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
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="font-bold text-lg text-gray-900">SchoolIMS</h1>
                                        <p className="text-xs text-gray-500">Giáo viên</p>
                                    </div>
                                </Link>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
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
                <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center sticky top-0 z-30">
                    <div className="flex items-center justify-end w-full">
                        <div className="flex items-center gap-4">
                            {/* Notification Dropdown */}
                            <NotificationBell />

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-2 py-1 transition-colors"
                                >
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                                        <p className="text-xs text-gray-500">
                                            {teacherProfile?.isHomeroomTeacher ? 'Giáo viên chủ nhiệm' : 'Giáo viên'}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                                        {(user?.fullName || user?.email || "T").charAt(0).toUpperCase()}
                                    </div>
                                </button>

                                {profileDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                            <Link
                                                to="/teacher/profile"
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <UserCircle size={20} strokeWidth={1.5} />
                                                <span>Thông tin cá nhân</span>
                                            </Link>
                                            <Link
                                                to="/teacher/profile"
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <Lock size={20} strokeWidth={1.5} />
                                                <span>Đổi mật khẩu</span>
                                            </Link>
                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    handleLogout();
                                                }}
                                            >
                                                <LogOut size={20} strokeWidth={1.5} />
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
                    <Outlet context={{ teacherProfile }} />
                </div>
            </main>
        </div>
    );
}
