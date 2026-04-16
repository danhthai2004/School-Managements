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
    LineChart,
    Line,
} from "recharts";
import type { StudentReportDto } from "../../../../services/schoolReportService";
import { StudentIcon } from "../../SchoolAdminIcons";
import StatCard from "./StatCard";

const StudentTab = ({ data }: { data: StudentReportDto }) => {
    const statusData = [
        { name: "Đang học", value: data.activeStudents, color: "#10B981" },
        { name: "Tạm nghỉ / Khác", value: data.nonActiveStudents, color: "#EF4444" },
    ].filter((d) => d.value > 0);

    const accountData = [
        { name: "Có tài khoản", value: data.studentsWithAccount, color: "#3B82F6" },
        { name: "Chưa có", value: data.studentsWithoutAccount, color: "#F59E0B" },
    ].filter((d) => d.value > 0);

    // Filter months with data for enrollment chart
    const enrollmentData = data.enrollmentStats.filter((e) => e.newEnrollments > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={<StudentIcon />} label="Tổng học sinh" value={data.totalStudents} color="blue" />
                <StatCard icon={<StudentIcon />} label="Đang học" value={data.activeStudents} color="green" />
                <StatCard icon={<StudentIcon />} label="Có tài khoản" value={data.studentsWithAccount} color="purple" />
                <StatCard icon={<StudentIcon />} label="Chưa có TK" value={data.studentsWithoutAccount} color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Status & Account Pie Charts */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái học sinh</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 text-center mb-2">Trạng thái</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 text-center mb-2">Tài khoản</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={accountData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                                        {accountData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Enrollment Trend */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Nhập học theo tháng</h3>
                    {enrollmentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={enrollmentData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tickFormatter={(v) => `T${v}`} />
                                <YAxis />
                                <Tooltip shared={false} formatter={(v) => [v, "Học sinh mới"]} />
                                <Line type="monotone" dataKey="newEnrollments" stroke="#3B82F6" strokeWidth={2} dot />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu nhập học trong năm nay
                        </div>
                    )}
                </div>
            </div>

            {/* Students by Class Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sĩ số theo lớp</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Sĩ số</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Sức chứa</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.studentsByClass.slice(0, 10).map((c) => (
                                <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                    <td className="py-3 px-4 text-gray-600">{c.grade}</td>
                                    <td className="py-3 px-4 text-right text-gray-900">{c.studentCount}</td>
                                    <td className="py-3 px-4 text-right text-gray-600">{c.capacity}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${c.studentCount / c.capacity > 0.9
                                                ? "bg-red-100 text-red-700"
                                                : c.studentCount / c.capacity > 0.7
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-green-100 text-green-700"
                                                }`}
                                        >
                                            {((c.studentCount / c.capacity) * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentTab;
