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
import type { ClassReportDto } from "../../../../services/schoolReportService";
import { ClassIcon } from "../../SchoolAdminIcons";
import StatCard from "./StatCard";

const COLORS = ["#3B82F6", "#EC4899", "#A855F7", "#10B981", "#F59E0B", "#6366F1"];

const ClassTab = ({ data }: { data: ClassReportDto }) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard icon={<ClassIcon />} label="Tổng lớp" value={data.totalClasses} color="blue" />
                <StatCard icon={<ClassIcon />} label="Đang hoạt động" value={data.activeClasses} color="green" />
                <StatCard
                    icon={<ClassIcon />}
                    label="Không hoạt động"
                    value={data.totalClasses - data.activeClasses}
                    color="gray"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
                {/* Classes by Grade */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê theo khối</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.classesByGrade}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="grade" tickFormatter={(v) => `Khối ${v}`} />
                            <YAxis />
                            <Tooltip
                                shared={false}
                                cursor={{ fill: "transparent" }}
                                formatter={(value, name) => [
                                    value,
                                    name === "classCount" ? "Số lớp" : "Học sinh",
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="classCount" name="Số lớp" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalStudents" name="Học sinh" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố theo ban</h3>
                    {(() => {
                        const deptData = data.classSummaries.reduce((acc, c) => {
                            const dept = c.department || "KHONG_PHAN_BAN";
                            acc[dept] = (acc[dept] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);

                        const pieData = Object.entries(deptData).map(([name, value], i) => ({
                            name:
                                name === "KHONG_PHAN_BAN"
                                    ? "Không phân ban"
                                    : name === "TU_NHIEN"
                                        ? "Tự nhiên"
                                        : name === "XA_HOI"
                                            ? "Xã hội"
                                            : name,
                            value,
                            color: COLORS[i % COLORS.length],
                        }));

                        return (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        );
                    })()}
                </div>
            </div>

            {/* Class Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Danh sách lớp học</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tên lớp</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Năm học</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">GVCN</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Sĩ số</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Sức chứa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.classSummaries.slice(0, 15).map((c) => (
                                <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                    <td className="py-3 px-4 text-gray-600">{c.grade}</td>
                                    <td className="py-3 px-4 text-gray-600">{c.academicYear}</td>
                                    <td className="py-3 px-4 text-gray-600">{c.homeroomTeacherName}</td>
                                    <td className="py-3 px-4 text-right text-gray-900">{c.enrolledStudents}</td>
                                    <td className="py-3 px-4 text-right text-gray-600">{c.capacity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClassTab;
