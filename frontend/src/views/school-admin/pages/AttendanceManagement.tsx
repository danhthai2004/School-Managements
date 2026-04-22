import { useState, useEffect, useCallback, useMemo } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { schoolAdminService } from "../../../services/schoolAdminService";
import type {
    ClassRoomDto,
    AdminSlotDto,
    AdminAttendanceDto,
    AdminSaveAttendanceRequest,
} from "../../../services/schoolAdminService";
import {
    Calendar as CalendarIcon,
    Users,
    Save,
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    Clock,
    BookOpen
} from "lucide-react";

import { useToast } from "../../../context/ToastContext";

const AttendanceStatus = {
    PRESENT: "PRESENT",
    ABSENT_EXCUSED: "ABSENT_EXCUSED",
    ABSENT_UNEXCUSED: "ABSENT_UNEXCUSED",
    LATE: "LATE",
} as const;

type AttendanceStatusType = typeof AttendanceStatus[keyof typeof AttendanceStatus];

export default function AttendanceManagement() {
    const { toast } = useToast();
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState<AdminSlotDto[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<AdminSlotDto | null>(null);
    const [students, setStudents] = useState<AdminAttendanceDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filterGrade, setFilterGrade] = useState<string>("");
    const [skippedStudents, setSkippedStudents] = useState<{ studentId: string; reason: string; studentName?: string; studentCode?: string }[]>([]);
    const [showSkippedModal, setShowSkippedModal] = useState(false);

    // Load classes on mount
    useEffect(() => {
        loadClasses();
    }, []);

    async function loadClasses() {
        try {
            const data = await schoolAdminService.listClasses();
            setClasses(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to load classes:", error);
        }
    }

    const filteredClasses = useMemo(() => {
        if (!filterGrade) return classes;
        return classes.filter(c => c.grade.toString() === filterGrade);
    }, [classes, filterGrade]);

    // Clear class if it doesn't match filter
    useEffect(() => {
        if (selectedClassId && !filteredClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId("");
        }
    }, [filteredClasses, selectedClassId]);

    // Load slots when class or date changes
    useEffect(() => {
        if (selectedClassId) {
            loadSlots();
        } else {
            setSlots([]);
            setSelectedSlot(null);
            setStudents([]);
        }
    }, [selectedClassId, selectedDate]);

    async function loadSlots() {
        try {
            setLoadingSlots(true);
            setSelectedSlot(null);
            setStudents([]);
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const data = await schoolAdminService.getAttendanceSlots(selectedClassId, dateStr);
            setSlots(data);
        } catch (error) {
            console.error("Failed to load slots:", error);
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }

    // Load students when slot selected
    const loadStudents = useCallback(async () => {
        if (!selectedSlot || !selectedClassId) return;
        try {
            setLoading(true);
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const data = await schoolAdminService.getAttendanceForSlot(
                selectedClassId,
                dateStr,
                selectedSlot.slotIndex
            );
            setStudents(data);
        } catch (error) {
            console.error("Failed to load attendance:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedSlot, selectedClassId, selectedDate]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
        setStudents(prev =>
            prev.map(s => (s.studentId === studentId ? { ...s, status } : s))
        );
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setStudents(prev =>
            prev.map(s => (s.studentId === studentId ? { ...s, remarks } : s))
        );
    };

    const handleSave = async () => {
        if (!selectedSlot || !selectedClassId) return;
        try {
            setSaving(true);
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const request: AdminSaveAttendanceRequest = {
                date: dateStr,
                slotIndex: selectedSlot.slotIndex,
                records: students.map(s => ({
                    studentId: s.studentId,
                    status: s.status,
                    remarks: s.remarks || "",
                })),
            };
            const res = await schoolAdminService.saveAttendance(selectedClassId, request);

            if (res.skippedStudents && res.skippedStudents.length > 0) {
                const skippedWithDetails = res.skippedStudents.map(skipped => {
                    const studentInfo = students.find(s => s.studentId === skipped.studentId);
                    return {
                        ...skipped,
                        studentName: studentInfo?.studentName || "Không xác định",
                        studentCode: studentInfo?.studentCode || skipped.studentId
                    };
                });
                setSkippedStudents(skippedWithDetails);
                setShowSkippedModal(true);
                toast.error(`Lưu thành công, nhưng có ${res.skippedStudents.length} học sinh bị bỏ qua.`);
            } else {
                toast.success("Lưu điểm danh thành công!");
            }
        } catch (error: any) {
            console.error("Failed to save:", error);
            const status = error.response?.status;
            const message = error.response?.data?.message || "Lỗi khi lưu điểm danh";

            if (status === 400 || status === 403 || status === 404 || status === 409) {
                toast.error(message);
            } else {
                toast.error("Hệ thống gặp sự cố. Vui lòng thử lại sau.");
            }
        } finally {
            setSaving(false);
        }
    };

    const statusOptions = [
        { value: AttendanceStatus.PRESENT, label: "Có mặt", icon: CheckCircle, color: "bg-green-100 text-green-700", ring: "ring-green-500", active: "bg-green-600 text-white" },
        { value: AttendanceStatus.ABSENT_EXCUSED, label: "Vắng (CP)", icon: Info, color: "bg-amber-100 text-amber-700", ring: "ring-amber-500", active: "bg-amber-500 text-white" },
        { value: AttendanceStatus.ABSENT_UNEXCUSED, label: "Vắng (KP)", icon: XCircle, color: "bg-red-100 text-red-700", ring: "ring-red-500", active: "bg-red-600 text-white" },
        { value: AttendanceStatus.LATE, label: "Đi muộn", icon: Clock, color: "bg-blue-100 text-blue-700", ring: "ring-blue-500", active: "bg-blue-600 text-white" },
    ];

    const isPastDay = (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        return sel < today;
    })();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Modal Skipped Students */}
            {showSkippedModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-600 border-b border-gray-100 pb-4">
                            <div className="p-2 bg-amber-100 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Điểm danh chưa hoàn tất</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Hệ thống đã lưu điểm danh, nhưng có <strong>{skippedStudents.length}</strong> học sinh bị bỏ qua:
                        </p>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y max-h-60 overflow-y-auto">
                            {skippedStudents.map((s, i) => (
                                <div key={i} className="p-3">
                                    <div className="font-medium text-gray-800">{s.studentName} <span className="text-gray-500 text-xs font-normal">({s.studentCode})</span></div>
                                    <div className="text-red-500 text-xs mt-0.5">{s.reason}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setShowSkippedModal(false)}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-medium rounded-xl transition-all shadow-lg"
                            >
                                Đóng và kiểm tra lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Quản lý điểm danh trường
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Chế độ Admin • Xem và chỉnh sửa dữ liệu toàn trường
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-8">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3 h-3" /> Khối
                    </label>
                    <select
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        className="min-w-[120px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-white"
                    >
                        <option value="">Tất cả khối</option>
                        <option value="10">Khối 10</option>
                        <option value="11">Khối 11</option>
                        <option value="12">Khối 12</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" /> Lớp học
                    </label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-white"
                    >
                        <option value="">Chọn lớp học từ danh sách...</option>
                        {filteredClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3" /> Ngày điểm danh
                    </label>
                    <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden hover:bg-white transition-colors">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => date && setSelectedDate(date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-36 px-3 py-2 bg-transparent border-0 text-gray-900 text-sm font-semibold outline-none cursor-pointer"
                            locale={vi}
                        />
                    </div>
                </div>

                {isPastDay && (
                    <div className="self-end mb-1">
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold border border-amber-200/50 uppercase tracking-tighter shadow-sm animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Chế độ ghi đè dữ liệu
                        </div>
                    </div>
                )}
            </div>

            {/* Slots Selection Bar */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                {!selectedClassId ? (
                    <div className="py-2 text-center text-sm text-gray-400 italic">
                        Hãy chọn khối và lớp để xem danh sách tiết học
                    </div>
                ) : loadingSlots ? (
                    <div className="flex gap-2 p-1 overflow-hidden">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-10 w-32 bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : slots.length === 0 ? (
                    <div className="py-2 text-center text-sm text-gray-400 italic">
                        Lớp học không có tiết trong ngày này
                    </div>
                ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {slots.map((slot) => (
                            <button
                                key={slot.slotIndex}
                                onClick={() => setSelectedSlot(slot)}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-xl border-2 text-center transition-all min-w-[140px] ${selectedSlot?.slotIndex === slot.slotIndex
                                    ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                                    : "border-transparent bg-gray-50 text-gray-500 font-semibold hover:bg-gray-100"
                                    }`}
                            >
                                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">Tiết {slot.slotIndex}</div>
                                <div className="text-sm line-clamp-1">{slot.subjectName || "Nghỉ"}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                {!selectedSlot ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-50">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Thông tin điểm danh học sinh
                        </h3>
                        <p className="text-gray-500 mt-2 max-w-sm text-sm">
                            {selectedClassId
                                ? "Vui lòng chọn một tiết học phía trên để xem danh sách điểm danh."
                                : "Hãy chọn khối, lớp and ngày cần kiểm tra dữ liệu."}
                        </p>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 text-sm font-medium">Đang tải danh sách học sinh...</p>
                    </div>
                ) : (
                    <>
                        {/* Table Header Info */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-0.5">
                                        Thông tin tiết học
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Tiết {selectedSlot.slotIndex} • {selectedSlot.subjectName || "Tiết không tên"}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    {statusOptions.map(opt => {
                                        const count = students.filter(s => s.status === opt.value).length;
                                        return (
                                            <div key={opt.value} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border border-gray-100 ${opt.color}`}>
                                                <opt.icon className="w-3.5 h-3.5" />
                                                {opt.label}: {count}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold disabled:opacity-50 hover:from-blue-700 hover:to-blue-600"
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
                                            <Save className="w-5 h-5" />
                                            Lưu điểm danh
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            STT
                                        </th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            Học sinh
                                        </th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            Trạng thái điểm danh
                                        </th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            Ghi chú
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((student, index) => (
                                        <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {student.studentName}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {student.studentCode}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {statusOptions.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => handleStatusChange(student.studentId, opt.value as any)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${student.status === opt.value
                                                                ? opt.active + " border-transparent"
                                                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={student.remarks || ""}
                                                    onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg outline-none transition-all text-gray-600 placeholder:text-gray-400 font-medium"
                                                    placeholder="Ghi chú..."
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
