import React, { useState } from "react";
import { User, Shield, Bell, Lock, Camera } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { authService } from "../../../services/authService";
import { toast } from "react-hot-toast";

type TabType = "profile" | "security" | "notifications" | "privacy";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    dateOfBirth: user?.dateOfBirth || "",
    address: user?.address || "",
    bio: user?.bio || "",
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await authService.updateProfile(profileData);
      // We need to update context but useAuth doesn't expose a clean setter, maybe reload or login again
      // The easiest way is forcing a reload or using `me()` to update state if Context supports it.
      // Usually, it's fine. For now let's just show success
      toast.success("Cập nhật hồ sơ thành công!");
      window.location.reload(); // Simple state sync
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật hồ sơ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      setIsSubmitting(true);
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Đổi mật khẩu thành công!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi đổi mật khẩu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Hồ sơ", icon: <User className="w-4 h-4 mr-2" /> },
    { id: "security", label: "Bảo mật", icon: <Shield className="w-4 h-4 mr-2" /> },
    { id: "notifications", label: "Thông báo", icon: <Bell className="w-4 h-4 mr-2" /> },
    { id: "privacy", label: "Riêng tư", icon: <Lock className="w-4 h-4 mr-2" /> },
  ];

  const handleLogoutOtherDevices = async () => {
    try {
      if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác không?")) return;
      setIsSubmitting(true);
      await authService.logoutOtherDevices();
      toast.success("Đã đăng xuất khỏi các thiết bị khác.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi đăng xuất");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Cài đặt</h1>
        <p className="text-sm text-gray-500">Quản lý tài khoản và tùy chọn của bạn</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {activeTab === "profile" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Thông tin cá nhân</h2>

              <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 border-4 border-white dark:border-gray-800 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-bold">
                    {user?.fullName?.charAt(0) || "U"}
                  </div>
                  <button title="Thay đổi ảnh đại diện" className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.fullName}</h3>
                  <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 text-xs rounded-full font-medium">
                    {user?.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Họ và tên
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="0901234567"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ngày sinh
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      placeholder="dd/mm/yyyy"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Địa chỉ
                    </label>
                    <input
                      id="address"
                      type="text"
                      placeholder="123 Đường ABC, Quận XYZ, TP. HCM"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tiểu sử (Mô tả ngắn)
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      placeholder="Viết vài dòng giới thiệu về bản thân..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Đổi mật khẩu</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Yêu cầu mật khẩu:</h4>
                  <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                    <li>Ít nhất 8 ký tự</li>
                    <li>Chứa ít nhất một chữ hoa, một chữ thường</li>
                    <li>Chứa ít nhất một số và một ký tự đặc biệt</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>

              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bảo mật nâng cao</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Đăng xuất thiết bị khác</h4>
                      <p className="text-sm text-gray-500">Đăng xuất khỏi tất cả thiết bị khác</p>
                    </div>
                    <button 
                      onClick={handleLogoutOtherDevices}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Cài đặt thông báo</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Thông báo Email</h4>
                    <p className="text-sm text-gray-500">Nhận email khi có thông báo hệ thống quan trọng</p>
                  </div>
                  <label htmlFor="notifyEmail" className="relative inline-flex items-center cursor-pointer">
                    <input id="notifyEmail" type="checkbox" title="Bật/tắt thông báo email" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {/* Additional Notification placeholder */}
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quyền riêng tư</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Hiển thị số điện thoại</h4>
                    <p className="text-sm text-gray-500">Cho phép người dùng khác xem số điện thoại của bạn</p>
                  </div>
                  <label htmlFor="showPhone" className="relative inline-flex items-center cursor-pointer">
                    <input id="showPhone" type="checkbox" title="Bật/tắt hiển thị số điện thoại" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
