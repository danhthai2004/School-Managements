import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import SuccessToast from '../components/common/SuccessToast';

interface ToastOptions {
    message: string;
    subtitle?: string;
    autoCloseMs?: number;
}

interface ToastContextType {
    showSuccess: (options: ToastOptions | string) => void;
    showError: (options: ToastOptions | string) => void;
    hideToast: () => void;
    toast: {
        success: (options: ToastOptions | string) => void;
        error: (options: ToastOptions | string) => void;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [subtitle, setSubtitle] = useState<string | undefined>(undefined);
    const [autoCloseMs, setAutoCloseMs] = useState(3000);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const showSuccess = useCallback((options: ToastOptions | string) => {
        if (typeof options === 'string') {
            setMessage(options);
            setSubtitle(undefined);
            setAutoCloseMs(3000);
        } else {
            setMessage(options.message);
            setSubtitle(options.subtitle);
            setAutoCloseMs(options.autoCloseMs ?? 3000);
        }
        setToastType('success');
        setIsOpen(true);
    }, []);

    const showError = useCallback((options: ToastOptions | string) => {
        if (typeof options === 'string') {
            setMessage(options);
            setSubtitle(undefined);
            setAutoCloseMs(3000);
        } else {
            setMessage(options.message);
            setSubtitle(options.subtitle);
            setAutoCloseMs(options.autoCloseMs ?? 3000);
        }
        setToastType('error');
        setIsOpen(true);
    }, []);

    const hideToast = useCallback(() => {
        setIsOpen(false);
    }, []);

    const toast = React.useMemo(() => ({
        success: showSuccess,
        error: showError
    }), [showSuccess, showError]);

    return (
        <ToastContext.Provider value={{
            showSuccess,
            showError,
            hideToast,
            toast
        }}>
            {children}
            <SuccessToast
                isOpen={isOpen}
                onClose={hideToast}
                message={message}
                subtitle={subtitle}
                autoCloseMs={autoCloseMs}
                type={toastType}
            />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
