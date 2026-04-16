import { useEffect, useState } from "react";
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
import { CheckIcon, BookIcon, TimetableIcon } from "../components/reports/ReportIcons";
import OverviewTab from "../components/reports/OverviewTab";
import StudentTab from "../components/reports/StudentTab";
import TeacherTab from "../components/reports/TeacherTab";
import ClassTab from "../components/reports/ClassTab";
import AttendanceTab from "../components/reports/AttendanceTab";
import AcademicTab from "../components/reports/AcademicTab";
import TimetableTab from "../components/reports/TimetableTab";
import { useSemester } from "../../../context/SemesterContext";
import SemesterSelector from "../../../components/common/SemesterSelector";

type TabType = "overview" | "students" | "teachers" | "classes" | "attendance" | "academic" | "timetable";

const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [loading, setLoading] = useState(false);
    const { activeSemester, allSemesters } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    // Initial load priority: System Active Semester
    useEffect(() => {
        if (!selectedSemesterId && activeSemester) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const selectedSemester = allSemesters.find(s => s.id === selectedSemesterId);

    // Data states
    const [overview, setOverview] = useState<ReportOverviewDto | null>(null);
    const [studentReport, setStudentReport] = useState<StudentReportDto | null>(null);
    const [teacherReport, setTeacherReport] = useState<TeacherReportDto | null>(null);
    const [classReport, setClassReport] = useState<ClassReportDto | null>(null);
    const [attendanceReport, setAttendanceReport] = useState<AttendanceReportDto | null>(null);
    const [academicReport, setAcademicReport] = useState<AcademicReportDto | null>(null);
    const [timetableReport, setTimetableReport] = useState<TimetableReportDto | null>(null);

    useEffect(() => {
        if (selectedSemesterId) {
            fetchData(activeTab);
        }
    }, [activeTab, selectedSemesterId]);

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
                    const academicData = await schoolReportService.getAcademicReport(
                        selectedSemester?.academicYearName,
                        selectedSemester?.semesterNumber
                    );
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
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Thống kê</h1>
                    <p className="text-gray-500 text-sm">Hệ thống phân tích dữ liệu giáo dục toàn diện</p>
                </div>
                <div className="flex items-center gap-4">
                    <SemesterSelector
                        value={selectedSemesterId}
                        onChange={setSelectedSemesterId}
                        label=""
                        className="bg-gray-50 border-gray-200 h-10 px-4 rounded-lg font-medium text-gray-700"
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all
                            ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm mt-4 font-medium">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {activeTab === "overview" && overview && <OverviewTab data={overview} />}
                        {activeTab === "students" && studentReport && <StudentTab data={studentReport} />}
                        {activeTab === "teachers" && teacherReport && <TeacherTab data={teacherReport} />}
                        {activeTab === "classes" && classReport && <ClassTab data={classReport} />}
                        {activeTab === "attendance" && attendanceReport && <AttendanceTab data={attendanceReport} />}
                        {activeTab === "academic" && academicReport && <AcademicTab data={academicReport} />}
                        {activeTab === "timetable" && timetableReport && <TimetableTab data={timetableReport} />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;
