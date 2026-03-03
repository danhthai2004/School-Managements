import { useState, useEffect } from "react";
import { studentService, type AttendanceSummaryDto } from "../../services/studentService";
import { CheckCircle, XCircle, Clock, Calendar, AlertCircle } from "lucide-react";
import { formatDate } from "../../utils/dateHelpers";

const statusConfig = {
    PRESENT: { label: "Có mặt", icon: CheckCircle, color: "text-green-600 bg-green-100" },
    ABSENT: { label: "Vắng", icon: XCircle, color: "text-red-600 bg-red-100" },
    LATE: { label: "Đi trễ", icon: Clock, color: "text-orange-600 bg-orange-100" },
    EXCUSED: { label: "Có phép", icon: AlertCircle, color: "text-blue-600 bg-blue-100" },
};

export default function StudentAttendancePage() {
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceSummaryDto | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [year, month] = selectedMonth.split('-').map(Number);
                const data = await studentService.getAttendance(month, year);
                setAttendance(data);
            } catch (error) {
                console.error("Error fetching attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedMonth]);

    if (loading || !attendance) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Điểm Danh</h1>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
                    <p className="text-white/80 text-sm">Tỷ lệ chuyên cần</p>
                    <p className="text-3xl font-bold">{attendance.attendanceRate}%</p>
                    <p className="text-white/60 text-xs mt-1">Trong tháng</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Có mặt</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.presentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Vắng</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.absentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Đi trễ</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.lateDays}</p>
                    </div>
                </div>
            </div>

            {/* Attendance Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Tiến độ chuyên cần</h3>
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-100">
                                {attendance.attendanceRate >= 80 ? "Tốt" : attendance.attendanceRate >= 50 ? "Trung bình" : "Cần cải thiện"}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-green-600">
                                {attendance.attendanceRate}%
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-100">
                        <div
                            style={{ width: `${attendance.attendanceRate}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${attendance.attendanceRate >= 80 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                                attendance.attendanceRate >= 50 ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                                    "bg-gradient-to-r from-red-400 to-red-500"
                                }`}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Attendance Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Chi tiết điểm danh
                    </h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {attendance.records.length > 0 ? (
                        attendance.records.map((record, i) => {
                            const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.PRESENT;
                            const Icon = config.icon;
                            return (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {formatDate(record.date)}
                                            </p>
                                            {record.note && <p className="text-sm text-gray-500">{record.note}</p>}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                                        {config.label}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-6 py-12 text-center text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Không có dữ liệu điểm danh cho tháng này</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
