import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Lock } from 'lucide-react';
import type { SemesterDto } from '../../../../services/semesterService';

interface CloseSemesterConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    semester: SemesterDto | null;
}

const CloseSemesterConfirmModal: React.FC<CloseSemesterConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    semester
}) => {
    if (!isOpen || !semester) return null;

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
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Chốt sổ học kỳ</h3>
                    
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-left mb-6">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900">
                                Bạn có chắc chắn muốn đóng <span className="font-bold text-gray-900">"{semester.name}"</span>?
                            </p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Hành động này sẽ KHÓA mọi hoạt động nhập điểm, điểm danh và xếp lịch. Dữ liệu sẽ trở về trạng thái chỉ đọc.
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
                            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <Lock className="w-4 h-4" />
                            Xác nhận chốt
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CloseSemesterConfirmModal;
