import api from "./api";

// ==================== TYPES ====================

export type AcademicYearDto = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
};

export type SemesterDto = {
    id: string;
    name: string;
    semesterNumber: number;
    academicYearId: string;
    academicYearName: string;
    startDate: string;
    endDate: string;
    gradeDeadline: string | null;
    status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
};

export type CreateAcademicYearRequest = {
    name: string;
    startDate: string;
    endDate: string;
};

export type UpdateSemesterRequest = {
    name: string;
    startDate: string;
    endDate: string;
    gradeDeadline?: string;
};

// ==================== SERVICE ====================

export const semesterService = {
    // Academic Year
    listAcademicYears: async (): Promise<AcademicYearDto[]> => {
        const res = await api.get<AcademicYearDto[]>("/school/academic-years");
        return res.data;
    },

    createAcademicYear: async (req: CreateAcademicYearRequest): Promise<AcademicYearDto> => {
        const res = await api.post<AcademicYearDto>("/school/academic-years", req);
        return res.data;
    },

    updateAcademicYear: async (id: string, req: CreateAcademicYearRequest): Promise<AcademicYearDto> => {
        const res = await api.put<AcademicYearDto>(`/school/academic-years/${id}`, req);
        return res.data;
    },

    deleteAcademicYear: async (id: string): Promise<void> => {
        await api.delete(`/school/academic-years/${id}`);
    },

    activateAcademicYear: async (id: string): Promise<AcademicYearDto> => {
        const res = await api.post<AcademicYearDto>(`/school/academic-years/${id}/activate`);
        return res.data;
    },

    // Semester (auto-created with academic year, only update/activate/close)
    listSemesters: async (academicYearId?: string): Promise<SemesterDto[]> => {
        const params = academicYearId ? { academicYearId } : {};
        const res = await api.get<SemesterDto[]>("/school/semesters", { params });
        return res.data;
    },

    getCurrentSemester: async (): Promise<SemesterDto | null> => {
        try {
            const res = await api.get<SemesterDto>("/school/semesters/current");
            return res.data;
        } catch {
            return null;
        }
    },

    updateSemester: async (id: string, req: UpdateSemesterRequest): Promise<SemesterDto> => {
        const res = await api.put<SemesterDto>(`/school/semesters/${id}`, req);
        return res.data;
    },

    activateSemester: async (id: string): Promise<SemesterDto> => {
        const res = await api.post<SemesterDto>(`/school/semesters/${id}/activate`);
        return res.data;
    },

    closeSemester: async (id: string): Promise<SemesterDto> => {
        const res = await api.post<SemesterDto>(`/school/semesters/${id}/close`);
        return res.data;
    },
};
