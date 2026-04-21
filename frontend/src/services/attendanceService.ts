import api from "./api";

// ==================== TYPES ====================

export const AttendanceStatus = {
    PRESENT: "PRESENT",
    ABSENT_EXCUSED: "ABSENT_EXCUSED",
    ABSENT_UNEXCUSED: "ABSENT_UNEXCUSED",
    LATE: "LATE"
} as const;

export type AttendanceStatus = typeof AttendanceStatus[keyof typeof AttendanceStatus];

export type AttendanceDto = {
    studentId: string;
    studentCode: string;
    studentName: string;
    status: AttendanceStatus;
    remarks: string;
};

export type AttendanceRecord = {
    studentId: string;
    status: AttendanceStatus;
    remarks: string;
};

export type SaveAttendanceRequest = {
    date: string; // YYYY-MM-DD
    slotIndex: number;
    records: AttendanceRecord[];
};

export type SaveAttendanceResultDto = {
    savedCount: number;
    skippedStudents: {
        studentId: string;
        reason: string;
    }[];
};


export type StudentDailyAttendance = {
    studentId: string;
    studentName: string;
    slotTheStatus: Record<number, AttendanceStatus>;
};

export type DailyAttendanceSummaryDto = {
    classroomName: string;
    date: string;
    isFinalized: boolean;
    students: StudentDailyAttendance[];
};
export type StudentAttendanceSummary = {
    studentId: string;
    studentName: string;
    totalPresent: number;
    totalAbsentExcused: number;
    totalAbsentUnexcused: number;
    totalLate: number;
    totalSessions: number;
    attendanceRate: number;
};

export type AttendanceReportSummaryDto = {
    classroomName: string;
    startDate: string;
    endDate: string;
    reportType: string;
    students: StudentAttendanceSummary[];
    totalStudents: number;
    totalSchoolDays: number;
    overallAttendanceRate: number;
};

export type StudentAttendanceDetailRecord = {
    date: string;
    slotIndex: number;
    subjectName: string;
    status: AttendanceStatus;
    remarks: string;
};

export type StudentAttendanceDetailDto = {
    studentId: string;
    studentName: string;
    records: StudentAttendanceDetailRecord[];
};

// ==================== SERVICE ====================

export const attendanceService = {
    // Get attendance for a specific slot
    getAttendanceForSlot: async (date: string, slotIndex: number): Promise<AttendanceDto[]> => {
        const res = await api.get<AttendanceDto[]>("/teacher/attendance/slot", {
            params: { date, slotIndex }
        });
        return res.data;
    },

    // Save attendance for a specific slot
    saveAttendance: async (request: SaveAttendanceRequest): Promise<SaveAttendanceResultDto> => {
        const res = await api.post<SaveAttendanceResultDto>("/teacher/attendance/slot", request);
        return res.data;
    },

    // Get daily attendance summary (Homeroom)
    getDailySummary: async (date: string): Promise<DailyAttendanceSummaryDto> => {
        const res = await api.get<DailyAttendanceSummaryDto>("/teacher/attendance/daily-summary", {
            params: { date }
        });
        return res.data;
    },

    // Get attendance report (weekly/monthly) for Homeroom Teacher
    getAttendanceReport: async (startDate: string, endDate: string, reportType: string): Promise<AttendanceReportSummaryDto> => {
        const res = await api.get<AttendanceReportSummaryDto>("/teacher/attendance/report", {
            params: { startDate, endDate, reportType }
        });
        return res.data;
    },

    // Get student attendance detail records
    getStudentAttendanceDetail: async (studentId: string, startDate: string, endDate: string, status?: string): Promise<StudentAttendanceDetailDto> => {
        const res = await api.get<StudentAttendanceDetailDto>("/teacher/attendance/student-detail", {
            params: { studentId, startDate, endDate, status }
        });
        return res.data;
    },

};


