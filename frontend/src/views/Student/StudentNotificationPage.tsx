import { useState, useEffect } from "react";
import { Bell, Clock, ChevronRight, X, Calendar } from "lucide-react";

interface NotificationItem {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    createdByName: string;
    isRead: boolean;
    type: string;
}

const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
    });
};

export default function StudentNotificationPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                const API_BASE = import.meta.env.VITE_API_URL || "";
                const res = await fetch(`${API_BASE}/v1/notifications?page=0&size=50`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.notifications || []);
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (notificationId: string) => {
        try {
            const token = localStorage.getItem("accessToken");
            const API_BASE = import.meta.env.VITE_API_URL || "";
            await fetch(`${API_BASE}/v1/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const handleSelectNotif = (notif: NotificationItem) => {
        setSelectedNotif(notif);
        if (!notif.isRead) {
            markAsRead(notif.id);
        }
    };

    const formatFullDate = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${mins}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
                    <p className="text-sm text-gray-500 mt-1">Danh sách thông báo quan trọng dành cho học sinh</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                    <Bell className="w-4 h-4" />
                    <span>{notifications.length} Thông báo</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List View */}
                <div className={`${selectedNotif ? 'lg:col-span-1 hidden lg:block' : 'lg:col-span-3'} space-y-3`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleSelectNotif(notif)}
                                        className={`p-4 hover:bg-gray-50 transition-all cursor-pointer group flex items-start gap-4 ${selectedNotif?.id === notif.id ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${notif.isRead ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={`text-sm ${notif.isRead ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'} truncate group-hover:text-blue-600`}>
                                                    {notif.title}
                                                </h3>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                    {formatFullDate(notif.createdAt).split(' ')[0]}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-1 italic">
                                                {notif.content}
                                            </p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 mt-1 transition-colors ${selectedNotif?.id === notif.id ? 'text-blue-500' : 'text-gray-300'}`} />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>Không có thông báo nào</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detail View */}
                {selectedNotif && (
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-white font-bold">Chi tiết thông báo</h3>
                                <button
                                    onClick={() => setSelectedNotif(null)}
                                    className="p-1 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold uppercase shadow-inner">
                                        {(selectedNotif.createdByName || 'HT')[0]}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 text-xl leading-tight">{selectedNotif.title}</h2>
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{formatFullDate(selectedNotif.createdAt)}</span>
                                            </div>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                <Calendar className="w-3 h-3" />
                                                <span>{selectedNotif.createdByName || 'Hệ thống'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">Nội dung chi tiết</div>
                                    <div className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap bg-blue-50/20 p-6 rounded-2xl border border-blue-50 shadow-inner">
                                        {renderFormattedContent(selectedNotif.content)}
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={() => setSelectedNotif(null)}
                                        className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm shadow-sm"
                                    >
                                        Đóng nội dung
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
