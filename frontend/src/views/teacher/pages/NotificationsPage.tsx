import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Send, Bell, Clock, ChevronDown, CheckCircle, AlertCircle, ClipboardList, Calendar } from "lucide-react";
import toast from "react-hot-toast";

interface TeacherProfile {
    isHomeroomTeacher: boolean;
    homeroomClassId?: string;
    homeroomClassName?: string;
    assignedClasses?: AssignedClass[];
}

interface AssignedClass {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
}

interface NotificationItem {
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
}

const API_BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
    return localStorage.getItem("accessToken");
}

export default function NotificationsPage() {
    const { teacherProfile } = useOutletContext<{ teacherProfile: TeacherProfile | null }>();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [sending, setSending] = useState(false);

    const [history, setHistory] = useState<NotificationItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyPage, setHistoryPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Build list of classes this teacher can send to
    const availableClasses = (() => {
        const classMap = new Map<string, string>();

        // Homeroom class
        if (teacherProfile?.isHomeroomTeacher && teacherProfile.homeroomClassId) {
            classMap.set(
                teacherProfile.homeroomClassId,
                `${teacherProfile.homeroomClassName} (Chủ nhiệm)`
            );
        }

        // Assigned classes
        if (teacherProfile?.assignedClasses) {
            for (const ac of teacherProfile.assignedClasses) {
                if (!classMap.has(ac.classId)) {
                    classMap.set(ac.classId, `${ac.className} — ${ac.subjectName}`);
                }
            }
        }

        return Array.from(classMap, ([id, label]) => ({ id, label }));
    })();

    const fetchHistory = useCallback(async (page = 0) => {
        setLoadingHistory(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/v1/teacher/notifications?page=${page}&size=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.content || []);
                setTotalPages(data.totalPages || 0);
                setHistoryPage(data.number || 0);
            }
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory(0);
    }, [fetchHistory]);

    const handleSend = async () => {
        if (!title.trim() || !content.trim() || !selectedClassId) {
            toast.error("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        setSending(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/v1/teacher/notifications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    type: "OTHER",
                    targetGroup: "CLASS",
                    referenceId: selectedClassId,
                }),
            });

            if (res.ok) {
                toast.success("Đã gửi thông báo thành công!");
                setTitle("");
                setContent("");
                setSelectedClassId("");
                fetchHistory(0);
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || `Lỗi ${res.status}: Không thể gửi thông báo.`);
            }
        } catch (err) {
            console.error("Send error:", err);
            toast.error("Lỗi kết nối khi gửi thông báo.");
        } finally {
            setSending(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        return `${hours}:${mins} ${day}/${month}/${year}`;
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Gửi thông báo</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Gửi thông báo đến lớp bạn dạy hoặc lớp chủ nhiệm
                </p>
            </div>

            {/* Send Notification Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Tạo thông báo mới</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Class Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gửi đến lớp <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none transition-all"
                            >
                                <option value="">-- Chọn lớp --</option>
                                {availableClasses.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {availableClasses.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Không tìm thấy lớp nào. Hãy liên hệ quản trị viên.
                            </p>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tiêu đề <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề thông báo..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nội dung <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Nhập nội dung thông báo..."
                            rows={4}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !content.trim() || !selectedClassId}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {sending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Gửi thông báo
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h2 className="font-semibold text-gray-900">Lịch sử thông báo đã gửi</h2>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Bell className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">Chưa có thông báo nào được gửi</p>
                        </div>
                    ) : (
                        history.map((notification) => (
                            <div
                                key={notification.id}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {(() => {
                                                const iconClass = "w-5 h-5 text-blue-600";
                                                if (notification.type === "EXAM") return <ClipboardList className={iconClass} />;
                                                if (notification.type === "SCHEDULE") return <Calendar className={iconClass} />;
                                                return <Bell className={iconClass} />;
                                            })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-900">
                                                {notification.title}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {notification.content}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatDateTime(notification.createdAt)}</span>
                                                </div>
                                                <span className="flex items-center gap-1 text-green-500">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Đã gửi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {notification.status === "RECALLED" && (
                                        <span className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-full font-medium flex-shrink-0">
                                            Đã thu hồi
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
                        <button
                            onClick={() => fetchHistory(historyPage - 1)}
                            disabled={historyPage === 0}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <span className="text-sm text-gray-500">
                            Trang {historyPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => fetchHistory(historyPage + 1)}
                            disabled={historyPage >= totalPages - 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
