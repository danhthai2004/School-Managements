import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    examAdminService,
    type ExamSessionDto,
    type CreateExamSessionRequest,
} from "../../../services/examAdminService";
import { Loader2, Calendar, Edit2, Trash2, Plus, CheckCircle, X, Eye } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from "../../../context/ToastContext";
import { formatDate } from "../../../utils/dateHelpers";
import { useSemester } from "../../../context/SemesterContext";
import SemesterSelector from "../../../components/common/SemesterSelector";
import { NoAcademicYearState } from "../../../components/common/EmptyState";
import { useConfirmation } from "../../../hooks/useConfirmation";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Nháp", cls: "bg-gray-100 text-gray-600" },
    PUBLISHED: { label: "Đã công bố", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Hoàn thành", cls: "bg-blue-100 text-blue-700" },
};

export default function ExamSessionManagement() {
    // ====== Session list ======
    const [sessions, setSessions] = useState<ExamSessionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();
    // Global context
    const { activeSemester, allSemesters, loading: isContextLoading } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const { confirm, ConfirmationDialog } = useConfirmation();

    // Initial load priority: System Active Semester
    useEffect(() => {
        if (!selectedSemesterId && activeSemester) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const selectedSemester = allSemesters.find(s => s.id === selectedSemesterId);
    const availableYears = allSemesters.map(s => s.academicYearName).filter((value, index, self) => self.indexOf(value) === index);

    // ====== Session modal ======
    const [sessionModal, setSessionModal] = useState(false);
    const [editSession, setEditSession] = useState<ExamSessionDto | null>(null);
    const [sessionForm, setSessionForm] = useState<CreateExamSessionRequest>({
        name: "", academicYear: "", semester: 1, startDate: "", endDate: "", status: "DRAFT", type: "MIDTERM"
    });
    const [saving, setSaving] = useState(false);



    // ====== Fetch data ======
    const fetchSessions = async () => {
        if (!selectedSemesterId || !selectedSemester) return;
        try {
            setLoading(true);
            const data = await examAdminService.listSessions(
                selectedSemester.academicYearName,
                selectedSemester.semesterNumber
            );
            setSessions(data);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi tải danh sách kỳ thi");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isContextLoading) {
            if (selectedSemesterId) {
                fetchSessions();
            } else {
                setLoading(false);
            }
        }
    }, [selectedSemesterId, isContextLoading]);

    // ====== Session CRUD ======
    const openCreateSession = () => {
        setSessionForm({
            name: "",
            academicYear: selectedSemester?.academicYearName || (availableYears.length > 0 ? availableYears[0] : ""),
            semester: selectedSemester?.semesterNumber || 1,
            startDate: "",
            endDate: "",
            status: "DRAFT",
            type: "MIDTERM"
        });
        setEditSession(null);
        setSessionModal(true);
    };

    const openEditSession = (s: ExamSessionDto) => {
        setSessionForm({ name: s.name, academicYear: s.academicYear, semester: s.semester, startDate: s.startDate, endDate: s.endDate, status: s.status, type: s.type });
        setEditSession(s);
        setSessionModal(true);
    };

    const handleSaveSession = async () => {
        if (!sessionForm.name?.trim() || !sessionForm.startDate || !sessionForm.endDate) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        if (new Date(sessionForm.endDate) < new Date(sessionForm.startDate)) {
            toast.error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
            return;
        }

        try {
            setSaving(true);
            if (editSession) {
                await examAdminService.updateSession(editSession.id, sessionForm);
            } else {
                await examAdminService.createSession(sessionForm);
            }
            setSessionModal(false);
            toast.success(editSession ? "Cập nhật kỳ thi thành công!" : "Tạo kỳ thi thành công!");
            fetchSessions();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi lưu kỳ thi");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSession = async (session: ExamSessionDto) => {
        confirm({
            title: "Xóa kỳ thi?",
            message: (
                <div>
                    <p>Bạn chắc chắn muốn xóa kỳ thi <strong>{session.name}</strong>?</p>
                    <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 italic">
                        Lưu ý: Tất cả lịch thi, phòng thi và danh sách học sinh liên quan sẽ bị xóa vĩnh viễn.
                    </p>
                </div>
            ),
            variant: "danger",
            confirmText: "Xóa kỳ thi",
            onConfirm: async () => {
                try {
                    await examAdminService.deleteSession(session.id);
                    toast.success("Đã xóa kỳ thi và toàn bộ dữ liệu liên quan");
                    fetchSessions();
                } catch (e: any) {
                    const status = e?.response?.status;
                    const msg = e?.response?.data?.message;
                    if (status === 404) {
                        toast.error("Kỳ thi không tồn tại hoặc đã bị xóa trước đó");
                    } else if (status === 409 || (msg && msg.includes("constraint"))) {
                        toast.error("Không thể xóa: Kỳ thi đang có dữ liệu ràng buộc. Vui lòng thử lại.");
                    } else {
                        toast.error(msg || "Có lỗi xảy ra khi xóa kỳ thi. Vui lòng thử lại.");
                    }
                }
            }
        });
    };

    const handleStatusChange = async (session: ExamSessionDto, newStatus: "PUBLISHED" | "COMPLETED") => {
        const label = newStatus === "PUBLISHED" ? "công bố" : "hoàn thành";
        confirm({
            title: `Thay đổi trạng thái?`,
            message: `Bạn chắc chắn muốn chuyển kỳ thi "${session.name}" sang trạng thái ${label}?`,
            variant: newStatus === "PUBLISHED" ? "success" : "primary",
            confirmText: "Xác nhận",
            onConfirm: async () => {
                try {
                    await examAdminService.updateSessionStatus(session.id, newStatus);
                    toast.success(`Đã ${label} kỳ thi "${session.name}"`);
                    fetchSessions();
                } catch (e: any) {
                    toast.error(e?.response?.data?.message || `Không thể ${label} kỳ thi`);
                }
            }
        });
    };



    // ====== RENDER ======
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kỳ thi</h1>
                    <p className="text-sm text-gray-500 mt-1">Tạo và quản lý các kỳ thi</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <SemesterSelector
                        value={selectedSemesterId}
                        onChange={setSelectedSemesterId}
                        label=""
                        className="h-[42px]"
                    />
                    <button onClick={openCreateSession}
                        disabled={allSemesters.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
                        <Plus className="w-4 h-4" /> Tạo kỳ thi
                    </button>
                </div>
            </div>

            {allSemesters.length === 0 && !isContextLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <NoAcademicYearState onAction={() => navigate("/school-admin/semesters")} />
                </div>
            ) : (
                <>
                    {/* Session Cards */}
                    {loading ? (
                        <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Đang tải...</div>
                    ) : sessions.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Chưa có kỳ thi nào</p>
                            <button onClick={openCreateSession} className="mt-3 text-blue-600 text-sm hover:underline">+ Tạo kỳ thi mới</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sessions.map(s => (
                                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-gray-500">{s.academicYear} — HK{s.semester}</p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${s.type === 'MIDTERM' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                                    {s.type === 'MIDTERM' ? 'GIỮA KỲ' : 'CUỐI KỲ'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[s.status]?.cls || "bg-gray-100"}`}>
                                            {STATUS_MAP[s.status]?.label || s.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(s.startDate)}</span>
                                        <span>→</span>
                                        <span>{formatDate(s.endDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                                        {s.status === "DRAFT" && (
                                            <button onClick={() => handleStatusChange(s, "PUBLISHED")}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors"
                                                title="Công bố kỳ thi">
                                                <CheckCircle className="w-4 h-4" /> Công bố
                                            </button>
                                        )}
                                        {s.status === "PUBLISHED" && (
                                            <button onClick={() => handleStatusChange(s, "COMPLETED")}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                                                title="Đánh dấu hoàn thành">
                                                <CheckCircle className="w-4 h-4" /> Hoàn thành
                                            </button>
                                        )}
                                        <button onClick={() => navigate(`/school-admin/exam-sessions/${s.id}`)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Xem chi tiết">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openEditSession(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteSession(s)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ==================== Session Modal ==================== */}
            {sessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setSessionModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-[100]">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{editSession ? "Sửa kỳ thi" : "Tạo kỳ thi mới"}</h2>
                                        <p className="text-blue-100 text-sm">{editSession ? "Cập nhật thông tin kỳ thi" : "Tạo kỳ thi và thiết lập thời gian"}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSessionModal(false)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên kỳ thi *</label>
                                    <input value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="VD: HK1, HK2" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại kỳ thi *</label>
                                    <select value={sessionForm.type} onChange={e => setSessionForm({ ...sessionForm, type: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                                        <option value="MIDTERM">Giữa kỳ</option>
                                        <option value="FINAL">Cuối kỳ</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm học *</label>
                                    <select value={sessionForm.academicYear} onChange={e => setSessionForm({ ...sessionForm, academicYear: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                                        {allSemesters
                                            .map(s => s.academicYearName)
                                            .filter((v, i, a) => a.indexOf(v) === i)
                                            .sort((a, b) => b.localeCompare(a))
                                            .map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))
                                        }
                                        {allSemesters.length === 0 && (
                                            <option value="" disabled>Chưa có Năm học</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ *</label>
                                    <select value={sessionForm.semester} onChange={e => setSessionForm({ ...sessionForm, semester: +e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                                        <option value={1}>Học kỳ 1</option>
                                        <option value={2}>Học kỳ 2</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                                    <DatePicker
                                        selected={sessionForm.startDate ? new Date(sessionForm.startDate) : null}
                                        onChange={(date: Date | null) => {
                                            if (date) {
                                                const y = date.getFullYear();
                                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                                const d = String(date.getDate()).padStart(2, '0');
                                                setSessionForm({ ...sessionForm, startDate: `${y}-${m}-${d}` });
                                            } else {
                                                setSessionForm({ ...sessionForm, startDate: "" });
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm"
                                        placeholderText="DD/MM/YYYY"
                                        wrapperClassName="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
                                    <DatePicker
                                        selected={sessionForm.endDate ? new Date(sessionForm.endDate) : null}
                                        onChange={(date: Date | null) => {
                                            if (date) {
                                                const y = date.getFullYear();
                                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                                const d = String(date.getDate()).padStart(2, '0');
                                                setSessionForm({ ...sessionForm, endDate: `${y}-${m}-${d}` });
                                            } else {
                                                setSessionForm({ ...sessionForm, endDate: "" });
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm"
                                        placeholderText="DD/MM/YYYY"
                                        wrapperClassName="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                            <button onClick={() => setSessionModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                            <button onClick={handleSaveSession} disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-semibold disabled:opacity-50 hover:from-blue-700 hover:to-blue-600"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        {editSession ? "Cập nhật" : "Tạo mới"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <ConfirmationDialog />
        </div>
    );
}