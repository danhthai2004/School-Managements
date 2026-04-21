import { useState, useEffect } from "react";
import { guardianService } from "../../services/guardianService";
import type { AttendanceSummaryDto } from "../../services/studentService";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";
import { useSemester } from "../../context/SemesterContext";

export default function StudentAttendance() {
    const { activeSemester, allAcademicYears } = useSemester();
    const { student } = useOutletContext<StudentDataProp>();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceSummaryDto | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const fetchData = async () => {
            if (!student) return;
            setLoading(true);
            try {
                const month = selectedDate.getMonth() + 1;
                const year = selectedDate.getFullYear();
                const data = await guardianService.getAttendance(student.id, month, year);
                setAttendance(data);
            } catch (error) {
                console.error("Error fetching attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate, student]);

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

    // Use pre-calculated grid from backend
    const { attendanceGrid } = attendance;

    const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const slots = Array.from({ length: 10 }, (_, i) => i);

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Chuyên cần của con</h1>
                    <p className="text-sm text-gray-500">Xem chi tiết tình hình đến lớp của {student?.fullName}</p>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-100">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Tỷ lệ chuyên cần</p>
                    <p className="text-4xl font-black mt-2 text-center">{attendance.attendanceRate}%</p>
                    <div className="mt-4 h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${attendance.attendanceRate}%` }}></div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Tiết có mặt</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.presentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 border border-red-100">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Tiết vắng</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.absentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Tiết đi trễ</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.lateDays}</p>
                    </div>
                </div>
            </div>

            {/* Attendance Timetable Grid */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 bg-gray-50/50 border-b border-r border-gray-100 text-[10px] font-black text-gray-400 uppercase w-20">Tiết học</th>
                                {daysOfWeek.map((day, i) => {
                                    const date = new Date(weekStart);
                                    date.setDate(weekStart.getDate() + i);
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <th key={day} className={`p-4 bg-gray-50/50 border-b border-gray-100 text-center min-w-[150px] ${isToday ? 'bg-blue-50/50 text-blue-700' : 'text-gray-600'}`}>
                                            <div className="text-sm font-black">{day}</div>
                                            <div className="text-[10px] opacity-50 font-bold tracking-wider">{date.toLocaleDateString('vi-VN')}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {slots.map(slotIndex => (
                                <tr key={slotIndex}>
                                    <td className="p-4 border-r border-b border-gray-50 text-center font-black text-gray-400 text-xs bg-gray-50/5">
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
                                        const record = attendanceGrid[dateStr]?.[slotIndex + 1];

                                        let timetableSlot = (attendance as any).classroomTimetable?.find(
                                            (s: any) => s.dayOfWeek === (dayIdx + 2) && s.slotIndex === (slotIndex + 1)
                                        );

                                        const currentYear = allAcademicYears.find((y: any) => y.id === activeSemester?.academicYearId);
                                        const thresholdDate = currentYear ? new Date(currentYear.startDate) : new Date(0);
                                        thresholdDate.setHours(0, 0, 0, 0);
                                        if (date < thresholdDate) {
                                            timetableSlot = undefined;
                                        }

                                        let statusClasses = "bg-gray-50/30 text-gray-300 border border-dashed border-gray-100";
                                        let statusLabel = timetableSlot ? "CHƯA ĐIỂM DANH" : "-";

                                        if (record) {
                                            if (record.status === 'PRESENT') {
                                                statusClasses = "bg-green-500 text-white shadow-md shadow-green-100";
                                                statusLabel = "CÓ MẶT";
                                            } else if (record.status.startsWith('ABSENT')) {
                                                statusClasses = "bg-red-500 text-white shadow-md shadow-red-100";
                                                statusLabel = record.status === 'ABSENT_EXCUSED' ? "CÓ PHÉP" : "VẮNG";
                                            } else if (record.status === 'LATE') {
                                                statusClasses = "bg-orange-500 text-white shadow-md shadow-orange-100";
                                                statusLabel = "ĐI TRỄ";
                                            }
                                        } else if (timetableSlot && date < new Date(new Date().setHours(23, 59, 59))) {
                                            statusClasses = "bg-gray-100 text-gray-500";
                                            statusLabel = "CHƯA GHI NHẬN";
                                        }

                                        return (
                                            <td key={dayIdx} className="p-2 border-b border-gray-50 h-28 align-top">
                                                {record || timetableSlot ? (
                                                    <div className={`h-full w-full rounded-xl p-3 flex flex-col justify-between transition-all duration-300 hover:scale-105 active:scale-95 ${statusClasses}`}>
                                                        <div className="text-[11px] font-black uppercase leading-tight line-clamp-2">
                                                            {record?.subjectName || timetableSlot?.subjectName}
                                                        </div>
                                                        <div className="text-[9px] font-black text-right opacity-90 tracking-tighter italic">
                                                            {statusLabel}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full border border-dashed border-gray-50 rounded-xl flex items-center justify-center text-[10px] text-gray-200 font-bold italic">
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