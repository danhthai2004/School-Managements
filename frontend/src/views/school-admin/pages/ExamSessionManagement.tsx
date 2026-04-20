import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    examAdminService,
    type ExamSessionDto,
    type CreateExamSessionRequest,
    type ExamAllocateRequest,
} from "../../../services/examAdminService";
import { schoolAdminService, type RoomDto, type SubjectDto, type TeacherDto } from "../../../services/schoolAdminService";
import { Loader2, Calendar, Edit2, Trash2, Plus, Users, ChevronRight, ChevronLeft, Building2, CheckCircle, X, Eye, BookOpen, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import { vi } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from "../../../context/ToastContext";
import { formatDate } from "../../../utils/dateHelpers";
import { useSemester } from "../../../context/SemesterContext";
import SemesterSelector from "../../../components/common/SemesterSelector";

const GRADES = [10, 11, 12];
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
        name: "", academicYear: "", semester: 2, startDate: "", endDate: "", status: "DRAFT",
    });
    const [saving, setSaving] = useState(false);

    // ====== Wizard state ======
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardSession, setWizardSession] = useState<ExamSessionDto | null>(null);

    // Step 1: Subject + Grade
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedGrade, setSelectedGrade] = useState(10);

    // Step 2: Date + Time
    const [examDate, setExamDate] = useState("");
    const [startTime, setStartTime] = useState("07:30");
    const [endTime, setEndTime] = useState("08:30");

    // Step 3: Rooms
    const [availableRooms, setAvailableRooms] = useState<RoomDto[]>([]);
    const [selectedRooms, setSelectedRooms] = useState<{ roomId: string; capacity: number; teacherIds: string[] }[]>([]);
    const [teachers, setTeachers] = useState<TeacherDto[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Step 4: Result
    const [allocating, setAllocating] = useState(false);
    const [allocResult, setAllocResult] = useState<{ message: string; allocatedCount: number } | null>(null);

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
        if (!isContextLoading && selectedSemesterId) {
            fetchSessions(); 
        }
    }, [selectedSemesterId, isContextLoading]);

    // ====== Session CRUD ======
    const openCreateSession = () => {
        setSessionForm({ name: "", academicYear: availableYears.length > 0 ? availableYears[0] : "", semester: 2, startDate: "", endDate: "", status: "DRAFT" });
        setEditSession(null);
        setSessionModal(true);
    };

    const openEditSession = (s: ExamSessionDto) => {
        setSessionForm({ name: s.name, academicYear: s.academicYear, semester: s.semester, startDate: s.startDate, endDate: s.endDate, status: s.status });
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

    const handleDeleteSession = async (id: string) => {
        if (!window.confirm("Bạn chắc chắn muốn xóa kỳ thi này? Tất cả lịch thi, phòng thi và danh sách học sinh liên quan sẽ bị xóa.")) return;
        try {
            await examAdminService.deleteSession(id);
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
    };

    const handleStatusChange = async (session: ExamSessionDto, newStatus: "PUBLISHED" | "COMPLETED") => {
        const label = newStatus === "PUBLISHED" ? "công bố" : "hoàn thành";
        if (!window.confirm(`Bạn chắc chắn muốn chuyển kỳ thi "${session.name}" sang trạng thái ${label}?`)) return;
        try {
            await examAdminService.updateSessionStatus(session.id, newStatus);
            toast.success(`Đã ${label} kỳ thi "${session.name}"`);
            fetchSessions();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || `Không thể ${label} kỳ thi`);
        }
    };

    // ====== Wizard ======
    const openWizard = async (session: ExamSessionDto) => {
        setWizardSession(session);
        setWizardStep(0);
        setWizardOpen(true);
        setAllocResult(null);
        setSelectedRooms([]);

        // Load subjects + teachers
        try {
            const [subs, tchs] = await Promise.all([
                schoolAdminService.listSubjects(),
                schoolAdminService.listTeacherProfiles(0, 1000),
            ]);
            setSubjects(subs.filter(s => s.type !== "ACTIVITY" && s.code !== "CC" && s.code !== "SHL"));
            setTeachers(tchs.content);
            if (subs.length > 0) setSelectedSubject(subs[0].id);
        } catch {
            toast.error("Lỗi tải dữ liệu");
        }
    };

    const wizardNext = async () => {
        if (wizardStep === 1) {
            if (startTime && endTime && endTime <= startTime) {
                toast.error("Giờ kết thúc phải lớn hơn giờ bắt đầu");
                return;
            }
            // Fetch available rooms
            setLoadingRooms(true);
            try {
                const rooms = await examAdminService.getAvailableRooms(examDate, startTime, endTime);
                setAvailableRooms(rooms);
                setSelectedRooms([]);
            } catch (e: any) {
                toast.error(e?.response?.data?.message || "Lỗi tải phòng trống");
                return;
            } finally {
                setLoadingRooms(false);
            }
        }
        setWizardStep(prev => prev + 1);
    };

    const wizardBack = () => setWizardStep(prev => Math.max(0, prev - 1));

    const toggleRoom = (room: RoomDto) => {
        setSelectedRooms(prev => {
            const exists = prev.find(r => r.roomId === room.id);
            if (exists) return prev.filter(r => r.roomId !== room.id);
            return [...prev, { roomId: room.id, capacity: room.capacity, teacherIds: [] }];
        });
    };

    const setRoomTeacher = (roomId: string, teacherId: string) => {
        setSelectedRooms(prev => prev.map(r =>
            r.roomId === roomId ? { ...r, teacherIds: teacherId ? [teacherId] : [] } : r
        ));
    };

    const handleAllocate = async () => {
        if (!wizardSession || selectedRooms.length === 0) return;
        setAllocating(true);
        try {
            const req: ExamAllocateRequest = {
                examSessionId: wizardSession.id,
                subjectId: selectedSubject,
                grade: selectedGrade,
                examDate,
                startTime,
                endTime,
                rooms: selectedRooms,
            };
            const result = await examAdminService.allocateExam(req);
            setAllocResult(result);
            setWizardStep(3);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi phân bổ");
        } finally {
            setAllocating(false);
        }
    };

    const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "";

    // ====== RENDER ======
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kỳ thi & Phân bổ phòng thi</h1>
                    <p className="text-sm text-gray-500 mt-1">Tạo kỳ thi, phân bổ học sinh ngẫu nhiên vào phòng thi</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <SemesterSelector 
                        value={selectedSemesterId} 
                        onChange={setSelectedSemesterId}
                        label="" 
                        className="h-[42px]"
                    />
                    <button onClick={openCreateSession}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                        <Plus className="w-4 h-4" /> Tạo kỳ thi
                    </button>
                </div>
            </div>

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
                                    <p className="text-xs text-gray-500 mt-0.5">{s.academicYear} — HK{s.semester}</p>
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
                                <button onClick={() => openWizard(s)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors">
                                    <Users className="w-4 h-4" /> Phân bổ
                                </button>
                                <button onClick={() => navigate(`/school-admin/exam-sessions/${s.id}`)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Xem chi tiết">
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => openEditSession(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteSession(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên kỳ thi *</label>
                                <input value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    placeholder="VD: Giữa kỳ 1, Cuối kỳ 2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm học *</label>
                                    <select value={sessionForm.academicYear} onChange={e => setSessionForm({ ...sessionForm, academicYear: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                                        {availableYears.length > 0 ? (
                                            availableYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))
                                        ) : (
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
                                        locale={vi}
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
                                        locale={vi}
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
                                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50">
                                {saving ? "Đang lưu..." : editSession ? "Cập nhật" : "Tạo mới"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Wizard ==================== */}
            {wizardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                        {/* Wizard Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Phân bổ học sinh vào phòng thi</h2>
                                <p className="text-xs text-gray-500">{wizardSession?.name}</p>
                            </div>
                            <button onClick={() => setWizardOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Steps indicator */}
                        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                            {["Môn & Khối", "Thời gian", "Phòng thi", "Hoàn tất"].map((label, i) => (
                                <div key={i} className="flex items-center gap-1.5 flex-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= wizardStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>{i + 1}</div>
                                    <span className={`text-xs ${i <= wizardStep ? "text-blue-600 font-medium" : "text-gray-400"} hidden sm:inline`}>{label}</span>
                                    {i < 3 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                                </div>
                            ))}
                        </div>

                        {/* Wizard Body */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Step 0: Subject + Grade */}
                            {wizardStep === 0 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2"><BookOpen className="w-4 h-4 inline mr-1" />Chọn môn thi</label>
                                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2"><Users className="w-4 h-4 inline mr-1" />Chọn khối</label>
                                        <div className="flex gap-2">
                                            {GRADES.map(g => (
                                                <button key={g} onClick={() => setSelectedGrade(g)}
                                                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${selectedGrade === g ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                                    Khối {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Date + Time */}
                            {wizardStep === 1 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar className="w-4 h-4 inline mr-1" />Ngày thi</label>
                                        <DatePicker
                                            selected={examDate ? new Date(examDate) : null}
                                            onChange={(date: Date | null) => {
                                                if (date) {
                                                    const y = date.getFullYear();
                                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                                    const d = String(date.getDate()).padStart(2, '0');
                                                    setExamDate(`${y}-${m}-${d}`);
                                                } else {
                                                    setExamDate("");
                                                }
                                            }}
                                            minDate={wizardSession?.startDate ? new Date(wizardSession.startDate) : undefined}
                                            maxDate={wizardSession?.endDate ? new Date(wizardSession.endDate) : undefined}
                                            dateFormat="dd/MM/yyyy"
                                            locale={vi}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm"
                                            placeholderText="DD/MM/YYYY"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="w-4 h-4 inline mr-1" />Giờ bắt đầu</label>
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Giờ kết thúc</label>
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Rooms */}
                            {wizardStep === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">Phòng trống ({availableRooms.length})</h3>
                                        <span className="text-sm text-gray-500">Đã chọn: {selectedRooms.length}</span>
                                    </div>
                                    {loadingRooms ? (
                                        <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Đang tải phòng...</div>
                                    ) : availableRooms.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>Không có phòng trống trong thời gian này</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {availableRooms.map(room => {
                                                const isSelected = selectedRooms.some(r => r.roomId === room.id);
                                                const selectedRoom = selectedRooms.find(r => r.roomId === room.id);
                                                return (
                                                    <div key={room.id} className={`border rounded-xl p-3 transition-all ${isSelected ? "border-blue-300 bg-blue-50/50" : "border-gray-200 hover:border-gray-300"}`}>
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleRoom(room)}
                                                                className="w-4 h-4 text-blue-600 rounded" />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                                    <span className="font-medium text-gray-900 text-sm">{room.name}</span>
                                                                    {room.building && <span className="text-xs text-gray-400">({room.building})</span>}
                                                                </div>
                                                                <span className="text-xs text-gray-500"><Users className="w-3 h-3 inline mr-0.5" />{room.capacity} chỗ</span>
                                                            </div>
                                                            {isSelected && (
                                                                <select value={selectedRoom?.teacherIds[0] || ""} onChange={e => setRoomTeacher(room.id, e.target.value)}
                                                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-40">
                                                                    <option value="">-- Chọn giám thị --</option>
                                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Result */}
                            {wizardStep === 3 && allocResult && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Phân bổ thành công!</h3>
                                    <p className="text-gray-600 mb-4">{allocResult.message}</p>
                                    <div className="bg-gray-50 rounded-xl p-4 max-w-xs mx-auto space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-500">Môn thi:</span><span className="font-medium">{getSubjectName(selectedSubject)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Khối:</span><span className="font-medium">{selectedGrade}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Ngày:</span><span className="font-medium">{examDate}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Giờ:</span><span className="font-medium">{startTime} - {endTime}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Số phòng:</span><span className="font-medium">{selectedRooms.length}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Số HS:</span><span className="font-bold text-blue-600">{allocResult.allocatedCount}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Wizard Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between">
                            <button onClick={wizardStep === 3 ? () => setWizardOpen(false) : wizardBack} disabled={wizardStep === 0}
                                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                                {wizardStep === 3 ? "Đóng" : <><ChevronLeft className="w-4 h-4" /> Quay lại</>}
                            </button>
                            {wizardStep < 2 && (
                                <button onClick={wizardNext} disabled={(wizardStep === 1 && !examDate)}
                                    className="flex items-center gap-1 px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50">
                                    Tiếp theo <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {wizardStep === 2 && (
                                <button onClick={handleAllocate} disabled={selectedRooms.length === 0 || allocating}
                                    className="flex items-center gap-1 px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                                    {allocating ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang phân bổ...</> : <><Users className="w-4 h-4" /> Phân bổ ngẫu nhiên</>}
                                </button>
                            )}
                            {wizardStep === 3 && (
                                <button onClick={() => { setWizardStep(0); setAllocResult(null); }}
                                    className="flex items-center gap-1 px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                                    <Plus className="w-4 h-4" /> Phân bổ thêm
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
