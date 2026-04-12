import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { Plus, Play, Calendar, Eye, Loader2, X, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

import { useToast } from "../../../context/ToastContext";
import { useConfirmation } from "../../../hooks/useConfirmation";
import { formatDate } from "../../../utils/dateHelpers";

interface Timetable {
    id: string;
    name: string;
    academicYear: string;
    semester: number;
    status: string;
    createdAt: string;
}

import { useSemester } from "../../../context/SemesterContext";
import SemesterSelector from "../../../components/common/SemesterSelector";
import { NoAcademicYearState } from "../../../components/common/EmptyState";

// Modal Component for Creating Timetable
interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function CreateTimetableModal({ isOpen, onClose, onSuccess }: CreateModalProps) {
    const { activeSemester, allSemesters } = useSemester();
    const [name, setName] = useState("");
    const [semesterId, setSemesterId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill default semester info
    useEffect(() => {
        if (isOpen) {
            if (activeSemester) {
                setSemesterId(activeSemester.id);
            } else if (allSemesters.length > 0) {
                setSemesterId(allSemesters[0].id);
            }
            setName("");
            setError(null);
        }
    }, [isOpen, activeSemester, allSemesters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!semesterId) {
            setError("Vui lòng chọn học kỳ.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            await api.post("/school-admin/timetables", {
                name,
                semesterId
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError("Có lỗi xảy ra khi tạo thời khóa biểu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[100]">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex-none z-[110]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Tạo Thời Khóa Biểu Mới</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên TKB *</label>
                        <input
                            type="text"
                            required
                            placeholder="VD: TKB HK1 Năm học 2025-2026"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-800"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ & Năm học *</label>
                        <select
                            value={semesterId}
                            onChange={(e) => setSemesterId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-800 bg-white"
                        >
                            <option value="">-- Chọn học kỳ --</option>
                            {allSemesters.map(s => (
                                <option key={s.id} value={s.id}>
                                    Học kỳ {s.semesterNumber} ({s.academicYearName})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

export default function TimetableManagement() {
    const [timetables, setTimetables] = useState<Timetable[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Global Hooks
    const { showSuccess } = useToast();
    const { confirm, ConfirmationDialog } = useConfirmation();

    // Create Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { activeSemester, allSemesters, loading: isContextLoading } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    // Initial load priority: System Active Semester
    useEffect(() => {
        if (!selectedSemesterId && activeSemester) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const fetchTimetables = async () => {
        if (!selectedSemesterId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.get("/school-admin/timetables", {
                params: { semesterId: selectedSemesterId }
            }).then(res => res.data);
            setTimetables(data);
        } catch (error) {
            setError("Không thể tải danh sách thời khóa biểu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isContextLoading) {
            if (selectedSemesterId) {
                fetchTimetables();
            } else {
                setLoading(false);
            }
        }
    }, [selectedSemesterId, isContextLoading]);

    const handleGenerateClick = (timetable: Timetable) => {
        confirm({
            title: "Chạy Xếp Lịch Tự Động?",
            message: (
                <span>
                    Hệ thống sẽ tự động sắp xếp thời khóa biểu cho <strong>{timetable.name}</strong> dựa trên dữ liệu hiện tại.<br />
                    <span className="text-xs text-gray-500 mt-2 block">Quá trình này có thể mất vài phút.</span>
                </span>
            ),
            confirmText: "Xác nhận",
            onConfirm: async () => {
                setGenerating(timetable.id);
                setError(null);
                try {
                    await api.post(`/school-admin/timetables/${timetable.id}/generate`);
                    showSuccess(`Đã xếp lịch thành công cho: ${timetable.name}`);
                } catch (error) {
                    setError(`Lỗi khi xếp TKB: ${timetable.name}. Vui lòng thử lại.`);
                } finally {
                    setGenerating(null);
                }
            }
        });
    };

    const confirmDelete = (timetable: Timetable) => {
        confirm({
            title: "Xóa thời khóa biểu?",
            message: <span>Bạn có chắc chắn muốn xóa <strong>{timetable.name}</strong>? Hành động này không thể hoàn tác.</span>,
            variant: "danger",
            confirmText: "Xóa",
            onConfirm: async () => {
                setLoading(true);
                try {
                    await api.delete(`/school-admin/timetables/${timetable.id}`);
                    showSuccess(`Đã xóa: ${timetable.name}`);
                    fetchTimetables();
                } catch (error) {
                    setError("Lỗi khi xóa thời khóa biểu.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const openApplyModal = (timetable: Timetable) => {
        confirm({
            title: "Áp dụng thời khóa biểu?",
            message: (
                <span>
                    Bạn có muốn áp dụng <strong>{timetable.name}</strong> cho toàn trường không?<br />
                    <span className="text-sm text-gray-500 mt-2 block">Trạng thái sẽ chuyển thành <strong>OFFICIAL</strong> và các TKB khác sẽ bị hủy kích hoạt.</span>
                </span>
            ),
            variant: "success",
            confirmText: "Xác nhận",
            onConfirm: async () => {
                setLoading(true);
                try {
                    await api.post(`/school-admin/timetables/${timetable.id}/apply`);
                    showSuccess(`Đã áp dụng TKB: ${timetable.name}`);
                    fetchTimetables();
                } catch (error) {
                    setError("Lỗi khi áp dụng thời khóa biểu.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Thời Khóa Biểu</h1>
                    <p className="text-sm text-gray-500 mt-1">Danh sách các phiên bản thời khóa biểu</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <SemesterSelector 
                        value={selectedSemesterId} 
                        onChange={setSelectedSemesterId}
                        label="" 
                        className="h-[42px]"
                    />
                    <button onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
                    >
                        <Plus size={20} />
                        Tạo TKB Mới
                    </button>
                </div>
            </div>

            {allSemesters.length === 0 && !isContextLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <NoAcademicYearState onAction={() => navigate("/school-admin/semesters")} />
                </div>
            ) : (
                <>
                {/* Error Alerts (Keep error as banner, logical for persistent issues) */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên TKB</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Năm học</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Học kỳ</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Đang tải...</td>
                            </tr>
                        ) : !Array.isArray(timetables) || timetables.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Chưa có thời khóa biểu nào</td>
                            </tr>
                        ) : (
                            timetables.map((t) => (
                                <tr key={t.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Calendar size={18} />
                                            </div>
                                            <span className="font-semibold text-gray-900">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{t.academicYear}</td>
                                    <td className="px-6 py-4 text-gray-600">{t.semester}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${t.status === 'OFFICIAL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {t.status === 'OFFICIAL' ? 'Đang áp dụng' : 'Bản nháp'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {formatDate(t.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {t.status !== 'OFFICIAL' && (
                                                <button
                                                    onClick={() => openApplyModal(t)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors group"
                                                    title="Áp dụng cho toàn trường"
                                                >
                                                    <CheckCircle2 size={18} className="group-hover:stroke-[2.5px]" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleGenerateClick(t)}
                                                disabled={generating === t.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                                title="Chạy thuật toán xếp tự động"
                                            >
                                                {generating === t.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                Auto Xếp
                                            </button>

                                            <button
                                                onClick={() => navigate(`/school-admin/schedule/${t.id}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                            >
                                                <Eye size={14} />
                                            </button>

                                            <button
                                                onClick={() => confirmDelete(t)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Xóa thời khóa biểu"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <CreateTimetableModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    fetchTimetables();
                    showSuccess("Tạo thời khóa biểu mới thành công!");
                }}
            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog />
            </>
            )}
        </div>
    );
}
