import { useEffect, useRef, useCallback } from "react";
import { requestFCMToken, onForegroundMessage } from "../firebase";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

/**
 * Hook to manage Firebase Cloud Messaging.
 * 
 * - On mount: requests notification permission, gets FCM token, saves to backend.
 * - On foreground message: shows toast notification.
 * - Exposes `removeToken()` for logout cleanup.
 */
export function useFirebaseMessaging() {
    const tokenRef = useRef<string | null>(null);

    const getAuthToken = () => localStorage.getItem("accessToken");

    /**
     * Save FCM token to backend.
     */
    const saveTokenToBackend = useCallback(async (fcmToken: string) => {
        try {
            const authToken = getAuthToken();
            if (!authToken) return;

            await fetch(`${API_BASE}/v1/notifications/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    fcmToken,
                    deviceType: "WEB",
                }),
            });
        } catch (error) {
            console.error("Failed to save FCM token:", error);
        }
    }, []);

    /**
     * Remove FCM token from backend (call on logout).
     */
    const removeToken = useCallback(async () => {
        const fcmToken = tokenRef.current;
        if (!fcmToken) return;

        try {
            const authToken = getAuthToken();
            if (!authToken) return;

            await fetch(`${API_BASE}/v1/notifications/token?fcmToken=${encodeURIComponent(fcmToken)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${authToken}` },
            });

            tokenRef.current = null;
        } catch (error) {
            console.error("Failed to remove FCM token:", error);
        }
    }, []);

    useEffect(() => {
        if (!VAPID_KEY) {
            // Push notifications disabled when no VAPID_KEY is provided
            return;
        }

        let mounted = true;

        const init = async () => {
            const fcmToken = await requestFCMToken(VAPID_KEY);
            if (!mounted || !fcmToken) return;

            tokenRef.current = fcmToken;
            await saveTokenToBackend(fcmToken);

            // Listen for foreground messages
            onForegroundMessage((payload: Record<string, unknown>) => {
                const notification = payload?.notification as Record<string, string> | undefined;
                const data = payload?.data as Record<string, string> | undefined;
                const title = notification?.title || data?.title || "Thông báo mới";
                const body = notification?.body || data?.body || "";

                toast(`🔔 ${title}${body ? `: ${body}` : ""}`, { duration: 6000 });
            });
        };

        init();

        return () => {
            mounted = false;
        };
    }, [saveTokenToBackend]);

    return { removeToken };
}
