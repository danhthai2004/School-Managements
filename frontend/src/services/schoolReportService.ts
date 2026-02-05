import api from "./api";

// ==================== REPORT TYPES ====================

export type GenderDistribution = {
    male: number;
    female: number;
    other: number;
};

export type GradeDistribution = {
    grade: number;
    studentCount: number;
    classCount: number;
};

export type ReportOverviewDto = {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    currentAcademicYear: string;
    genderDistribution: GenderDistribution;
    gradeDistribution: GradeDistribution[];
};

export type StudentByClassDto = {
    classId: string;
    className: string;
    grade: number;
    studentCount: number;
    capacity: number;
};

export type EnrollmentStatDto = {
    year: number;
    month: number;
    newEnrollments: number;
};

export type GenderStats = {
    male: number;
    female: number;
    other: number;
};

export type StudentReportDto = {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    studentsWithAccount: number;
    studentsWithoutAccount: number;
    studentsByClass: StudentByClassDto[];
    enrollmentStats: EnrollmentStatDto[];
    genderStats: GenderStats;
};

export type TeacherBySubjectDto = {
    subjectId: string;
    subjectName: string;
    teacherCount: number;
};

export type TeacherWorkloadDto = {
    teacherId: string;
    teacherCode: string;
    teacherName: string;
    primarySubject: string;
    assignedClasses: number;
    totalPeriodsPerWeek: number;
};

export type TeacherReportDto = {
    totalTeachers: number;
    activeTeachers: number;
    inactiveTeachers: number;
    teachersBySubject: TeacherBySubjectDto[];
    workloadList: TeacherWorkloadDto[];
};

export type ClassSummaryDto = {
    classId: string;
    className: string;
    grade: number;
    academicYear: string;
    department: string;
    enrolledStudents: number;
    capacity: number;
    homeroomTeacherName: string;
    hasFullTeachers: boolean;
};

export type ClassByGradeDto = {
    grade: number;
    classCount: number;
    totalStudents: number;
};

export type ClassReportDto = {
    totalClasses: number;
    activeClasses: number;
    classSummaries: ClassSummaryDto[];
    classesByGrade: ClassByGradeDto[];
};

// ==================== PHASE 2: DETAILED STUDENT REPORTS ====================

export type StudentDetailDto = {
    id: string;
    studentCode: string;
    fullName: string;
    gender: string;
    dateOfBirth: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    hasAccount: boolean;
    enrollmentDate: string | null;
};

export type StudentDetailedListDto = {
    classId: string;
    className: string;
    grade: number;
    academicYear: string;
    capacity: number;
    currentStudentCount: number;
    students: StudentDetailDto[];
};

export type StudentBasicDto = {
    id: string;
    studentCode: string;
    fullName: string;
    email: string | null;
};

export type StudentNoAccountByClassDto = {
    className: string;
    students: StudentBasicDto[];
};

export type StudentsWithoutAccountDto = {
    totalCount: number;
    byClass: StudentNoAccountByClassDto[];
};

export type EnrollmentByGradeDto = {
    grade: number;
    count: number;
};

export type EnrollmentTrendDto = {
    academicYear: string;
    totalNewEnrollments: number;
    monthlyStats: EnrollmentStatDto[];
    byGrade: EnrollmentByGradeDto[];
};

// ==================== PHASE 3: ATTENDANCE REPORTS ====================

export type AttendanceByClassDto = {
    classId: string;
    className: string;
    grade: number;
    totalSessions: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
};

export type ChronicAbsenteeDto = {
    studentId: string;
    studentCode: string;
    studentName: string;
    className: string;
    absentDays: number;
    absentRate: number;
};

export type AttendanceReportDto = {
    totalSessions: number;
    overallAttendanceRate: number;
    attendanceByClass: AttendanceByClassDto[];
    chronicAbsentees: ChronicAbsenteeDto[];
};

// ==================== SERVICE ====================

