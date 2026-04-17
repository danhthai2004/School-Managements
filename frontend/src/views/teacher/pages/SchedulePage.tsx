import { useState, useEffect } from "react";
import { teacherService, type TimetableDetail } from "../../../services/teacherService";
import { AlertCircle, Calendar, Clock } from "lucide-react";

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const ENGLISH_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<TimetableDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const data = await teacherService.getWeeklySchedule();
            setSchedule(data);
        } catch (err) {
            console.error("Failed to fetch schedule", err);
            setError("Không thể tải thời khóa biểu. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    // Deduplicate schedule: keep only one entry per (dayOfWeek, slotIndex) pair
    const deduplicatedSchedule = (() => {
        const seen = new Set<string>();
        return schedule.filter(s => {
            const key = `${s.dayOfWeek}-${s.slotIndex}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    })();

    const getCell = (day: string, slot: number) => {
        const dayIndex = DAYS.indexOf(day);
        if (dayIndex === -1) return undefined;
        const originalDayName = ENGLISH_DAYS[dayIndex];
        return deduplicatedSchedule.find(s => s.dayOfWeek === originalDayName && s.slotIndex === slot);
    };

    // Get slot time from any matching schedule entry for that slot
    const getSlotTime = (slot: number): string | null => {
        const entry = deduplicatedSchedule.find(s => s.slotIndex === slot);
        if (entry?.startTime && entry?.endTime) {
            return `${entry.startTime} - ${entry.endTime}`;
        }
        return null;
    };

    const getDefaultSession = (slot: number) => {
        if (slot <= 5) return "Sáng";
        return "Chiều";
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
                    <p className="text-sm text-gray-500 mt-1">Xem lịch giảng dạy hàng tuần của bạn</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar size={24} />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Đang tải dữ liệu...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-3 border-r border-gray-200 text-center font-semibold text-gray-700 w-16 sticky left-0 bg-gray-50 z-10">
                                        Tiết
                                    </th>
                                    {DAYS.map(day => (
                                        <th key={day} className="p-3 border-r border-gray-200 text-center font-semibold text-blue-700 bg-blue-50/50 min-w-[150px]">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {SLOTS.map((slot) => (
                                    <tr key={slot} className={`border-b border-gray-100 hover:bg-gray-50 ${slot === 5 ? 'border-b-2 border-gray-300' : ''}`}>
                                        <td className="p-3 text-center font-medium text-gray-500 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-sm font-bold text-gray-700">{slot}</span>
                                                <span className="text-[10px] text-gray-400 font-normal">
                                                    {getSlotTime(slot) || getDefaultSession(slot)}
                                                </span>
                                            </div>
                                        </td>
                                        {DAYS.map(day => {
                                            const lesson = getCell(day, slot);
                                            return (
                                                <td key={`${day}-${slot}`} className="p-2 border-r border-gray-100 h-20 align-top">
                                                    {lesson ? (
                                                        <div className="h-full w-full bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col gap-1 transition-all hover:shadow-md hover:border-blue-300">
                                                            <div className="font-bold text-blue-800 text-sm line-clamp-1" title={lesson.subjectName}>
                                                                {lesson.subjectName}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-blue-600">
                                                                <span className="font-semibold bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                    {lesson.className}
                                                                </span>
                                                            </div>
                                                            {lesson.isFixed && (
                                                                <span className="text-[10px] text-gray-400 mt-auto flex items-center gap-1">
                                                                    <Clock size={10} /> Cố định
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // Empty cell
                                                        <div className="h-full w-full"></div>
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
            )}
        </div>
    );
}
