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
};

export type CreateExamSessionRequest = {
    name: string;
    academicYear: string;
    semester: number;
    startDate: string;
    endDate: string;
    status?: "DRAFT" | "PUBLISHED" | "COMPLETED";
};

export type RoomAllocation = {
    roomId: string;
    capacity: number;
    teacherIds: string[];
};

export type ExamAllocateRequest = {
    examSessionId: string;
    subjectId: string;
    grade: number;
    examDate: string;
    startTime: string;
    endTime: string;
    rooms: RoomAllocation[];
};

export type ExamSwapRequest = {
    studentId1: string;
    examRoomId1: string;
    studentId2: string;
    examRoomId2: string;
};

export type ExamRoomDetailDto = {
    id: string;
    roomName: string;
    building: string;
    capacity: number;
    studentCount: number;
    invigilatorNames: string[];
};

export type ExamScheduleDetailDto = {
    id: string;
    subjectName: string;
    grade: number;
    examDate: string;
    startTime: string;
    endTime: string;
    rooms: ExamRoomDetailDto[];
};

export type ExamStudentDetailDto = {
    id: string;
    studentCode: string;
    fullName: string;
};

// ==================== SERVICE ====================

export const examAdminService = {
    // ExamSession CRUD
    listSessions: async (): Promise<ExamSessionDto[]> => {
        const res = await api.get<ExamSessionDto[]>("/school/exam-admin/sessions");
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

    // Available rooms (filtered by conflict)
    getAvailableRooms: async (date: string, startTime: string, endTime: string) => {
        const res = await api.get<import("./schoolAdminService").RoomDto[]>("/school/exam-admin/available-rooms", {
            params: { date, startTime, endTime },
        });
        return res.data;
    },

    // Allocation
    allocateExam: async (req: ExamAllocateRequest): Promise<{ message: string; allocatedCount: number }> => {
        const res = await api.post<{ message: string; allocatedCount: number }>("/school/exam-admin/allocate", req);
        return res.data;
    },

    // Student swap
    swapStudents: async (req: ExamSwapRequest): Promise<{ message: string }> => {
        const res = await api.put<{ message: string }>("/school/exam-admin/students/swap", req);
        return res.data;
    },

    // Session schedule details
    getSessionSchedules: async (sessionId: string): Promise<ExamScheduleDetailDto[]> => {
        const res = await api.get<ExamScheduleDetailDto[]>(`/school/exam-admin/sessions/${sessionId}/schedules`);
        return res.data;
    },

    // Room students
    getRoomStudents: async (roomId: string): Promise<ExamStudentDetailDto[]> => {
        const res = await api.get<ExamStudentDetailDto[]>(`/school/exam-admin/rooms/${roomId}/students`);
        return res.data;
    },
};

