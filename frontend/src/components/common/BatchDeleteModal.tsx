import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Check, Loader2, X } from 'lucide-react';

interface BatchDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<any>;
    title: string;
    message: string;
    itemCount: number;
    itemName: string;
    confirmLabel?: string; // New prop for explicit confirmation checkbox
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemCount,
    itemName,
    confirmLabel
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [result, setResult] = useState<{ deleted: number; failed: number; errors: string[] } | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false); // State for checkbox

    // Reset checkbox when opening/closing
    React.useEffect(() => {
        if (isOpen) setIsConfirmed(false);
    }, [isOpen]);

    const handleConfirm = async () => {
        if (confirmLabel && !isConfirmed) return; // Prevent if not confirmed
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

            {!result ? (
                /* Confirmation Modal (Classic Style) */
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 p-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-rose-600" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>

                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3 text-left mb-6">
                            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-rose-900">
                                    Hành động không thể hoàn tác!
                                </p>
                                <p className="text-[13px] text-rose-700 leading-relaxed">
                                    Bạn đang chuẩn bị xóa <strong className="text-slate-900">{itemCount} {itemName}</strong>.{' '}
                                    {message}
                                </p>
                            </div>
                        </div>

                        {/* Simple Confirmation Checkbox */}
                        {confirmLabel && (
                            <div className="mb-6 flex items-start gap-3 text-left p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setIsConfirmed(!isConfirmed)}>
                                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isConfirmed ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                    {isConfirmed && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <label className="text-xs font-semibold text-slate-600 cursor-pointer select-none flex-1 py-0.5">
                                    {confirmLabel}
                                </label>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all disabled:opacity-50 text-sm"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isDeleting || (!!confirmLabel && !isConfirmed)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-100"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xóa...</span>
                                    </>
                                ) : (
                                    <span>Xác nhận</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Result Modal (Standarized with Import) */
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col z-[110] max-h-[90vh] animate-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className={`px-6 py-5 flex-none ${result.failed > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white tracking-tight">{title} - Kết quả</h3>
                            <button onClick={handleClose} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            <div className="text-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="text-2xl font-extrabold text-slate-800">{result.deleted + result.failed}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tổng số</div>
                            </div>
                            <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 shadow-sm">
                                <div className="text-2xl font-extrabold text-emerald-600">{result.deleted}</div>
                                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Thành công</div>
                            </div>
                            <div className="text-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/80 shadow-sm">
                                <div className="text-2xl font-extrabold text-rose-600">{result.failed}</div>
                                <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">Thất bại</div>
                            </div>
                        </div>

                        {/* Error Details */}
                        {result.failed > 0 && result.errors.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                                    <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                                    Chi tiết các trường hợp lỗi:
                                </p>
                                <div className="max-h-60 overflow-y-auto bg-slate-50/50 border border-slate-200/60 rounded-2xl divide-y divide-slate-100 custom-scrollbar shadow-sm">
                                    {result.errors.map((err, idx) => {
                                        // Detect "Label [Name]: Message" pattern to bold the name
                                        const colonIndex = err.indexOf(':');
                                        const namePart = colonIndex !== -1 ? err.substring(0, colonIndex + 1) : '';
                                        const messagePart = colonIndex !== -1 ? err.substring(colonIndex + 1) : err;

                                        return (
                                            <div key={idx} className="p-3.5 text-sm flex gap-3 hover:bg-white transition-colors group">
                                                <div className="font-bold text-rose-600 shrink-0 bg-rose-50 px-2.5 py-1 rounded-lg h-fit text-xs">Mục {idx + 1}</div>
                                                <div className="text-slate-600 leading-relaxed py-0.5">
                                                    {namePart && <span className="font-black text-slate-800">{namePart}</span>}
                                                    {messagePart}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {result.failed === 0 && (
                            <div className="py-4 px-6 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100/60 mt-2 animate-in fade-in zoom-in duration-300 shadow-sm border-dashed">
                                <p className="text-emerald-800 font-bold text-base">Hoàn tất xử lý</p>
                                <p className="text-emerald-600 text-sm mt-1 font-medium italic">Tất cả dữ liệu đã được giải quyết thành công!</p>
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                onClick={handleClose}
                                className="w-full px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm shadow-sm"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default BatchDeleteModal;
