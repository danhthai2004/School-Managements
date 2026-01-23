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
    roomNumber: string | null;
    department: string | null;
    status: string;
    homeroomTeacherId: string | null;
    homeroomTeacherName: string | null;
    studentCount: number;
};

export type CreateClassRoomRequest = {
    name: string;
    grade: number;
    academicYear: string;
    maxCapacity: number;
    roomNumber?: string;
    department?: 'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI';
    homeroomTeacherId?: string;
};

export type UserDto = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    schoolId: string;
    schoolCode: string;
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
    specialization?: string;
    degree?: string;
    createAccount: boolean;
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

    // Student Account Management
    getStudentsEligibleForAccount: async (): Promise<StudentDto[]> => {
        const res = await api.get<StudentDto[]>("/school/students/no-account");
        return res.data;
    },

    createStudentAccounts: async (studentIds: string[]): Promise<BulkAccountCreationResponse> => {
        const res = await api.post<BulkAccountCreationResponse>("/school/students/accounts", studentIds);
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
