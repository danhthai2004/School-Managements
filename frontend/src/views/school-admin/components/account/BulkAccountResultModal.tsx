import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "../../SchoolAdminIcons";
import { type BulkAccountCreationResponse } from "../../../../services/schoolAdminService";

interface BulkAccountResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: BulkAccountCreationResponse | null;
    title?: string;
}

const BulkAccountResultModal: React.FC<BulkAccountResultModalProps> = ({
    isOpen,
    onClose,
    result,
    title = "Kết quả tạo tài khoản"
}) => {
    // Auto-close effect if success (similar to ImportSuccessToast)
    useEffect(() => {
        if (isOpen && result) {
            const hasErrors = result.errors && result.errors.length > 0;
            if (!hasErrors) {
                const timer = setTimeout(() => {
                    onClose();
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, result, onClose]);

    if (!isOpen || !result) return null;

    const hasErrors = result.errors && result.errors.length > 0;
    const isSuccess = !hasErrors;
    const total = result.created + result.skipped + (result.errors ? result.errors.length : 0);

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-6 py-4 ${hasErrors ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Success Icon */}
                    {isSuccess && (
                        <div className="flex flex-col items-center justify-center py-2 mb-4 text-emerald-600 animate-in zoom-in spin-in-180 duration-500">
                            <svg className="w-12 h-12 mb-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <p className="font-medium text-emerald-600">Thực hiện thành công!</p>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-700">{total}</div>
                            <div className="text-xs text-slate-500">Tổng số</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                            <div className="text-2xl font-bold text-emerald-600">{result.created}</div>
                            <div className="text-xs text-emerald-600">Thành công</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                            <div className="text-xs text-red-600">Thất bại</div>
                        </div>
                    </div>

                    {/* Skipped Note */}
                    {result.skipped > 0 && (
                        <div className="mt-2 bg-slate-50 rounded-lg p-2 text-center mb-4">
                            <p className="text-xs text-slate-500">
                                <span className="font-bold">{result.skipped}</span> tài khoản đã được bỏ qua (đã tồn tại hoặc không hợp lệ).
                            </p>
                        </div>
                    )}

                    {/* Error Details */}
                    {hasErrors && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">Chi tiết lỗi:</p>
                            <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 text-sm">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="text-red-700 py-1 border-b border-red-100 last:border-0 break-words">
                                        • {err}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer / Auto close text */}
                    <div className="mt-4 flex flex-col gap-2">
                        {isSuccess && <p className="text-xs text-center text-slate-400">Tự động đóng sau 3 giây</p>}
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkAccountResultModal;
