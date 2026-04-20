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
  pendingDeleteAt: string | null;
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
  provinceCode: number | null;
  provinceName: string | null;
  wardCode: number | null;
  wardName: string | null;
  enrollmentArea: string | null;
  address: string | null;
  admins: UserListDto[];
  pendingDeleteAt: string | null;
};

export type NotificationDto = {
  id: string;
  title: string;
  content: string;
  type: string;
  targetGroup: string;
  referenceId: string | null;
  actionUrl: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  isRead: boolean;
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
  schoolCode: string;
  provinceCode: number;
  wardCode?: number;
  enrollmentArea?: string;
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
  name?: string;
  code?: string;
  provinceCode?: number;
  wardCode?: number;
  enrollmentArea?: string;
  address?: string;
};

export type ProvinceDto = {
  code: number;
  name: string;
  codename: string;
};

export type WardDto = {
  code: number;
  name: string;
  provinceCode: number;
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
  content: string;
  type: string;
  targetGroup: string;
  referenceId?: string;
  actionUrl?: string;
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
  listSchools: async (page = 0, size = 20): Promise<PageResponse<SchoolDto>> => {
    const res = await api.get<PageResponse<SchoolDto>>("/system/schools", {
      params: { page, size },
    });
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

  deleteSchool: async (id: string): Promise<void> => {
    await api.delete(`/system/schools/${id}`);
  },

  listPendingDeleteSchools: async (page = 0, size = 20): Promise<PageResponse<SchoolDto>> => {
    const res = await api.get<PageResponse<SchoolDto>>("/system/schools/pending", {
      params: { page, size },
    });
    return res.data;
  },

  restoreSchool: async (id: string): Promise<void> => {
    await api.post(`/system/schools/${id}/restore`);
  },

  permanentDeleteSchool: async (id: string): Promise<void> => {
    await api.delete(`/system/schools/${id}/permanent`);
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
    page?: number;
    size?: number;
  }): Promise<PageResponse<UserListDto>> => {
    const res = await api.get<PageResponse<UserListDto>>("/system/users", { params });
    return res.data;
  },

  listPendingDeleteUsers: async (page = 0, size = 20): Promise<PageResponse<UserListDto>> => {
    const res = await api.get<PageResponse<UserListDto>>("/system/users/pending", {
      params: { page, size }
    });
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
    const res = await api.get<PageResponse<NotificationDto>>("/system/notifications");
    return res.data.content || [];
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

  getWardsByProvince: async (provinceCode: number): Promise<WardDto[]> => {
    const res = await api.get<WardDto[]>(`/v1/locations/provinces/${provinceCode}/wards`);
    return res.data;
  },

  getSchoolRegistry: async (provinceCode: number, level?: SchoolLevel): Promise<SchoolRegistryDto[]> => {
    const res = await api.get<SchoolRegistryDto[]>("/v1/locations/schools/registry", {
      params: { provinceCode, level },
    });
    return res.data;
  },
};
