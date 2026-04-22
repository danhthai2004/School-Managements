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
                <div className={`px-6 py-4 flex-none ${hasErrors ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Kết quả nhập điểm</h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Stats Grid - 3 Columns Pattern */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-2xl font-bold text-slate-700">{result.totalRows}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tổng số dòng</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="text-2xl font-bold text-emerald-600">{totalSuccess}</div>
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
                                            {err.studentCode && <span className="font-semibold">{err.studentCode}: </span>}
                                            {err.errorMessage}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Message & Preview Table */}
                    {!hasErrors && result.previewData && (
                        <div className="space-y-4">
                            <div className="py-4 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-emerald-800 font-bold text-lg">Dữ liệu hợp lệ</p>
                                <p className="text-emerald-600 text-sm mt-1">Vui lòng kiểm tra kỹ bảng điểm dưới đây trước khi Duyệt.</p>
                            </div>

                            <div className="bg-white border text-sm border-gray-200 rounded-xl overflow-x-auto max-h-[300px] custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 border-b border-gray-200 font-bold text-gray-600 text-xs uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-20">Mã HS</th>
                                            <th className="p-3 border-b border-gray-200 font-bold text-gray-600 text-xs uppercase tracking-wider whitespace-nowrap">Họ Tên</th>
                                            <th className="p-3 border-b border-gray-200 font-bold text-gray-600 text-xs uppercase tracking-wider text-center">TX / GK / CK</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {result.previewData.map(student => (
                                            <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-medium text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50">{student.studentCode}</td>
                                                <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">{student.fullName}</td>
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                        {student.grades.map((g, idx) => (
                                                            <span key={idx} className={`px-2 py-0.5 min-w-[2rem] text-center rounded text-xs font-bold leading-none
                                                                ${g.type === 'REGULAR' ? 'bg-blue-100 text-blue-700' :
                                                                    g.type === 'MID_TERM' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-rose-100 text-rose-700'}`}>
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

                    {/* Footer Buttons */}
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all uppercase text-xs tracking-widest"
                            disabled={isSaving}
                        >
                            Hủy bỏ
                        </button>

                        {hasErrors ? (
                            <button
                                onClick={onRetry}
                                className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Chọn file khác để thử lại
                            </button>
                        ) : (
                            <button
                                onClick={onConfirmSave}
                                disabled={isSaving}
                                className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-xs tracking-widest"
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
