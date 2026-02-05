import { useEffect, useState } from "react";
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
    LineChart,
    Line,
} from "recharts";
import schoolReportService, {
    type ReportOverviewDto,
    type StudentReportDto,
    type TeacherReportDto,
    type ClassReportDto,
    type AttendanceReportDto,
    type AcademicReportDto,
    type TimetableReportDto,
} from "../../../services/schoolReportService";
import {
    StudentIcon,
    TeacherIcon,
    ClassIcon,
    CalendarIcon,
} from "../SchoolAdminIcons";

type TabType = "overview" | "students" | "teachers" | "classes" | "attendance" | "academic" | "timetable";

const COLORS = ["#3B82F6", "#EC4899", "#A855F7", "#10B981", "#F59E0B", "#6366F1"];
const GENDER_COLORS = { male: "#3B82F6", female: "#EC4899", other: "#A855F7" };

const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [loading, setLoading] = useState(false);

    // Data states
    const [overview, setOverview] = useState<ReportOverviewDto | null>(null);
    const [studentReport, setStudentReport] = useState<StudentReportDto | null>(null);
    const [teacherReport, setTeacherReport] = useState<TeacherReportDto | null>(null);
    const [classReport, setClassReport] = useState<ClassReportDto | null>(null);
    const [attendanceReport, setAttendanceReport] = useState<AttendanceReportDto | null>(null);
    const [academicReport, setAcademicReport] = useState<AcademicReportDto | null>(null);
    const [timetableReport, setTimetableReport] = useState<TimetableReportDto | null>(null);

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    const fetchData = async (tab: TabType) => {
        setLoading(true);
        try {
            switch (tab) {
                case "overview":
                    const overviewData = await schoolReportService.getDashboardOverview();
                    setOverview(overviewData);
                    break;
                case "students":
                    const studentData = await schoolReportService.getStudentReport();
                    setStudentReport(studentData);
                    break;
                case "teachers":
                    const teacherData = await schoolReportService.getTeacherReport();
                    setTeacherReport(teacherData);
                    break;
                case "classes":
                    const classData = await schoolReportService.getClassReport();
                    setClassReport(classData);
                    break;
                case "attendance":
                    const attendanceData = await schoolReportService.getAttendanceReport();
                    setAttendanceReport(attendanceData);
                    break;
                case "academic":
                    const academicData = await schoolReportService.getAcademicReport();
                    setAcademicReport(academicData);
                    break;
                case "timetable":
                    const timetableData = await schoolReportService.getTimetableReport();
                    setTimetableReport(timetableData);
                    break;
            }
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: "overview" as TabType, label: "Tổng quan", icon: <CalendarIcon /> },
        { id: "students" as TabType, label: "Học sinh", icon: <StudentIcon /> },
        { id: "teachers" as TabType, label: "Giáo viên", icon: <TeacherIcon /> },
        { id: "classes" as TabType, label: "Lớp học", icon: <ClassIcon /> },
        { id: "attendance" as TabType, label: "Điểm danh", icon: <CheckIcon /> },
        { id: "academic" as TabType, label: "Học tập", icon: <BookIcon /> },
        { id: "timetable" as TabType, label: "Thời khóa biểu", icon: <TimetableIcon /> },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Thống kê</h1>
                <p className="text-sm text-gray-500 mt-1">Xem thống kê chi tiết về trường học</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Đang tải dữ liệu...</div>
                </div>
            ) : (
                <>
                    {activeTab === "overview" && overview && <OverviewTab data={overview} />}
                    {activeTab === "students" && studentReport && <StudentTab data={studentReport} />}
                    {activeTab === "teachers" && teacherReport && <TeacherTab data={teacherReport} />}
                    {activeTab === "classes" && classReport && <ClassTab data={classReport} />}
                    {activeTab === "attendance" && attendanceReport && <AttendanceTab data={attendanceReport} />}
                    {activeTab === "academic" && academicReport && <AcademicTab data={academicReport} />}
                    {activeTab === "timetable" && timetableReport && <TimetableTab data={timetableReport} />}
                </>
            )}
        </div>
    );
};

// ==================== OVERVIEW TAB ====================
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

