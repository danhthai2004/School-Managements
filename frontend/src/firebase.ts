import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

/**
 * Firebase client configuration.
 * 
 * Sử dụng biến môi trường từ .env:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Init Firebase App (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Get Firebase Messaging instance.
 * Returns null if messaging is not supported (e.g., in incognito mode or unsupported browser).
 */
let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
    if (messagingInstance) return messagingInstance;

    const supported = await isSupported();
    if (!supported) {
        console.warn("Firebase Messaging is not supported in this browser.");
        return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
}

/**
 * Request notification permission and get FCM token.
 * Returns the FCM token string or null if permission denied / not supported.
 */
export async function requestFCMToken(vapidKey: string): Promise<string | null> {
    try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return null;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("Notification permission denied.");
            return null;
        }

        const token = await getToken(messaging, { vapidKey });
        return token;
    } catch (error) {
        console.error("Error getting FCM token:", error);
        return null;
    }
}

/**
 * Listen for foreground messages.
 * Calls the callback with the payload whenever a push message arrives while the app is in focus.
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
    getFirebaseMessaging().then((messaging) => {
        if (messaging) {
            onMessage(messaging, callback);
        }
    });
    // onMessage doesn't return an unsubscribe function in newer versions,
    // but we return null for consistency
    return null;
}

export { app };
