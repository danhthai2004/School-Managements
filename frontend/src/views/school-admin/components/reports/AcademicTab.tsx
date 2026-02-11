import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { AcademicReportDto } from "../../../../services/schoolReportService";
import { BookIcon } from "./ReportIcons";
import StatCard from "./StatCard";

const AcademicTab = ({ data }: { data: AcademicReportDto }) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={<BookIcon />} label="Tổng bản ghi điểm" value={data.totalGradeRecords} color="blue" />
                <StatCard icon={<BookIcon />} label="ĐTB chung" value={data.overallAverageScore} color="green" />
                <StatCard icon={<BookIcon />} label="Năm học" value={data.academicYear} color="purple" />
                <StatCard icon={<BookIcon />} label="Học kỳ" value={`HK${data.semester}`} color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Grade Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố điểm số</h3>
                    {data.gradeDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.gradeDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v, name) => [v, name === "count" ? "Số lượng" : "Tỷ lệ"]} />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu điểm
                        </div>
                    )}
                </div>

                {/* Subject Averages */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm TB theo môn</h3>
                    {data.subjectAverages.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.subjectAverages.slice(0, 8)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" domain={[0, 10]} />
                                <YAxis dataKey="subjectName" type="category" width={80} tick={{ fontSize: 11 }} />
                                <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v) => [`${v}`, "ĐTB"]} />
                                <Bar dataKey="averageScore" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </div>

            {/* Top Students Table */}
            {data.topStudents.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        ⭐ Top học sinh xuất sắc (ĐTB ≥ 8.0)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã HS</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Họ tên</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">ĐTB</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Xếp loại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topStudents.map((s, idx) => (
                                    <tr key={s.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-600">{idx + 1}</td>
                                        <td className="py-3 px-4 text-gray-600">{s.studentCode}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{s.studentName}</td>
                                        <td className="py-3 px-4 text-gray-600">{s.className}</td>
                                        <td className="py-3 px-4 text-right font-bold text-green-600">{s.averageScore}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                {s.performanceCategory}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Class Averages Table */}
            {data.classAverages.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm TB theo lớp</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">ĐTB</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-green-600">Giỏi</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">Khá</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-yellow-600">TB</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-red-600">Yếu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.classAverages.map((c) => (
                                    <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="py-3 px-4 text-center text-gray-600">{c.grade}</td>
                                        <td className="py-3 px-4 text-right font-bold text-blue-600">{c.averageScore}</td>
                                        <td className="py-3 px-4 text-center text-green-600 font-medium">{c.excellentCount}</td>
                                        <td className="py-3 px-4 text-center text-blue-600 font-medium">{c.goodCount}</td>
                                        <td className="py-3 px-4 text-center text-yellow-600 font-medium">{c.averageCount}</td>
                                        <td className="py-3 px-4 text-center text-red-600 font-medium">{c.belowAverageCount}</td>
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

export default AcademicTab;
