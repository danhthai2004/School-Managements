import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { TimetableReportDto } from "../../../../services/schoolReportService";
import StatCard from "./StatCard";
import { CalendarRange, ClipboardList, CheckCircle2 } from "lucide-react";

const TimetableTab = ({ data }: { data: TimetableReportDto }) => {
    const coverageData = [
        { name: "Có thời khóa biểu", value: data.coverage.classesWithTimetable, color: "#10B981" },
        { name: "Chưa có", value: data.coverage.classesWithoutTimetable, color: "#EF4444" },
    ];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={<CalendarRange />} label="Độ phủ TKB" value={`${data.coverage.coverageRate.toFixed(1)}%`} color="blue" />
                <StatCard icon={<ClipboardList />} label="Tổng số TKB" value={data.totalTimetables} color="green" />
                <StatCard icon={<CheckCircle2 />} label="Chính thức" value={data.officialTimetables} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coverage Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tỷ lệ lớp có thời khóa biểu</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={coverageData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {coverageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Class Timetable Status Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Chi tiết theo lớp học</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tên lớp</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Trạng thái</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.classStatuses.slice(0, 10).map((c) => (
                                    <tr key={c.classId}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{c.className}</td>
                                        <td className="px-6 py-4 text-center">
                                            {c.hasTimetable ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Có TKB</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Chưa có</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[60px]">
                                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${c.fillRate}%` }} />
                                                </div>
                                                <span className="font-bold text-gray-900 text-xs">{c.fillRate.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Timetable List Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Danh sách các bản thời khóa biểu</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tên bản TKB</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Năm học - HK</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Trạng thái</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Tiết đã xếp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {data.timetables.map((t) => (
                                <tr key={t.timetableId}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{t.academicYear} - HK{t.semester}</td>
                                    <td className="px-6 py-4 text-center">
                                        {t.status === "OFFICIAL" ? (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-tight">Chính thức</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase tracking-tight">Bản nháp</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-900">{t.filledSlots}/{t.totalSlots}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TimetableTab;
