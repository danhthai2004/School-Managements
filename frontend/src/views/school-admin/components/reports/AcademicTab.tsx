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
import StatCard from "./StatCard";
import { GraduationCap, Trophy, Award } from "lucide-react";

const AcademicTab = ({ data }: { data: AcademicReportDto }) => {
    // Academic year and semester from data
    const title = `Kết quả học tập HK${data.semester} - Năm học ${data.academicYear}`;

    return (
        <div className="space-y-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{title}</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<Trophy />} label="Điểm trung bình toàn trường" value={data.overallAverageScore.toFixed(2)} color="blue" />
                <StatCard icon={<Award />} label="Tổng số bản ghi điểm" value={data.totalGradeRecords} color="green" />
                <StatCard icon={<GraduationCap />} label="Số môn học" value={data.subjectAverages.length} color="indigo" />
            </div>

            {/* Subject Performance Bar Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm trung bình theo môn học</h3>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.subjectAverages} margin={{ bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="subjectName"
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis domain={[0, 10]} />
                            <Tooltip labelFormatter={(v) => `Môn: ${v}`} />
                            <Bar dataKey="averageScore" name="Điểm TB" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Students List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Học sinh tiêu biểu</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {data.topStudents.slice(0, 5).map((s, idx) => (
                                <div key={s.studentId} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? "bg-yellow-400 text-white" : "bg-blue-100 text-blue-600"}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{s.studentName}</p>
                                            <p className="text-xs text-gray-500">{s.className} • {s.performanceCategory}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-blue-600 text-lg">{s.averageScore.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Class Averages Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Điểm trung bình theo lớp</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tên lớp</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Khối</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Điểm TB</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.classAverages.slice(0, 10).sort((a, b) => b.averageScore - a.averageScore).map((c) => (
                                    <tr key={c.classId}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="px-6 py-4 text-gray-500 text-center">{c.grade}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(c.averageScore / 10) * 100}%` }} />
                                                </div>
                                                <span className="font-bold text-gray-900 text-xs">{c.averageScore.toFixed(2)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademicTab;
