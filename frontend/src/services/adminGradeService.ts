import api from "./api";

// ==================== TYPES ====================

export type GradingConfigDto = {
    regularWeight: number;
    midtermWeight: number;
    finalWeight: number;
    updatedAt: string | null;
    updatedBy: string | null;
};

export type GradeEntryStatusDto = {
    totalClasses: number;
    completedClasses: number;
    totalMidtermGrades: number;
    filledMidtermGrades: number;
    totalFinalGrades: number;
    filledFinalGrades: number;
    completionPercentage: number;
    classStatuses: ClassEntryStatus[];
};

export type ClassEntryStatus = {
    classId: string;
    className: string;
    grade: number;
    totalSubjects: number;
    completedSubjects: number;
    totalStudents: number;
    expectedGradeEntries: number;
    totalGradeEntries: number;
    completionPercentage: number;
    isLocked: boolean;
    subjects: SubjectEntryStatus[];
};

export type SubjectEntryStatus = {
    subjectId: string;
    subjectName: string;
    totalStudents: number;
    txEntered: number;
    midtermEntered: number;
    finalEntered: number;
    completionPercentage: number;
    isComplete: boolean;
};

export type GradeHistoryDto = {
    id: string;
    studentName: string;
    studentCode: string;
    subjectName: string;
    fieldChanged: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    changedAt: string;
    reason: string;
};

export type StudentRankingDto = {
    studentId: string;
    studentCode: string;
    fullName: string;
    gpa: number | null;
    performanceCategory: string | null;
    conduct: string | null;
    rankInClass: number | null;
};

export type GradeBookDto = {
    subjectId: string;
    subjectName: string;
    className: string;
    academicYear: string;
    semester: number;
    regularAssessmentCount: number;
    canEdit: boolean;
    students: StudentGradeDto[];
};

export type StudentGradeDto = {
    studentId: string;
    studentCode: string;
    fullName: string;
    grades: GradeValueDto[];
};

export type GradeValueDto = {
    type: 'REGULAR' | 'MIDTERM' | 'FINAL';
    index: number | null;
    value: number | null;
};

export type PageResponse<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

// ==================== SERVICE ====================

export const adminGradeService = {
    // 1. Config
    getConfig: async (): Promise<GradingConfigDto> => {
        const res = await api.get<GradingConfigDto>("/school/grades/config");
        return res.data;
    },
    updateConfig: async (req: GradingConfigDto): Promise<GradingConfigDto> => {
        const res = await api.put<GradingConfigDto>("/school/grades/config", req);
        return res.data;
    },

    // 2. Lock/Unlock
    lockClass: async (classId: string, semesterId: string, reason: string): Promise<void> => {
        await api.post("/school/grades/lock", null, {
            params: { classId, semesterId, reason }
        });
    },
    unlockClass: async (classId: string, semesterId: string): Promise<void> => {
        await api.post("/school/grades/unlock", null, {
            params: { classId, semesterId }
        });
    },

    // 3. Status
    getEntryStatus: async (semesterId?: string): Promise<GradeEntryStatusDto> => {
        const params = semesterId ? { semesterId } : {};
        const res = await api.get<GradeEntryStatusDto>("/school/grades/entry-status", { params });
        return res.data;
    },

    // 4. Audit History
    getHistory: async (page = 0, size = 50, semesterId?: string, classId?: string): Promise<PageResponse<GradeHistoryDto>> => {
        const params: any = { page, size };
        if (semesterId) params.semesterId = semesterId;
        if (classId) params.classId = classId;
        
        const res = await api.get<PageResponse<GradeHistoryDto>>("/school/grades/history", { params });
        // Handling Spring Page object
        return res.data as any;
    },

    // 5. Ranking
    getRankings: async (classId: string, semesterId?: string): Promise<StudentRankingDto[]> => {
        const params: any = { classId };
        if (semesterId) params.semesterId = semesterId;

        const res = await api.get<StudentRankingDto[]>("/school/grades/rankings", { params });
        return res.data;
    },
    calculateRankings: async (classId: string, semesterId?: string): Promise<StudentRankingDto[]> => {
        const params: any = { classId };
        if (semesterId) params.semesterId = semesterId;

        const res = await api.post<StudentRankingDto[]>("/school/grades/rankings/calculate", null, { params });
        return res.data;
    },

    // 6. Super Edit Book
    getGradeBook: async (classId: string, subjectId: string, semesterId?: string): Promise<GradeBookDto> => {
        const params: any = { classId, subjectId };
        if (semesterId) params.semesterId = semesterId;

        const res = await api.get<GradeBookDto>("/school/grades/book", { params });
        return res.data;
    },
    saveGradeBook: async (classId: string, subjectId: string, gradeData: StudentGradeDto[], reason: string, semesterId?: string): Promise<void> => {
        const payload = { classId, subjectId, semesterId, gradeData, reason };
        await api.put("/school/grades/book", payload);
    }
};
