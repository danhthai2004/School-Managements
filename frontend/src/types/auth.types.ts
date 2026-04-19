export type AuthStatus = "AUTHENTICATED" | "OTP_REQUIRED";


export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  schoolId?: string | null;
  schoolCode?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  bio?: string | null;
}

export interface AuthResponse {
  status: AuthStatus;
  token?: string | null;
  user?: UserDto | null;
  challengeId?: string | null;
  emailMasked?: string | null;
  message?: string | null;
}

export interface VerifyResponse {
  resetToken: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
