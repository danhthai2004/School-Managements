import api from "./api";

// ==================== TYPES ====================

export type TeacherProfile = {
    isHomeroomTeacher: boolean;
    homeroomClassId?: string;
    homeroomClassName?: string;
    assignedClasses: AssignedClass[];
};

export type AssignedClass = {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
};

export type TeacherDashboardStats = {
    // Common stats
    totalAssignedClasses: number;
    todayPeriods: number;

    // Homeroom-only stats
    totalStudents?: number;
    homeroomClassName?: string;
    todayAttendance?: { present: number; total: number };
    studentsNeedingAttention?: number;
    averageGpa?: number;
    attendanceRate?: number;
    excellentStudents?: number;
    pendingAssignments?: number;
};

export type TodayScheduleItem = {
    periodNumber: number;
    subjectName: string;
    className: string;
    roomNumber: string;
    startTime: string;
    endTime: string;
};

export type StudentRiskAnalysis = {
    studentId: string;
    studentName: string;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    riskType: string;
    metrics: {
        label: string;
        value: number;
        maxValue: number;
    }[];
    issues: string[];
    suggestions: string[];
};

export type AIRecommendation = {
    id: string;
    type: 'ACADEMIC' | 'ATTENDANCE' | 'DISCIPLINE';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    actions: string[];
};

export type HomeroomStudent = {
    id: string;
    studentCode: string;
    fullName: string;
    gender: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    status: string;
    attendanceRate?: number;
    averageGpa?: number;
    conductGrade?: string;
    parentPhone?: string;
    parentEmail?: string;
};

export type TimetableDetail = {
    id: string;
    classRoomId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    teacherId: string;
    teacherName: string;
    dayOfWeek: string;
    slotIndex: number;
    isFixed: boolean;
    startTime?: string;
    endTime?: string;
};


// ==================== GRADE TYPES ====================

export type GradeValue = {
    type: 'REGULAR' | 'MID_TERM' | 'FINAL_TERM';
    index?: number; // 1-4 for REGULAR
    value: number | null;
};

export type StudentGrade = {
    studentId: string;
    studentCode: string;
    fullName: string;
    grades: GradeValue[];
};

export type GradeBook = {
    subjectId: string;
    subjectName: string;
    className: string;
    academicYear: string;
    semester: number;
    regularAssessmentCount: number; // 2, 3, or 4
    canEdit: boolean;
    students: StudentGrade[];
};

export type SaveGradeRequest = {
    classId: string;
    subjectId: string;
    semester: number;
    students: StudentGrade[];
};

// ==================== SERVICE ====================

export const teacherService = {
    // Get teacher profile (includes isHomeroomTeacher flag)
    getProfile: async (): Promise<TeacherProfile> => {
        const res = await api.get<TeacherProfile>("/teacher/profile");
        return res.data;
    },

    // Get dashboard statistics
    getStats: async (): Promise<TeacherDashboardStats> => {
        const res = await api.get<TeacherDashboardStats>("/teacher/stats");
        return res.data;
    },

    // Get today's schedule
    getTodaySchedule: async (): Promise<TodayScheduleItem[]> => {
        const res = await api.get<TodayScheduleItem[]>("/teacher/schedule/today");
        return res.data;
    },

    // Get weekly schedule
    getWeeklySchedule: async (): Promise<TimetableDetail[]> => {
        const res = await api.get<TimetableDetail[]>("/teacher/schedule/weekly");
        return res.data;
    },

    // Get homeroom students (403 for subject-only teachers)
    getHomeroomStudents: async (): Promise<HomeroomStudent[]> => {
        const res = await api.get<HomeroomStudent[]>("/teacher/students");
        return res.data;
    },

    // Get AI risk analysis (homeroom only)
    getRiskAnalysis: async (): Promise<StudentRiskAnalysis[]> => {
        const res = await api.get<StudentRiskAnalysis[]>("/teacher/ai/risk-analysis");
        return res.data;
    },

    // Get AI recommendations (homeroom only)
    getRecommendations: async (): Promise<AIRecommendation[]> => {
        const res = await api.get<AIRecommendation[]>("/teacher/ai/recommendations");
        return res.data;
    },

    // Get grade book
    getGradeBook: async (classId: string, subjectId: string, semester: number = 1): Promise<GradeBook> => {
        const res = await api.get<GradeBook>("/teacher/grades", {
            params: { classId, subjectId, semester }
        });
        return res.data;
    },

    // Get teacher exam schedule (invigilation)
    getExamSchedule: async (academicYear?: string, semester?: number): Promise<import("../services/studentService").ExamScheduleDto[]> => {
        const res = await api.get<import("../services/studentService").ExamScheduleDto[]>("/teacher/schedule/exam", {
            params: { academicYear, semester }
        });
        return res.data;
    },

    // Save grades
    saveGrades: async (data: SaveGradeRequest): Promise<void> => {
        await api.post("/teacher/grades", data);
    }
};

