import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in p-6"
            >
                {!result ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 text-left mb-6">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-red-900">
                                    Hành động này không thể hoàn tác!
                                </p>
                                <p className="text-sm text-red-700">
                                    Bạn đang chuẩn bị xóa <strong className="text-gray-900">{itemCount} {itemName}</strong>.{' '}
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xóa...</span>
                                    </>
                                ) : (
                                    <span>Xóa</span>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            {result.deleted > 0 && result.failed === 0 ? (
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Kết quả xóa</h3>
                            <p className="text-sm text-gray-500">Chi tiết quá trình xử lý</p>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex-1 text-center">
                                <p className="text-sm text-gray-500 mb-1">Đã xóa</p>
                                <p className="text-2xl font-bold text-emerald-600">{result.deleted}</p>
                            </div>
                            <div className="w-px h-10 bg-gray-200" />
                            <div className="flex-1 text-center">
                                <p className="text-sm text-gray-500 mb-1">Thất bại</p>
                                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                            </div>
                        </div>

                        {result.failed > 0 && result.errors.length > 0 && (
                            <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-left">
                                <p className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Chi tiết lỗi:
                                </p>
                                <div className="max-h-32 overflow-y-auto text-xs text-red-600 space-y-1 pr-2 custom-scrollbar">
                                    {result.errors.map((err, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <span className="mt-0.5">•</span>
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10"
                        >
                            Đóng
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default BatchDeleteModal;
