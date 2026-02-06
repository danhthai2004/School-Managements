import { AlertCircle, CheckCircle2, Play, Trash2 } from "lucide-react";
import React from "react";

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
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
            icon: Play, // Default for primary actions like "Generate"
            confirmBtn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200",
        },
        danger: {
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            icon: Trash2,
            confirmBtn: "bg-red-600 hover:bg-red-700 shadow-red-200",
        },
        success: {
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            icon: CheckCircle2,
            confirmBtn: "bg-green-600 hover:bg-green-700 shadow-green-200",
        },
        warning: {
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
            icon: AlertCircle,
            confirmBtn: "bg-orange-600 hover:bg-orange-700 shadow-orange-200",
        }
    };

    const config = variants[variant];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
                {/* Header Decoration */}
                <div className={`h-2 w-full ${config.confirmBtn.split(" ")[0]}`} />

                <div className="p-6 text-center">
                    <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner`}>
                        <Icon className={`w-10 h-10 ${config.iconColor}`} strokeWidth={1.5} />
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>

                    <div className="text-slate-500 mb-8 leading-relaxed">
                        {message}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${config.confirmBtn}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
