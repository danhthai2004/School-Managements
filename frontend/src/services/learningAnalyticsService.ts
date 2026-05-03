import api from "./api";

// ==================== TYPES ====================

export type LearningAnalysisDto = {
    id: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    className: string | null;
    classId: string | null;
    semesterName: string | null;

    strengths: string | null;
    weaknesses: string | null;
    detailedAnalysis: string | null;
    learningAdvice: string | null;
    predictedGpa: number | null;
    currentGpa: number | null;
    analyzedAt: string | null;
};

export type ClassLearningOverviewDto = {
    classId: string;
    className: string;
    gradeLevel: number;
    totalStudents: number;
    analyzedCount: number;
    avgPredictedGpa: number | null;
    avgCurrentGpa: number | null;
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    weakCount: number;
};

// ==================== SERVICE ====================

export const learningAnalyticsService = {
    // ── Admin Dashboard ──

    /** Tổng quan chất lượng học tập toàn trường */
    getSchoolOverview: async (): Promise<ClassLearningOverviewDto[]> => {
        const res = await api.get<ClassLearningOverviewDto[]>("/learning-analytics/overview");
        return res.data;
    },

    /** Trigger phân tích toàn trường (Admin only) */
    triggerSchoolAnalysis: async (): Promise<LearningAnalysisDto[]> => {
        const res = await api.post<LearningAnalysisDto[]>("/learning-analytics/trigger");
        return res.data;
    },

    // ── Teacher Dashboard ──

    /** Lấy báo cáo của tất cả học sinh trong lớp chủ nhiệm */
    getHomeroomStudentsReports: async (): Promise<LearningAnalysisDto[]> => {
        const res = await api.get<LearningAnalysisDto[]>("/learning-analytics/homeroom/students");
        return res.data;
    },

    // ── Teacher/Admin: Per-Student ──

    /** Lấy báo cáo mới nhất của 1 học sinh */
    getStudentReport: async (studentId: string): Promise<LearningAnalysisDto | null> => {
        const res = await api.get<LearningAnalysisDto>(`/learning-analytics/students/${studentId}`);
        return res.status === 204 ? null : res.data;
    },

    /** Lịch sử báo cáo cho biểu đồ xu hướng */
    getStudentHistory: async (studentId: string): Promise<LearningAnalysisDto[]> => {
        const res = await api.get<LearningAnalysisDto[]>(`/learning-analytics/students/${studentId}/history`);
        return res.data;
    },

    /** Trigger phân tích thủ công 1 học sinh */
    triggerStudentAnalysis: async (studentId: string): Promise<LearningAnalysisDto | null> => {
        const res = await api.post<LearningAnalysisDto>(`/learning-analytics/students/${studentId}/trigger`);
        return res.status === 204 ? null : res.data;
    },

    // ── Student Portal (read-only) ──

    /** Học sinh xem báo cáo AI cố vấn cá nhân */
    getMyReport: async (): Promise<LearningAnalysisDto | null> => {
        const res = await api.get<LearningAnalysisDto>("/student/learning-analytics");
        return res.status === 204 ? null : res.data;
    },
};
