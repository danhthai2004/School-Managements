import api from "./api";

// ========== TYPES ==========

export type SchoolLevel = "PRIMARY" | "SECONDARY" | "HIGH_SCHOOL";

export type SchoolDto = {
  id: string;
  name: string;
  code: string;
  provinceCode: number | null;
  provinceName: string | null;
  wardCode: number | null;
  wardName: string | null;
  schoolLevel: SchoolLevel | null;
  address: string | null;
  enrollmentArea: string | null;
};

export type UserListDto = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  enabled: boolean;
  pendingDeleteAt: string | null;
};

export type SchoolDetailDto = {
  id: string;
  name: string;
  code: string;
  admins: UserListDto[];
};

export type NotificationDto = {
  id: string;
  title: string;
  message: string;
  scope: "ALL" | "SCHOOL" | "ROLE";
  targetSchoolId: string | null;
  targetSchoolName: string | null;
  targetRole: string | null;
  createdByEmail: string;
  createdAt: string;
};

export type ActivityLogDto = {
  id: string;
  action: string;
  performedByEmail: string | null;
  targetUserId: string | null;
  details: string | null;
  createdAt: string;
};

export type CreateSchoolRequest = {
  schoolName: string;
  provinceCode: number;
  address?: string;
};

export type CreateSchoolAdminRequest = {
  email: string;
  fullName: string;
  role: "SCHOOL_ADMIN";
  schoolId: string;
};

export type CreateSchoolAdminForSchoolRequest = {
  email: string;
  fullName: string;
};

export type UpdateSchoolRequest = {
  wardCode?: number;
  address?: string;
  name?: string;
  code?: string;
};

export type ProvinceDto = {
  code: number;
  name: string;
  codename: string;
};

export type SchoolRegistryDto = {
  code: string;
  name: string;
  provinceCode: number;
  schoolLevel: SchoolLevel;
  enrollmentArea: string;
};

export type CreateNotificationRequest = {
  title: string;
  message: string;
  scope: "ALL" | "SCHOOL" | "ROLE";
  targetSchoolId?: string;
  targetRole?: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

// ========== SERVICE ==========

export const systemService = {
  // Schools
  listSchools: async (): Promise<SchoolDto[]> => {
    const res = await api.get<SchoolDto[]>("/system/schools");
    return res.data;
  },

  createSchool: async (req: CreateSchoolRequest): Promise<SchoolDto> => {
    const res = await api.post<SchoolDto>("/system/schools", req);
    return res.data;
  },

  getSchool: async (id: string): Promise<SchoolDetailDto> => {
    const res = await api.get<SchoolDetailDto>(`/system/schools/${id}`);
    return res.data;
  },

  updateSchool: async (id: string, req: UpdateSchoolRequest): Promise<SchoolDto> => {
    const res = await api.put<SchoolDto>(`/system/schools/${id}`, req);
    return res.data;
  },

  createSchoolAdminForSchool: async (schoolId: string, req: CreateSchoolAdminForSchoolRequest): Promise<void> => {
    await api.post(`/system/schools/${schoolId}/admins`, req);
  },

  // Legacy school admin endpoint
  createSchoolAdmin: async (req: CreateSchoolAdminRequest): Promise<void> => {
    await api.post("/system/school-admins", req);
  },

  // Users
  listUsers: async (params?: {
    role?: string;
    schoolId?: string;
    enabled?: boolean;
    pendingDelete?: boolean;
  }): Promise<UserListDto[]> => {
    const res = await api.get<UserListDto[]>("/system/users", { params });
    return res.data;
  },

  listPendingDeleteUsers: async (): Promise<UserListDto[]> => {
    const res = await api.get<UserListDto[]>("/system/users/pending");
    return res.data;
  },

  enableUser: async (id: string): Promise<void> => {
    await api.put(`/system/users/${id}/enable`);
  },

  disableUser: async (id: string): Promise<void> => {
    await api.put(`/system/users/${id}/disable`);
  },

  markPendingDelete: async (id: string): Promise<void> => {
    await api.delete(`/system/users/${id}`);
  },

  permanentDeleteUser: async (id: string): Promise<void> => {
    await api.delete(`/system/users/${id}/permanent`);
  },

  restoreUser: async (id: string): Promise<void> => {
    await api.put(`/system/users/${id}/restore`);
  },

  // Notifications
  listNotifications: async (): Promise<NotificationDto[]> => {
    const res = await api.get<NotificationDto[]>("/system/notifications");
    return res.data;
  },

  createNotification: async (req: CreateNotificationRequest): Promise<NotificationDto> => {
    const res = await api.post<NotificationDto>("/system/notifications", req);
    return res.data;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/system/notifications/${id}`);
  },

  // Activity Logs
  listActivityLogs: async (page = 0, size = 20): Promise<PageResponse<ActivityLogDto>> => {
    const res = await api.get<PageResponse<ActivityLogDto>>("/system/activity-logs", {
      params: { page, size },
    });
    return res.data;
  },

  // Locations
  getProvinces: async (): Promise<ProvinceDto[]> => {
    const res = await api.get<ProvinceDto[]>("/v1/locations/provinces");
    return res.data;
  },

  getSchoolRegistry: async (provinceCode: number, level?: SchoolLevel): Promise<SchoolRegistryDto[]> => {
    const res = await api.get<SchoolRegistryDto[]>("/v1/locations/schools/registry", {
      params: { provinceCode, level },
    });
    return res.data;
  },
};
