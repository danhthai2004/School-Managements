import React from "react";
import { createPortal } from "react-dom";
import { X, RefreshCcw } from "lucide-react";
import type { GradeImportResult } from "../../../../services/teacherService";

interface ImportGradesResultModalProps {
    result: GradeImportResult | null;
    onClose: () => void;
    onRetry?: () => void;
    onConfirmSave?: () => void;
    isSaving?: boolean;
}

const ImportGradesResultModal: React.FC<ImportGradesResultModalProps> = ({ result, onClose, onRetry, onConfirmSave, isSaving }) => {
    if (!result) return null;

    const hasErrors = result.failedCount > 0;
    // Gộp cả Thêm mới và Cập nhật vào một con số Thành công duy nhất
    const totalSuccess = result.successCount + result.updatedCount;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[110]">
                {/* Header */}
                {/* Header */}
                <div className={`px-6 py-5 flex-none ${hasErrors ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white tracking-tight">Kết quả nhập điểm</h3>
                        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Stats Grid - Cleaner Look */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="text-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-2xl font-extrabold text-slate-800">{result.totalRows}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tổng dòng</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 shadow-sm">
                            <div className="text-2xl font-extrabold text-emerald-600">{totalSuccess}</div>
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Thành công</div>
                        </div>
                        <div className="text-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/80 shadow-sm">
                            <div className="text-2xl font-extrabold text-rose-600">{result.failedCount}</div>
                            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">Thất bại</div>
                        </div>
                    </div>

                    {/* Error Details */}
                    {result.errors && result.errors.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                                <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                                Chi tiết các dòng lỗi:
                            </p>
                            <div className="max-h-60 overflow-y-auto bg-slate-50/50 border border-slate-200/60 rounded-2xl divide-y divide-slate-100 custom-scrollbar">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="p-3.5 text-sm flex gap-3 hover:bg-white transition-colors">
                                        <div className="font-bold text-rose-600 shrink-0 bg-rose-50 px-2.5 py-1 rounded-lg h-fit text-xs">Dòng {err.rowNumber}</div>
                                        <div className="text-slate-600 leading-relaxed py-1">
                                            {err.studentCode && <span className="font-bold text-slate-800">{err.studentCode}: </span>}
                                            {err.errorMessage}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Message & Preview Table */}
                    {!hasErrors && result.previewData && (
                        <div className="space-y-5">
                            <div className="py-4 px-6 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100/60 shadow-sm">
                                <p className="text-emerald-800 font-bold text-base">Dữ liệu hợp lệ</p>
                                <p className="text-emerald-600 text-sm mt-1 font-medium">Vui lòng kiểm tra kỹ bảng điểm bên dưới trước khi duyệt.</p>
                            </div>

                            <div className="bg-white border text-sm border-slate-200/60 rounded-2xl overflow-x-auto max-h-[320px] custom-scrollbar shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3.5 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-20">Mã HS</th>
                                            <th className="p-3.5 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase tracking-wider whitespace-nowrap">Họ Tên</th>
                                            <th className="p-3.5 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">TX / GK / CK</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {result.previewData.map(student => (
                                            <tr key={student.studentId} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="p-3.5 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors font-mono text-[11px]">{student.studentCode}</td>
                                                <td className="p-3.5 font-medium text-slate-700 whitespace-nowrap">{student.fullName}</td>
                                                <td className="p-3.5 text-center">
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                        {student.grades.map((g, idx) => (
                                                            <span key={idx} className={`px-2.5 py-1 min-w-[2.2rem] text-center rounded-lg text-xs font-bold
                                                                ${g.type === 'REGULAR' ? 'bg-blue-50 text-blue-600 border border-blue-100/50' :
                                                                    g.type === 'MIDTERM' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                                                        'bg-rose-50 text-rose-600 border border-rose-100/50'}`}>
                                                                {g.value !== null ? g.value : '-'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons - Standardized with main pages */}
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm"
                            disabled={isSaving}
                        >
                            Hủy bỏ
                        </button>

                        {hasErrors ? (
                            <button
                                onClick={onRetry}
                                className="flex-[2] px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-100 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Thử lại
                            </button>
                        ) : (
                            <button
                                onClick={onConfirmSave}
                                disabled={isSaving}
                                className="flex-[2] px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Duyệt & Lưu điểm"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportGradesResultModal;
