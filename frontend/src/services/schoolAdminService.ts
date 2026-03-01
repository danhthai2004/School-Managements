import api from "./api";
import type { TeacherAssignmentDto } from "./dtos/TeacherAssignmentDto";

// ==================== TYPES ====================

export type SchoolStatsDto = {
    totalClasses: number;
    totalTeachers: number;
    totalStudents: number;
    currentAcademicYear: string;
};

export type ClassRoomDto = {
    id: string;
    name: string;
    grade: number;
    academicYear: string;
    maxCapacity: number;
    roomNumber: string | null;
    department: string | null;
    status: string;
    homeroomTeacherId: string | null;
    homeroomTeacherName: string | null;
    studentCount: number;
    combinationId: string | null;
    combinationName: string | null;
};

export type CreateClassRoomRequest = {
    name: string;
    grade: number;
    academicYear: string;
    maxCapacity: number;
    roomNumber?: string;
    department?: 'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI';
    homeroomTeacherId?: string;
    combinationId?: string;
};

export type UserDto = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    schoolId: string;
    schoolCode: string;
};

export type SchoolUserListDto = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    schoolId: string;
    schoolCode: string;
    schoolName: string;
    enabled: boolean;
    pendingDeleteAt: string | null;
};

export type GuardianDto = {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    relationship: string | null;
};

export type StudentDto = {
    id: string;
    studentCode: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
    birthPlace: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    enrollmentDate: string | null;
    currentClassName: string | null;
    currentClassId: string | null;
    guardians: GuardianDto[];
    hasAccount?: boolean;
};

export type GuardianRequest = {
    fullName: string;
    phone?: string;
    email?: string;
    relationship?: string;
};

export type CreateStudentRequest = {
    studentCode?: string; // Optional - will be auto-generated if not provided
    fullName: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    birthPlace?: string;
    address?: string;
    email?: string;
    phone?: string;
    enrollmentDate?: string;
    classId?: string;
    academicYear?: string;
    guardians?: GuardianRequest[];
};

export type UpdateStudentRequest = {
    fullName: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    birthPlace?: string;
    address?: string;
    email?: string;
    phone?: string;
    status?: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED';
    classId?: string;
    academicYear?: string;
    guardians?: UpdateGuardianRequest[];
};

export type UpdateGuardianRequest = {
    id?: string; // null for new guardian
    fullName: string;
    phone?: string;
    email?: string;
    relationship?: string;
};


export type TeacherDto = {
    id: string;
    teacherCode: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    specialization: string | null;
    degree: string | null;
    status: string;
    homeroomClassId: string | null;
    homeroomClassName: string | null;
    subjectId: string | null;
    subjectName: string | null;
    avatarUrl: string | null;
    maxPeriodsPerWeek: number;
    hasAccount?: boolean;
};

export type CreateTeacherRequest = {
    teacherCode?: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: string;
    email?: string;
    phone?: string;
    specialization?: string;
    degree?: string;
    subjectId?: string;
    createAccount: boolean;
};

export type GlobalSlotRequest = {
    dayOfWeek: string;
    slotIndex: number;
    subjectId: string | null;
    grades: number[];
};

export type ClassSlotRequest = {
    classRoomId: string;
    dayOfWeek: string;
    slotIndex: number;
    subjectId: string | null;
    teacherId: string | null;
};

// ==================== SERVICE ====================

