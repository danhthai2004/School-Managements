import { useState, useEffect } from "react";
import { studentService, type StudentTimetableDto, type TimetableSlotDto } from "../../services/studentService";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useSemester } from "../../context/SemesterContext";
import SemesterSelector from "../../components/common/SemesterSelector";
import { formatDate } from "../../utils/dateHelpers";

const days = [
    { value: 2, label: "Thứ 2" },
    { value: 3, label: "Thứ 3" },
    { value: 4, label: "Thứ 4" },
    { value: 5, label: "Thứ 5" },
    { value: 6, label: "Thứ 6" },
    { value: 7, label: "Thứ 7" },
];



function getWeekDates(weekOffset: number = 0) {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
}

function getWeekNumber(date: Date) {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const daysVal = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((daysVal + startDate.getDay() + 1) / 7);
}



export default function StudentTimetablePage() {
    const { activeSemester, loading: isContextLoading } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<StudentTimetableDto | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);

    // Initial load priority: System Active Semester
    useEffect(() => {
        if (!selectedSemesterId && activeSemester) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const { monday, sunday } = getWeekDates(weekOffset);
    const weekNumber = getWeekNumber(monday);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedSemesterId) return;
            try {
                const data = await studentService.getTimetable(selectedSemesterId);
                setTimetable(data);
                setError(null);
            } catch (err: unknown) {
                console.error("Error fetching timetable:", err);
                setError("Không thể tải thời khóa biểu. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        };
        if (!isContextLoading) {
            fetchData();
        }
    }, [selectedSemesterId, isContextLoading]);

    const getSlotForDayAndPeriod = (dayOfWeek: number, slotIndex: number): TimetableSlotDto | null => {
        if (!timetable) return null;
        return timetable.slots.find(s => s.dayOfWeek === dayOfWeek && s.slotIndex === slotIndex) || null;
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !timetable) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg font-medium">{error || "Không thể tải thời khóa biểu"}</p>
                    <p className="text-gray-400 text-sm mt-2">Bạn có thể chưa được xếp vào lớp học nào trong năm học hiện tại.</p>
                </div>
            </div>
        );
    }

    const hasSlots = timetable.slots && timetable.slots.length > 0;

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Tuần {weekNumber} ({formatDate(monday)} - {formatDate(sunday)})
                        </p>
                    </div>
                    <SemesterSelector 
                        value={selectedSemesterId} 
                        onChange={setSelectedSemesterId}
                        label="" 
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setWeekOffset(0)}
                        className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Tuần này
                    </button>
                    <button
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Timetable Grid */}
            {hasSlots ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] border-collapse bg-white">
                            <thead>
                                <tr>
                                    <th className="p-4 text-center text-sm font-semibold text-slate-700 w-16 border-b border-r border-gray-100 bg-white sticky left-0 z-20">Tiết</th>
                                    {days.map((day) => (
                                        <th
                                            key={day.value}
                                            className="p-4 text-center text-sm font-medium text-blue-600 bg-white border-b border-r border-gray-100"
                                        >
                                            {day.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Morning session header */}
                                <tr>
                                    <td colSpan={days.length + 1} className="p-3 text-center border-b border-gray-100">
                                        <span className="text-xs font-medium text-blue-600 uppercase">BUỔI SÁNG</span>
                                    </td>
                                </tr>
                                {[1, 2, 3, 4, 5].map((period) => (
                                    <tr key={period} className={`${period === 5 ? 'border-b-2 border-gray-200' : 'border-b border-gray-100'} hover:bg-slate-50/50 transition-colors`}>
                                        <td className="p-3 text-center text-xs font-medium text-slate-500 border-r border-gray-100 bg-white sticky left-0 z-10">
                                            T{period}
                                        </td>
                                        {days.map((day) => {
                                            const slot = getSlotForDayAndPeriod(day.value, period);

                                            return (
                                                <td key={day.value} className="p-2 border-r border-gray-100 align-middle text-center h-[60px]">
                                                    {slot ? (
                                                        <div className="flex flex-col justify-center items-center h-full w-full">
                                                            <span className="font-medium text-xs text-slate-800">{slot.subjectName}</span>
                                                            <span className="text-[10px] text-blue-400 mt-0.5">-</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center text-slate-200">-</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                                {/* Afternoon session header */}
                                <tr>
                                    <td colSpan={days.length + 1} className="p-3 text-center border-b border-gray-100">
                                        <span className="text-xs font-medium text-blue-600 uppercase">BUỔI CHIỀU</span>
                                    </td>
                                </tr>
                                {[6, 7, 8, 9].map((period) => (
                                    <tr key={period} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3 text-center text-xs font-medium text-slate-500 border-r border-gray-100 bg-white sticky left-0 z-10">
                                            T{period}
                                        </td>
                                        {days.map((day) => {
                                            const slot = getSlotForDayAndPeriod(day.value, period);

                                            return (
                                                <td key={day.value} className="p-2 border-r border-gray-100 align-middle text-center h-[60px]">
                                                    {slot ? (
                                                        <div className="flex flex-col justify-center items-center h-full w-full">
                                                            <span className="font-medium text-xs text-slate-800">{slot.subjectName}</span>
                                                            <span className="text-[10px] text-blue-400 mt-0.5">-</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center text-slate-200">-</div>
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
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg font-medium">Chưa có thời khóa biểu chính thức</p>
                    <p className="text-gray-400 text-sm mt-2">Thời khóa biểu cho học kỳ này chưa được công bố hoặc bạn chưa được xếp lớp.</p>
                </div>
            )}
        </div>
    );
}
