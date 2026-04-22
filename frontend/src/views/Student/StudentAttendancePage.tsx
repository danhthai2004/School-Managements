import { useState, useEffect } from "react";
import { studentService, type AttendanceSummaryDto } from "../../services/studentService";
import { CheckCircle, XCircle, Clock, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useSemester } from "../../context/SemesterContext";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

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
    const { attendanceGrid } = attendance;

    const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const slots = Array.from({ length: 10 }, (_, i) => i);

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chi tiết chuyên cần</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Tuần {weekStart.toLocaleDateString('vi-VN')} - {weekEnd.toLocaleDateString('vi-VN')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 relative">
                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 7);
                            setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                        title="Tuần trước"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="relative group">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => date && setSelectedDate(date)}
                            locale="vi"
                            dateFormat="dd/MM/yyyy"
                            customInput={
                                <button className="px-4 py-2 hover:bg-gray-50 rounded-lg text-sm font-medium text-blue-600 transition-colors flex items-center gap-2 border border-transparent hover:border-blue-100">
                                    <CalendarIcon className="w-4 h-4" />
                                    {selectedDate.toDateString() === new Date().toDateString() ? "Tuần này" : selectedDate.toLocaleDateString('vi-VN')}
                                </button>
                            }
                            shouldCloseOnSelect={true}
                            todayButton="Hôm nay"
                        />
                    </div>

                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 7);
                            setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                        title="Tuần sau"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Tỷ lệ chuyên cần</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{attendance.attendanceRate}%</p>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${attendance.attendanceRate}%` }}></div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tiết có mặt</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.presentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 border border-red-100">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tiết vắng</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.absentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 border border-orange-100">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tiết đi trễ</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.lateDays}</p>
                    </div>
                </div>
            </div>

            {/* Attendance Timetable Board */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white">
                        <thead>
                            <tr>
                                <th className="p-4 text-center text-sm font-semibold text-slate-700 w-20 border-b border-r border-gray-100 bg-white sticky left-0 z-20">Tiết</th>
                                {daysOfWeek.map((day, i) => {
                                    const date = new Date(weekStart);
                                    date.setDate(weekStart.getDate() + i);
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <th
                                            key={day}
                                            className={`p-4 text-center text-sm border-b border-r border-gray-100 transition-colors ${isToday ? "text-blue-700 font-bold bg-blue-50/50" : "text-blue-600 font-medium bg-white"
                                                }`}
                                        >
                                            {day}
                                            <div className={`text-[10px] mt-0.5 ${isToday ? "text-blue-500 font-bold" : "text-gray-400 font-normal"}`}>
                                                {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                            {isToday && <span className="block text-[9px] text-blue-400 mt-0.5">Hôm nay</span>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {slots.map(slotIndex => (
                                <tr key={slotIndex} className="hover:bg-slate-50/50 transition-colors border-b border-gray-100">
                                    <td className="p-3 text-center text-xs font-medium text-slate-500 border-r border-gray-100 bg-white sticky left-0 z-10">
                                        T{slotIndex + 1}
                                    </td>
                                    {daysOfWeek.map((_, dayIdx) => {
                                        const date = new Date(weekStart);
                                        date.setDate(weekStart.getDate() + dayIdx);
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const dayNum = String(date.getDate()).padStart(2, '0');
                                        const dateStr = `${year}-${month}-${dayNum}`;
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

                                        let cardStyles = "bg-gray-50/30 border border-dashed border-gray-100 text-gray-400";
                                        let statusLabel = timetableSlot ? "Chưa điểm danh" : "-";
                                        const isToday = date.toDateString() === new Date().toDateString();

                                        if (record) {
                                            if (record.status === 'PRESENT') {
                                                cardStyles = "bg-green-100 border border-green-200 text-green-700 shadow-sm shadow-green-50/50";
                                                statusLabel = "Có mặt";
                                            } else if (record.status.startsWith('ABSENT')) {
                                                cardStyles = "bg-red-100 border border-red-200 text-red-700 shadow-sm shadow-red-50/50";
                                                statusLabel = record.status === 'ABSENT_EXCUSED' ? "Có phép" : "Vắng";
                                            } else if (record.status === 'LATE') {
                                                cardStyles = "bg-orange-100 border border-orange-200 text-orange-700 shadow-sm shadow-orange-50/50";
                                                statusLabel = "Đi trễ";
                                            }
                                        } else if (timetableSlot && date < new Date(new Date().setHours(23, 59, 59))) {
                                            cardStyles = "bg-slate-100 border border-slate-200 text-slate-500";
                                            statusLabel = "Chưa ghi nhận";
                                        }

                                        return (
                                            <td key={dayIdx} className={`p-2 border-r border-gray-100 h-20 group transition-colors ${isToday ? "bg-blue-50/10" : ""}`}>
                                                {timetableSlot || record ? (
                                                    <div className={`h-full w-full rounded-lg p-2 flex flex-col justify-between transition-all group-hover:shadow-md ${cardStyles}`}>
                                                        <div className="text-[13px] font-semibold leading-tight line-clamp-1">
                                                            {record?.subjectName || timetableSlot?.subjectName}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-right opacity-80 italic">
                                                            {statusLabel}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-200">-</div>
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
