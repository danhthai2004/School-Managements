import { useEffect, useRef } from 'react';

interface AutoRefreshOptions {
    /** Auto-refresh interval in milliseconds. 0 or undefined means no interval */
    interval?: number;
    /** Whether auto-refresh is enabled. Default true */
    enabled?: boolean;
    /** Re-fetch when the window regains focus. Default true */
    revalidateOnFocus?: boolean;
}

export function useAutoRefresh(
    action: () => Promise<void> | void,
    options: AutoRefreshOptions = {}
) {
    const { interval = 0, enabled = true, revalidateOnFocus = true } = options;

    // Keep the latest action reference so setInterval/event listeners always call the newest closure
    const savedAction = useRef(action);
    useEffect(() => {
        savedAction.current = action;
    }, [action]);

    useEffect(() => {
        if (!enabled) return;

        // Interval background polling
        let intervalId: ReturnType<typeof setInterval>;
        if (interval > 0) {
            intervalId = setInterval(() => {
                savedAction.current();
            }, interval);
        }

        // Window Focus Refetch
        const handleFocus = () => {
            if (document.visibilityState === 'visible') {
                savedAction.current();
            }
        };

        if (revalidateOnFocus) {
            window.addEventListener('focus', handleFocus);
            // also listen to visibilitychange for modern browsers switching tabs
            document.addEventListener('visibilitychange', handleFocus);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [interval, enabled, revalidateOnFocus]);
}
