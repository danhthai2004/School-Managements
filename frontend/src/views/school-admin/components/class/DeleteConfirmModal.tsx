import { useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type ClassRoomDto } from "../../../../services/schoolAdminService";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    classData: ClassRoomDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function DeleteConfirmModal({ isOpen, classData, onClose, onSuccess }: DeleteConfirmModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!classData) return;
        setLoading(true);
        setError(null);

        try {
            await schoolAdminService.deleteClass(classData.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể xóa lớp học.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !classData) return null;

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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa lớp học?</h3>
                    <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa lớp <span className="font-semibold text-gray-900">{classData.name}</span>? Hành động này không thể hoàn tác.</p>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
                            {loading ? "Đang xóa..." : "Xóa"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default DeleteConfirmModal;
