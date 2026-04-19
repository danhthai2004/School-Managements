import { useState, useEffect, useRef, useCallback } from "react";
import { ClipboardList, Calendar, Bell, Settings } from "lucide-react";
import api from "../../services/api";

// ==================== TYPES ====================

type NotificationItem = {
    id: string;
    title: string;
    content: string;
    type?: string;
    createdAt: string;
    isRead: boolean;
};

type Props = {
    role: "system" | "school-admin" | "teacher";
};

// ==================== ICON MAPS ====================

const TYPE_ICONS: Record<string, React.ElementType> = {
    EXAM: ClipboardList,
    SCHEDULE: Calendar,
    OTHER: Bell,
    SYSTEM: Settings,
};

// ==================== COMPONENT ====================

export default function NotificationDropdown({ role }: Props) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            let data: NotificationItem[] = [];

            if (role === "system") {
                const res = await api.get("/system/notifications");
                data = (res.data || []).map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    content: n.message || n.content || "",
                    type: "SYSTEM",
                    createdAt: n.createdAt,
                    isRead: false,
                }));
            } else if (role === "teacher") {
                const res = await api.get("/teacher/notifications");
                data = (res.data || []).map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    content: n.content || "",
                    type: n.notificationType || "OTHER",
                    createdAt: n.createdAt,
                    isRead: false,
                }));
            } else if (role === "school-admin") {
                // School admin uses system notifications scoped to their school
                const res = await api.get("/system/notifications");
                data = (res.data || []).map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    content: n.message || n.content || "",
                    type: "SYSTEM",
                    createdAt: n.createdAt,
                    isRead: false,
                }));
            }

            setNotifications(data.slice(0, 10)); // Show latest 10
        } catch (err) {
            console.error("Failed to load notifications:", err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / 60000);

            if (diffMin < 1) return "Vừa xong";
            if (diffMin < 60) return `${diffMin} phút trước`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `khoảng ${diffHours} giờ trước`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return date.toLocaleDateString("vi-VN");
        } catch {
            return dateStr;
        }
    };

    const getNotificationPath = () => {
        if (role === "system") return "/system/notifications";
        if (role === "teacher") return "/teacher/notifications";
        return "#";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                aria-label="Thông báo"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Thông báo</h3>
                            {unreadCount > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} thông báo chưa đọc</p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Đánh dấu tất cả
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center">
                                <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Đang tải...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="text-3xl mb-2">📭</div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Không có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 flex gap-3 ${!notif.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                                        }`}
                                    onClick={() => {
                                        setNotifications((prev) =>
                                            prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                                        );
                                    }}
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        {(() => {
                                            const Icon = TYPE_ICONS[notif.type || "OTHER"] || Bell;
                                            return <Icon className="w-5 h-5" />;
                                        })()}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className={`text-sm leading-snug ${!notif.isRead ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                                                {notif.title}
                                            </h4>
                                            {!notif.isRead && (
                                                <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.content}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                            {formatTime(notif.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-center">
                            <a
                                href={getNotificationPath()}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                onClick={() => setOpen(false)}
                            >
                                Xem tất cả thông báo
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
