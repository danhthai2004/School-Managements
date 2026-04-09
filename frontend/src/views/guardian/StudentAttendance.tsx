import { useState, useEffect } from "react";
import { guardianService } from "../../services/guardianService";
import type { AttendanceSummaryDto } from "../../services/studentService";
import { CheckCircle, XCircle, Clock, Calendar, AlertCircle } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";

const statusConfig = {
    PRESENT: { label: "Có mặt", icon: CheckCircle, color: "text-green-600 bg-green-100" },
    ABSENT_UNEXCUSED: { label: "Vắng không phép", icon: XCircle, color: "text-red-600 bg-red-100" },
    ABSENT_EXCUSED: { label: "Vắng có phép", icon: AlertCircle, color: "text-blue-600 bg-blue-100" },
    LATE: { label: "Đi trễ", icon: Clock, color: "text-orange-600 bg-orange-100" },
};

export default function StudentAttendance() {
    const { student } = useOutletContext<StudentDataProp>();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceSummaryDto | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!student) return;
            setLoading(true);
            try {
                const [year, month] = selectedMonth.split('-').map(Number);
                const data = await guardianService.getAttendance(student.id, month, year);
                setAttendance(data);
            } catch (error) {
                console.error("Error fetching attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedMonth, student]);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chuyên cần của con</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Theo dõi tình hình đến lớp của {student?.fullName}
                    </p>
                </div>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-200">
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Tỷ lệ chuyên cần</p>
                    <p className="text-3xl font-bold mt-1 text-center">{attendance.attendanceRate}%</p>
                    <p className="text-white/60 text-[10px] mt-2 italic text-center">Calculated based on school days</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Có mặt</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.presentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Vắng</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.absentDays}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Đi trễ</p>
                        <p className="text-2xl font-bold text-gray-900">{attendance.lateDays}</p>
                    </div>
                </div>
            </div>

            {/* Attendance Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    Tiến độ đi học trong tháng
                </h3>
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-50 border border-blue-100">
                                {attendance.attendanceRate >= 90 ? "Rất tốt" : attendance.attendanceRate >= 70 ? "Khá" : "Cần lưu ý"}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">
                                {attendance.attendanceRate}%
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-50 border border-gray-100">
                        <div
                            style={{ width: `${attendance.attendanceRate}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 ${
                                attendance.attendanceRate >= 90 ? "bg-gradient-to-r from-blue-400 to-indigo-500" :
                                attendance.attendanceRate >= 70 ? "bg-gradient-to-r from-blue-300 to-blue-500" :
                                    "bg-gradient-to-r from-red-400 to-red-500"
                            }`}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Attendance Details Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Lịch sử điểm danh chi tiết
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left bg-gray-50/30">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attendance.records.length > 0 ? (
                                attendance.records.map((record, i) => {
                                    const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.PRESENT;
                                    const Icon = config.icon;
                                    return (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${config.color}`}>
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">
                                                        {new Date(record.date).toLocaleDateString('vi-VN', { 
                                                            weekday: 'long', 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
                                                    <span className={`text-sm font-medium ${config.color.split(' ')[0]}`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 italic">
                                                    {record.note || "-"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Calendar className="w-12 h-12 mb-3 text-gray-200" />
                                            <p className="text-sm">Không có dữ liệu điểm danh tháng này</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}