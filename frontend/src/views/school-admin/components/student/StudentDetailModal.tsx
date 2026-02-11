import { createPortal } from "react-dom";
import { type StudentDto } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { StatusBadge } from "../../../../components/common";
import { formatDate } from "../../../../utils/dateHelpers";

interface StudentDetailModalProps {
    isOpen: boolean;
    student: StudentDto | null;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function StudentDetailModal({ isOpen, student, onClose, onEdit, onDelete }: StudentDetailModalProps) {
    if (!isOpen || !student) return null;

    const genderText = student.gender === 'MALE' ? 'Nam' : student.gender === 'FEMALE' ? 'Nữ' : student.gender === 'OTHER' ? 'Khác' : '—';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[100]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex-none z-[110]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Thông tin chi tiết học sinh</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Avatar and basic info */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                student.fullName?.charAt(0)?.toUpperCase() || 'H'
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{student.fullName}</h3>
                            <p className="text-blue-600 font-medium">{student.studentCode}</p>
                            <StatusBadge status={student.status || 'ACTIVE'} className="mt-1" />
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                            Thông tin cá nhân
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-500">Giới tính</span>
                                <p className="text-sm font-medium text-gray-900">{genderText}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Ngày sinh</span>
                                <p className="text-sm font-medium text-gray-900">{formatDate(student.dateOfBirth)}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Nơi sinh</span>
                                <p className="text-sm font-medium text-gray-900">{student.birthPlace || '—'}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs text-gray-500">Địa chỉ</span>
                                <p className="text-sm font-medium text-gray-900">{student.address || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                            Thông tin liên hệ
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-500">Email</span>
                                <p className="text-sm font-medium text-gray-900">{student.email || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Số điện thoại</span>
                                <p className="text-sm font-medium text-gray-900">{student.phone || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                            Thông tin học tập
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-500">Lớp hiện tại</span>
                                <p className="text-sm font-medium text-gray-900">{student.currentClassName || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Ngày nhập học</span>
                                <p className="text-sm font-medium text-gray-900">{formatDate(student.enrollmentDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Guardians Information */}
                    {student.guardians && student.guardians.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                                Người giám hộ
                            </h4>
                            <div className="space-y-3">
                                {student.guardians.map((guardian, index) => (
                                    <div key={guardian.id || index} className="bg-gray-50 rounded-lg p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-xs text-gray-500">Họ tên</span>
                                                <p className="text-sm font-medium text-gray-900">{guardian.fullName}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500">Quan hệ</span>
                                                <p className="text-sm font-medium text-gray-900">{guardian.relationship || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500">Số điện thoại</span>
                                                <p className="text-sm font-medium text-gray-900">{guardian.phone || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500">Email</span>
                                                <p className="text-sm font-medium text-gray-900">{guardian.email || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-4 flex gap-3">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-medium hover:bg-blue-100 transition-all"
                            >
                                Chỉnh sửa
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium hover:bg-red-100 transition-all"
                            >
                                Xóa
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-all"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default StudentDetailModal;
