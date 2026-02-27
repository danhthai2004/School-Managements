import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HomeIcon,
  UsersIcon,
  SchoolIcon,
  BellIcon,
  ActivityIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
  LockIcon,
} from "./SystemIcons";
import NotificationBell from "./NotificationBell";

export default function SystemLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { to: "/system/overview", label: "Tổng quan", icon: <HomeIcon /> },
    { to: "/system/users", label: "Quản lý tài khoản", icon: <UsersIcon /> },
    { to: "/system/schools", label: "Danh sách trường học", icon: <SchoolIcon /> },
    { to: "/system/notifications", label: "Quản lý thông báo", icon: <BellIcon /> },
    { to: "/system/activity-logs", label: "Báo cáo hoạt động", icon: <ActivityIcon /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Fixed */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"
          }`}
      >
        {/* Logo & Toggle */}
        <div
          className={`p-4 border-b border-gray-200 ${!sidebarCollapsed ? "h-16 flex items-center" : ""
            }`}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mở rộng"
              >
                <MenuIcon />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Link to="/system/overview" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-gray-900">SchoolIMS</h1>
                    <p className="text-xs text-gray-500">System Admin</p>
                  </div>
                </Link>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Thu gọn"
              >
                <MenuIcon />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm
                ${isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
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
            className={`w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm ${sidebarCollapsed ? "justify-center" : ""
              }`}
          >
            <LogoutIcon />
            {!sidebarCollapsed && <span className="font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? "ml-20" : "ml-64"
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
                <SearchIcon />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <NotificationBell
                apiEndpoint="/system/notifications"
                countEndpoint="/system/notifications/count"
              />

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-2 py-1 transition-colors"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.fullName || user?.email}
                    </p>
                    <p className="text-xs text-gray-500">System Admin</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                    {(user?.fullName || user?.email || "S").charAt(0).toUpperCase()}
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
                        <UserIcon />
                        <span>Thông tin cá nhân</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <LockIcon />
                        <span>Đổi mật khẩu</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogoutIcon />
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
