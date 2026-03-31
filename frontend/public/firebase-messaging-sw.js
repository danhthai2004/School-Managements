/**
 * Firebase Messaging Service Worker
 * 
 * Handles background push notifications when the app is not in focus.
 * This file MUST be in the public/ directory to be served at the root.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// These values will be replaced with actual config from your Firebase project
firebase.initializeApp({
    apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
    authDomain: self.__FIREBASE_CONFIG__?.authDomain || '',
    projectId: self.__FIREBASE_CONFIG__?.projectId || '',
    storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || '',
    messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
    appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

/**
 * Handle background messages (when app is not in focus).
 * The browser will automatically show a notification using the 'notification' field
 * from the FCM payload. This handler is for any custom logic on 'data' messages.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    // If the payload has a notification field, the browser handles it automatically.
    // Only show a custom notification if there is no notification field (data-only message).
    if (!payload.notification && payload.data) {
        const notificationTitle = payload.data.title || 'SchoolIMS';
        const notificationOptions = {
            body: payload.data.body || payload.data.content || '',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: {
                url: payload.data.actionUrl || '/',
            },
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

/**
 * Handle notification click — open the relevant page.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Otherwise open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        })
    );
});
