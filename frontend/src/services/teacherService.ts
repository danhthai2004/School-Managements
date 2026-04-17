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

// ==================== NOTIFICATION TYPES ====================

export type NotificationTypeEnum =
    | 'EXAM_SCHEDULE'
    | 'PARENT_MEETING'
    | 'ACADEMIC_WARNING'
    | 'BEHAVIOR_WARNING'
    | 'EVENT'
    | 'HOMEWORK'
    | 'OTHER';

export type RecipientTypeEnum = 'ALL' | 'STUDENTS_ONLY' | 'PARENTS_ONLY' | 'SPECIFIC';

export type RecipientInfo = {
    userId: string;
    name: string;
    role: string;
    isRead: boolean;
};

export type HomeroomNotification = {
    id: string;
    className: string;
    classRoomId: string;
    notificationType: NotificationTypeEnum;
    recipientType: RecipientTypeEnum;
    title: string;
    content: string;
    scheduledDate?: string;
    scheduledTime?: string;
    createdByName: string;
    createdAt: string;
    recipientCount: number;
    readCount: number;
    recipients: RecipientInfo[];
};

export type CreateNotificationPayload = {
    notificationType: NotificationTypeEnum;
    recipientType: RecipientTypeEnum;
    title: string;
    content: string;
    scheduledDate?: string;
    scheduledTime?: string;
    specificRecipientIds?: string[];
};

// ==================== GRADE TYPES ====================

export type GradeValue = {
    type: 'REGULAR' | 'MID_TERM' | 'FINAL_TERM';
    index?: number; // 1-4 for REGULAR
    value: number | null;
};

export type SubGradeValue = {
    id?: string;
    category: 'ORAL' | 'TEST_15MIN';
    subIndex: number;
    value: number | null;
};

export type SubGradeColumn = {
    category: 'ORAL' | 'TEST_15MIN';
    subIndex: number;
    label: string;
};

export type StudentGrade = {
    studentId: string;
    studentCode: string;
    fullName: string;
    grades: GradeValue[];
    subGrades?: SubGradeValue[];
};

export type GradeBook = {
    subjectId: string;
    subjectName: string;
    className: string;
    academicYear: string;
    semester: number;
    regularAssessmentCount: number; // 2, 3, or 4
    canEdit: boolean;
    subGradeColumns?: SubGradeColumn[];
    students: StudentGrade[];
};

export type SaveGradeRequest = {
    classId: string;
    subjectId: string;
    semester: number;
    students: StudentGrade[];
};

// ==================== HOMEROOM GRADE SUMMARY TYPES ====================

export type SubjectGradeDetail = {
    regularGrades: (number | null)[];
    midTerm: number | null;
    finalTerm: number | null;
    average: number | null;
};

export type StudentSummaryRow = {
    studentId: string;
    studentCode: string;
    fullName: string;
    subjectGrades: Record<string, SubjectGradeDetail>;
    overallAverage: number | null;
    performanceCategory: string;
};

export type SubjectInfo = {
    subjectId: string;
    subjectName: string;
    regularCount: number;
};

export type HomeroomGradeSummary = {
    classId: string;
    className: string;
    academicYear: string;
    semester: number;
    subjects: SubjectInfo[];
    students: StudentSummaryRow[];
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

    // Get teacher exam schedule (invigilation)
    getExamSchedule: async (semesterId?: string): Promise<import("../services/studentService").ExamScheduleDto[]> => {
        const res = await api.get<import("../services/studentService").ExamScheduleDto[]>("/teacher/schedule/exam", {
            params: { semesterId }
        });
        return res.data;
    },

    // Get grade book
    getGradeBook: async (classId: string, subjectId: string, semester: number = 1): Promise<GradeBook> => {
        const res = await api.get<GradeBook>("/teacher/grades", {
            params: { classId, subjectId, semester }
        });
        return res.data;
    },

    // Save grades
    saveGrades: async (data: SaveGradeRequest): Promise<void> => {
        await api.post("/teacher/grades", data);
    },

    // Add sub-grade column
    addSubGradeColumn: async (classId: string, subjectId: string, semester: number, category: string): Promise<SubGradeColumn> => {
        const res = await api.post<SubGradeColumn>("/teacher/grades/sub-columns", {
            classId, subjectId, semester, category
        });
        return res.data;
    },

    // Remove sub-grade column
    removeSubGradeColumn: async (classId: string, subjectId: string, semester: number, category: string, subIndex: number): Promise<void> => {
        await api.delete("/teacher/grades/sub-columns", {
            params: { classId, subjectId, semester, category, subIndex }
        });
    },

    // Resolve overflow
    resolveOverflow: async (classId: string, subjectId: string, semester: number, strategy: 'AVERAGE' | 'MAX'): Promise<void> => {
        await api.post("/teacher/grades/resolve", {
            classId, subjectId, semester, strategy
        });
    },

    // Get homeroom grade summary (GVCN only)
    getHomeroomGradeSummary: async (semester: number = 1): Promise<HomeroomGradeSummary> => {
        const res = await api.get<HomeroomGradeSummary>("/teacher/grades/homeroom-summary", {
            params: { semester }
        });
        return res.data;
    },

    // ==================== NOTIFICATIONS ====================

    // Create a homeroom notification
    createNotification: async (data: CreateNotificationPayload): Promise<HomeroomNotification> => {
        const res = await api.post<HomeroomNotification>("/teacher/notifications", data);
        return res.data;
    },

    // Get sent notifications
    getNotifications: async (): Promise<HomeroomNotification[]> => {
        const res = await api.get<HomeroomNotification[]>("/teacher/notifications");
        return res.data;
    },

    // Delete a notification
    deleteNotification: async (id: string): Promise<void> => {
        await api.delete(`/teacher/notifications/${id}`);
    },

    // ==================== CLASS SEAT MAP ====================

    // Get seating chart for a class
    getClassSeatMap: async (classId: string): Promise<ClassSeatMapData> => {
        const res = await api.get<ClassSeatMapData>(`/teacher/class-map/${classId}`);
        return res.data;
    },

    // Save seating chart for a class (GVCN only)
    saveClassSeatMap: async (classId: string, config: string): Promise<ClassSeatMapData> => {
        const res = await api.post<ClassSeatMapData>(`/teacher/class-map/${classId}`, { config });
        return res.data;
    },

    // Delete/reset seating chart for a class (GVCN only)
    deleteClassSeatMap: async (classId: string): Promise<void> => {
        await api.delete(`/teacher/class-map/${classId}`);
    }
};

// ==================== CLASS SEAT MAP TYPES ====================

export type SeatPosition = {
    studentId: string;
    studentCode: string;
    fullName: string;
    gender: string;
    row: number;
    col: number;
    seatIndex: number;
};

export type ClassObject = {
    id: string;
    type: 'DOOR' | 'TEACHER_DESK' | 'PROJECTOR' | 'TV' | 'WHITEBOARD';
    position: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
    label: string;
    offset?: number; // percentage offset along the bar (0-100), default 50 = center
};

export type ClassSeatMapConfig = {
    rows: number;
    desksPerRow: number;
    seatsPerDesk: number;
    studentPositions: SeatPosition[];
    objects: ClassObject[];
};

export type ClassSeatMapData = {
    classId: string;
    className: string;
    config: string | null; // JSON string of ClassSeatMapConfig
    updatedAt?: string;
    updatedByName?: string;
};
