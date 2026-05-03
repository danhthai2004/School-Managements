import api from "./api";

// ==================== TYPES ====================

export type RiskAssessmentDto = {
    id: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    className: string | null;
    classId: string | null;
    assessmentDate: string;
    riskScore: number;
    riskCategory: "ACADEMIC" | "BEHAVIOR" | "ATTENDANCE" | "MIXED";
    riskTrend: "IMPROVING" | "STABLE" | "DECLINING" | "CRITICAL" | null;
    aiReason: string | null;
    aiAdvice: string | null;
    teacherFeedback: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "ACTION_TAKEN";
    teacherNote: string | null;
    notificationSent: boolean;
};

export type ClassRiskOverviewDto = {
    classId: string;
    className: string;
    grade: number;
    totalStudents: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    riskLevel: "SAFE" | "WATCH" | "DANGER";
};

export type TeacherFeedbackRequest = {
    assessmentId: string;
    feedback: "ACKNOWLEDGED" | "FALSE_POSITIVE" | "ACTION_TAKEN";
    note?: string;
};

// ==================== SERVICE ====================

export const riskService = {
    /** Tổng quan rủi ro toàn trường (Heatmap data) */
    getSchoolOverview: async (): Promise<ClassRiskOverviewDto[]> => {
        const res = await api.get<ClassRiskOverviewDto[]>("/risk/overview");
        return res.data;
    },

    /** Danh sách cảnh báo rủi ro chưa xử lý */
    getPendingAlerts: async (): Promise<RiskAssessmentDto[]> => {
        const res = await api.get<RiskAssessmentDto[]>("/risk/alerts");
        return res.data;
    },

    /** Lịch sử rủi ro cho 1 học sinh (dùng cho LineChart) */
    getStudentHistory: async (studentId: string): Promise<RiskAssessmentDto[]> => {
        const res = await api.get<RiskAssessmentDto[]>(`/risk/students/${studentId}/history`);
        return res.data;
    },

    /** Đánh giá mới nhất cho 1 học sinh */
    getLatestAssessment: async (studentId: string): Promise<RiskAssessmentDto | null> => {
        const res = await api.get<RiskAssessmentDto>(`/risk/students/${studentId}/latest`);
        return res.status === 204 ? null : res.data;
    },

    /** Giáo viên gửi phản hồi */
    submitFeedback: async (data: TeacherFeedbackRequest): Promise<RiskAssessmentDto> => {
        const res = await api.post<RiskAssessmentDto>("/risk/feedback", data);
        return res.data;
    },

    /** Kích hoạt phân tích AI thủ công (Admin only) */
    triggerAnalysis: async (): Promise<RiskAssessmentDto[]> => {
        const res = await api.post<RiskAssessmentDto[]>("/risk/trigger");
        return res.data;
    },
};
