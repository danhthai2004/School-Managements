import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import type { ClassReportDto } from "../../../../services/schoolReportService";
import StatCard from "./StatCard";
import { Building2, UserCheck, LayoutList } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const ClassTab = ({ data }: { data: ClassReportDto }) => {
    const totalStudents = data.classSummaries.reduce((sum, c) => sum + c.enrolledStudents, 0);
    const avgSize = data.totalClasses > 0 ? totalStudents / data.totalClasses : 0;

    const classSizeData = [
        { name: "Lớp nhỏ (<30)", value: data.classSummaries.filter(c => c.enrolledStudents < 30).length },
        { name: "Lớp vừa (30-40)", value: data.classSummaries.filter(c => c.enrolledStudents >= 30 && c.enrolledStudents <= 40).length },
        { name: "Lớp lớn (>40)", value: data.classSummaries.filter(c => c.enrolledStudents > 40).length },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<Building2 />} label="Tổng số lớp" value={data.totalClasses} color="blue" />
                <StatCard icon={<LayoutList />} label="Sĩ số trung bình" value={avgSize.toFixed(1)} color="green" />
                <StatCard icon={<UserCheck />} label="Tổng học sinh" value={totalStudents} color="indigo" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố quy mô lớp</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={classSizeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {classSizeData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê theo khối</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.classesByGrade}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="grade" tickFormatter={(v) => `Khối ${v}`} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="classCount" name="Số lớp" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Danh sách lớp học</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tên lớp</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Khối</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">GV Chủ nhiệm</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Sĩ số</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center w-40">Tỷ lệ lấp đầy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.classSummaries.map((c) => {
                                const ratio = (c.enrolledStudents / c.capacity) * 100;
                                return (
                                    <tr key={c.classId}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="px-6 py-4 text-gray-500">Khối {c.grade}</td>
                                        <td className="px-6 py-4 text-gray-500">{c.homeroomTeacherName || "-"}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-900">{c.enrolledStudents}/{c.capacity}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${ratio > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
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

export default ClassTab;
