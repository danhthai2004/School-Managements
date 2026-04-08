import { useState } from "react";
import { Link, Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    LayoutDashboard,
    Users,
    LayoutGrid,
    BookOpen,
    Calendar,
    Building2,
    CalendarClock,
    Bell,
    BarChart3,
    Settings2,
    SquareActivity,
    GraduationCap,
    Search,
    Menu,
    LogOut,
    UserCircle,
    Lock
} from "lucide-react";
import NotificationBell from "../../components/layout/NotificationBell";

export default function SchoolAdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const menuItems = [
        { path: "/school-admin/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/students", label: "Quản lý học sinh", icon: <Users size={20} strokeWidth={1.5} /> },
        {
            label: "Quản lý giáo viên",
            icon: <GraduationCap size={20} strokeWidth={1.5} />,
            children: [
                { path: "/school-admin/teachers", label: "Danh sách giáo viên" },
                { path: "/school-admin/assignments", label: "Phân công chuyên môn" }
            ]
        },
        { path: "/school-admin/classes", label: "Quản lý lớp học", icon: <LayoutGrid size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/subjects", label: "Quản lý Môn học & Tổ hợp", icon: <BookOpen size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/rooms", label: "Quản lý phòng", icon: <Building2 size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/schedule", label: "Thời khóa biểu", icon: <Calendar size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/exam-sessions", label: "Kỳ thi & Phân bổ", icon: <CalendarClock size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/notifications", label: "Thông báo", icon: <Bell size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/reports", label: "Báo cáo & Thống kê", icon: <BarChart3 size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/risk-analytics", label: "AI Phân Tích Rủi Ro", icon: <SquareActivity size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/accounts", label: "Quản lý tài khoản", icon: <UserCircle size={20} strokeWidth={1.5} /> },
        { path: "/school-admin/semesters", label: "Cấu hình Năm học & Học kỳ", icon: <Settings2 size={20} strokeWidth={1.5} /> },
    ];

    // State for expanded menus (using labels as keys)
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        "Quản lý giáo viên": true
    });

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
        if (sidebarCollapsed) setSidebarCollapsed(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar - Fixed */}
            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                {/* Logo & Toggle */}
                <div className={`p-4 border-b border-gray-200 ${!sidebarCollapsed ? 'h-16 flex items-center' : ''}`}>
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
                                <Link to="/school-admin/dashboard" className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="font-bold text-lg text-gray-900">SchoolIMS</h1>
                                        <p className="text-xs text-gray-500">School Admin</p>
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

                {/* Menu */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item: any, index) => {
                        if (item.children) {
                            const isExpanded = expandedMenus[item.label || ""];
                            const isActiveParent = item.children.some((child: any) => location.pathname === child.path);

                            return (
                                <div key={index} className="space-y-1">
                                    <button
                                        onClick={() => toggleMenu(item.label || "")}
                                        className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all text-sm group
                                            ${isActiveParent ? 'text-blue-700 bg-blue-50 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                                            ${sidebarCollapsed ? 'justify-center' : ''}
                                        `}
                                        title={sidebarCollapsed ? item.label : undefined}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            {!sidebarCollapsed && <span>{item.label}</span>}
                                        </div>
                                        {!sidebarCollapsed && (
                                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    {isExpanded && !sidebarCollapsed && (
                                        <div className="pl-10 space-y-1">
                                            {item.children.map((child: any) => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path}
                                                    className={({ isActive }) => `
                                                        block text-sm py-2 px-3 rounded-lg transition-colors
                                                        ${isActive
                                                            ? 'text-blue-600 bg-blue-100/50 font-medium'
                                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                                                    `}
                                                >
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm
                                    ${isActive
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }
                                    ${sidebarCollapsed ? 'justify-center' : ''}
                                `}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                {item.icon}
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={logout}
                        title={sidebarCollapsed ? 'Đăng xuất' : undefined}
                        className={`flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} strokeWidth={1.5} />
                        {!sidebarCollapsed && <span className="font-medium">Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
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
                                        <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                                        <p className="text-xs text-gray-500">Quản trị viên</p>
                                    </div>
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                                        {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
                                    </div>
                                </button>

                                {profileDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <UserCircle size={20} strokeWidth={1.5} />
                                                <span>Thông tin cá nhân</span>
                                            </button>
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <Lock size={20} strokeWidth={1.5} />
                                                <span>Đổi mật khẩu</span>
                                            </button>
                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    logout();
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
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
