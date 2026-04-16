import React from "react";
import { createPortal } from "react-dom";
import { type ImportTeacherResult } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { RefreshCcw } from "lucide-react";

interface ImportTeacherResultModalProps {
    result: ImportTeacherResult | null;
    onClose: () => void;
    onRetry?: () => void;
}

const ImportTeacherResultModal: React.FC<ImportTeacherResultModalProps> = ({ result, onClose, onRetry }) => {
    if (!result) return null;

    const hasErrors = result.failedCount > 0;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[110]">
                {/* Header */}
                <div className={`px-6 py-4 flex-none ${hasErrors ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Kết quả Import giáo viên</h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-2xl font-bold text-slate-700">{result.totalRows}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tổng số dòng</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="text-2xl font-bold text-emerald-600">{result.successCount}</div>
                            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mt-1">Thành công</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="text-2xl font-bold text-red-600">{result.failedCount}</div>
                            <div className="text-xs font-medium text-red-600 uppercase tracking-wider mt-1">Thất bại</div>
                        </div>
                    </div>

                    {/* Error Details */}
                    {result.errors && result.errors.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-700">Chi tiết các dòng lỗi:</p>
                            <div className="max-h-60 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="p-3 text-sm flex gap-3">
                                        <div className="font-bold text-red-600 shrink-0">Dòng {err.rowNumber}</div>
                                        <div className="text-slate-700">
                                            {err.teacherName && <span className="font-semibold">{err.teacherName}: </span>}
                                            {err.errorMessage}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={onRetry}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Import lại
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportTeacherResultModal;
