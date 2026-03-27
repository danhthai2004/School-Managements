import { Trash2, AlertCircle } from "lucide-react";
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
                        <Trash2 className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Xóa lớp học</h3>
                    
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 text-left mb-6">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-red-900">
                                Bạn có chắc muốn xóa lớp <span className="font-bold text-gray-900">"{classData.name}"</span>?
                            </p>
                            <p className="text-xs text-red-700 leading-relaxed">
                                Hành động này KHÔNG THỂ hoàn tác. Hệ thống sẽ ngăn chặn nếu đã có dữ liệu Điểm hoặc Học sinh.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-sm text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-semibold hover:shadow-lg hover:shadow-red-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xóa...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>Xác nhận xóa</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default DeleteConfirmModal;
