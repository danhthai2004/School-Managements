import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import type { StudentReportDto } from "../../../../services/schoolReportService";
import StatCard from "./StatCard";
import { Users, UserCheck, UserX } from "lucide-react";

const StudentTab = ({ data }: { data: StudentReportDto }) => {
    const statusData = [
        { name: "Sẵn sàng", value: data.activeStudents, color: "#10B981" },
        { name: "Nghỉ / Khác", value: data.nonActiveStudents, color: "#EF4444" },
    ].filter((d) => d.value > 0);

    const accountData = [
        { name: "Đã kích hoạt", value: data.studentsWithAccount, color: "#3B82F6" },
        { name: "Chưa kích hoạt", value: data.studentsWithoutAccount, color: "#F59E0B" },
    ].filter((d) => d.value > 0);

    const enrollmentData = data.enrollmentStats;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users />} label="Tổng học sinh" value={data.totalStudents} color="blue" />
                <StatCard icon={<UserCheck />} label="Đang học" value={data.activeStudents} color="green" />
                <StatCard icon={<UserCheck />} label="Đã cấp TK" value={data.studentsWithAccount} color="indigo" />
                <StatCard icon={<UserX />} label="Chưa có TK" value={data.studentsWithoutAccount} color="orange" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Charts */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-50 pb-2">Phân bổ học sinh</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-700 text-center uppercase tracking-wide">Số lượng học sinh</p>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={5}>
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-700 text-center uppercase tracking-wide">Tài khoản</p>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={accountData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={5}>
                                            {accountData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enrollment Trend Area Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-50 pb-2">Xu hướng nhập học</h3>
                    <div className="h-[250px]">
                        {enrollmentData.some(e => e.newEnrollments > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={enrollmentData}>
                                    <defs>
                                        <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" tickFormatter={(v) => `Tháng ${v}`} />
                                    <YAxis />
                                    <Tooltip labelFormatter={(v) => `Tháng ${v}`} />
                                    <Area
                                        name="Học sinh mới"
                                        type="monotone"
                                        dataKey="newEnrollments"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorEnrollment)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <p className="text-sm">Chưa có dữ liệu nhập học</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Class Capacity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Sĩ số & Sức chứa theo lớp</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên lớp</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khối</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sĩ số</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sức chứa</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lấp đầy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.studentsByClass.slice(0, 10).map((c) => {
                                const ratio = (c.studentCount / c.capacity) * 100;
                                const ratioColor = ratio > 95 ? "bg-red-500" : ratio > 80 ? "bg-orange-500" : "bg-green-500";

                                return (
                                    <tr key={c.classId}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="px-6 py-4 text-gray-500">Khối {c.grade}</td>
                                        <td className="px-6 py-4 text-gray-900">{c.studentCount}</td>
                                        <td className="px-6 py-4 text-gray-500">{c.capacity}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${ratioColor}`}
                                                    style={{ width: `${Math.min(100, ratio)}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentTab;
