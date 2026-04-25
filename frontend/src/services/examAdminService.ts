import api from "./api";

// ==================== TYPES ====================

export type ExamSessionDto = {
    id: string;
    name: string;
    academicYear: string;
    semester: number;
    startDate: string;
    endDate: string;
    status: "DRAFT" | "PUBLISHED" | "COMPLETED";
    type: string;
};

export type CreateExamSessionRequest = {
    name: string;
    academicYear: string;
    semester: number;
    startDate: string;
    endDate: string;
    status?: "DRAFT" | "PUBLISHED" | "COMPLETED";
    type: string;
};

export type ExamScheduleDetailDto = {
    id: string;
    subjectName: string;
    grade: number;
    examDate: string;
    startTime: string;
    endTime: string;
    examType?: string;
    note: string;
};

// ==================== SERVICE ====================

export const examAdminService = {
    // ExamSession CRUD
    listSessions: async (academicYear?: string, semester?: number): Promise<ExamSessionDto[]> => {
        const res = await api.get<ExamSessionDto[]>("/school/exam-admin/sessions", {
            params: { academicYear, semester }
        });
        return res.data;
    },

    getSession: async (id: string): Promise<ExamSessionDto> => {
        const res = await api.get<ExamSessionDto>(`/school/exam-admin/sessions/${id}`);
        return res.data;
    },

    createSession: async (req: CreateExamSessionRequest): Promise<ExamSessionDto> => {
        const res = await api.post<ExamSessionDto>("/school/exam-admin/sessions", req);
        return res.data;
    },

    updateSession: async (id: string, req: CreateExamSessionRequest): Promise<ExamSessionDto> => {
        const res = await api.put<ExamSessionDto>(`/school/exam-admin/sessions/${id}`, req);
        return res.data;
    },

    deleteSession: async (id: string): Promise<void> => {
        await api.delete(`/school/exam-admin/sessions/${id}`);
    },

    updateSessionStatus: async (id: string, status: "DRAFT" | "PUBLISHED" | "COMPLETED"): Promise<ExamSessionDto> => {
        const res = await api.patch<ExamSessionDto>(`/school/exam-admin/sessions/${id}/status`, { status });
        return res.data;
    },

    // Session schedule details
    getSessionSchedules: async (sessionId: string): Promise<ExamScheduleDetailDto[]> => {
        const res = await api.get<ExamScheduleDetailDto[]>(`/school/exam-admin/sessions/${sessionId}/schedules`);
        return res.data;
    },

    createSchedules: async (sessionId: string, schedules: ExamScheduleDetailDto[]): Promise<void> => {
        await api.post(`/school/exam-admin/sessions/${sessionId}/schedules`, schedules);
    },

    updateSchedule: async (scheduleId: string, schedule: ExamScheduleDetailDto): Promise<ExamScheduleDetailDto> => {
        const res = await api.put<ExamScheduleDetailDto>(`/school/exam-admin/schedules/${scheduleId}`, schedule);
        return res.data;
    },

    deleteSchedule: async (scheduleId: string): Promise<void> => {
        await api.delete(`/school/exam-admin/schedules/${scheduleId}`);
    },
};

