import { useState, useEffect, useCallback } from "react";
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
import { CalendarIcon } from "../SchoolAdminIcons";

const AttendanceStatus = {
    PRESENT: "PRESENT",
    ABSENT_EXCUSED: "ABSENT_EXCUSED",
    ABSENT_UNEXCUSED: "ABSENT_UNEXCUSED",
    LATE: "LATE",
} as const;

type AttendanceStatusType = typeof AttendanceStatus[keyof typeof AttendanceStatus];

export default function AttendanceManagement() {
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState<AdminSlotDto[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<AdminSlotDto | null>(null);
    const [students, setStudents] = useState<AdminAttendanceDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [saving, setSaving] = useState(false);

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
            alert("Không thể tải danh sách điểm danh");
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
            await schoolAdminService.saveAttendance(selectedClassId, request);
            alert("Lưu điểm danh thành công!");
        } catch (error: unknown) {
            console.error("Failed to save:", error);
            const err = error as { response?: { data?: { message?: string } } };
            alert(err.response?.data?.message || "Lỗi khi lưu điểm danh");
        } finally {
            setSaving(false);
        }
    };

    const statusOptions = [
        { value: AttendanceStatus.PRESENT, label: "Có mặt", color: "bg-green-100 text-green-800", ring: "ring-green-500" },
        { value: AttendanceStatus.ABSENT_EXCUSED, label: "Vắng (CP)", color: "bg-yellow-100 text-yellow-800", ring: "ring-yellow-500" },
        { value: AttendanceStatus.ABSENT_UNEXCUSED, label: "Vắng (KP)", color: "bg-red-100 text-red-800", ring: "ring-red-500" },
        { value: AttendanceStatus.LATE, label: "Đi muộn", color: "bg-orange-100 text-orange-800", ring: "ring-orange-500" },
    ];

    const isPastDay = (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        return sel < today;
    })();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý điểm danh</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Xem và chỉnh sửa điểm danh cho tất cả các lớp (bao gồm ngày đã qua)
                </p>
            </div>

            {/* Filters Row */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Class selector */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Chọn lớp
                        </label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">-- Chọn lớp --</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (Khối {c.grade})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date picker */}
                    <div className="min-w-[180px]">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Chọn ngày
                        </label>
                        <div className="relative">
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date: Date | null) => date && setSelectedDate(date)}
                                dateFormat="dd/MM/yyyy"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                locale={vi}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <CalendarIcon />
                            </div>
                        </div>
                    </div>

                    {/* Date info badge */}
                    {isPastDay && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                                🔓 Ngày đã qua — Quyền Admin
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Slot List (Left Side) */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Các tiết trong ngày
                        </h3>

                        {!selectedClassId ? (
                            <p className="text-sm text-gray-400 text-center py-8">
                                Vui lòng chọn lớp
                            </p>
                        ) : loadingSlots ? (
                            <p className="text-sm text-gray-400 text-center py-8">
                                Đang tải...
                            </p>
                        ) : slots.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">
                                Không có tiết nào trong ngày này
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {slots.map((slot) => (
                                    <button
                                        key={slot.slotIndex}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                                            selectedSlot?.slotIndex === slot.slotIndex
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                                                : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold">Tiết {slot.slotIndex}</span>
                                            {selectedSlot?.slotIndex === slot.slotIndex && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {slot.subjectName || "—"}
                                        </p>
                                        {slot.teacherName && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                GV: {slot.teacherName}
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Attendance Table (Right Side) */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        {!selectedSlot ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-gray-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={1.5}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">
                                    {selectedClassId
                                        ? "Chọn tiết để xem điểm danh"
                                        : "Chọn lớp và tiết để bắt đầu"}
                                </h3>
                            </div>
                        ) : loading ? (
                            <div className="p-12 text-center text-gray-500">Đang tải...</div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            Tiết {selectedSlot.slotIndex} — {selectedSlot.subjectName}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })}
                                            {selectedSlot.teacherName && (
                                                <span> • GV: {selectedSlot.teacherName}</span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors shadow-sm"
                                    >
                                        {saving ? "Đang lưu..." : "💾 Lưu điểm danh"}
                                    </button>
                                </div>

                                {isPastDay && (
                                    <div className="mx-5 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                                        <span>⚠️</span>
                                        <span>
                                            Đang chỉnh sửa điểm danh ngày đã qua với quyền School Admin.
                                            Giáo viên không thể sửa ngày này.
                                        </span>
                                    </div>
                                )}

                                {/* Summary badges */}
                                <div className="flex flex-wrap gap-3 px-5 pt-4">
                                    {statusOptions.map((opt) => {
                                        const count = students.filter(
                                            (s) => s.status === opt.value
                                        ).length;
                                        return (
                                            <span
                                                key={opt.value}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${opt.color}`}
                                            >
                                                {opt.label}: {count}
                                            </span>
                                        );
                                    })}
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        Tổng: {students.length}
                                    </span>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto p-5">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    STT
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    Mã HS
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    Họ tên
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    Trạng thái
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    Ghi chú
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {students.map((student, index) => (
                                                <tr
                                                    key={student.studentId}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                >
                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {student.studentCode}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                        {student.studentName}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-1.5 flex-wrap">
                                                            {statusOptions.map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    onClick={() =>
                                                                        handleStatusChange(
                                                                            student.studentId,
                                                                            option.value
                                                                        )
                                                                    }
                                                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all
                                                                        ${
                                                                            student.status ===
                                                                            option.value
                                                                                ? option.color +
                                                                                  " ring-2 ring-offset-1 " +
                                                                                  option.ring
                                                                                : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500"
                                                                        }
                                                                    `}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={student.remarks || ""}
                                                            onChange={(e) =>
                                                                handleRemarksChange(
                                                                    student.studentId,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            </div>
        </div>
    );
}
