import api from "./api";

// ==================== TYPES ====================

export type StudentProfileDto = {
    id: string;
    studentCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    classId: string | null;
    className: string | null;
    grade: number | null;
    academicYear: string | null;
};

export type TimetableSlotDto = {
    id: string;
    dayOfWeek: number; // 2-8 (Mon-Sun)
    slotIndex: number;
    subjectName: string;
    teacherName: string;
    room: string | null;
};

export type StudentTimetableDto = {
    classId: string;
    className: string;
    academicYear: string;
    semester: number;
    slots: TimetableSlotDto[];
};

export type ExamScheduleDto = {
    id: string;
    subjectName: string;
    examDate: string;
    startTime: string;
    duration: number;
    examType: string; // 'MIDTERM' | 'FINAL' | 'REGULAR' | 'QUIZ'
    room: string | null;
    status: string; // 'UPCOMING' | 'COMPLETED'
    note: string | null;
};

export type ScoreDto = {
    subjectId: string;
    subjectName: string;
    oralScore: number | null;
    test15Score: number | null;
    test45Score: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    averageScore: number | null;
};

export type AttendanceRecordDto = {
    date: string;
    slotIndex: number;
    subjectName: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ABSENT_EXCUSED' | 'ABSENT_UNEXCUSED';
    note: string | null;
};

export type AttendanceSummaryDto = {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
    records: AttendanceRecordDto[];
    attendanceGrid: Record<string, Record<number, AttendanceRecordDto>>;
    classroomTimetable: TimetableSlotDto[];
};

export type StudentDashboardDto = {
    profile: StudentProfileDto;
    averageScore: number | null;
    totalSubjects: number;
    attendanceRate: number;
    absences: number;
    semester: string;
    todaySchedule: TimetableSlotDto[];
    upcomingExams: ExamScheduleDto[];
};

export type SubjectScoreSummary = {
    subjectId: string;
    subjectName: string;
    averageScore: number | null;
    performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE';
    trend: number | null;
};

export type MonthlyPerformance = {
    month: string;
    averageScore: number | null;
    attendanceRate: number | null;
};

export type StudentAnalysisDto = {
    studentId: string;
    studentName: string;
    className: string | null;
    academicYear: string;
    semester: number;

    // Score statistics
    overallAverage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    bestSubject: string | null;
    worstSubject: string | null;

    // Score distribution
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    belowAverageCount: number;

    // Subject scores summary
    subjectScores: SubjectScoreSummary[];

    // Attendance statistics
    totalAttendanceDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;

    // Performance trend
    monthlyPerformance: MonthlyPerformance[];

    // Ranking
    classRank: number | null;
    totalStudentsInClass: number | null;
};

// ==================== SERVICE ====================

export const studentService = {
    // Lấy thông tin profile của học sinh đang đăng nhập
    getProfile: async (): Promise<StudentProfileDto> => {
        const res = await api.get<StudentProfileDto>("/student/profile");
        return res.data;
    },

    // Lấy thời khóa biểu theo lớp của học sinh
    getTimetable: async (semesterId?: string): Promise<StudentTimetableDto> => {
        const res = await api.get<StudentTimetableDto>("/student/timetable", {
            params: { semesterId }
        });
        return res.data;
    },

    // Lấy lịch kiểm tra
    getExamSchedule: async (semesterId?: string): Promise<ExamScheduleDto[]> => {
        const res = await api.get<ExamScheduleDto[]>("/student/exams", {
            params: { semesterId }
        });
        return res.data;
    },

    // Lấy điểm số
    getScores: async (semesterId?: string): Promise<ScoreDto[]> => {
        const res = await api.get<ScoreDto[]>("/student/scores", {
            params: { semesterId }
        });
        return res.data;
    },

    // Lấy thông tin điểm danh
    getAttendance: async (month?: number, year?: number): Promise<AttendanceSummaryDto> => {
        const res = await api.get<AttendanceSummaryDto>("/student/attendance", {
            params: { month, year }
        });
        return res.data;
    },

    // Lấy dữ liệu dashboard tổng quan
    getDashboard: async (semesterId?: string): Promise<StudentDashboardDto> => {
        const res = await api.get<StudentDashboardDto>("/student/dashboard", {
            params: { semesterId }
        });
        return res.data;
    },

    // Lấy lịch học hôm nay
    getTodaySchedule: async (): Promise<TimetableSlotDto[]> => {
        const res = await api.get<TimetableSlotDto[]>("/student/today-schedule");
        return res.data;
    },

    // Lấy phân tích học tập chi tiết
    getAnalysis: async (semesterId?: string): Promise<StudentAnalysisDto> => {
        const res = await api.get<StudentAnalysisDto>("/student/analysis", {
            params: { semesterId }
        });
        return res.data;
    },
};
