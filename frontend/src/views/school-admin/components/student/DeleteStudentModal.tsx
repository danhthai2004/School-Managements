import { useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type StudentDto } from "../../../../services/schoolAdminService";

interface DeleteStudentModalProps {
    isOpen: boolean;
    student: StudentDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function DeleteStudentModal({ isOpen, student, onClose, onSuccess }: DeleteStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

    // Reset confirmation when modal opens
    if (!isOpen && isConfirmed) setIsConfirmed(false);

    const handleDelete = async () => {
        if (!student) return;
        setLoading(true);
        setError(null);

        try {
            const result = await schoolAdminService.bulkDeleteStudents([student.id]);
            if (result.successCount > 0) {
                onSuccess();
                onClose();
            } else if (result.failedCount > 0 && result.results.length > 0) {
                setError(result.results[0]?.message || "Không thể xóa học sinh.");
            } else {
                setError("Không thể xóa học sinh. Vui lòng thử lại.");
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !student) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa học sinh?</h3>
                    <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa học sinh <span className="font-semibold text-gray-900">{student.fullName}</span>? Hành động này không thể hoàn tác.</p>
                    {student.hasAccount && (
                        <div className="mb-4 text-left bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800 mb-2 font-medium">Cảnh báo: Học sinh này đang có tài khoản hệ thống.</p>
                            <div className="flex items-start gap-2 cursor-pointer" onClick={() => setIsConfirmed(!isConfirmed)}>
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isConfirmed ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                                    {isConfirmed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <label className="text-sm text-gray-700 cursor-pointer select-none">
                                    Tôi xác nhận xóa hồ sơ và tài khoản của học sinh này
                                </label>
                            </div>
                        </div>
                    )}

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button
                            onClick={handleDelete}
                            disabled={loading || (student.hasAccount && !isConfirmed)}
                            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Đang xóa..." : "Xóa"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default DeleteStudentModal;
