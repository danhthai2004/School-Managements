import api from "./api";

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
    roomId: string | null;
    roomName: string | null;
    department: string | null;
    session: 'SANG' | 'CHIEU' | null;
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
    roomId?: string;
    department?: 'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI';
    session?: 'SANG' | 'CHIEU';
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
    enabled: boolean;
};

export type GuardianDto = {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    relationship: string | null;
    studentName: string;
    studentClass: string;
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
    hasAccount: boolean;
    guardian: GuardianDto | null;
};

export type ClassEnrollmentHistoryDto = {
    enrollmentId: string;
    classId: string;
    className: string;
    academicYear: string;
    enrolledAt: string;
};

export type StudentProfileDto = StudentDto & {
    enrollmentHistory: ClassEnrollmentHistoryDto[];
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
    combinationId?: string;
    grade?: number;
    guardian?: GuardianRequest;
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
    guardian?: UpdateGuardianRequest;
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
    degree: string | null;
    status: string;
    homeroomClassId: string | null;
    homeroomClassName: string | null;
    subjects: SubjectDto[];
    subjectNames: string | null;
    hasAccount: boolean;
    avatarUrl: string | null;
};

export type CreateTeacherRequest = {
    teacherCode?: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: string;
    email?: string;
    phone?: string;
    degree?: string;
    subjectIds?: string[];
    createAccount: boolean;
};

export type BulkPromoteRequest = {
    studentIds: string[];
    targetGrade: number;
    targetAcademicYear: string;
};

export type BulkPromoteResponse = {
    promoted: number;
    skipped: number;
    errors: string[];
};

export type BulkDeleteRequest = {
    ids: string[];
};

export type BulkDeleteResponse = {
    deleted: number;
    failed: number;
    errors: string[];
};

export type RoomDto = {
    id: string;
    name: string;
    capacity: number;
    building: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
};

