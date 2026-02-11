import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import type { AttendanceReportDto } from "../../../../services/schoolReportService";
import { CheckIcon } from "./ReportIcons";
import StatCard from "./StatCard";

const AttendanceTab = ({ data }: { data: AttendanceReportDto }) => {
    const attendanceStatusData = [
        { name: "Có mặt", value: data.attendanceByClass.reduce((sum, c) => sum + c.presentCount, 0), color: "#10B981" },
        { name: "Vắng", value: data.attendanceByClass.reduce((sum, c) => sum + c.absentCount, 0), color: "#EF4444" },
        { name: "Trễ", value: data.attendanceByClass.reduce((sum, c) => sum + c.lateCount, 0), color: "#F59E0B" },
        { name: "Có phép", value: data.attendanceByClass.reduce((sum, c) => sum + c.excusedCount, 0), color: "#3B82F6" },
    ].filter((d) => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={<CheckIcon />} label="Tổng buổi học" value={data.totalSessions} color="blue" />
                <StatCard
                    icon={<CheckIcon />}
                    label="Tỷ lệ có mặt"
                    value={`${data.overallAttendanceRate}%`}
                    color={data.overallAttendanceRate >= 90 ? "green" : data.overallAttendanceRate >= 80 ? "orange" : "gray"}
                />
                <StatCard icon={<CheckIcon />} label="Số lớp" value={data.attendanceByClass.length} color="purple" />
                <StatCard icon={<CheckIcon />} label="HS vắng nhiều" value={data.chronicAbsentees.length} color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Attendance Status Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng hợp điểm danh</h3>
                    {attendanceStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={attendanceStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {attendanceStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu điểm danh
                        </div>
                    )}
                </div>

                {/* Attendance Rate by Class Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tỷ lệ có mặt theo lớp</h3>
                    {data.attendanceByClass.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.attendanceByClass.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="className" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v) => [`${v}%`, "Tỷ lệ có mặt"]} />
                                <Bar dataKey="attendanceRate" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance by Class Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết điểm danh theo lớp</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Số buổi</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-green-600">Có mặt</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-red-600">Vắng</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-yellow-600">Trễ</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">Có phép</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.attendanceByClass.map((c) => (
                                <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                    <td className="py-3 px-4 text-center text-gray-600">{c.grade}</td>
                                    <td className="py-3 px-4 text-center text-gray-600">{c.totalSessions}</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">{c.presentCount}</td>
                                    <td className="py-3 px-4 text-center text-red-600 font-medium">{c.absentCount}</td>
                                    <td className="py-3 px-4 text-center text-yellow-600 font-medium">{c.lateCount}</td>
                                    <td className="py-3 px-4 text-center text-blue-600 font-medium">{c.excusedCount}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${c.attendanceRate >= 90
                                                ? "bg-green-100 text-green-700"
                                                : c.attendanceRate >= 80
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {c.attendanceRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Chronic Absentees Table */}
            {data.chronicAbsentees.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        <span className="text-red-500">⚠️</span> Học sinh vắng nhiều (≥5 ngày)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã HS</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Họ tên</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Số ngày vắng</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ vắng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.chronicAbsentees.map((s) => (
                                    <tr key={s.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-600">{s.studentCode}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{s.studentName}</td>
                                        <td className="py-3 px-4 text-gray-600">{s.className}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                {s.absentDays} ngày
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-red-600 font-medium">{s.absentRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTab;
