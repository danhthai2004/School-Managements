import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { Plus, Play, Calendar, Eye, Loader2, X, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

import { schoolAdminService } from "../../../services/schoolAdminService";

interface Timetable {
    id: string;
    name: string;
    academicYear: string;
    semester: number;
    status: string;
    createdAt: string;
}

// Modal Component for Creating Timetable
interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultAcademicYear: string;
}

function CreateTimetableModal({ isOpen, onClose, onSuccess, defaultAcademicYear }: CreateModalProps) {
    const [name, setName] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [semester, setSemester] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill default academic year
    useEffect(() => {
        if (isOpen) {
            setAcademicYear(defaultAcademicYear);
            setName("");
            setSemester(1);
            setError(null);
        }
    }, [isOpen, defaultAcademicYear]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post("/school-admin/timetables", {
                name,
                academicYear,
                semester
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
                            <input
                                type="text"
                                required
                                placeholder="VD: 2025-2026"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-800 bg-white"
                            >
                                <option value={1}>Học kỳ 1</option>
                                <option value={2}>Học kỳ 2</option>
                            </select>
                        </div>
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

// Modal for Deleting Timetable
interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName }: DeleteModalProps) {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa thời khóa biểu?</h3>
                    <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa <span className="font-semibold text-gray-900">{itemName}</span>? Hành động này không thể hoàn tác.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">Hủy</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700">Xóa</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal for Applying Timetable
interface ApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

function ApplyConfirmationModal({ isOpen, onClose, onConfirm, itemName }: ApplyModalProps) {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Áp dụng thời khóa biểu?</h3>
                    <p className="text-gray-600 mb-6">
                        Bạn có muốn áp dụng <span className="font-semibold text-gray-900">{itemName}</span> cho toàn trường không?<br />
                        <span className="text-sm text-gray-500 mt-2 block">Trạng thái sẽ chuyển thành <strong>OFFICIAL</strong> và các TKB khác sẽ bị hủy kích hoạt.</span>
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">Hủy</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700">Xác nhận</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal for Generate Confirmation
interface GenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

function GenerateConfirmationModal({ isOpen, onClose, onConfirm, itemName }: GenerateModalProps) {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-8 h-8 text-indigo-600 pl-1" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Chạy Xếp Lịch Tự Động?</h3>
                    <p className="text-gray-600 mb-6">
                        Hệ thống sẽ tự động sắp xếp thời khóa biểu cho <span className="font-semibold text-gray-900">{itemName}</span> dựa trên dữ liệu hiện tại.<br />
                        <span className="text-xs text-gray-500 mt-2 block">Quá trình này có thể mất vài phút.</span>
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">Hủy</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Auto-Close Success Modal
interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

function AutoCloseSuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 2500); // Auto close after 2.5s
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
            {/* Transparent backdrop so user can see behind, but maybe slightly dimmed? Let's keep it minimal for "notification" feel or full modal? User said "Modal xuất hiện... rồi tự tắt" -> likely a center modal. */}
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative bg-white/90 backdrop-blur-md border border-white/50 shadow-2xl rounded-2xl p-6 min-w-[300px] transform transition-all animate-in fade-in zoom-in duration-300 pointer-events-auto">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{message}</h3>
                </div>
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

    // Success Modal State
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Create Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Delete Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

    // Apply Modal state
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [selectedApplyTimetable, setSelectedApplyTimetable] = useState<Timetable | null>(null);

    // Generate Modal state
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [selectedGenerateTimetable, setSelectedGenerateTimetable] = useState<Timetable | null>(null);

    const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");

    const fetchTimetables = async () => {
        setLoading(true);
        setError(null);
        try {
            const [timetablesData, statsData] = await Promise.all([
                api.get("/school-admin/timetables").then(res => res.data),
                schoolAdminService.getStats()
            ]);
            setTimetables(timetablesData);
            if (statsData?.currentAcademicYear) {
                setCurrentAcademicYear(statsData.currentAcademicYear);
            }
        } catch (error) {
            setError("Không thể tải danh sách thời khóa biểu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimetables();
    }, []);

    const handleGenerateClick = (timetable: Timetable) => {
        setSelectedGenerateTimetable(timetable);
        setGenerateModalOpen(true);
    };

    const handleConfirmGenerate = async () => {
        if (!selectedGenerateTimetable) return;
        const timetable = selectedGenerateTimetable;

        setGenerateModalOpen(false); // Close confirm modal
        setGenerating(timetable.id);
        setError(null);

        try {
            await api.post(`/school-admin/timetables/${timetable.id}/generate`);

            // Show success modal
            setSuccessMessage(`Đã xếp lịch thành công cho: ${timetable.name}`);
            setSuccessModalOpen(true);

            // Note: success modal auto-closes
        } catch (error) {
            setError(`Lỗi khi xếp TKB: ${timetable.name}. Vui lòng thử lại.`);
        } finally {
            setGenerating(null);
            setSelectedGenerateTimetable(null);
        }
    };

    const confirmDelete = (timetable: Timetable) => {
        setSelectedTimetable(timetable);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedTimetable) return;
        setDeleteModalOpen(false);
        setLoading(true);
        try {
            await api.delete(`/school-admin/timetables/${selectedTimetable.id}`);

            setSuccessMessage(`Đã xóa: ${selectedTimetable.name}`);
            setSuccessModalOpen(true);

            fetchTimetables();
        } catch (error) {
            setError("Lỗi khi xóa thời khóa biểu.");
        } finally {
            setLoading(false);
            setSelectedTimetable(null);
        }
    };

    const openApplyModal = (timetable: Timetable) => {
        setSelectedApplyTimetable(timetable);
        setApplyModalOpen(true);
    };

    const handleApplyConfirm = async () => {
        if (!selectedApplyTimetable) return;
        setApplyModalOpen(false);
        setLoading(true);
        try {
            await api.post(`/school-admin/timetables/${selectedApplyTimetable.id}/apply`);

            setSuccessMessage(`Đã áp dụng TKB: ${selectedApplyTimetable.name}`);
            setSuccessModalOpen(true);

            fetchTimetables();
        } catch (error) {
            setError("Lỗi khi áp dụng thời khóa biểu.");
        } finally {
            setLoading(false);
            setSelectedApplyTimetable(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Thời Khóa Biểu</h1>
                    <p className="text-gray-500 text-sm mt-1">Danh sách các phiên bản thời khóa biểu</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    <span>Tạo TKB Mới</span>
                </button>
            </div>

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
                                        {new Date(t.createdAt).toLocaleDateString("vi-VN")}
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
                    setSuccessMessage("Tạo thời khóa biểu mới thành công!");
                    setSuccessModalOpen(true);
                }}
                defaultAcademicYear={currentAcademicYear}
            />

            {/* Delete Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                itemName={selectedTimetable?.name || ""}
            />

            {/* Apply Modal */}
            <ApplyConfirmationModal
                isOpen={applyModalOpen}
                onClose={() => setApplyModalOpen(false)}
                onConfirm={handleApplyConfirm}
                itemName={selectedApplyTimetable?.name || ""}
            />

            {/* Generate Confirmation Modal */}
            <GenerateConfirmationModal
                isOpen={generateModalOpen}
                onClose={() => setGenerateModalOpen(false)}
                onConfirm={handleConfirmGenerate}
                itemName={selectedGenerateTimetable?.name || ""}
            />

            {/* Auto-Close Success Modal */}
            <AutoCloseSuccessModal
                isOpen={successModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                message={successMessage}
            />
        </div>
    );
}
