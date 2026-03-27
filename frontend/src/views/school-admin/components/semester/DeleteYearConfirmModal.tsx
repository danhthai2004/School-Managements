import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertCircle } from 'lucide-react';
import type { AcademicYearDto } from '../../../../services/semesterService';

interface DeleteYearConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    year: AcademicYearDto | null;
}

const DeleteYearConfirmModal: React.FC<DeleteYearConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    year
}) => {
    if (!isOpen || !year) return null;

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
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Xóa năm học</h3>
                    
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 text-left mb-6">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-red-900">
                                Bạn có chắc chắn muốn xóa <span className="font-bold text-gray-900">"{year.name}"</span>?
                            </p>
                            <p className="text-xs text-red-700 leading-relaxed">
                                Hành động này KHÔNG THỂ hoàn tác. Toàn bộ Học kỳ thuộc năm này sẽ bị xóa.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xác nhận xóa
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteYearConfirmModal;
