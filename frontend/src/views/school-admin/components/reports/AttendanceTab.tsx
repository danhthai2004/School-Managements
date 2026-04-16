import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { AttendanceReportDto } from "../../../../services/schoolReportService";
import StatCard from "./StatCard";
import { Calendar, AlertCircle, CheckCircle } from "lucide-react";

const AttendanceTab = ({ data }: { data: AttendanceReportDto }) => {
    const attendanceStatusData = [
        { name: "Trung bình có mặt", value: data.overallAttendanceRate, color: "#10B981" },
        { name: "Vắng học", value: 100 - data.overallAttendanceRate, color: "#E5E7EB" },
    ];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<Calendar />} label="Tỷ lệ chuyên cần chung" value={`${data.overallAttendanceRate.toFixed(1)}%`} color="blue" />
                <StatCard icon={<AlertCircle />} label="Học sinh vắng nhiều" value={data.chronicAbsentees.length} color="orange" />
                <StatCard icon={<CheckCircle />} label="Số tiết đã điểm danh" value={data.totalSessions} color="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Summary Pie */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan hiện diện</h3>
                    <div className="h-[300px] flex flex-col items-center justify-center relative">
                        {data.totalSessions > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attendanceStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {attendanceStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center space-y-2">
                                <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-100 mx-auto flex items-center justify-center">
                                    <Calendar size={32} className="text-gray-200" />
                                </div>
                                <p className="text-gray-400 text-sm italic">Chưa có dữ liệu điểm danh trong 30 ngày qua</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chronic Absentees List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Cảnh báo vắng học bất thường</h3>
                    </div>
                    <div className="p-6">
                        {data.chronicAbsentees.length > 0 ? (
                            <div className="space-y-4">
                                {data.chronicAbsentees.slice(0, 5).map((s) => (
                                    <div key={s.studentId} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                                                {s.studentName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{s.studentName}</p>
                                                <p className="text-[10px] text-gray-500">{s.className}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-rose-600 text-lg">{s.absentDays}</p>
                                            <p className="text-[10px] text-rose-300 uppercase leading-none font-bold">Ngày vắng</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-50 rounded-xl">
                                <CheckCircle size={32} strokeWidth={1} className="mb-2" />
                                <p className="text-xs font-medium uppercase tracking-widest">Tất cả ổn định</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance by Class Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Chi tiết điểm danh theo lớp</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lớp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Sĩ số</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tỷ lệ chuyên cần</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center text-rose-600">Vắng (TB/Tiết)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center text-amber-600">Trễ (TB/Tiết)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Số tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.attendanceByClass.length > 0 ? (
                                data.attendanceByClass.map((c) => (
                                    <tr key={c.classId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{c.studentCount}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-start gap-4">
                                                <div className="w-[120px] bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${c.attendanceRate >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${c.attendanceRate}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{c.attendanceRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-rose-600 font-bold bg-rose-50/30">
                                            {(c.absentCount / (c.totalSessions || 1)).toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-amber-600 font-bold bg-amber-50/30">
                                            {(c.lateCount / (c.totalSessions || 1)).toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-500">{c.totalSessions}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                                        Không có dữ liệu chi tiết cho các lớp
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTab;
