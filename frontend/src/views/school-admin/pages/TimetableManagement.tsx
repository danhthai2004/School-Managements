import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { Plus, Play, Calendar, Eye, Loader2, X, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

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
}

function CreateTimetableModal({ isOpen, onClose, onSuccess }: CreateModalProps) {
    const [name, setName] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [semester, setSemester] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill default academic year
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const defaultYear = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
            setAcademicYear(defaultYear);
            setName("");
            setSemester(1);
            setError(null);
        }
    }, [isOpen]);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Tạo Thời Khóa Biểu Mới</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên TKB *</label>
                        <input
                            type="text"
                            required
                            placeholder="VD: TKB HK1 Năm học 2025-2026"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-slate-800"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Năm học</label>
                            <input
                                type="text"
                                required
                                placeholder="VD: 2025-2026"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-slate-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Học kỳ</label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-slate-800 bg-white"
                            >
                                <option value={1}>Học kỳ 1</option>
                                <option value={2}>Học kỳ 2</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
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
        </div>
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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Xóa thời khóa biểu?</h3>
                    <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{itemName}</span>? Hành động này không thể hoàn tác.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700">Xóa</button>
                    </div>
                </div>
            </div>
        </div>
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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Áp dụng thời khóa biểu?</h3>
                    <p className="text-slate-600 mb-6">
                        Bạn có muốn áp dụng <span className="font-semibold text-slate-900">{itemName}</span> cho toàn trường không?<br />
                        <span className="text-sm text-slate-500 mt-2 block">Trạng thái sẽ chuyển thành <strong>OFFICIAL</strong> và các TKB khác sẽ bị hủy kích hoạt.</span>
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700">Xác nhận</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TimetableManagement() {
    const [timetables, setTimetables] = useState<Timetable[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Create Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Delete Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

    // Apply Modal state
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [selectedApplyTimetable, setSelectedApplyTimetable] = useState<Timetable | null>(null);

    const fetchTimetables = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/school-admin/timetables");
            setTimetables(res.data);
        } catch (error) {
            setError("Không thể tải danh sách thời khóa biểu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimetables();
    }, []);

    const handleGenerate = async (id: string, name: string) => {
        // Simple confirm for generate
        if (!confirm(`Bạn có chắc chắn muốn chạy thuật toán Auto Xếp cho TKB: ${name}?`)) return;

        setGenerating(id);
        setError(null);
        setSuccessMsg(null);

        try {
            await api.post(`/school-admin/timetables/${id}/generate`);
            setSuccessMsg(`Đã tạo lịch xếp tự động thành công cho TKB: ${name}`);
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (error) {
            setError(`Lỗi khi xếp TKB: ${name}. Vui lòng thử lại.`);
        } finally {
            setGenerating(null);
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
            setSuccessMsg(`Đã xóa thời khóa biểu: ${selectedTimetable.name}`);
            setTimeout(() => setSuccessMsg(null), 3000);
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
            setSuccessMsg(`Đã áp dụng TKB "${selectedApplyTimetable.name}" thành công!`);
            setTimeout(() => setSuccessMsg(null), 3000);
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
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Thời Khóa Biểu</h1>
                    <p className="text-slate-500 text-sm mt-1">Danh sách các phiên bản thời khóa biểu</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    <span>Tạo TKB Mới</span>
                </button>
            </div>

            {/* Success/Error Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} />
                    <span>{successMsg}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên TKB</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Năm học</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Học kỳ</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Đang tải...</td>
                            </tr>
                        ) : !Array.isArray(timetables) || timetables.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chưa có thời khóa biểu nào</td>
                            </tr>
                        ) : (
                            timetables.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Calendar size={18} />
                                            </div>
                                            <span className="font-semibold text-slate-900">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{t.academicYear}</td>
                                    <td className="px-6 py-4 text-slate-600">{t.semester}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.status === 'OFFICIAL' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {t.status === 'OFFICIAL' ? 'Đang áp dụng' : 'Bản nháp'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {t.status !== 'OFFICIAL' && (
                                                <button
                                                    onClick={() => openApplyModal(t)}
                                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors group"
                                                    title="Áp dụng cho toàn trường"
                                                >
                                                    <CheckCircle2 size={18} className="group-hover:stroke-[2.5px]" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleGenerate(t.id, t.name)}
                                                disabled={generating === t.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                                title="Chạy thuật toán xếp tự động"
                                            >
                                                {generating === t.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                Auto Xếp
                                            </button>

                                            <button
                                                onClick={() => navigate(`/school-admin/schedule/${t.id}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
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
                    setSuccessMsg("Tạo thời khóa biểu mới thành công!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                }}
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
        </div>
    );
}
