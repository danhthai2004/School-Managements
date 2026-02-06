import React, { createContext, useContext, useState, useCallback } from "react";

// Toast types
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto-remove after duration
        const duration = toast.duration || 4000;
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: "success", title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: "error", title, message, duration: 6000 });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: "warning", title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: "info", title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

// Hook to use toast
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

// Icons for different toast types
const icons = {
    success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

const colorClasses = {
    success: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: "bg-green-100 text-green-600",
        title: "text-green-800",
        message: "text-green-700",
    },
    error: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "bg-red-100 text-red-600",
        title: "text-red-800",
        message: "text-red-700",
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "bg-amber-100 text-amber-600",
        title: "text-amber-800",
        message: "text-amber-700",
    },
    info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "bg-blue-100 text-blue-600",
        title: "text-blue-800",
        message: "text-blue-700",
    },
};

// Toast Item Component
const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
    const colors = colorClasses[toast.type];

    return (
        <div
            className={`animate-slide-in-right ${colors.bg} ${colors.border} border rounded-xl shadow-lg p-4 min-w-[320px] max-w-md`}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center`}>
                    {icons[toast.type]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${colors.title}`}>{toast.title}</p>
                    {toast.message && (
                        <p className={`text-sm mt-0.5 ${colors.message}`}>{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({
    toasts,
    removeToast,
}) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

export default ToastProvider;
