import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Bell, Send, X, ChevronDown, Clock, RotateCcw, Users } from "lucide-react";
import { useToast } from "../../../context/ToastContext";

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
}

interface ClassRoomOption {
    id: string;
    name: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const TARGET_GROUP_LABELS: Record<string, string> = {
    ALL: "Toàn trường",
    TEACHER: "Giáo viên",
    STUDENT: "Học sinh",
    GUARDIAN: "Phụ huynh",
    CLASS: "Theo lớp",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    SYSTEM: "Hệ thống",
    EXAM: "Kiểm tra",
    SCHEDULE: "Thời khóa biểu",
    MANUAL: "Thủ công",
};

function getToken() {
    return localStorage.getItem("accessToken");
}

export default function NotificationManagement() {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [recalling, setRecalling] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formType, setFormType] = useState("MANUAL");
    const [formTargetGroup, setFormTargetGroup] = useState("ALL");
    const [formClassId, setFormClassId] = useState("");

    // Class list (for CLASS target)
    const [classOptions, setClassOptions] = useState<ClassRoomOption[]>([]);

    const fetchNotifications = useCallback(async (p = 0) => {
        // Prevent concurrent fetches if already loading
        const token = getToken();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/v1/admin/notifications?page=${p}&size=15`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.content || []);
                setTotalPages(data.totalPages || 0);
                setPage(data.number || 0);
            } else {
                const errorText = await res.text();
                console.error(`Fetch failed with status ${res.status}:`, errorText);
                toast.error("Lỗi khi tải danh sách thông báo");
            }
        } catch (error) {
            console.error("Network error fetching notifications:", error);
            toast.error("Lỗi khi tải danh sách thông báo");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchClasses = async () => {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/school/classes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const classes = (data || []).map((c: { id: string; name: string }) => ({
                    id: c.id,
                    name: c.name,
                }));
                setClassOptions(classes);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    useEffect(() => {
        fetchNotifications(0);
        fetchClasses();
    }, [fetchNotifications]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formContent.trim()) return;
        if (formTargetGroup === "CLASS" && !formClassId) {
            toast.error("Vui lòng chọn lớp.");
            return;
        }

        setSubmitting(true);
        try {
            const token = getToken();
            const body: Record<string, string | null> = {
                title: formTitle.trim(),
                content: formContent.trim(),
                type: formType,
                targetGroup: formTargetGroup,
                referenceId: formTargetGroup === "CLASS" ? formClassId : null,
                actionUrl: null,
            };

            const res = await fetch(`${API_BASE}/v1/admin/notifications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                resetForm();
                setShowModal(false);
                toast.success("Tạo thông báo thành công!");
                fetchNotifications(0);
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || "Lỗi khi tạo thông báo");
            }
        } catch (error) {
            console.error("Error creating notification:", error);
            toast.error("Lỗi khi tạo thông báo");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRecall = async (id: string) => {
        if (!confirm("Bạn có chắc muốn thu hồi thông báo này? Người nhận sẽ không còn thấy thông báo.")) return;

        setRecalling(id);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/v1/admin/notifications/${id}/recall`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                toast.success("Đã thu hồi thông báo");
                fetchNotifications(page);
            } else {
                toast.error("Lỗi khi thu hồi thông báo");
            }
        } catch (error) {
            console.error("Error recalling notification:", error);
            toast.error("Lỗi khi thu hồi thông báo");
        } finally {
            setRecalling(null);
        }
    };

    const resetForm = () => {
        setFormTitle("");
        setFormContent("");
        setFormType("MANUAL");
        setFormTargetGroup("ALL");
        setFormClassId("");
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        return `${hours}:${mins} ${day}/${month}/${year}`;
    };

    if (loading && notifications.length === 0) {
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
                    <p className="text-gray-500 mt-1">Tạo và quản lý thông báo cho toàn trường</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
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
                                className={`p-6 hover:bg-gray-50 transition-colors group ${notification.status === "RECALLED" ? "opacity-60" : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.status === "RECALLED" ? "bg-gray-100" : "bg-blue-100"
                                            }`}>
                                            <Bell className={`w-5 h-5 ${notification.status === "RECALLED" ? "text-gray-400" : "text-blue-600"
                                                }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                                {notification.status === "RECALLED" && (
                                                    <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                                                        Đã thu hồi
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 text-sm whitespace-pre-wrap line-clamp-2">
                                                {notification.content}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatDate(notification.createdAt)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    <span>{TARGET_GROUP_LABELS[notification.targetGroup] || notification.targetGroup}</span>
                                                </div>
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                                    {NOTIFICATION_TYPE_LABELS[notification.type] || notification.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {notification.status !== "RECALLED" && (
                                        <button
                                            onClick={() => handleRecall(notification.id)}
                                            disabled={recalling === notification.id}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                            title="Thu hồi thông báo"
                                        >
                                            {recalling === notification.id ? (
                                                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <RotateCcw className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
                        <button
                            onClick={() => fetchNotifications(page - 1)}
                            disabled={page === 0}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <span className="text-sm text-gray-500">
                            Trang {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => fetchNotifications(page + 1)}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>

            {showModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col z-[10000] max-h-[95vh] overflow-hidden">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Tạo thông báo mới</h2>
                                        <p className="text-blue-100 text-sm">Gửi thông báo đến đối tượng trong trường</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Target Group */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nhóm đối tượng <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={formTargetGroup}
                                        onChange={(e) => {
                                            setFormTargetGroup(e.target.value);
                                            if (e.target.value !== "CLASS") setFormClassId("");
                                        }}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                    >
                                        <option value="ALL">Toàn trường</option>
                                        <option value="TEACHER">Giáo viên</option>
                                        <option value="STUDENT">Học sinh</option>
                                        <option value="GUARDIAN">Phụ huynh</option>
                                        <option value="CLASS">Theo lớp</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Class Select (shown when CLASS target) */}
                            {formTargetGroup === "CLASS" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Chọn lớp <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formClassId}
                                            onChange={(e) => setFormClassId(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="">-- Chọn lớp --</option>
                                            {classOptions.map((cls) => (
                                                <option key={cls.id} value={cls.id}>
                                                    {cls.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Loại thông báo
                                </label>
                                <div className="relative">
                                    <select
                                        value={formType}
                                        onChange={(e) => setFormType(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                    >
                                        <option value="MANUAL">Thủ công</option>
                                        <option value="SYSTEM">Hệ thống</option>
                                        <option value="EXAM">Kiểm tra</option>
                                        <option value="SCHEDULE">Thời khóa biểu</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tiêu đề <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề thông báo..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    required
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nội dung <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder="Nhập nội dung thông báo..."
                                    rows={5}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-700">
                                    <strong>Lưu ý:</strong> Thông báo sẽ được gửi đến{" "}
                                    <strong>{TARGET_GROUP_LABELS[formTargetGroup]}</strong>.
                                    {formTargetGroup === "CLASS" && formClassId ? (
                                        <> Lớp đã chọn: <strong>{classOptions.find(c => c.id === formClassId)?.name}</strong>.</>
                                    ) : null}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
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
                </div>,
                document.body
            )}
        </div>
    );
}
