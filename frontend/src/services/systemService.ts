import api from "./api";

export type SchoolDto = {
  id: string;
  name: string;
  code: string;
};

export type CreateSchoolRequest = {
  name: string;
  code: string;
};

export type CreateSchoolAdminRequest = {
  email: string;
  fullName: string;
  role: "SCHOOL_ADMIN";
  schoolId: string;
};

export const systemService = {
  listSchools: async (): Promise<SchoolDto[]> => {
    const res = await api.get<SchoolDto[]>("/system/schools");
    return res.data;
  },

  createSchool: async (req: CreateSchoolRequest): Promise<SchoolDto> => {
    const res = await api.post<SchoolDto>("/system/schools", req);
    return res.data;
  },

  createSchoolAdmin: async (req: CreateSchoolAdminRequest): Promise<void> => {
    await api.post("/system/school-admins", req);
  },
};
