import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
} from "recharts";
import type { TimetableReportDto } from "../../../../services/schoolReportService";
import { TimetableIcon } from "./ReportIcons";
import StatCard from "./StatCard";

const TimetableTab = ({ data }: { data: TimetableReportDto }) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={<TimetableIcon />} label="Tổng TKB" value={data.totalTimetables} color="blue" />
                <StatCard icon={<TimetableIcon />} label="Chính thức" value={data.officialTimetables} color="green" />
                <StatCard icon={<TimetableIcon />} label="Nháp" value={data.draftTimetables} color="orange" />
                <StatCard icon={<TimetableIcon />} label="Phủ sóng" value={`${data.coverage.coverageRate}%`} color="purple" />
            </div>

            {/* Coverage Chart */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phủ sóng TKB theo lớp</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: "Có TKB", value: data.coverage.classesWithTimetable, color: "#10B981" },
                                    { name: "Chưa có TKB", value: data.coverage.classesWithoutTimetable, color: "#EF4444" },
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                <Cell fill="#10B981" />
                                <Cell fill="#EF4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Timetable List */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Danh sách TKB</h3>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto">
                        {data.timetables.length > 0 ? (
                            data.timetables.slice(0, 5).map((t) => (
                                <div key={t.timetableId} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900">{t.name}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === "OFFICIAL" ? "bg-green-100 text-green-700" :
                                            t.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" :
                                                "bg-gray-100 text-gray-700"
                                            }`}>
                                            {t.status === "OFFICIAL" ? "Chính thức" : t.status === "DRAFT" ? "Nháp" : "Lưu trữ"}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {t.academicYear} - HK{t.semester} | {t.filledSlots}/{t.totalSlots} tiết
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-400 text-center py-8">Chưa có TKB nào</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Class Timetable Status Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái TKB theo lớp</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Số tiết</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ lấp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.classStatuses.map((c) => (
                                <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                    <td className="py-3 px-4 text-center text-gray-600">{c.grade}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.hasTimetable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            }`}>
                                            {c.hasTimetable ? "Có TKB" : "Chưa có"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-600">{c.filledSlots}/{c.totalSlots}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.fillRate >= 90 ? "bg-green-100 text-green-700" :
                                            c.fillRate >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                "bg-red-100 text-red-700"
                                            }`}>
                                            {c.fillRate}%
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

export default TimetableTab;