// ==================== STUDENT TAB ====================
const StudentTab = ({ data }: { data: StudentReportDto }) => {
    const statusData = [
        { name: "Đang học", value: data.activeStudents, color: "#10B981" },
        { name: "Nghỉ học", value: data.inactiveStudents, color: "#EF4444" },
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

// ==================== TEACHER TAB ====================
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

// ==================== CLASS TAB ====================
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

// ==================== ATTENDANCE TAB ====================
const AttendanceTab = ({ data }: { data: AttendanceReportDto }) => {
    const attendanceStatusData = [
        { name: "Có mặt", value: data.attendanceByClass.reduce((sum, c) => sum + c.presentCount, 0), color: "#10B981" },
        { name: "Vắng", value: data.attendanceByClass.reduce((sum, c) => sum + c.absentCount, 0), color: "#EF4444" },
        { name: "Trễ", value: data.attendanceByClass.reduce((sum, c) => sum + c.lateCount, 0), color: "#F59E0B" },
        { name: "Có phép", value: data.attendanceByClass.reduce((sum, c) => sum + c.excusedCount, 0), color: "#3B82F6" },
    ].filter((d) => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={<CheckIcon />} label="Tổng buổi học" value={data.totalSessions} color="blue" />
                <StatCard
                    icon={<CheckIcon />}
                    label="Tỷ lệ có mặt"
                    value={`${data.overallAttendanceRate}%`}
                    color={data.overallAttendanceRate >= 90 ? "green" : data.overallAttendanceRate >= 80 ? "orange" : "gray"}
                />
                <StatCard icon={<CheckIcon />} label="Số lớp" value={data.attendanceByClass.length} color="purple" />
                <StatCard icon={<CheckIcon />} label="HS vắng nhiều" value={data.chronicAbsentees.length} color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Attendance Status Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng hợp điểm danh</h3>
                    {attendanceStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={attendanceStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {attendanceStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu điểm danh
                        </div>
                    )}
                </div>

                {/* Attendance Rate by Class Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tỷ lệ có mặt theo lớp</h3>
                    {data.attendanceByClass.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.attendanceByClass.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="className" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip shared={false} cursor={{ fill: "transparent" }} formatter={(v) => [`${v}%`, "Tỷ lệ có mặt"]} />
                                <Bar dataKey="attendanceRate" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance by Class Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết điểm danh theo lớp</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Khối</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Số buổi</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-green-600">Có mặt</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-red-600">Vắng</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-yellow-600">Trễ</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">Có phép</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.attendanceByClass.map((c) => (
                                <tr key={c.classId} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{c.className}</td>
                                    <td className="py-3 px-4 text-center text-gray-600">{c.grade}</td>
                                    <td className="py-3 px-4 text-center text-gray-600">{c.totalSessions}</td>
                                    <td className="py-3 px-4 text-center text-green-600 font-medium">{c.presentCount}</td>
                                    <td className="py-3 px-4 text-center text-red-600 font-medium">{c.absentCount}</td>
                                    <td className="py-3 px-4 text-center text-yellow-600 font-medium">{c.lateCount}</td>
                                    <td className="py-3 px-4 text-center text-blue-600 font-medium">{c.excusedCount}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${c.attendanceRate >= 90
                                                ? "bg-green-100 text-green-700"
                                                : c.attendanceRate >= 80
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {c.attendanceRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Chronic Absentees Table */}
            {data.chronicAbsentees.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        <span className="text-red-500">⚠️</span> Học sinh vắng nhiều (≥5 ngày)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã HS</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Họ tên</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Lớp</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Số ngày vắng</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tỷ lệ vắng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.chronicAbsentees.map((s) => (
                                    <tr key={s.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-600">{s.studentCode}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{s.studentName}</td>
                                        <td className="py-3 px-4 text-gray-600">{s.className}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                {s.absentDays} ngày
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-red-600 font-medium">{s.absentRate}%</td>
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

// ==================== CHECK ICON ====================
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// ==================== BOOK ICON ====================
const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

// ==================== TIMETABLE ICON ====================
const TimetableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// ==================== ACADEMIC TAB ====================
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

// ==================== TIMETABLE TAB ====================
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

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: "blue" | "green" | "orange" | "purple" | "gray";
}) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-500",
        green: "bg-green-50 text-green-500",
        orange: "bg-orange-50 text-orange-500",
        purple: "bg-purple-50 text-purple-500",
        gray: "bg-gray-50 text-gray-500",
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
