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

const GENDER_COLORS = { male: "#3B82F6", female: "#EC4899", other: "#A855F7" };

const OverviewTab = ({ data }: { data: ReportOverviewDto }) => {
    const genderData = [
        { name: "Nam", value: data.genderDistribution.male, color: GENDER_COLORS.male },
        { name: "Nữ", value: data.genderDistribution.female, color: GENDER_COLORS.female },
        { name: "Khác", value: data.genderDistribution.other, color: GENDER_COLORS.other },
    ].filter((d) => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
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
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố giới tính học sinh</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={genderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {genderData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Grade Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê theo khối</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.gradeDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="grade" tickFormatter={(v) => `Khối ${v}`} />
                            <YAxis />
                            <Tooltip
                                shared={false}
                                cursor={{ fill: "transparent" }}
                                formatter={(value, name) => [
                                    value,
                                    name === "studentCount" ? "Học sinh" : "Lớp",
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="studentCount" name="Học sinh" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="classCount" name="Số lớp" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
