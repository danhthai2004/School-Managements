import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    examAdminService,
    type ExamSessionDto,
    type ExamScheduleDetailDto,
    type ExamStudentDetailDto,
} from "../../../services/examAdminService";
import { Loader2, Calendar, Users, Building2, BookOpen, Clock, ChevronDown, Download, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "../../../context/ToastContext";
import { formatDate } from "../../../utils/dateHelpers";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Nháp", cls: "bg-gray-100 text-gray-600" },
    PUBLISHED: { label: "Đã công bố", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Hoàn thành", cls: "bg-blue-100 text-blue-700" },
};

export default function ExamSessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [session, setSession] = useState<ExamSessionDto | null>(null);
    const [schedules, setSchedules] = useState<ExamScheduleDetailDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
    const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
    const [roomStudents, setRoomStudents] = useState<ExamStudentDetailDto[]>([]);
    const [roomStudentsLoading, setRoomStudentsLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const [sessionData, schedulesData] = await Promise.all([
                    examAdminService.getSession(id),
                    examAdminService.getSessionSchedules(id),
                ]);
                setSession(sessionData);
                setSchedules(schedulesData);
            } catch (e: any) {
                toast.error(e?.response?.data?.message || "Lỗi tải dữ liệu kỳ thi");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const loadRoomStudents = async (roomId: string) => {
        if (expandedRoomId === roomId) {
            setExpandedRoomId(null);
            return;
        }
        setExpandedRoomId(roomId);
        setRoomStudentsLoading(true);
        try {
            const data = await examAdminService.getRoomStudents(roomId);
            setRoomStudents(data);
        } catch {
            toast.error("Lỗi tải danh sách học sinh");
        } finally {
            setRoomStudentsLoading(false);
        }
    };

    const exportRoomToExcel = (roomName: string, subjectName: string, grade: number) => {
        if (roomStudents.length === 0) return;
        const data = roomStudents.map((s, i) => ({
            "STT": i + 1,
            "Mã HS": s.studentCode,
            "Họ và tên": s.fullName,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách");
        XLSX.writeFile(wb, `DS_${subjectName}_K${grade}_${roomName}.xlsx`);
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
    const totalRooms = schedules.reduce((sum, s) => sum + s.rooms.length, 0);
    const totalStudents = schedules.reduce((sum, s) => s.rooms.reduce((rs, r) => rs + r.studentCount, 0) + sum, 0);

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
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{totalSchedules}</p>
                        <p className="text-xs text-gray-500">Môn thi</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
                        <p className="text-xs text-gray-500">Phòng thi</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                        <p className="text-xs text-gray-500">Thí sinh</p>
                    </div>
                </div>
            </div>

            {/* Schedules */}
            {schedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có lịch thi nào được phân bổ cho kỳ thi này.</p>
                    <p className="text-sm text-gray-400 mt-1">Hãy quay lại và dùng chức năng "Phân bổ" để xếp lịch thi.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => {
                        const isExpanded = expandedScheduleId === schedule.id;
                        const schTotalStudents = schedule.rooms.reduce((sum, r) => sum + r.studentCount, 0);
                        const schTotalCapacity = schedule.rooms.reduce((sum, r) => sum + r.capacity, 0);
                        return (
                            <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Accordion Header */}
                                <button onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">[Khối {schedule.grade}] {schedule.subjectName}</span>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(schedule.examDate)}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{schedule.startTime} - {schedule.endTime}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                                            <Users className="w-3.5 h-3.5 inline mr-1" />{schTotalStudents}/{schTotalCapacity} HS
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                                            <Building2 className="w-3.5 h-3.5 inline mr-1" />{schedule.rooms.length} phòng
                                        </span>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </div>
                                </button>

                                {/* Accordion Body */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                                        {schedule.rooms.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-6">Không có phòng thi nào.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-2 text-xs font-medium text-gray-500 px-3 py-2">
                                                    <span>Phòng</span>
                                                    <span>Số HS</span>
                                                    <span>Sức chứa</span>
                                                    <span>Giám thị</span>
                                                </div>
                                                {schedule.rooms.map(room => {
                                                    const isRoomExpanded = expandedRoomId === room.id;
                                                    return (
                                                        <div key={room.id}>
                                                            <div onClick={() => loadRoomStudents(room.id)}
                                                                className={`grid grid-cols-[2fr_1fr_1fr_2fr] gap-2 items-center px-3 py-3 rounded-lg text-sm cursor-pointer transition-colors ${isRoomExpanded ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                                    <span className="font-medium text-gray-900">{room.roomName}</span>
                                                                    {room.building && <span className="text-xs text-gray-400">({room.building})</span>}
                                                                </div>
                                                                <span className="font-semibold text-blue-600">{room.studentCount}</span>
                                                                <span className="text-gray-500">{room.capacity}</span>
                                                                <span className="text-gray-600">
                                                                    {room.invigilatorNames.length > 0 ? room.invigilatorNames.join(", ") : <span className="text-gray-400 italic">Chưa có</span>}
                                                                </span>
                                                            </div>
                                                            {isRoomExpanded && (
                                                                <div className="mt-1 ml-6 mr-2 mb-2 bg-white border border-gray-200 rounded-lg p-4">
                                                                    {roomStudentsLoading ? (
                                                                        <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                                                                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                                                        </div>
                                                                    ) : roomStudents.length === 0 ? (
                                                                        <p className="text-sm text-gray-400 text-center py-4">Chưa có học sinh nào.</p>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <span className="text-sm font-medium text-gray-700">Danh sách {roomStudents.length} học sinh</span>
                                                                                <button onClick={(e) => { e.stopPropagation(); exportRoomToExcel(room.roomName, schedule.subjectName, schedule.grade); }}
                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-200">
                                                                                    <Download className="w-3.5 h-3.5" /> Xuất Excel
                                                                                </button>
                                                                            </div>
                                                                            <table className="w-full text-sm">
                                                                                <thead>
                                                                                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                                                                                        <th className="text-left py-2 w-12">STT</th>
                                                                                        <th className="text-left py-2">Mã HS</th>
                                                                                        <th className="text-left py-2">Họ và tên</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {roomStudents.map((st, idx) => (
                                                                                        <tr key={st.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                                                            <td className="py-2 text-gray-400">{idx + 1}</td>
                                                                                            <td className="py-2 font-mono text-xs text-gray-600">{st.studentCode}</td>
                                                                                            <td className="py-2 text-gray-900">{st.fullName}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
