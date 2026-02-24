import { useState, useEffect } from "react";
import { studentService, type StudentTimetableDto, type TimetableSlotDto } from "../../services/studentService";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const days = [
    { value: 2, label: "Thứ 2" },
    { value: 3, label: "Thứ 3" },
    { value: 4, label: "Thứ 4" },
    { value: 5, label: "Thứ 5" },
    { value: 6, label: "Thứ 6" },
    { value: 7, label: "Thứ 7" },
];

const subjectColors: Record<string, { bg: string; text: string }> = {
    "Toán": { bg: "bg-blue-100", text: "text-blue-700" },
    "Văn": { bg: "bg-pink-100", text: "text-pink-700" },
    "Anh": { bg: "bg-purple-100", text: "text-purple-700" },
    "Lý": { bg: "bg-orange-100", text: "text-orange-700" },
    "Hóa": { bg: "bg-green-100", text: "text-green-700" },
    "Sinh": { bg: "bg-teal-100", text: "text-teal-700" },
    "Sử": { bg: "bg-amber-100", text: "text-amber-700" },
    "Địa": { bg: "bg-cyan-100", text: "text-cyan-700" },
    "GDCD": { bg: "bg-rose-100", text: "text-rose-700" },
    "Tin": { bg: "bg-indigo-100", text: "text-indigo-700" },
    "Tin học": { bg: "bg-yellow-100", text: "text-yellow-700" },
    "Thể dục": { bg: "bg-lime-100", text: "text-lime-700" },
    "Công nghệ": { bg: "bg-slate-100", text: "text-slate-700" },
    "GDQP": { bg: "bg-red-50", text: "text-red-600" },
    "SHL": { bg: "bg-pink-50", text: "text-pink-600" },
};

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

function formatDate(date: Date) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StudentTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<StudentTimetableDto | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);

    const { monday, sunday } = getWeekDates(weekOffset);
    const weekNumber = getWeekNumber(monday);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await studentService.getTimetable();
                setTimetable(data);
            } catch (error) {
                console.error("Error fetching timetable:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSlotForDayAndPeriod = (dayOfWeek: number, period: number): TimetableSlotDto | null => {
        if (!timetable) return null;
        return timetable.slots.find(s => s.dayOfWeek === dayOfWeek && s.period === period) || null;
    };

    const getSubjectColor = (subjectName: string) => {
        // Try to find exact match or partial match
        for (const [key, value] of Object.entries(subjectColors)) {
            if (subjectName.includes(key) || key.includes(subjectName)) {
                return value;
            }
        }
        return { bg: "bg-gray-100", text: "text-gray-700" };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
                    <p className="text-gray-500 mt-1">
                        Tuần {weekNumber} ({formatDate(monday)} - {formatDate(sunday)})
                    </p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 w-16">Tiết</th>
                                {days.map((day) => (
                                    <th
                                        key={day.value}
                                        className="px-4 py-3 text-center text-sm font-semibold text-gray-600"
                                    >
                                        {day.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Morning session header */}
                            <tr className="bg-blue-50 border-b border-blue-100">
                                <td colSpan={days.length + 1} className="px-4 py-2 text-center">
                                    <span className="text-sm font-semibold text-blue-600">🌅 BUỔI SÁNG (Tiết 1-5)</span>
                                </td>
                            </tr>
                            {[1, 2, 3, 4, 5].map((period) => (
                                <tr key={period} className={`border-b border-gray-50 ${period === 5 ? 'border-b-2 border-gray-200' : ''}`}>
                                    <td className="px-4 py-2 text-center">
                                        <span className="text-sm font-medium text-gray-600">{period}</span>
                                    </td>
                                    {days.map((day) => {
                                        const slot = getSlotForDayAndPeriod(day.value, period);
                                        const colors = slot ? getSubjectColor(slot.subjectName) : null;

                                        return (
                                            <td key={day.value} className="px-2 py-1.5">
                                                {slot ? (
                                                    <div className={`${colors?.bg} ${colors?.text} rounded-lg p-2 text-center min-h-[50px] flex flex-col justify-center`}>
                                                        <div className="font-medium text-sm">{slot.subjectName}</div>
                                                        <div className="text-xs opacity-75">{slot.room || ""}</div>
                                                    </div>
                                                ) : (
                                                    <div className="min-h-[50px]"></div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Afternoon session header */}
                            <tr className="bg-orange-50 border-b border-orange-100">
                                <td colSpan={days.length + 1} className="px-4 py-2 text-center">
                                    <span className="text-sm font-semibold text-orange-600">🌇 BUỔI CHIỀU (Tiết 6-9)</span>
                                </td>
                            </tr>
                            {[6, 7, 8, 9].map((period) => (
                                <tr key={period} className="border-b border-gray-50 last:border-0">
                                    <td className="px-4 py-2 text-center">
                                        <span className="text-sm font-medium text-gray-600">{period}</span>
                                    </td>
                                    {days.map((day) => {
                                        const slot = getSlotForDayAndPeriod(day.value, period);
                                        const colors = slot ? getSubjectColor(slot.subjectName) : null;

                                        return (
                                            <td key={day.value} className="px-2 py-1.5">
                                                {slot ? (
                                                    <div className={`${colors?.bg} ${colors?.text} rounded-lg p-2 text-center min-h-[50px] flex flex-col justify-center`}>
                                                        <div className="font-medium text-sm">{slot.subjectName}</div>
                                                        <div className="text-xs opacity-75">{slot.room || ""}</div>
                                                    </div>
                                                ) : (
                                                    <div className="min-h-[50px]"></div>
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
