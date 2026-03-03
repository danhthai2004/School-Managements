import { useState, useEffect } from "react";
import { Plus, Trash2, Bell, Send, X } from "lucide-react";
import { useToast } from "../../../context/ToastContext";

interface Notification {
    id: string;
    title: string;
    message: string;
    scope: string;
    targetSchoolName?: string;
    createdByEmail: string;
    createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function NotificationManagement() {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: "", message: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE}/school/notifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error: any) {
            console.error("Error fetching notifications:", error);
            toast.error(error?.response?.data?.message || "Lỗi khi tải danh sách thông báo");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.message.trim()) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE}/school/notifications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData({ title: "", message: "" });
                setShowModal(false);
                toast.success("Tạo thông báo thành công!");
                fetchNotifications();
            } else {
                toast.error("Lỗi khi tạo thông báo");
            }
        } catch (error: any) {
            console.error("Error creating notification:", error);
            toast.error(error?.response?.data?.message || "Lỗi khi tạo thông báo");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;

        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE}/school/notifications/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                toast.success("Đã xóa thông báo");
                fetchNotifications();
            } else {
                toast.error("Lỗi khi xóa thông báo");
            }
        } catch (error: any) {
            console.error("Error deleting notification:", error);
            toast.error(error?.response?.data?.message || "Lỗi khi xóa thông báo");
        }
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${mins} ${day}/${month}/${year}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
                    <p className="text-gray-500 mt-1">Tạo và quản lý thông báo cho học sinh trong trường</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    <span>Tạo thông báo</span>
                </button>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Bell className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Chưa có thông báo nào</p>
                        <p className="text-sm mt-1">Nhấn "Tạo thông báo" để tạo thông báo mới</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="p-6 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Bell className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(notification.createdAt)} • {notification.createdByEmail}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 ml-13 pl-13 whitespace-pre-wrap">
                                            {notification.message}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(notification.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Xóa thông báo"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-[100]">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Tạo thông báo mới</h2>
                                        <p className="text-blue-100 text-sm">Gửi thông báo đến học sinh trong trường</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)}
                                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tiêu đề <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Nhập tiêu đề thông báo..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nội dung <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Nhập nội dung thông báo..."
                                    rows={5}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    required
                                />
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-700">
                                    <strong>Lưu ý:</strong> Thông báo sẽ được gửi đến tất cả học sinh trong trường.
                                    Thông báo cũng sẽ hiển thị trong chuông thông báo của bạn.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                    <span>{submitting ? "Đang gửi..." : "Gửi thông báo"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
