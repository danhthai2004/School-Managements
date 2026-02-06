import { useState, useEffect, useRef } from "react";
import { Bell, X, Clock, ArrowLeft } from "lucide-react";

interface Notification {
    id: string;
    title: string;
    message: string;
    scope: string;
    createdAt: string;
    createdByEmail?: string;
    targetSchoolName?: string;
}

interface NotificationBellProps {
    apiEndpoint: string;
    countEndpoint?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function NotificationBell({ apiEndpoint, countEndpoint }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notification count
    const fetchCount = async () => {
        if (!countEndpoint) return;
        try {
            const token = localStorage.getItem("accessToken");
            console.log("[NotificationBell] Fetching count from:", `${API_BASE}${countEndpoint}`);
            const res = await fetch(`${API_BASE}${countEndpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[NotificationBell] Count response:", data);
                setUnreadCount(data.count || 0);
            } else {
                console.error("[NotificationBell] Count error:", res.status, res.statusText);
            }
        } catch (err) {
            console.error("[NotificationBell] Error fetching count:", err);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("accessToken");
            console.log("[NotificationBell] Fetching notifications from:", `${API_BASE}${apiEndpoint}`);
            const res = await fetch(`${API_BASE}${apiEndpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("[NotificationBell] Response status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("[NotificationBell] Notifications:", data);
                setNotifications(Array.isArray(data) ? data : []);
            } else {
                const text = await res.text();
                console.error("[NotificationBell] Error:", res.status, text);
                setError(`Lỗi ${res.status}`);
            }
        } catch (err) {
            console.error("[NotificationBell] Exception:", err);
            setError("Không thể tải thông báo");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchCount();
        // Refresh count every 60 seconds
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [countEndpoint]);

    // Load notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        } else {
            setSelectedNotification(null);
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (isOpen) {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Vừa xong";
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString("vi-VN");
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleBellClick = () => {
        console.log("[NotificationBell] Bell clicked, isOpen:", !isOpen);
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notification: Notification) => {
        setSelectedNotification(notification);
    };

    const handleBackToList = () => {
        setSelectedNotification(null);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                    style={{ zIndex: 9999 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        {selectedNotification ? (
                            <button
                                onClick={handleBackToList}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại
                            </button>
                        ) : (
                            <h3 className="font-semibold text-gray-900">Thông báo</h3>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-8 text-red-500">
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : selectedNotification ? (
                            // Detail View
                            <div className="p-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bell className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-base">
                                            {selectedNotification.title}
                                        </h4>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatDateTime(selectedNotification.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                        {selectedNotification.message}
                                    </p>
                                </div>

                                {selectedNotification.createdByEmail && (
                                    <div className="text-xs text-gray-500">
                                        <span className="font-medium">Người gửi:</span> {selectedNotification.createdByEmail}
                                    </div>
                                )}

                                {selectedNotification.targetSchoolName && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        <span className="font-medium">Trường:</span> {selectedNotification.targetSchoolName}
                                    </div>
                                )}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Bell className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">Không có thông báo</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Bell className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 text-sm">
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!selectedNotification && notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
