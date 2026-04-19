import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Clock, ArrowLeft, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

interface NotificationDto {
    id: string;
    title: string;
    content: string;
    type: string;
    targetGroup: string;
    referenceId?: string;
    actionUrl?: string;
    status: string;
    createdByName?: string;
    createdAt: string;
    isRead: boolean;
}

interface NotificationPageResponse {
    notifications: NotificationDto[];
    unreadCount: number;
    totalPages: number;
    totalElements: number;
    currentPage: number;
}

const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
    });
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<NotificationPageResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNotification, setSelectedNotification] = useState<NotificationDto | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<NotificationPageResponse>("/v1/notifications", {
                params: { page: 0, size: 15 }
            });
            setData(res.data);
        } catch {
            setError("Không thể tải thông báo");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch unread count periodically (and on mount)
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Reload when dropdown opens, reset detail view when it closes
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
        if (!isOpen) {
            setSelectedNotification(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const markAsRead = async (notificationId: string) => {
        try {
            await api.patch(`/v1/notifications/${notificationId}/read`);
            // Update local state
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    unreadCount: Math.max(0, prev.unreadCount - 1),
                    notifications: prev.notifications.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    ),
                };
            });
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch("/v1/notifications/read-all");
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    unreadCount: 0,
                    notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
                };
            });
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

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
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${mins} ${day}/${month}/${year}`;
    };

    const handleNotificationClick = (notification: NotificationDto) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        setSelectedNotification(notification);
    };

    const handleActionClick = (notification: NotificationDto) => {
        if (notification.actionUrl) {
            setIsOpen(false);
            navigate(notification.actionUrl);
        }
    };

    const unreadCount = data?.unreadCount ?? 0;
    const notifications = data?.notifications ?? [];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Thông báo"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
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
                                onClick={() => setSelectedNotification(null)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">Thông báo</h3>
                                {unreadCount > 0 && (
                                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                        {unreadCount} mới
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            {!selectedNotification && unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                    title="Đánh dấu tất cả đã đọc"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
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
                                    <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed space-y-1">
                                        {renderFormattedContent(selectedNotification.content)}
                                    </div>
                                </div>

                                {selectedNotification.createdByName && (
                                    <div className="text-xs text-gray-500">
                                        <span className="font-medium">Người gửi:</span> {selectedNotification.createdByName}
                                    </div>
                                )}

                                {selectedNotification.actionUrl && (
                                    <button
                                        onClick={() => handleActionClick(selectedNotification)}
                                        className="mt-3 w-full text-center text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors font-medium"
                                    >
                                        Xem chi tiết →
                                    </button>
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
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                            !notification.isRead ? 'bg-blue-50/40' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                                                }`}>
                                                    <Bell className={`w-5 h-5 ${
                                                        !notification.isRead ? 'text-blue-600' : 'text-gray-400'
                                                    }`} />
                                                </div>
                                                {!notification.isRead && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm ${
                                                    !notification.isRead
                                                        ? 'font-semibold text-gray-900'
                                                        : 'font-medium text-gray-700'
                                                }`}>
                                                    {notification.title}
                                                </h4>
                                                <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap line-clamp-2">
                                                    {renderFormattedContent(notification.content)}
                                                </div>
                                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                                    {notification.createdByName && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{notification.createdByName}</span>
                                                        </>
                                                    )}
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
