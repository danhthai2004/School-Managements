import api from "./api";
import type { AuthResponse, VerifyResponse, UserDto } from "../types/auth.types";

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    return res.data;
  },

  loginWithGoogle: async (idToken: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/google", { idToken });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/forgot-password", { email });
    return res.data;
  },

  resendCode: async (challengeId: string): Promise<void> => {
    await api.post("/auth/resend-code", { challengeId });
  },

  verifyOtp: async (challengeId: string, code: string): Promise<VerifyResponse> => {
    const res = await api.post<VerifyResponse>("/auth/verify", { challengeId, code });
    return res.data;
  },

  setPassword: async (resetToken: string, newPassword: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/set-password", { resetToken, newPassword });
    return res.data;
  },

  me: async (): Promise<UserDto> => {
    const res = await api.get<UserDto>("/auth/me");
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  updateProfile: async (data: {
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    bio?: string;
  }): Promise<UserDto> => {
    const res = await api.put<UserDto>("/auth/profile", data);
    return res.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put("/auth/change-password", { currentPassword, newPassword });
  },

  logoutOtherDevices: async (): Promise<void> => {
    await api.post("/auth/logout-other-devices");
  },

};
