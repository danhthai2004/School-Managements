import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import type { AuthResponse, UserDto } from "../types/auth.types";
import { useFirebaseMessaging } from "../hooks/useFirebaseMessaging";

type PendingChallenge = {
  challengeId: string;
  emailMasked?: string | null;
  authStatus?: string;
};

type AuthContextValue = {
  user: UserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<AuthResponse>;
  setPendingChallenge: (c: PendingChallenge | null) => void;
  getPendingChallenge: () => PendingChallenge | null;
  setResetToken: (token: string | null) => void;
  getResetToken: () => string | null;
  finalizePassword: (newPassword: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PENDING_KEY = "pendingChallenge";
const RESET_KEY = "resetToken";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Cloud Messaging — auto-register token when logged in
  const { removeToken: removeFcmToken } = useFirebaseMessaging();

  const refreshMe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      return;
    }
    const me = await authService.me();
    setUser(me);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        localStorage.removeItem("accessToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setPendingChallenge = (c: PendingChallenge | null) => {
    if (!c) {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(c));
  };

  const getPendingChallenge = (): PendingChallenge | null => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingChallenge;
    } catch {
      return null;
    }
  };

  const setResetToken = (token: string | null) => {
    if (!token) {
      sessionStorage.removeItem(RESET_KEY);
      return;
    }
    sessionStorage.setItem(RESET_KEY, token);
  };

  const getResetToken = () => sessionStorage.getItem(RESET_KEY);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    if (res.status === "AUTHENTICATED" && res.token) {
      localStorage.setItem("accessToken", res.token);
      await refreshMe();
    }
    if (res.status === "OTP_REQUIRED" && res.challengeId) {
      setPendingChallenge({ challengeId: res.challengeId, emailMasked: res.emailMasked, authStatus: res.status });
    }
    return res;
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await authService.loginWithGoogle(idToken);
    if (res.status === "AUTHENTICATED" && res.token) {
      localStorage.setItem("accessToken", res.token);
      await refreshMe();
    }
    if (res.status === "OTP_REQUIRED" && res.challengeId) {
      setPendingChallenge({ challengeId: res.challengeId, emailMasked: res.emailMasked, authStatus: res.status });
    }
    return res;
  };

  const forgotPassword = async (email: string) => {
    const res = await authService.forgotPassword(email);
    if (res.status === "OTP_REQUIRED" && res.challengeId) {
      setPendingChallenge({ challengeId: res.challengeId, emailMasked: res.emailMasked, authStatus: res.status });
    }
    return res;
  };

  const finalizePassword = async (newPassword: string) => {
    const resetToken = getResetToken();
    if (!resetToken) {
      throw new Error("Missing reset token");
    }
    const res = await authService.setPassword(resetToken, newPassword);
    if (res.status === "AUTHENTICATED" && res.token) {
      localStorage.setItem("accessToken", res.token);
      setResetToken(null);
      setPendingChallenge(null);
      await refreshMe();
    }
    return res;
  };

  const logout = async () => {
    try {
      // Remove FCM token from backend before logout
      await removeFcmToken();
    } catch {
      // ignore FCM cleanup errors
    }
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem(RESET_KEY);
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      forgotPassword,
      setPendingChallenge,
      getPendingChallenge,
      setResetToken,
      getResetToken,
      finalizePassword,
      logout,
      refreshMe,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
