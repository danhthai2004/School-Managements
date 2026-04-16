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
import type { ReportOverviewDto } from "../../../../services/schoolReportService";
import {
    StudentIcon,
    TeacherIcon,
    ClassIcon,
    CalendarIcon,
} from "../../SchoolAdminIcons";
import StatCard from "./StatCard";


const OverviewTab = ({ data }: { data: ReportOverviewDto }) => {
    const genderData = [
        { name: "Nam", value: data.genderDistribution.male, color: "#3B82F6" },
        { name: "Nữ", value: data.genderDistribution.female, color: "#EC4899" },
        { name: "Khác", value: data.genderDistribution.other, color: "#A855F7" },
    ].filter((d) => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<StudentIcon />}
                    label="Tổng học sinh"
                    value={data.totalStudents}
                    color="green"
                />
                <StatCard
                    icon={<TeacherIcon />}
                    label="Tổng giáo viên"
                    value={data.totalTeachers}
                    color="orange"
                />
                <StatCard
                    icon={<ClassIcon />}
                    label="Tổng lớp học"
                    value={data.totalClasses}
                    color="blue"
                />
                <StatCard
                    icon={<CalendarIcon />}
                    label="Năm học"
                    value={data.currentAcademicYear}
                    color="indigo"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố giới tính</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Grade Distribution Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê khối lớp</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.gradeDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="grade" tickFormatter={(v) => `Khối ${v}`} />
                                <YAxis />
                                <Tooltip labelFormatter={(v) => `Khối ${v}`} />
                                <Legend />
                                <Bar dataKey="studentCount" name="Số lượng học sinh" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="classCount" name="Số lượng lớp học" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
