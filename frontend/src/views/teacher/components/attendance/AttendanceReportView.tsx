import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { attendanceService } from "../../../../services/attendanceService";
import type { AttendanceReportSummaryDto } from "../../../../services/attendanceService";
import AttendanceDetailModal from "./AttendanceDetailModal";

type Props = {
    date: Date;
    reportType: "WEEKLY" | "MONTHLY";
};

type ModalInfo = {
    studentId: string;
    studentName: string;
    statusFilter?: string;
    statusLabel: string;
} | null;

export default function AttendanceReportView({ date, reportType }: Props) {
    const [report, setReport] = useState<AttendanceReportSummaryDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<string>("studentName");
    const [sortAsc, setSortAsc] = useState(true);
    const [modalInfo, setModalInfo] = useState<ModalInfo>(null);

    const getDateRange = useCallback(() => {
        if (reportType === "WEEKLY") {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = endOfWeek(date, { weekStartsOn: 1 });
            return { start, end };
        } else {
            const start = startOfMonth(date);
            const end = endOfMonth(date);
            return { start, end };
        }
    }, [date, reportType]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const { start, end } = getDateRange();
            const startStr = format(start, "yyyy-MM-dd");
            const endStr = format(end, "yyyy-MM-dd");
            const data = await attendanceService.getAttendanceReport(startStr, endStr, reportType);
            setReport(data);
        } catch (error) {
            console.error("Failed to load attendance report:", error);
        } finally {
            setLoading(false);
        }
    }, [date, reportType, getDateRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const handleCellClick = (studentId: string, studentName: string, count: number, statusFilter: string | undefined, statusLabel: string) => {
        if (count === 0) return; // Don't open modal for 0 values
        setModalInfo({ studentId, studentName, statusFilter, statusLabel });
    };

    const sortedStudents = report?.students
        ? [...report.students].sort((a, b) => {
            let valA: string | number, valB: string | number;
            switch (sortField) {
                case "studentName": valA = a.studentName; valB = b.studentName; break;
                case "totalPresent": valA = a.totalPresent; valB = b.totalPresent; break;
                case "totalAbsentExcused": valA = a.totalAbsentExcused; valB = b.totalAbsentExcused; break;
                case "totalAbsentUnexcused": valA = a.totalAbsentUnexcused; valB = b.totalAbsentUnexcused; break;
                case "totalLate": valA = a.totalLate; valB = b.totalLate; break;
                case "attendanceRate": valA = a.attendanceRate; valB = b.attendanceRate; break;
                default: valA = a.studentName; valB = b.studentName;
            }
            if (typeof valA === "string") {
                return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
            }
            return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        })
        : [];

    const { start, end } = getDateRange();
    const startDateStr = format(start, "yyyy-MM-dd");
    const endDateStr = format(end, "yyyy-MM-dd");
    const periodLabel = reportType === "WEEKLY"
        ? `Tuần ${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")}`
        : `Tháng ${format(date, "MM/yyyy")}`;

    const getAttendanceRateColor = (rate: number) => {
        if (rate >= 90) return "text-green-600";
        if (rate >= 75) return "text-yellow-600";
        return "text-red-600";
    };

    const getAttendanceRateBg = (rate: number) => {
        if (rate >= 90) return "bg-green-50";
        if (rate >= 75) return "bg-yellow-50";
        return "bg-red-50";
    };

    if (loading) return <div className="p-8 text-center">Đang tải báo cáo...</div>;
    if (!report) return <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>;

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                Báo cáo điểm danh - {report.classroomName}
                            </h2>
                            <p className="text-gray-500 mt-1">{periodLabel}</p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="text-sm text-blue-600 font-medium">Tổng học sinh</div>
                            <div className="text-2xl font-bold text-blue-800 mt-1">{report.totalStudents}</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                            <div className="text-sm text-purple-600 font-medium">Số ngày học</div>
                            <div className="text-2xl font-bold text-purple-800 mt-1">{report.totalSchoolDays}</div>
                        </div>
                        <div className={`rounded-xl p-4 border ${report.overallAttendanceRate >= 90 ? 'bg-green-50 border-green-100' : report.overallAttendanceRate >= 75 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`text-sm font-medium ${getAttendanceRateColor(report.overallAttendanceRate)}`}>Tỷ lệ chuyên cần</div>
                            <div className={`text-2xl font-bold mt-1 ${getAttendanceRateColor(report.overallAttendanceRate)}`}>{report.overallAttendanceRate}%</div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-20 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("studentName")}>
                                    Học sinh {sortField === "studentName" && (sortAsc ? "↑" : "↓")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("totalPresent")}>
                                    <span className="flex flex-col items-center">
                                        <span className="w-3 h-3 rounded-full bg-green-500 mb-1"></span>
                                        Có mặt {sortField === "totalPresent" && (sortAsc ? "↑" : "↓")}
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("totalAbsentExcused")}>
                                    <span className="flex flex-col items-center">
                                        <span className="w-3 h-3 rounded-full bg-yellow-500 mb-1"></span>
                                        Vắng P {sortField === "totalAbsentExcused" && (sortAsc ? "↑" : "↓")}
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("totalAbsentUnexcused")}>
                                    <span className="flex flex-col items-center">
                                        <span className="w-3 h-3 rounded-full bg-red-500 mb-1"></span>
                                        Vắng KP {sortField === "totalAbsentUnexcused" && (sortAsc ? "↑" : "↓")}
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("totalLate")}>
                                    <span className="flex flex-col items-center">
                                        <span className="w-3 h-3 rounded-full bg-orange-500 mb-1"></span>
                                        Muộn {sortField === "totalLate" && (sortAsc ? "↑" : "↓")}
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                    Tổng tiết
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("attendanceRate")}>
                                    Tỷ lệ % {sortField === "attendanceRate" && (sortAsc ? "↑" : "↓")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedStudents.map((student) => (
                                <tr key={student.studentId} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white hover:bg-gray-50 whitespace-nowrap">
                                        {student.studentName}
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg text-green-700 bg-green-50 font-medium ${student.totalPresent > 0 ? 'cursor-pointer hover:ring-2 hover:ring-green-300 transition-all' : ''}`}
                                            onClick={() => handleCellClick(student.studentId, student.studentName, student.totalPresent, "PRESENT", "Có mặt")}
                                        >
                                            {student.totalPresent}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg font-medium ${student.totalAbsentExcused > 0 ? 'text-yellow-700 bg-yellow-50 cursor-pointer hover:ring-2 hover:ring-yellow-300 transition-all' : 'text-gray-400 bg-gray-50'}`}
                                            onClick={() => handleCellClick(student.studentId, student.studentName, student.totalAbsentExcused, "ABSENT_EXCUSED", "Vắng có phép")}
                                        >
                                            {student.totalAbsentExcused}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg font-medium ${student.totalAbsentUnexcused > 0 ? 'text-red-700 bg-red-50 cursor-pointer hover:ring-2 hover:ring-red-300 transition-all' : 'text-gray-400 bg-gray-50'}`}
                                            onClick={() => handleCellClick(student.studentId, student.studentName, student.totalAbsentUnexcused, "ABSENT_UNEXCUSED", "Vắng không phép")}
                                        >
                                            {student.totalAbsentUnexcused}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg font-medium ${student.totalLate > 0 ? 'text-orange-700 bg-orange-50 cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all' : 'text-gray-400 bg-gray-50'}`}
                                            onClick={() => handleCellClick(student.studentId, student.studentName, student.totalLate, "LATE", "Đi muộn")}
                                        >
                                            {student.totalLate}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span
                                            className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg text-gray-600 font-medium cursor-pointer hover:bg-gray-100 hover:ring-2 hover:ring-gray-300 transition-all"
                                            onClick={() => handleCellClick(student.studentId, student.studentName, student.totalSessions, undefined, "Tất cả tiết")}
                                        >
                                            {student.totalSessions}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm">
                                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg font-bold ${getAttendanceRateColor(student.attendanceRate)} ${getAttendanceRateBg(student.attendanceRate)}`}>
                                            {student.attendanceRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Có mặt (C)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Vắng có phép (P)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Vắng không phép (K)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Đi muộn (M)</span>
                    <span className="ml-auto text-gray-400">
                        💡 Click vào số để xem chi tiết
                    </span>
                </div>
            </div>

            {/* Detail Modal */}
            {modalInfo && (
                <AttendanceDetailModal
                    studentId={modalInfo.studentId}
                    studentName={modalInfo.studentName}
                    startDate={startDateStr}
                    endDate={endDateStr}
                    statusFilter={modalInfo.statusFilter}
                    statusLabel={modalInfo.statusLabel}
                    onClose={() => setModalInfo(null)}
                />
            )}
        </>
    );
}
