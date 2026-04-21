import { useState, useEffect } from "react";
import { studentService, type AttendanceSummaryDto } from "../../services/studentService";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useSemester } from "../../context/SemesterContext";

export default function StudentAttendancePage() {
    const { activeSemester, allAcademicYears } = useSemester();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceSummaryDto | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const month = selectedDate.getMonth() + 1;
                const year = selectedDate.getFullYear();
                const data = await studentService.getAttendance(month, year);
                setAttendance(data);
            } catch (error) {
                console.error("Error fetching attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate]);

    if (loading || !attendance) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Helper to get start and end of week
    const getWeekRange = (date: Date) => {
        const start = new Date(date);
        start.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    };

    const { start: weekStart, end: weekEnd } = getWeekRange(selectedDate);

    // The attendanceGrid is now provided directly from the backend to ensure consistency and performance
    const { attendanceGrid } = attendance;

    const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const slots = Array.from({ length: 10 }, (_, i) => i);

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chi Tiết Chuyên Cần</h1>
                    <p className="text-sm text-gray-500">Xem tình hình đi học theo từng tiết trong tuần</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 7);
                            setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                    >
                        &larr; Tuần trước
                    </button>
                    <div className="px-4 py-1 text-sm font-semibold text-blue-600 border-x border-gray-100">
                        {weekStart.toLocaleDateString('vi-VN')} - {weekEnd.toLocaleDateString('vi-VN')}
                    </div>
                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 7);
                            setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                    >
                        Tuần sau &rarr;
                    </button>
                </div>
            </div>

            {/* Stats Cards (Same as before but with updated labels) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
                    <p className="text-white/80 text-sm font-medium">Tỷ lệ chuyên cần</p>
                    <p className="text-4xl font-bold mt-1">{attendance.attendanceRate}%</p>
                    <div className="mt-4 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${attendance.attendanceRate}%` }}></div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tiết có mặt</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.presentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 border border-red-100">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tiết vắng</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.absentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 border border-orange-100">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tiết đi trễ</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.lateDays}</p>
                    </div>
                </div>
            </div>

            {/* Attendance Timetable Board */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 bg-gray-50 border-b border-r border-gray-100 text-xs font-bold text-gray-400 uppercase w-20">Tiết</th>
                                {daysOfWeek.map((day, i) => {
                                    const date = new Date(weekStart);
                                    date.setDate(weekStart.getDate() + i);
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <th key={day} className={`p-4 bg-gray-50 border-b border-gray-100 text-center min-w-[140px] ${isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                                            <div className="text-sm font-bold">{day}</div>
                                            <div className="text-[10px] opacity-60 font-medium">{date.toLocaleDateString('vi-VN')}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {slots.map(slotIndex => (
                                <tr key={slotIndex}>
                                    <td className="p-4 border-r border-b border-gray-50 text-center font-bold text-gray-400 text-sm">
                                        {slotIndex + 1}
                                    </td>
                                    {daysOfWeek.map((_, dayIdx) => {
                                        const date = new Date(weekStart);
                                        date.setDate(weekStart.getDate() + dayIdx);
                                        // Format as YYYY-MM-DD manually to avoid timezone shifting from toISOString()
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const dateStr = `${year}-${month}-${day}`;
                                        const record = attendanceGrid[dateStr]?.[slotIndex + 1]; // backend uses 1-based slots

                                        // Find subject name from timetable if no record yet
                                        let timetableSlot = attendance.classroomTimetable.find(
                                            s => s.dayOfWeek === (dayIdx + 2) && s.slotIndex === (slotIndex + 1)
                                        );

                                        // DO NOT show timetable schedule if the date is OUTSIDE the active academic year timeline.
                                        const currentYear = allAcademicYears.find(y => y.id === activeSemester?.academicYearId);
                                        const thresholdDate = currentYear ? new Date(currentYear.startDate) : new Date(0);
                                        // Set to midnight for proper comparison
                                        thresholdDate.setHours(0, 0, 0, 0);
                                        if (date < thresholdDate) {
                                            timetableSlot = undefined;
                                        }

                                        let bgColor = "bg-gray-50/50";
                                        let borderStyle = "border-2 border-dashed border-gray-100";
                                        let textColor = "text-gray-400";
                                        let statusLabel = timetableSlot ? "Chưa điểm danh" : "-";

                                        if (record) {
                                            borderStyle = "border-0 shadow-lg";
                                            if (record.status === 'PRESENT') {
                                                bgColor = "bg-green-500 shadow-green-100";
                                                textColor = "text-white";
                                                statusLabel = "Có mặt";
                                            } else if (record.status === 'ABSENT_UNEXCUSED' || record.status === 'ABSENT_EXCUSED' || (record.status as any) === 'ABSENT') {
                                                bgColor = "bg-red-500 shadow-red-100";
                                                textColor = "text-white";
                                                statusLabel = record.status === 'ABSENT_EXCUSED' ? "Có phép" : "Vắng";
                                            } else if (record.status === 'LATE') {
                                                bgColor = "bg-orange-500 shadow-orange-100";
                                                textColor = "text-white";
                                                statusLabel = "Đi trễ";
                                            }
                                        } else if (timetableSlot && date < new Date(new Date().setHours(23, 59, 59))) {
                                            // Passed session without record
                                            bgColor = "bg-gray-100";
                                            textColor = "text-gray-500";
                                            statusLabel = "Chưa ghi nhận";
                                        }

                                        return (
                                            <td key={dayIdx} className="p-2 border-b border-gray-50 h-24">
                                                {timetableSlot || record ? (
                                                    <div className={`h-full w-full rounded-xl p-2 flex flex-col justify-between transition-all duration-300 hover:scale-105 ${bgColor} ${textColor} ${borderStyle}`}>
                                                        <div className="text-[10px] font-bold uppercase overflow-hidden whitespace-nowrap text-ellipsis">
                                                            {record?.subjectName || timetableSlot?.subjectName}
                                                        </div>
                                                        <div className="text-[10px] font-medium self-end opacity-90 italic">
                                                            {statusLabel}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full border-2 border-dashed border-gray-50 rounded-xl flex items-center justify-center text-[10px] text-gray-300 italic">
                                                        Tiết trống
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