export const schoolAdminService = {
    // Statistics
    getStats: async (): Promise<SchoolStatsDto> => {
        const res = await api.get<SchoolStatsDto>("/school/stats");
        return res.data;
    },

    // ClassRoom CRUD
    listClasses: async (): Promise<ClassRoomDto[]> => {
        const res = await api.get<ClassRoomDto[]>("/school/classes");
        return res.data;
    },

    createClass: async (req: CreateClassRoomRequest): Promise<ClassRoomDto> => {
        const res = await api.post<ClassRoomDto>("/school/classes", req);
        return res.data;
    },

    updateClass: async (classId: string, req: CreateClassRoomRequest): Promise<ClassRoomDto> => {
        const res = await api.put<ClassRoomDto>(`/school/classes/${classId}`, req);
        return res.data;
    },

    deleteClass: async (classId: string): Promise<void> => {
        await api.delete(`/school/classes/${classId}`);
    },

    // Teachers
    listTeachers: async (): Promise<UserDto[]> => {
        const res = await api.get<UserDto[]>("/school/teachers");
        return res.data;
    },

    listTeacherProfiles: async (): Promise<TeacherDto[]> => {
        const res = await api.get<TeacherDto[]>("/school/teachers/profiles");
        return res.data;
    },

    createTeacher: async (req: CreateTeacherRequest): Promise<TeacherDto> => {
        const res = await api.post<TeacherDto>("/school/teachers", req);
        return res.data;
    },

    updateTeacher: async (teacherId: string, req: CreateTeacherRequest): Promise<TeacherDto> => {
        const res = await api.put<TeacherDto>(`/school/teachers/${teacherId}`, req);
        return res.data;
    },

    deleteTeacher: async (teacherId: string): Promise<void> => {
        await api.delete(`/school/teachers/${teacherId}`);
    },

    // Users
    listUsers: async (): Promise<UserDto[]> => {
        const res = await api.get<UserDto[]>("/school/users");
        return res.data;
    },

    // User Lifecycle Management
    listUsersWithStatus: async (): Promise<SchoolUserListDto[]> => {
        const res = await api.get<SchoolUserListDto[]>("/school/users/manage");
        return res.data;
    },

    listPendingDeleteUsers: async (): Promise<SchoolUserListDto[]> => {
        const res = await api.get<SchoolUserListDto[]>("/school/users/pending");
        return res.data;
    },

    enableUser: async (id: string): Promise<void> => {
        await api.put(`/school/users/${id}/enable`);
    },

    disableUser: async (id: string): Promise<void> => {
        await api.put(`/school/users/${id}/disable`);
    },

    markPendingDelete: async (id: string): Promise<void> => {
        await api.delete(`/school/users/${id}`);
    },

    restoreUser: async (id: string): Promise<void> => {
        await api.put(`/school/users/${id}/restore`);
    },

    permanentDeleteUser: async (id: string): Promise<void> => {
        await api.delete(`/school/users/${id}/permanent`);
    },

    // Students
    listStudents: async (): Promise<StudentDto[]> => {
        const res = await api.get<StudentDto[]>("/school/students");
        return res.data;
    },

    getStudent: async (studentId: string): Promise<StudentDto> => {
        const res = await api.get<StudentDto>(`/school/students/${studentId}`);
        return res.data;
    },

    createStudent: async (req: CreateStudentRequest): Promise<StudentDto> => {
        const res = await api.post<StudentDto>("/school/students", req);
        return res.data;
    },

    updateStudent: async (studentId: string, req: UpdateStudentRequest): Promise<StudentDto> => {
        const res = await api.put<StudentDto>(`/school/students/${studentId}`, req);
        return res.data;
    },

    // Import students from Excel
    importStudentsFromExcel: async (
        file: File,
        academicYear: string,
        grade: number,
        autoAssign: boolean = true
    ): Promise<ImportStudentResult> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("academicYear", academicYear);
        formData.append("grade", grade.toString());
        formData.append("autoAssign", autoAssign.toString());

        const res = await api.post<ImportStudentResult>("/school/students/import-excel", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    },

    deleteStudent: async (studentId: string): Promise<void> => {
        await api.delete(`/school/students/${studentId}`);
    },

    // Bulk delete students
    bulkDeleteStudents: async (studentIds: string[]): Promise<BulkDeleteResponse> => {
        const res = await api.post<BulkDeleteResponse>("/school/students/bulk-delete", { ids: studentIds });
        return res.data;
    },

    // Get class detail
    getClass: async (classId: string): Promise<ClassRoomDto> => {
        const res = await api.get<ClassRoomDto>(`/school/classes/${classId}`);
        return res.data;
    },

    // Promote students
    promoteStudents: async (req: BulkPromoteRequest): Promise<BulkPromoteResponse> => {
        const res = await api.post<BulkPromoteResponse>("/school/students/promote", req);
        return res.data;
    },

    // Student profile
    getStudentProfile: async (studentId: string): Promise<StudentProfileDto> => {
        const res = await api.get<StudentProfileDto>(`/school/students/${studentId}/profile`);
        return res.data;
    },

    // Transfer student
    transferStudent: async (studentId: string, newClassId: string): Promise<StudentProfileDto> => {
        const res = await api.post<StudentProfileDto>(`/school/students/${studentId}/transfer?newClassId=${newClassId}`);
        return res.data;
    },

    // Upload student avatar
    uploadAvatar: async (studentId: string, file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post<{ url: string }>(`/school/students/${studentId}/avatar`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    },

    // Import teachers from Excel
    importTeachersFromExcel: async (file: File): Promise<ImportTeacherResult> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post<ImportTeacherResult>("/school/teachers/import-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    },

    // Student Account Management
    getStudentsEligibleForAccount: async (): Promise<StudentDto[]> => {
        const res = await api.get<StudentDto[]>("/school/students/no-account");
        return res.data;
    },

    createStudentAccounts: async (studentIds: string[]): Promise<BulkAccountCreationResponse> => {
        const res = await api.post<BulkAccountCreationResponse>("/school/students/accounts", studentIds);
        return res.data;
    },

    // Curriculum
    listSubjects: async (): Promise<SubjectDto[]> => {
        const res = await api.get<SubjectDto[]>("/school/subjects");
        return res.data;
    },

    listCombinations: async (): Promise<CombinationDto[]> => {
        const res = await api.get<CombinationDto[]>("/school/combinations");
        return res.data;
    },

    createCombination: async (req: CreateCombinationRequest): Promise<CombinationDto> => {
        const res = await api.post<CombinationDto>("/school/combinations", req);
        return res.data;
    },

    updateCombination: async (id: string, req: CreateCombinationRequest): Promise<CombinationDto> => {
        const res = await api.put<CombinationDto>(`/school/combinations/${id}`, req);
        return res.data;
    },

    deleteCombination: async (id: string): Promise<void> => {
        await api.delete(`/school/combinations/${id}`);
    },

    // ==================== TEACHER ASSIGNMENT ====================

    listAssignments: async (): Promise<TeacherAssignmentDto[]> => {
        const response = await api.get<TeacherAssignmentDto[]>(
            `/school/assignments`
        );
        return response.data;
    },

    addAssignment: async (
        teacherId: string,
        subjectId: string
    ): Promise<TeacherAssignmentDto> => {
        const response = await api.post<TeacherAssignmentDto>(
            `/school/assignments`,
            { teacherId, subjectId }
        );
        return response.data;
    },

    removeAssignment: async (assignmentId: string): Promise<void> => {
        await api.delete(`/school/assignments/${assignmentId}`);
    },

    setHeadOfDepartment: async (
        assignmentId: string,
        isHead: boolean
    ): Promise<TeacherAssignmentDto[]> => {
        const response = await api.put<TeacherAssignmentDto[]>(
            `/school/assignments/${assignmentId}/head?isHead=${isHead}`
        );
        return response.data;
    },

    // Timetable Slots
    updateGlobalSlot: async (timetableId: string, req: GlobalSlotRequest): Promise<void> => {
        await api.post(`/school-admin/timetables/${timetableId}/global-slot`, req);
    },

    updateClassSlot: async (timetableId: string, req: ClassSlotRequest): Promise<void> => {
        await api.post(`/school-admin/timetables/${timetableId}/class-slot`, req);
    },
};

export type BulkAccountCreationResponse = {
    created: number;
    skipped: number;
    errors: string[];
};

// ==================== IMPORT RESULT TYPE ====================

export type ImportStudentResult = {
    totalRows: number;
    successCount: number;
    failedCount: number;
    assignedToClassCount: number;
    errors: ImportError[];
};


export type ImportError = {
    rowNumber: number;
    studentName: string;
    errorMessage: string;
};

// ==================== BULK DELETE TYPES ====================

export type BulkDeleteRequest = {
    ids: string[];
};

export type BulkDeleteResponse = {
    totalRequested: number;
    successCount: number;
    failedCount: number;
    results: { id: string; success: boolean; message?: string }[];
};

// ==================== PROMOTION TYPES ====================

export type BulkPromoteRequest = {
    studentIds: string[];
    targetAcademicYear: string;
    targetGrade: number;
};

export type BulkPromoteResponse = {
    totalRequested: number;
    successCount: number;
    failedCount: number;
    results: { studentId: string; success: boolean; message?: string }[];
};

// ==================== TEACHER IMPORT TYPES ====================

export type ImportTeacherResult = {
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: ImportError[];
};

// ==================== STUDENT PROFILE TYPES ====================

export type StudentProfileDto = {
    student: StudentDto;
    enrollmentHistory: { id: string; className: string; academicYear: string; enrolledAt: string }[];
    attendanceSummary?: { totalDays: number; presentDays: number; absentDays: number; lateDays: number };
};

// ==================== CURRICULUM TYPES ====================

export type SubjectDto = {
    id: string;
    name: string;
    code: string | null;
    type: 'COMPULSORY' | 'ELECTIVE' | 'SPECIALIZED';
    stream: 'TU_NHIEN' | 'XA_HOI' | null;
    totalLessons: number | null;
    active: boolean;
    description: string | null;
};

export type CombinationDto = {
    id: string;
    name: string;
    code: string | null;
    stream: 'TU_NHIEN' | 'XA_HOI';
    subjects: SubjectDto[];
};

export type CreateCombinationRequest = {
    name: string;
    code?: string;
    stream: 'TU_NHIEN' | 'XA_HOI';
    electiveSubjectIds: string[];
    specializedSubjectIds: string[];
};

// ==================== TIMETABLE SETTINGS TYPES ====================

export type TimetableSettingsDto = {
    periodsPerMorning: number;
    periodsPerAfternoon: number;
    periodDurationMinutes: number;
    morningStartTime: string;
    afternoonStartTime: string;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakAfterPeriod: number;
};

export type SlotTimeDto = {
    slotIndex: number;
    startTime: string;
    endTime: string;
    isAfterLongBreak: boolean;
};

export type TimetableScheduleSummaryDto = {
    arrivalTime: string;
    morningEndTime: string;
    afternoonEndTime: string;
    lunchBreakStart: string;
    lunchBreakEnd: string;
    lunchBreakDurationMinutes: number;
    totalLearningMinutesPerDay: number;
    morningSlots: SlotTimeDto[];
    afternoonSlots: SlotTimeDto[];
};

// ==================== TIMETABLE SETTINGS SERVICE ====================

export const timetableSettingsService = {
    getSettings: async (): Promise<TimetableSettingsDto> => {
        const res = await api.get<TimetableSettingsDto>("/school-admin/timetables/settings");
        return res.data;
    },

    updateSettings: async (settings: TimetableSettingsDto): Promise<TimetableSettingsDto> => {
        const res = await api.put<TimetableSettingsDto>("/school-admin/timetables/settings", settings);
        return res.data;
    },

    getScheduleSummary: async (): Promise<TimetableScheduleSummaryDto> => {
        const res = await api.get<TimetableScheduleSummaryDto>("/school-admin/timetables/settings/summary");
        return res.data;
    },

    previewScheduleSummary: async (settings: TimetableSettingsDto): Promise<TimetableScheduleSummaryDto> => {
        const res = await api.post<TimetableScheduleSummaryDto>("/school-admin/timetables/settings/preview", settings);
        return res.data;
    },

    getSlotTimes: async (): Promise<SlotTimeDto[]> => {
        const res = await api.get<SlotTimeDto[]>("/school-admin/timetables/slot-times");
        return res.data;
    },
};
