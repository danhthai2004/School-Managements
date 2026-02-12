import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface BatchDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<any>;
    title: string;
    message: string;
    itemCount: number;
    itemName: string;
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemCount,
    itemName
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [result, setResult] = useState<{ deleted: number; failed: number; errors: string[] } | null>(null);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            const res = await onConfirm();
            setResult(res);
        } catch (error) {
            console.error(error);
            setResult({ deleted: 0, failed: itemCount, errors: ["Lỗi không xác định"] });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (result) {
            // Reset state when closing after success
            setResult(null);
            setIsDeleting(false);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        {result ? 'Kết quả xóa' : title}
                    </h3>
                    {!isDeleting && (
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {!result ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-red-900">
                                        Hành động này không thể hoàn tác!
                                    </p>
                                    <p className="text-sm text-red-700">
                                        Bạn đang chuẩn bị xóa <strong>{itemCount} {itemName}</strong>.
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="flex-1 text-center">
                                    <p className="text-sm text-gray-500">Đã xóa</p>
                                    <p className="text-2xl font-bold text-emerald-600">{result.deleted}</p>
                                </div>
                                <div className="w-px h-10 bg-gray-200" />
                                <div className="flex-1 text-center">
                                    <p className="text-sm text-gray-500">Thất bại</p>
                                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                                </div>
                            </div>

                            {result.failed > 0 && result.errors.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Chi tiết lỗi:</p>
                                    <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs text-red-600 space-y-1 border border-gray-100">
                                        {result.errors.map((err, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <span>•</span>
                                                <span>{err}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.deleted > 0 && result.failed === 0 && (
                                <div className="flex flex-col items-center justify-center py-4 text-emerald-600">
                                    <CheckCircle className="w-12 h-12 mb-2" />
                                    <p className="font-medium">Xóa thành công!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    {!result ? (
                        <>
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Xóa {itemCount} mục
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BatchDeleteModal;
