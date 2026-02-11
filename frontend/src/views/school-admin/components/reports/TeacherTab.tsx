import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import type { TeacherReportDto } from "../../../../services/schoolReportService";
import { TeacherIcon } from "../../SchoolAdminIcons";
import StatCard from "./StatCard";

const TeacherTab = ({ data }: { data: TeacherReportDto }) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard icon={<TeacherIcon />} label="Tổng giáo viên" value={data.totalTeachers} color="blue" />
                <StatCard icon={<TeacherIcon />} label="Đang hoạt động" value={data.activeTeachers} color="green" />
                <StatCard icon={<TeacherIcon />} label="Tạm nghỉ" value={data.inactiveTeachers} color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Teachers by Subject */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Giáo viên theo môn</h3>
                    {data.teachersBySubject.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.teachersBySubject} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" />
                                <YAxis dataKey="subjectName" type="category" width={100} />
                                <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v) => [v, "Giáo viên"]} />
                                <Bar dataKey="teacherCount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>

                {/* Top Workload */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Khối lượng công việc (Top 10)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                            data={data.workloadList.slice(0, 10).sort((a, b) => b.totalPeriodsPerWeek - a.totalPeriodsPerWeek)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="teacherName" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v, name) => [v, name === "totalPeriodsPerWeek" ? "Tiết/tuần" : "Lớp"]} />
                            <Legend />
                            <Bar dataKey="totalPeriodsPerWeek" name="Tiết/tuần" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="assignedClasses" name="Số lớp" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Workload Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết phân công</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã GV</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Họ tên</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Môn chính</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Số lớp</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tiết/tuần</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.workloadList.map((t) => (
                                <tr key={t.teacherId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-gray-600">{t.teacherCode}</td>
                                    <td className="py-3 px-4 font-medium text-gray-900">{t.teacherName}</td>
                                    <td className="py-3 px-4 text-gray-600">{t.primarySubject}</td>
                                    <td className="py-3 px-4 text-right text-gray-900">{t.assignedClasses}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${t.totalPeriodsPerWeek > 25
                                                ? "bg-red-100 text-red-700"
                                                : t.totalPeriodsPerWeek > 20
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-green-100 text-green-700"
                                                }`}
                                        >
                                            {t.totalPeriodsPerWeek}
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

export default TeacherTab;
