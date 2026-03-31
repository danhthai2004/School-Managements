import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface SuccessToastProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
    /** Optional subtitle text below the message */
    subtitle?: string;
    /** Auto-close delay in ms, default 3000. Set to 0 to disable auto-close. */
    autoCloseMs?: number;
    type?: 'success' | 'error';
}

function SuccessToast({ isOpen, onClose, message, subtitle, autoCloseMs = 3000, type = 'success' }: SuccessToastProps) {
    useEffect(() => {
        if (isOpen && autoCloseMs > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseMs);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose, autoCloseMs]);

    if (!isOpen) return null;

    const isError = type === 'error';

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className={`${isError ? 'bg-red-500' : 'bg-emerald-500'} px-6 py-4`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{isError ? 'Thông báo lỗi' : 'Thao tác thành công'}</h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                {/* Body */}
                <div className="p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 ${isError ? 'bg-red-100' : 'bg-emerald-100'} rounded-full flex items-center justify-center mb-4`}>
                            {isError ? (
                                <XCircle className="w-9 h-9 text-red-600" />
                            ) : (
                                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                            )}
                        </div>
                        <p className="text-base font-semibold text-gray-800 mb-1">{message}</p>
                        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
                    </div>
                    {/* Progress bar */}
                    {autoCloseMs > 0 && (
                        <div className="mt-5 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${isError ? 'bg-red-500' : 'bg-emerald-500'} rounded-full`}
                                style={{ animation: `successToastShrink ${autoCloseMs}ms linear forwards` }}
                            />
                        </div>
                    )}
                    <style>{`@keyframes successToastShrink { from { width: 100%; } to { width: 0%; } }`}</style>
                    <button
                        onClick={onClose}
                        className="w-full mt-4 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default SuccessToast;
