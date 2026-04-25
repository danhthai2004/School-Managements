import { AlertCircle, CheckCircle2, Play, Trash2, Loader2 } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'success' | 'warning';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    variant = 'primary',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    // Configuration based on variant
    const variants = {
        primary: {
            circleBg: "bg-blue-100",
            iconColor: "text-blue-600",
            icon: Play,
            confirmBtn: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
            box: "bg-blue-50 border-blue-100 text-blue-900"
        },
        danger: {
            circleBg: "bg-red-100",
            iconColor: "text-red-600",
            icon: Trash2,
            confirmBtn: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
            box: "bg-red-50 border-red-100 text-red-900"
        },
        success: {
            circleBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            icon: CheckCircle2,
            confirmBtn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
            box: "bg-emerald-50 border-emerald-100 text-emerald-900"
        },
        warning: {
            circleBg: "bg-amber-100",
            iconColor: "text-amber-600",
            icon: AlertCircle,
            confirmBtn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
            box: "bg-amber-50 border-amber-100 text-amber-900"
        }
    };

    const config = variants[variant];
    const Icon = config.icon;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
                <div className={`w-16 h-16 ${isLoading ? 'bg-blue-50' : config.circleBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {isLoading ? (
                        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                        <Icon className={`w-8 h-8 ${config.iconColor}`} />
                    )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-6">{isLoading ? 'Đang Xử Lý...' : title}</h3>

                <div className={`p-4 ${isLoading ? 'bg-slate-50 border-slate-100 text-slate-600' : config.box} rounded-xl border flex gap-3 text-left mb-6 transition-all duration-300`}>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center w-full py-2 gap-3 text-center">
                            <p className="text-sm font-medium animate-pulse">Vui lòng đợi trong giây lát</p>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full w-1/3 rounded-full animate-progress-indeterminate" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
                            <div className="text-sm leading-relaxed">
                                {message}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3">
                    {!isLoading && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-all text-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 rounded-xl ${isLoading ? 'bg-blue-600/10 text-blue-600' : config.confirmBtn + ' text-white'} font-semibold transition-all flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang xử lý...</span>
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
