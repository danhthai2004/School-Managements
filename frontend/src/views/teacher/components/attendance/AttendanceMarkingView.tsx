import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfDay, isBefore, isEqual, isAfter } from "date-fns";
import { vi } from "date-fns/locale";
import { attendanceService, AttendanceStatus } from "../../../../services/attendanceService";
import type { AttendanceDto } from "../../../../services/attendanceService";
import { Clock, Lock, Save } from "lucide-react";
import { vietnameseNameSort } from "../../../../utils/sortUtils";

import { useToast } from "../../../../context/ToastContext";

type Props = {
    date: Date;
    slotIndex: number;
    subjectName: string;
    className: string;
    slotStartTime?: string; // "HH:mm" format from timetable settings
    onClose: () => void;
};

export default function AttendanceMarkingView({ date, slotIndex, subjectName, className, slotStartTime, onClose }: Props) {
    const { toast } = useToast();
    const [students, setStudents] = useState<AttendanceDto[]>([]);
    // Initialize states based on whether the slot has already started
    const [isSlotStarted, setIsSlotStarted] = useState(() => {
        if (!slotStartTime) return true;
        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        if (!isEqual(selectedDay, today)) return true; // Not today

        const [hours, minutes] = slotStartTime.split(":").map(Number);
        const now = new Date();
        const slotStart = new Date();
        slotStart.setHours(hours, minutes, 0, 0);
        return now >= slotStart;
    });

    const [loading, setLoading] = useState(() => {
        // Only start in loading state if the slot has already started or is locked (past/future)
        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        const isLockedInit = isBefore(selectedDay, today) || isAfter(selectedDay, today);

        // Return true (loading) if we expect to call loadData() immediately
        if (isLockedInit) return true;

        const [hours, minutes] = slotStartTime?.split(":").map(Number) || [0, 0];
        const now = new Date();
        const slotStart = new Date();
        slotStart.setHours(hours, minutes, 0, 0);
        const started = now >= slotStart;

        return started;
    });
    const [saving, setSaving] = useState(false);
    const [countdown, setCountdown] = useState<string>("");

    const [skippedStudents, setSkippedStudents] = useState<{ studentId: string; reason: string; studentName?: string; studentCode?: string }[]>([]);
    const [showSkippedModal, setShowSkippedModal] = useState(false);


    // Lock attendance for non-today days (past = auto-locked, future = not allowed)
    const isLocked = useMemo(() => {
        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        return isBefore(selectedDay, today) || isAfter(selectedDay, today);
    }, [date]);

    const isFutureDay = useMemo(() => {
        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        return isAfter(selectedDay, today);
    }, [date]);

    const isPastDay = useMemo(() => {
        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        return isBefore(selectedDay, today);
    }, [date]);

    // Check if slot has started yet (only for today)
    useEffect(() => {
        if (!slotStartTime || isLocked) return;

        const today = startOfDay(new Date());
        const selectedDay = startOfDay(date);
        const isToday = isEqual(selectedDay, today);

        if (!isToday) {
            setIsSlotStarted(true);
            return;
        }

        // Parse start time "HH:mm"
        const [hours, minutes] = slotStartTime.split(":").map(Number);

        const checkAndUpdate = () => {
            const now = new Date();
            const slotStart = new Date();
            slotStart.setHours(hours, minutes, 0, 0);

            if (now >= slotStart) {
                setIsSlotStarted(true);
                setCountdown("");
                return true; // Started
            }

            // Calculate remaining time
            const diff = slotStart.getTime() - now.getTime();
            const remainH = Math.floor(diff / (1000 * 60 * 60));
            const remainM = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const remainS = Math.floor((diff % (1000 * 60)) / 1000);

            if (remainH > 0) {
                setCountdown(`${remainH.toString().padStart(2, "0")}:${remainM.toString().padStart(2, "0")}:${remainS.toString().padStart(2, "0")}`);
            } else {
                setCountdown(`${remainM.toString().padStart(2, "0")}:${remainS.toString().padStart(2, "0")}`);
            }
            setIsSlotStarted(false);
            return false; // Not started yet
        };

        // Initial check
        if (checkAndUpdate()) return;

        // Update every second
        const interval = setInterval(() => {
            if (checkAndUpdate()) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [date, slotStartTime, isLocked]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const dateStr = format(date, "yyyy-MM-dd");
            const data = await attendanceService.getAttendanceForSlot(dateStr, slotIndex);
            const sortedData = [...data].sort((a, b) => vietnameseNameSort(a.studentName, b.studentName));
            setStudents(sortedData);
        } catch (error: any) {
            console.error("Failed to load attendance:", error);
            // Only show error toast if it's actually time to load or already locked
            // Extract the most meaningful message from backend
            const data = error.response?.data;
            const message = data?.message || data?.error || "Không thể tải danh sách điểm danh";

            if (isSlotStarted || isLocked) {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    }, [date, slotIndex, toast, isSlotStarted, isLocked]);

    useEffect(() => {
        if (isSlotStarted || isLocked) {
            loadData();
        } else {
            // If not started yet, don't show loading screen
            setLoading(false);
        }
    }, [loadData, isSlotStarted, isLocked]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudents(prev => prev.map(s =>
            s.studentId === studentId ? { ...s, status } : s
        ));
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setStudents(prev => prev.map(s =>
            s.studentId === studentId ? { ...s, remarks } : s
        ));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const dateStr = format(date, "yyyy-MM-dd");
            const res = await attendanceService.saveAttendance({
                date: dateStr,
                slotIndex,
                records: students.map(s => ({
                    studentId: s.studentId,
                    status: s.status,
                    remarks: s.remarks
                }))
            });

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
            } else {
                toast.success("Lưu điểm danh thành công!");
                onClose();
            }
        } catch (error: any) {

            console.error("Failed to save attendance:", error);

            // Extract the most meaningful message
            const status = error.response?.status;
            const data = error.response?.data;
            let errorMessage = "Đã xảy ra lỗi khi lưu điểm danh";

            if (status === 400 || status === 403 || status === 404 || status === 409) {
                // Use backend reason if available, otherwise generic
                errorMessage = data?.message || data?.error || errorMessage;
            } else if (status === 500) {
                errorMessage = "Lỗi hệ thống (Server Error). Vui lòng liên hệ Admin.";
            }

            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const statusOptions = [
        { value: AttendanceStatus.PRESENT, label: "Có mặt", color: "bg-green-100 text-green-800" },
        { value: AttendanceStatus.ABSENT_EXCUSED, label: "Vắng (CP)", color: "bg-yellow-100 text-yellow-800" },
        { value: AttendanceStatus.ABSENT_UNEXCUSED, label: "Vắng (KP)", color: "bg-red-100 text-red-800" },
        { value: AttendanceStatus.LATE, label: "Đi muộn", color: "bg-orange-100 text-orange-800" },
    ];

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    const canEdit = !isLocked && isSlotStarted;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            {showSkippedModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold">Điểm danh chưa hoàn tất</h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Hệ thống đã lưu điểm danh, nhưng có <strong>{skippedStudents.length}</strong> học sinh bị bỏ qua (có thể do học sinh đã chuyển lớp hoặc bị xoá khỏi danh sách):
                        </p>

                        <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y max-h-60 overflow-y-auto mb-6">
                            {skippedStudents.map((s, i) => (
                                <div key={i} className="p-3 text-sm">
                                    <div className="font-medium text-gray-800">{s.studentName} <span className="text-gray-500 font-normal">({s.studentCode})</span></div>
                                    <div className="text-red-500 mt-1">{s.reason}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setShowSkippedModal(false);
                                    onClose();
                                }}
                                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors"
                            >
                                Đóng và tải lại danh sách
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Countdown overlay when slot hasn't started */}
            {!isLocked && !isSlotStarted && (
                <>
                    {/* Blur overlay on the content behind */}
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl z-30" />
                    {/* Popup */}
                    <div className="absolute inset-0 flex items-center justify-center z-40">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full mx-4 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                Vui lòng chờ đến khi tiết học bắt đầu
                            </h3>
                            <p className="text-gray-500 mb-5 text-sm">
                                Tiết {slotIndex} bắt đầu lúc <span className="font-semibold text-gray-700">{slotStartTime}</span>
                            </p>
                            {/* Countdown */}
                            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-6 py-4">
                                {countdown.split("").map((char, i) => (
                                    <span
                                        key={i}
                                        className={
                                            char === ":"
                                                ? "text-2xl font-bold text-blue-400 mx-0.5 animate-pulse"
                                                : "text-3xl font-mono font-bold text-blue-700 bg-white rounded-lg w-10 h-12 inline-flex items-center justify-center shadow-sm border border-blue-100"
                                        }
                                    >
                                        {char}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-4 text-xs text-gray-400">
                                Trang sẽ tự mở khi đến giờ
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-5 px-5 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        {subjectName} - {className}
                    </h2>
                    <p className="text-gray-500">
                        Tiết {slotIndex} - {format(date, "EEEE, dd/MM/yyyy", { locale: vi })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Quay lại
                    </button>
                    {canEdit && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <Save className="w-4 h-4" strokeWidth={1.8} />
                                    Lưu điểm danh
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {isLocked && (
                <div className={`mb-4 p-3 border rounded-lg flex items-center gap-2 ${isFutureDay ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {isFutureDay ? <Clock size={20} strokeWidth={2} /> : <Lock size={20} strokeWidth={2} />}
                    <span className="font-medium">
                        {isFutureDay
                            ? 'Không thể điểm danh cho ngày trong tương lai. Vui lòng chờ đến ngày hôm đó.'
                            : isPastDay
                                ? 'Điểm danh ngày này đã bị khóa tự động. Không thể chỉnh sửa.'
                                : 'Điểm danh đã bị khóa.'}
                    </span>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">STT</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Mã HS</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Họ tên</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Trạng thái</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {students.map((student, index) => (
                            <tr key={student.studentId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.studentCode}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{student.studentName}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        {statusOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleStatusChange(student.studentId, option.value)}
                                                disabled={!canEdit}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                                                    ${student.status === option.value
                                                        ? option.color + " ring-2 ring-offset-1 ring-blue-500"
                                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                    }
                                                    ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}
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
                                        onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                                        disabled={!canEdit}
                                        className={`w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                        placeholder="Ghi chú..."
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
