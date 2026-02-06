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
    dayOfWeek: number; // 2-7 (Mon-Sat)
    period: number;
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
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    note: string | null;
};

export type AttendanceSummaryDto = {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
    records: AttendanceRecordDto[];
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

// ==================== MOCK DATA (sẽ được thay thế bởi API thực tế) ====================

const mockProfile: StudentProfileDto = {
    id: "1",
    studentCode: "HS001",
    fullName: "Nguyễn Văn A",
    email: "nguyenvana@school.edu.vn",
    phone: "0901234567",
    avatarUrl: null,
    classId: "class-1",
    className: "12A1",
    grade: 12,
    academicYear: "2025-2026",
};

const mockTimetableSlots: TimetableSlotDto[] = [
    { id: "1", dayOfWeek: 2, period: 1, subjectName: "Toán", teacherName: "Nguyễn Văn A", room: "P.301" },
    { id: "2", dayOfWeek: 2, period: 2, subjectName: "Toán", teacherName: "Nguyễn Văn A", room: "P.301" },
    { id: "3", dayOfWeek: 2, period: 3, subjectName: "Văn", teacherName: "Trần Thị B", room: "P.301" },
    { id: "4", dayOfWeek: 2, period: 4, subjectName: "Văn", teacherName: "Trần Thị B", room: "P.301" },
    { id: "5", dayOfWeek: 2, period: 5, subjectName: "Anh", teacherName: "Lê Văn C", room: "P.301" },
    { id: "6", dayOfWeek: 3, period: 1, subjectName: "Lý", teacherName: "Phạm Văn D", room: "P.Lab1" },
    { id: "7", dayOfWeek: 3, period: 2, subjectName: "Lý", teacherName: "Phạm Văn D", room: "P.Lab1" },
    { id: "8", dayOfWeek: 3, period: 3, subjectName: "Hóa", teacherName: "Hoàng Thị E", room: "P.Lab2" },
    { id: "9", dayOfWeek: 3, period: 4, subjectName: "Sinh", teacherName: "Vũ Văn F", room: "P.301" },
    { id: "10", dayOfWeek: 3, period: 5, subjectName: "Sử", teacherName: "Đặng Thị G", room: "P.301" },
    { id: "11", dayOfWeek: 4, period: 1, subjectName: "Địa", teacherName: "Bùi Văn H", room: "P.301" },
    { id: "12", dayOfWeek: 4, period: 2, subjectName: "GDCD", teacherName: "Ngô Thị I", room: "P.301" },
    { id: "13", dayOfWeek: 4, period: 3, subjectName: "Tin", teacherName: "Lý Văn K", room: "P.IT1" },
    { id: "14", dayOfWeek: 4, period: 4, subjectName: "Tin", teacherName: "Lý Văn K", room: "P.IT1" },
    { id: "15", dayOfWeek: 4, period: 5, subjectName: "Thể dục", teacherName: "Trịnh Văn L", room: "Sân" },
    { id: "16", dayOfWeek: 5, period: 1, subjectName: "Toán", teacherName: "Nguyễn Văn A", room: "P.301" },
    { id: "17", dayOfWeek: 5, period: 2, subjectName: "Anh", teacherName: "Lê Văn C", room: "P.301" },
    { id: "18", dayOfWeek: 5, period: 3, subjectName: "Anh", teacherName: "Lê Văn C", room: "P.301" },
    { id: "19", dayOfWeek: 5, period: 4, subjectName: "Lý", teacherName: "Phạm Văn D", room: "P.Lab1" },
    { id: "20", dayOfWeek: 5, period: 5, subjectName: "Văn", teacherName: "Trần Thị B", room: "P.301" },
    { id: "21", dayOfWeek: 6, period: 1, subjectName: "Hóa", teacherName: "Hoàng Thị E", room: "P.Lab2" },
    { id: "22", dayOfWeek: 6, period: 2, subjectName: "Hóa", teacherName: "Hoàng Thị E", room: "P.Lab2" },
    { id: "23", dayOfWeek: 6, period: 3, subjectName: "Toán", teacherName: "Nguyễn Văn A", room: "P.301" },
    { id: "24", dayOfWeek: 6, period: 4, subjectName: "Sinh", teacherName: "Vũ Văn F", room: "P.301" },
    { id: "25", dayOfWeek: 6, period: 5, subjectName: "SHCN", teacherName: "Trần Thị B", room: "P.301" },
    { id: "26", dayOfWeek: 7, period: 1, subjectName: "Văn", teacherName: "Trần Thị B", room: "P.301" },
    { id: "27", dayOfWeek: 7, period: 2, subjectName: "Sử", teacherName: "Đặng Thị G", room: "P.301" },
    { id: "28", dayOfWeek: 7, period: 3, subjectName: "Địa", teacherName: "Bùi Văn H", room: "P.301" },
    { id: "29", dayOfWeek: 7, period: 4, subjectName: "Công nghệ", teacherName: "Mai Văn M", room: "P.301" },
];

const mockExams: ExamScheduleDto[] = [
    { id: "1", subjectName: "Toán", examDate: "2026-02-05", startTime: "07:30", duration: 90, examType: "MIDTERM", room: "P.101", status: "UPCOMING", note: "Mang theo máy tính cầm tay" },
    { id: "2", subjectName: "Văn", examDate: "2026-02-07", startTime: "07:30", duration: 15, examType: "QUIZ", room: "P.301", status: "UPCOMING", note: null },
    { id: "3", subjectName: "Anh", examDate: "2026-02-10", startTime: "07:30", duration: 60, examType: "MIDTERM", room: "P.102", status: "UPCOMING", note: "Mang theo từ điển Anh-Việt" },
    { id: "4", subjectName: "Lý", examDate: "2026-02-12", startTime: "09:00", duration: 45, examType: "REGULAR", room: "P.Lab1", status: "UPCOMING", note: null },
    { id: "5", subjectName: "Sinh", examDate: "2026-01-20", startTime: "07:30", duration: 15, examType: "QUIZ", room: "P.301", status: "COMPLETED", note: null },
];

const mockScores: ScoreDto[] = [
    { subjectId: "1", subjectName: "Toán", oralScore: 8.5, test15Score: 8.0, test45Score: 7.5, midtermScore: 8.0, finalScore: null, averageScore: 8.0 },
    { subjectId: "2", subjectName: "Văn", oralScore: 7.0, test15Score: 7.5, test45Score: 8.0, midtermScore: 7.5, finalScore: null, averageScore: 7.5 },
    { subjectId: "3", subjectName: "Anh", oralScore: 9.0, test15Score: 8.5, test45Score: 9.0, midtermScore: 9.0, finalScore: null, averageScore: 8.9 },
    { subjectId: "4", subjectName: "Lý", oralScore: 8.0, test15Score: 7.0, test45Score: 8.5, midtermScore: 8.0, finalScore: null, averageScore: 7.9 },
    { subjectId: "5", subjectName: "Hóa", oralScore: 7.5, test15Score: 8.0, test45Score: 7.0, midtermScore: 7.5, finalScore: null, averageScore: 7.5 },
    { subjectId: "6", subjectName: "Sinh", oralScore: 8.0, test15Score: 8.5, test45Score: 8.0, midtermScore: null, finalScore: null, averageScore: 8.2 },
    { subjectId: "7", subjectName: "Sử", oralScore: 7.0, test15Score: 7.5, test45Score: null, midtermScore: null, finalScore: null, averageScore: 7.3 },
    { subjectId: "8", subjectName: "Địa", oralScore: 8.5, test15Score: 8.0, test45Score: 8.5, midtermScore: null, finalScore: null, averageScore: 8.3 },
    { subjectId: "9", subjectName: "GDCD", oralScore: 9.0, test15Score: 9.0, test45Score: null, midtermScore: null, finalScore: null, averageScore: 9.0 },
];

const mockAttendance: AttendanceSummaryDto = {
    totalDays: 20,
    presentDays: 17,
    absentDays: 2,
    lateDays: 1,
    attendanceRate: 85,
    records: [
        { date: "2026-01-30", status: "PRESENT", note: null },
        { date: "2026-01-29", status: "LATE", note: "Đến trễ 10 phút" },
        { date: "2026-01-28", status: "PRESENT", note: null },
        { date: "2026-01-27", status: "PRESENT", note: null },
        { date: "2026-01-24", status: "PRESENT", note: null },
        { date: "2026-01-23", status: "ABSENT", note: "Nghỉ ốm có phép" },
        { date: "2026-01-22", status: "PRESENT", note: null },
        { date: "2026-01-21", status: "PRESENT", note: null },
        { date: "2026-01-20", status: "PRESENT", note: null },
        { date: "2026-01-17", status: "ABSENT", note: "Nghỉ không phép" },
    ],
};

// ==================== SERVICE ====================

export const studentService = {
    // Lấy thông tin profile của học sinh đang đăng nhập
    getProfile: async (): Promise<StudentProfileDto> => {
        try {
            const res = await api.get<StudentProfileDto>("/student/profile");
            return res.data;
        } catch {
            // Fallback to mock data
            return mockProfile;
        }
    },

    // Lấy thời khóa biểu theo lớp của học sinh
    getTimetable: async (): Promise<StudentTimetableDto> => {
        try {
            const res = await api.get<StudentTimetableDto>("/student/timetable");
            return res.data;
        } catch {
            // Fallback to mock data
            return {
                classId: mockProfile.classId || "",
                className: mockProfile.className || "12A1",
                academicYear: mockProfile.academicYear || "2025-2026",
                semester: 1,
                slots: mockTimetableSlots,
            };
        }
    },

    // Lấy lịch kiểm tra
    getExamSchedule: async (academicYear?: string, semester?: number): Promise<ExamScheduleDto[]> => {
        try {
            const res = await api.get<ExamScheduleDto[]>("/student/exams", {
                params: { academicYear, semester }
            });
            return res.data;
        } catch {
            return mockExams;
        }
    },

    // Lấy điểm số
    getScores: async (semester?: number): Promise<ScoreDto[]> => {
        try {
            const res = await api.get<ScoreDto[]>("/student/scores", {
                params: { semester }
            });
            return res.data;
        } catch {
            return mockScores;
        }
    },

    // Lấy thông tin điểm danh
    getAttendance: async (month?: number, year?: number): Promise<AttendanceSummaryDto> => {
        try {
            const res = await api.get<AttendanceSummaryDto>("/student/attendance", {
                params: { month, year }
            });
            return res.data;
        } catch {
            return mockAttendance;
        }
    },

    // Lấy dữ liệu dashboard tổng quan
    getDashboard: async (): Promise<StudentDashboardDto> => {
        try {
            const res = await api.get<StudentDashboardDto>("/student/dashboard");
            return res.data;
        } catch {
            // Fallback: build from mock data
            const today = new Date().getDay();
            const dayOfWeek = today === 0 ? 2 : today + 1;
            const todaySlots = mockTimetableSlots.filter(s => s.dayOfWeek === dayOfWeek);
            const upcomingExams = mockExams.filter(e => e.status === "UPCOMING").slice(0, 3);
            const avgScore = mockScores.reduce((a, b) => a + (b.averageScore || 0), 0) / mockScores.length;

            return {
                profile: mockProfile,
                averageScore: parseFloat(avgScore.toFixed(1)),
                totalSubjects: mockScores.length,
                attendanceRate: mockAttendance.attendanceRate,
                absences: mockAttendance.absentDays,
                semester: `Học kỳ 1 - ${mockProfile.academicYear}`,
                todaySchedule: todaySlots,
                upcomingExams: upcomingExams,
            };
        }
    },

    // Lấy lịch học hôm nay
    getTodaySchedule: async (): Promise<TimetableSlotDto[]> => {
        try {
            const res = await api.get<TimetableSlotDto[]>("/student/today-schedule");
            return res.data;
        } catch {
            // Fallback: filter from mock timetable
            const today = new Date().getDay();
            const dayOfWeek = today === 0 ? 2 : today + 1;
            return mockTimetableSlots.filter(s => s.dayOfWeek === dayOfWeek);
        }
    },

    // Lấy phân tích học tập chi tiết
    getAnalysis: async (): Promise<StudentAnalysisDto> => {
        try {
            const res = await api.get<StudentAnalysisDto>("/student/analysis");
            return res.data;
        } catch {
            // Fallback: build from mock data
            const avgScore = mockScores.reduce((a, b) => a + (b.averageScore || 0), 0) / mockScores.length;
            const sortedScores = [...mockScores].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

            return {
                studentId: mockProfile.id,
                studentName: mockProfile.fullName,
                className: mockProfile.className,
                academicYear: mockProfile.academicYear || "2025-2026",
                semester: 1,
                overallAverage: parseFloat(avgScore.toFixed(1)),
                highestScore: sortedScores[0]?.averageScore || null,
                lowestScore: sortedScores[sortedScores.length - 1]?.averageScore || null,
                bestSubject: sortedScores[0]?.subjectName || null,
                worstSubject: sortedScores[sortedScores.length - 1]?.subjectName || null,
                excellentCount: mockScores.filter(s => (s.averageScore || 0) >= 8.5).length,
                goodCount: mockScores.filter(s => (s.averageScore || 0) >= 7.0 && (s.averageScore || 0) < 8.5).length,
                averageCount: mockScores.filter(s => (s.averageScore || 0) >= 5.0 && (s.averageScore || 0) < 7.0).length,
                belowAverageCount: mockScores.filter(s => (s.averageScore || 0) < 5.0).length,
                subjectScores: mockScores.map(s => ({
                    subjectId: s.subjectId,
                    subjectName: s.subjectName,
                    averageScore: s.averageScore,
                    performance: (s.averageScore || 0) >= 8.5 ? 'EXCELLENT' as const :
                        (s.averageScore || 0) >= 7.0 ? 'GOOD' as const :
                            (s.averageScore || 0) >= 5.0 ? 'AVERAGE' as const : 'BELOW_AVERAGE' as const,
                    trend: 0,
                })),
                totalAttendanceDays: mockAttendance.totalDays,
                presentDays: mockAttendance.presentDays,
                absentDays: mockAttendance.absentDays,
                lateDays: mockAttendance.lateDays,
                attendanceRate: mockAttendance.attendanceRate,
                monthlyPerformance: [],
                classRank: null,
                totalStudentsInClass: null,
            };
        }
    },
};
