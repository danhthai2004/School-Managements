import { useEffect } from "react";
import { createPortal } from "react-dom";
import { type ImportTeacherResult } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";

interface ImportTeacherSuccessToastProps {
    result: ImportTeacherResult | null;
    onClose: () => void;
}

function ImportTeacherSuccessToast({ result, onClose }: ImportTeacherSuccessToastProps) {
    useEffect(() => {
        if (result) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [result, onClose]);

    if (!result) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className={`px-6 py-4 ${result.failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Kết quả Import</h3>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <XIcon />
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-700">{result.totalRows}</div>
                            <div className="text-xs text-slate-500">Tổng dòng</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                            <div className="text-2xl font-bold text-emerald-600">{result.successCount}</div>
                            <div className="text-xs text-emerald-600">Thành công</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{result.failedCount}</div>
                            <div className="text-xs text-red-600">Thất bại</div>
                        </div>
                    </div>

                    {result.errors && result.errors.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">Chi tiết lỗi:</p>
                            <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 text-sm">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="text-red-700 py-1 border-b border-red-100 last:border-0">
                                        <span className="font-medium">Dòng {err.rowNumber}</span>
                                        {err.teacherName && <span> ({err.teacherName})</span>}: {err.errorMessage}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-4 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ImportTeacherSuccessToast;
