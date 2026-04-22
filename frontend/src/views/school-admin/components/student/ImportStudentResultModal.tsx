import React from "react";
import { createPortal } from "react-dom";
import { type ImportStudentResult } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { RefreshCcw } from "lucide-react";

interface ImportResultModalProps {
    result: ImportStudentResult | null;
    onClose: () => void;
    onRetry?: () => void;
}

const ImportStudentResultModal: React.FC<ImportResultModalProps> = ({ result, onClose, onRetry }) => {
    if (!result) return null;

    const hasErrors = result.failedCount > 0;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[110]">
                {/* Header */}
                <div className={`px-6 py-5 flex-none ${hasErrors ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white tracking-tight">Kết quả Import học sinh</h3>
                        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="text-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-2xl font-extrabold text-slate-800">{result.totalRows}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tổng dòng</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 shadow-sm">
                            <div className="text-2xl font-extrabold text-emerald-600">{result.successCount}</div>
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Thành công</div>
                        </div>
                        <div className="text-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/80 shadow-sm">
                            <div className="text-2xl font-extrabold text-rose-600">{result.failedCount}</div>
                            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">Thất bại</div>
                        </div>
                    </div>

                    {/* Auto Assignment Result */}
                    {result.assignedToClassCount > 0 && (
                        <div className="mb-8 bg-blue-50/50 border border-blue-100/80 rounded-2xl p-5 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-blue-800 font-bold text-sm leading-relaxed">
                                Đã tự động phân lớp thành công cho <span className="text-xl mx-0.5 text-blue-600">{result.assignedToClassCount}</span> học sinh mới
                            </p>
                        </div>
                    )}

                    {/* Error Details */}
                    {result.errors && result.errors.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                                <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                                Chi tiết các dòng lỗi:
                            </p>
                            <div className="max-h-60 overflow-y-auto bg-slate-50/50 border border-slate-200/60 rounded-2xl divide-y divide-slate-100 custom-scrollbar shadow-sm">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="p-3.5 text-sm flex gap-3 hover:bg-white transition-colors">
                                        <div className="font-bold text-rose-600 shrink-0 bg-rose-50 px-2.5 py-1 rounded-lg h-fit text-xs">Dòng {err.rowNumber}</div>
                                        <div className="text-slate-600 leading-relaxed py-1">
                                            {err.studentName && <span className="font-bold text-slate-800">{err.studentName}: </span>}
                                            {err.errorMessage}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Message (if no errors) */}
                    {!hasErrors && (
                        <div className="py-8 px-6 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100/60 mt-2 animate-in fade-in zoom-in duration-300 shadow-sm border-dashed">
                            <p className="text-emerald-800 font-bold text-base">Hoàn tất nhập liệu</p>
                            <p className="text-emerald-600 text-sm mt-1 font-medium italic">Hệ thống đã cập nhật tất cả học sinh thành công!</p>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={onRetry}
                            className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-100 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Tiếp tục Import
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportStudentResultModal;