export type CreateRoomRequest = {
    name: string;
    capacity: number;
    building?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
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

    getClass: async (id: string): Promise<ClassRoomDto> => {
        const res = await api.get<ClassRoomDto>(`/school/classes/${id}`);
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

    bulkDeleteTeachers: async (ids: string[]): Promise<BulkDeleteResponse> => {
        const res = await api.post<BulkDeleteResponse>("/school/teachers/bulk-delete", { ids });
        return res.data;
    },
    // Import teachers from Excel
    importTeachersFromExcel: async (file: File): Promise<ImportTeacherResult> => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.post<ImportTeacherResult>("/school/teachers/import-excel", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    },


    // Users
    listUsers: async (): Promise<UserDto[]> => {
        const res = await api.get<UserDto[]>("/school/users");
        return res.data;
    },

    resetPassword: async (userId: string): Promise<void> => {
        await api.post(`/school/users/${userId}/reset-password`);
    },

    updateUserStatus: async (userId: string, enabled: boolean): Promise<void> => {
        await api.put(`/school/users/${userId}/status`, null, {
            params: { enabled }
        });
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/school/users/${userId}`);
    },

    // Students
    listStudents: async (classId?: string): Promise<StudentDto[]> => {
        const params = classId ? { classId } : {};
        const res = await api.get<StudentDto[]>("/school/students", { params });
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

    getStudentProfile: async (studentId: string): Promise<StudentProfileDto> => {
        const res = await api.get<StudentProfileDto>(`/school/students/${studentId}/profile`);
        return res.data;
    },

    transferStudent: async (studentId: string, newClassId: string): Promise<StudentProfileDto> => {
        const res = await api.post<StudentProfileDto>(`/school/students/${studentId}/transfer`, null, {
            params: { newClassId }
        });
        return res.data;
    },

    uploadAvatar: async (studentId: string, file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post<{ url: string }>(`/school/students/${studentId}/avatar`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    },

    // Bulk Promotion
    promoteStudents: async (req: BulkPromoteRequest): Promise<BulkPromoteResponse> => {
        const res = await api.post<BulkPromoteResponse>("/school/students/promote", req);
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

    bulkDeleteStudents: async (ids: string[]): Promise<BulkDeleteResponse> => {
        const res = await api.post<BulkDeleteResponse>("/school/students/bulk-delete", { ids });
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

    deleteStudentAccount: async (studentId: string): Promise<void> => {
        await api.delete(`/school/students/${studentId}/account`);
    },

    // Teacher Account Management
    getTeachersEligibleForAccount: async (): Promise<TeacherDto[]> => {
        const res = await api.get<TeacherDto[]>("/school/teachers/no-account");
        return res.data;
    },

    createTeacherAccounts: async (teacherIds: string[]): Promise<BulkAccountCreationResponse> => {
        const res = await api.post<BulkAccountCreationResponse>("/school/teachers/accounts", teacherIds);
        return res.data;
    },

    // Guardian Account Management
    getGuardiansEligibleForAccount: async (): Promise<GuardianDto[]> => {
        const res = await api.get<GuardianDto[]>("/school/guardians/eligible-for-account");
        return res.data;
    },

    createGuardianAccounts: async (guardianIds: string[]): Promise<BulkAccountCreationResponse> => {
        const res = await api.post<BulkAccountCreationResponse>("/school/guardians/accounts", guardianIds);
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

    // ==================== Room Management ====================
    listRooms: async (page = 0, size = 50): Promise<{ content: RoomDto[]; totalElements: number }> => {
        const res = await api.get<{ content: RoomDto[]; totalElements: number }>("/school/rooms", { params: { page, size } });
        return res.data;
    },

    listActiveRooms: async (): Promise<RoomDto[]> => {
        const res = await api.get<RoomDto[]>("/school/rooms/active");
        return res.data;
    },

    createRoom: async (req: CreateRoomRequest): Promise<RoomDto> => {
        const res = await api.post<RoomDto>("/school/rooms", req);
        return res.data;
    },

    createBulkRooms: async (rooms: CreateRoomRequest[]): Promise<RoomDto[]> => {
        const res = await api.post<RoomDto[]>("/school/rooms/bulk", rooms);
        return res.data;
    },

    updateReportSetting(id: string, req: object): Promise<void> {
        return api.put(`/api/school/report-settings/${id}`, req);
    },

    deleteReportSetting(id: string): Promise<void> {
        return api.delete(`/api/school/report-settings/${id}`);
    },

    updateRoom: async (id: string, req: CreateRoomRequest): Promise<RoomDto> => {
        const res = await api.put<RoomDto>(`/school/rooms/${id}`, req);
        return res.data;
    },

    deleteRoom: async (id: string): Promise<void> => {
        await api.delete(`/school/rooms/${id}`);
    },

    updateRoomStatus: async (id: string, status: string): Promise<RoomDto> => {
        const res = await api.patch<RoomDto>(`/school/rooms/${id}/status`, null, { params: { status } });
        return res.data;
    },

    // Teacher Assignments
    initializeAssignments: async (): Promise<void> => {
        await api.post("/school/assignments/init");
    },

    listAssignments: async (classId?: string): Promise<import("./dtos/TeacherAssignmentDto").TeacherAssignmentDto[]> => {
        const res = await api.get<import("./dtos/TeacherAssignmentDto").TeacherAssignmentDto[]>("/school/assignments", {
            params: { classId }
        });
        return res.data;
    },

    assignTeacher: async (assignmentId: string, teacherId: string | null): Promise<import("./dtos/TeacherAssignmentDto").TeacherAssignmentDto> => {
        const res = await api.put<import("./dtos/TeacherAssignmentDto").TeacherAssignmentDto>(`/school/assignments/${assignmentId}/teacher`, {
            teacherId
        });
        return res.data;
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

// ==================== IMPORT TEACHER RESULT TYPE ====================

export type ImportTeacherResult = {
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: ImportTeacherError[];
};

export type ImportTeacherError = {
    rowNumber: number;
    teacherName: string;
    errorMessage: string;
};

// ==================== CURRICULUM TYPES ====================

export type SubjectDto = {
    id: string;
    name: string;
    code: string | null;
    type: 'COMPULSORY' | 'ELECTIVE' | 'SPECIALIZED' | 'ACTIVITY';
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



