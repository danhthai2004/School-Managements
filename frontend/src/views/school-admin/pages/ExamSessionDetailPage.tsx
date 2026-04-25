import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    examAdminService,
    type ExamSessionDto,
    type ExamScheduleDetailDto,
} from "../../../services/examAdminService";
import { Loader2, Calendar, BookOpen, Clock, ArrowLeft, Plus, Trash2, X, Edit2 } from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { formatDate } from "../../../utils/dateHelpers";
import { schoolAdminService, type SubjectDto } from "../../../services/schoolAdminService";
import { useConfirmation } from "../../../hooks/useConfirmation";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Nháp", cls: "bg-gray-100 text-gray-600" },
    PUBLISHED: { label: "Đã công bố", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Hoàn thành", cls: "bg-blue-100 text-blue-700" },
};

export default function ExamSessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { confirm, ConfirmationDialog } = useConfirmation();

    const [session, setSession] = useState<ExamSessionDto | null>(null);
    const [schedules, setSchedules] = useState<ExamScheduleDetailDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [editScheduleModal, setEditScheduleModal] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState<ExamScheduleDetailDto | null>(null);
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [newSchedules, setNewSchedules] = useState<Partial<ExamScheduleDetailDto>[]>([
        { subjectName: "", grade: 10, examDate: "", startTime: "07:30", endTime: "09:00", note: "" }
    ]);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [sessionData, schedulesData, subjectsData] = await Promise.all([
                examAdminService.getSession(id),
                examAdminService.getSessionSchedules(id),
                schoolAdminService.listSubjects(),
            ]);
            setSession(sessionData);
            setSchedules(schedulesData);
            setSubjects(subjectsData);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleAddRow = () => {
        setNewSchedules([...newSchedules, { subjectName: "", grade: 10, examDate: "", startTime: "07:30", endTime: "09:00", note: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        setNewSchedules(newSchedules.filter((_, i) => i !== index));
    };

    const handleSaveSchedules = async () => {
        if (!id) return;
        // Basic validation
        const isValid = newSchedules.every(s => s.subjectName && s.grade && s.examDate && s.startTime);
        if (!isValid) {
            toast.error("Vui lòng điền đầy đủ thông tin (Môn, Khối, Ngày, Giờ)");
            return;
        }

        setSaving(true);
        try {
            await examAdminService.createSchedules(id, newSchedules as ExamScheduleDetailDto[]);
            toast.success("Đã tạo lịch thi thành công");
            setCreateModal(false);
            setNewSchedules([{ subjectName: "", grade: 10, examDate: "", startTime: "07:30", endTime: "09:00", note: "" }]);
            loadData();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi khi tạo lịch thi");
        } finally {
            setSaving(false);
        }
    };

    const handleEditSchedule = (s: ExamScheduleDetailDto) => {
        if (session?.status !== 'DRAFT') {
            toast.error("Chỉ có thể chỉnh sửa lịch thi khi kỳ thi ở trạng thái Nháp");
            return;
        }
        setCurrentSchedule(s);
        setEditScheduleModal(true);
    };

    const handleUpdateSchedule = async () => {
        if (!currentSchedule || !id) return;
        setSaving(true);
        try {
            await examAdminService.updateSchedule(currentSchedule.id, currentSchedule);
            toast.success("Đã cập nhật lịch thi");
            setEditScheduleModal(false);
            loadData();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi cập nhật lịch thi");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (session?.status !== 'DRAFT') {
            toast.error("Chỉ có thể xóa lịch thi khi kỳ thi ở trạng thái Nháp");
            return;
        }
        confirm({
            title: "Xóa lịch thi?",
            message: "Bạn có chắc chắn muốn xóa môn thi này khỏi lịch thi? Thao tác này không thể hoàn tác.",
            variant: "danger",
            confirmText: "Xóa",
            onConfirm: async () => {
                try {
                    await examAdminService.deleteSchedule(scheduleId);
                    toast.success("Đã xóa lịch thi");
                    loadData();
                } catch (e: any) {
                    toast.error(e?.response?.data?.message || "Lỗi xóa lịch thi");
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tải...
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">Không tìm thấy kỳ thi.</p>
                    <button onClick={() => navigate("/school-admin/exam-sessions")} className="mt-3 text-blue-600 text-sm hover:underline">
                        ← Quay lại
                    </button>
                </div>
            </div>
        );
    }

    const totalSchedules = schedules.length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate("/school-admin/exam-sessions")}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[session.status]?.cls || "bg-gray-100"}`}>
                            {STATUS_MAP[session.status]?.label || session.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {session.academicYear} — HK{session.semester} | {formatDate(session.startDate)} → {formatDate(session.endDate)}
                    </p>
                </div>
                <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Tạo lịch thi
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{totalSchedules}</p>
                        <p className="text-xs text-gray-500">Môn thi</p>
                    </div>
                </div>
            </div>

            {/* Schedules */}
            {schedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có lịch thi nào cho kỳ thi này.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
                                        <span className="text-xs font-semibold">K{schedule.grade}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 line-clamp-1">{schedule.subjectName}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${schedule.examType === 'MIDTERM' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                                {schedule.examType === 'MIDTERM' ? 'GIỮA KỲ' : 'CUỐI KỲ'}
                                            </span>
                                        </div>
                                        {schedule.note && <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-1">Ghi chú: {schedule.note}</p>}
                                    </div>
                                    {session.status === 'DRAFT' && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleEditSchedule(schedule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteSchedule(schedule.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{formatDate(schedule.examDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{schedule.startTime} - {schedule.endTime}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Schedules Modal */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 p-6 flex items-center justify-between text-white">
                            <div>
                                <h2 className="text-xl font-bold">Tạo lịch thi mới</h2>
                                <p className="text-blue-100 text-sm">{session.name} — {session.academicYear}</p>
                            </div>
                            <button onClick={() => setCreateModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="grid grid-cols-11 gap-3 text-xs font-bold text-gray-400 uppercase px-3">
                                    <div className="col-span-2">Môn thi</div>
                                    <div className="col-span-1 text-center">Khối</div>
                                    <div className="col-span-2">Ngày thi</div>
                                    <div className="col-span-2">Bắt đầu</div>
                                    <div className="col-span-2">Kết thúc</div>
                                    <div className="col-span-1">Ghi chú</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {newSchedules.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-11 gap-3 items-center group">
                                        <div className="col-span-2">
                                            <select value={row.subjectName} onChange={e => {
                                                const rows = [...newSchedules];
                                                rows[idx].subjectName = e.target.value;
                                                setNewSchedules(rows);
                                            }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10">
                                                <option value="">Chọn môn...</option>
                                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <select value={row.grade} onChange={e => {
                                                const rows = [...newSchedules];
                                                rows[idx].grade = parseInt(e.target.value);
                                                setNewSchedules(rows);
                                            }} className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm text-center">
                                                <option value={10}>10</option>
                                                <option value={11}>11</option>
                                                <option value={12}>12</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <input type="date"
                                                min={session.startDate}
                                                max={session.endDate}
                                                value={row.examDate} onChange={e => {
                                                    const rows = [...newSchedules];
                                                    rows[idx].examDate = e.target.value;
                                                    setNewSchedules(rows);
                                                }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="time" value={row.startTime} onChange={e => {
                                                const rows = [...newSchedules];
                                                rows[idx].startTime = e.target.value;
                                                setNewSchedules(rows);
                                            }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="time" value={row.endTime} onChange={e => {
                                                const rows = [...newSchedules];
                                                rows[idx].endTime = e.target.value;
                                                setNewSchedules(rows);
                                            }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                        </div>
                                        <div className="col-span-1">
                                            <input value={row.note} onChange={e => {
                                                const rows = [...newSchedules];
                                                rows[idx].note = e.target.value;
                                                setNewSchedules(rows);
                                            }} placeholder="VD: Khuyết tật..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                        </div>
                                        <div className="col-span-1 text-right">
                                            {newSchedules.length > 1 && (
                                                <button onClick={() => handleRemoveRow(idx)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg group-hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <button onClick={handleAddRow} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl w-full justify-center hover:border-blue-300 hover:text-blue-600 transition-all">
                                    <Plus className="w-4 h-4" /> Thêm môn thi
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                            <button onClick={() => setCreateModal(false)} disabled={saving} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 transition-colors rounded-xl">
                                Hủy
                            </button>
                            <button onClick={handleSaveSchedules} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-md disabled:bg-blue-300 transition-colors">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : "Lưu lịch thi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Individual Schedule Modal */}
            {editScheduleModal && currentSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 p-6 flex items-center justify-between text-white">
                            <div>
                                <h2 className="text-xl font-bold">Sửa lịch thi</h2>
                                <p className="text-blue-100 text-sm">Cập nhật thông tin chi tiết môn thi</p>
                            </div>
                            <button onClick={() => setEditScheduleModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Môn thi</label>
                                <select value={currentSchedule.subjectName} onChange={e => setCurrentSchedule({ ...currentSchedule, subjectName: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20">
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                                    <select value={currentSchedule.grade} onChange={e => setCurrentSchedule({ ...currentSchedule, grade: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                                        <option value={10}>10</option>
                                        <option value={11}>11</option>
                                        <option value={12}>12</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thi</label>
                                <input type="date" min={session.startDate} max={session.endDate} value={currentSchedule.examDate}
                                    onChange={e => setCurrentSchedule({ ...currentSchedule, examDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bắt đầu</label>
                                    <input type="time" value={currentSchedule.startTime}
                                        onChange={e => setCurrentSchedule({ ...currentSchedule, startTime: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kết thúc</label>
                                    <input type="time" value={currentSchedule.endTime}
                                        onChange={e => setCurrentSchedule({ ...currentSchedule, endTime: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <input value={currentSchedule.note}
                                    onChange={e => setCurrentSchedule({ ...currentSchedule, note: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                                    placeholder="Ghi chú cho môn thi này..." />
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button onClick={() => setEditScheduleModal(false)} disabled={saving} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl">
                                Hủy
                            </button>
                            <button onClick={handleUpdateSchedule} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-md disabled:bg-blue-300 transition-colors">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : "Cập nhật"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmationDialog />
        </div>
    );
}
