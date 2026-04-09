import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { attendanceService, AttendanceStatus } from "../../../../services/attendanceService";
import type { DailyAttendanceSummaryDto } from "../../../../services/attendanceService";

type Props = {
    date: Date;
};

export default function DailySummaryView({ date }: Props) {
    const [summary, setSummary] = useState<DailyAttendanceSummaryDto | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const dateStr = format(date, "yyyy-MM-dd");
            const data = await attendanceService.getDailySummary(dateStr);
            setSummary(data);
        } catch (error) {
            console.error("Failed to load summary:", error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getStatusLabel = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.PRESENT: return "C";
            case AttendanceStatus.ABSENT_EXCUSED: return "P";
            case AttendanceStatus.ABSENT_UNEXCUSED: return "K";
            case AttendanceStatus.LATE: return "M";
            default: return "-";
        }
    };

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.PRESENT: return "text-green-600 bg-green-50";
            case AttendanceStatus.ABSENT_EXCUSED: return "text-yellow-600 bg-yellow-50 font-bold";
            case AttendanceStatus.ABSENT_UNEXCUSED: return "text-red-600 bg-red-50 font-bold";
            case AttendanceStatus.LATE: return "text-orange-600 bg-orange-50 font-bold";
            default: return "text-gray-400 bg-gray-50";
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;
    if (!summary) return <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Tổng hợp điểm danh - {summary.classroomName}</h2>
                    <p className="text-gray-500">
                        Ngày {format(date, "dd/MM/yyyy")} - {summary.isFinalized ? <span className="text-red-600 font-medium">🔒 Đã khóa (tự động)</span> : <span className="text-green-600 font-medium">Đang mở</span>}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-b border-r border-gray-200 w-64 bg-gray-50 sticky left-0 z-20">
                                Học sinh
                            </th>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(slot => (
                                <th key={slot} className="px-2 py-3 text-center text-sm font-medium text-gray-500 border-b border-gray-200 w-16">
                                    Tiết {slot}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 border-b border-gray-200">
                                Tóm tắt
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {summary.students.map((student) => {
                            const stats = Object.values(student.slotTheStatus).reduce((acc, status) => {
                                if (status === AttendanceStatus.ABSENT_EXCUSED || status === AttendanceStatus.ABSENT_UNEXCUSED) {
                                    acc.absent++;
                                } else if (status === AttendanceStatus.LATE) {
                                    acc.late++;
                                }
                                return acc;
                            }, { absent: 0, late: 0 });

                            return (
                                <tr key={student.studentId} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white hover:bg-gray-50">
                                        {student.studentName}
                                    </td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(slot => {
                                        const status = student.slotTheStatus[slot];
                                        return (
                                            <td key={slot} className="px-2 py-2 text-center border-r border-gray-100">
                                                {status ? (
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${getStatusColor(status)}`}>
                                                        {getStatusLabel(status)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        <div className="flex flex-col items-center gap-0.5">
                                            {stats.absent > 0 && (
                                                <span className="text-red-600 font-bold whitespace-nowrap">Vắng {stats.absent} tiết</span>
                                            )}
                                            {stats.late > 0 && (
                                                <span className="text-orange-600 font-bold whitespace-nowrap">Muộn {stats.late} tiết</span>
                                            )}
                                            {stats.absent === 0 && stats.late === 0 && (
                                                <span className="text-green-600">Đủ</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> C: Có mặt</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> P: Vắng có phép</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> K: Vắng không phép</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> M: Đi muộn</span>
            </div>
        </div>
    );
}
