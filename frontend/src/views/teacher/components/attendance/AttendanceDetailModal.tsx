import { useState, useEffect } from "react";
import { attendanceService, AttendanceStatus } from "../../../../services/attendanceService";
import type { StudentAttendanceDetailDto } from "../../../../services/attendanceService";
import { formatDate } from "../../../../utils/dateHelpers";

type Props = {
    studentId: string;
    studentName: string;
    startDate: string;
    endDate: string;
    statusFilter?: string;
    statusLabel: string;
    onClose: () => void;
};

const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
        case AttendanceStatus.PRESENT: return "Có mặt";
        case AttendanceStatus.ABSENT_EXCUSED: return "Vắng có phép";
        case AttendanceStatus.ABSENT_UNEXCUSED: return "Vắng không phép";
        case AttendanceStatus.LATE: return "Đi muộn";
        default: return status;
    }
};

const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
        case AttendanceStatus.PRESENT:
            return "bg-green-100 text-green-700";
        case AttendanceStatus.ABSENT_EXCUSED:
            return "bg-yellow-100 text-yellow-700";
        case AttendanceStatus.ABSENT_UNEXCUSED:
            return "bg-red-100 text-red-700";
        case AttendanceStatus.LATE:
            return "bg-orange-100 text-orange-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
};



const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return days[date.getDay()];
};

export default function AttendanceDetailModal({
    studentId, studentName, startDate, endDate, statusFilter, statusLabel, onClose
}: Props) {
    const [detail, setDetail] = useState<StudentAttendanceDetailDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await attendanceService.getStudentAttendanceDetail(
                    studentId, startDate, endDate, statusFilter
                );
                setDetail(data);
            } catch (error) {
                console.error("Failed to load student detail:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [studentId, startDate, endDate, statusFilter]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4 animate-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{studentName}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Chi tiết: <span className="font-medium">{statusLabel}</span>
                            {" — "}
                            {formatDate(startDate)} → {formatDate(endDate)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Đang tải...</div>
                    ) : !detail || detail.records.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>Không có dữ liệu điểm danh</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Ngày
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Thứ
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Tiết
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Môn học
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                        Ghi chú
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {detail.records.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                            {formatDate(record.date)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-sm text-gray-600">
                                            {getDayOfWeek(record.date)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-sm">
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs">
                                                {record.slotIndex}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {record.subjectName || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-center text-sm">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(record.status)}`}>
                                                {getStatusLabel(record.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 italic">
                                            {record.remarks || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                    <span className="text-xs text-gray-500">
                        {detail?.records.length ?? 0} bản ghi
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