export const schoolReportService = {
    // Dashboard Overview
    getDashboardOverview: async (): Promise<ReportOverviewDto> => {
        const res = await api.get<ReportOverviewDto>("/reports/dashboard/overview");
        return res.data;
    },

    // Student Reports
    getStudentReport: async (): Promise<StudentReportDto> => {
        const res = await api.get<StudentReportDto>("/reports/students");
        return res.data;
    },

    // Phase 2: Detailed Student List by Class
    getStudentsByClass: async (classId: string): Promise<StudentDetailedListDto> => {
        const res = await api.get<StudentDetailedListDto>(`/reports/students/by-class/${classId}`);
        return res.data;
    },

    // Phase 2: Students Without Account
    getStudentsWithoutAccount: async (): Promise<StudentsWithoutAccountDto> => {
        const res = await api.get<StudentsWithoutAccountDto>("/reports/students/no-account");
        return res.data;
    },

    // Phase 2: Enrollment Trend
    getEnrollmentTrend: async (academicYear?: string): Promise<EnrollmentTrendDto> => {
        const params = academicYear ? { academicYear } : {};
        const res = await api.get<EnrollmentTrendDto>("/reports/students/enrollment-trend", { params });
        return res.data;
    },

    // Phase 3: Attendance Report
    getAttendanceReport: async (): Promise<AttendanceReportDto> => {
        const res = await api.get<AttendanceReportDto>("/reports/attendance");
        return res.data;
    },

    // Phase 4: Academic Report
    getAcademicReport: async (academicYear?: string, semester?: number): Promise<AcademicReportDto> => {
        const params: Record<string, string | number> = {};
        if (academicYear) params.academicYear = academicYear;
        if (semester) params.semester = semester;
        const res = await api.get<AcademicReportDto>("/reports/academic", { params });
        return res.data;
    },

    // Phase 4: Timetable Report
    getTimetableReport: async (): Promise<TimetableReportDto> => {
        const res = await api.get<TimetableReportDto>("/reports/timetable");
        return res.data;
    },

    // Teacher Reports
    getTeacherReport: async (): Promise<TeacherReportDto> => {
        const res = await api.get<TeacherReportDto>("/reports/teachers");
        return res.data;
    },

    // Class Reports
    getClassReport: async (): Promise<ClassReportDto> => {
        const res = await api.get<ClassReportDto>("/reports/classes");
        return res.data;
    },
};

// ==================== PHASE 4: ACADEMIC & TIMETABLE REPORTS ====================

export type GradeDistributionDto = {
    range: string;
    count: number;
    percentage: number;
};

export type SubjectAverageDto = {
    subjectId: string;
    subjectName: string;
    averageScore: number;
    studentCount: number;
};

export type TopStudentDto = {
    studentId: string;
    studentCode: string;
    studentName: string;
    className: string;
    averageScore: number;
    performanceCategory: string;
};

export type ClassAverageDto = {
    classId: string;
    className: string;
    grade: number;
    averageScore: number;
    studentCount: number;
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    belowAverageCount: number;
};

export type AcademicReportDto = {
    totalGradeRecords: number;
    academicYear: string;
    semester: number;
    overallAverageScore: number;
    gradeDistribution: GradeDistributionDto[];
    subjectAverages: SubjectAverageDto[];
    topStudents: TopStudentDto[];
    classAverages: ClassAverageDto[];
};

export type TimetableSummaryDto = {
    timetableId: string;
    name: string;
    academicYear: string;
    semester: number;
    status: string;
    createdAt: string;
    totalSlots: number;
    filledSlots: number;
};

export type ClassTimetableStatusDto = {
    classId: string;
    className: string;
    grade: number;
    hasTimetable: boolean;
    totalSlots: number;
    filledSlots: number;
    fillRate: number;
};

export type TimetableCoverageDto = {
    totalClasses: number;
    classesWithTimetable: number;
    classesWithoutTimetable: number;
    coverageRate: number;
};

export type TimetableReportDto = {
    totalTimetables: number;
    officialTimetables: number;
    draftTimetables: number;
    currentAcademicYear: string;
    currentSemester: number;
    timetables: TimetableSummaryDto[];
    classStatuses: ClassTimetableStatusDto[];
    coverage: TimetableCoverageDto;
};

export default schoolReportService;



