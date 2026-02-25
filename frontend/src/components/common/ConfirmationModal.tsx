import { AlertCircle, CheckCircle2, Play, Trash2 } from "lucide-react";
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
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            icon: Play,
            confirmBtn: "bg-blue-600 hover:bg-blue-700",
        },
        danger: {
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            icon: Trash2,
            confirmBtn: "bg-red-600 hover:bg-red-700",
        },
        success: {
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            icon: CheckCircle2,
            confirmBtn: "bg-green-600 hover:bg-green-700",
        },
        warning: {
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            icon: AlertCircle,
            confirmBtn: "bg-amber-600 hover:bg-amber-700",
        }
    };

    const config = variants[variant];
    const Icon = config.icon;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center">
                    <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={`w-8 h-8 ${config.iconColor}`} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

                    <div className="text-gray-600 mb-6 text-sm">
                        {message}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2 rounded-xl text-white font-medium shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${config.confirmBtn}`}
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
        </div>,
        document.body
    );
}
