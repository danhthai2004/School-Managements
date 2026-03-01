import React from "react";
import { createPortal } from "react-dom";
import { type TeacherDto } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { TeacherStatusBadge } from "../../../../components/common";
import { formatDate } from "../../../../utils/dateHelpers";

interface TeacherDetailModalProps {
    isOpen: boolean;
    teacher: TeacherDto | null;
    onClose: () => void;
    onEdit: (teacher: TeacherDto) => void;
}

function TeacherDetailModal({ isOpen, teacher, onClose, onEdit }: TeacherDetailModalProps) {
    if (!isOpen || !teacher) return null;

    const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="py-3 border-b border-gray-100 last:border-0">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-sm text-gray-900 font-medium">{value || '—'}</div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Thông tin giáo viên</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white"><XIcon /></button>
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-2xl">
                            {teacher.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{teacher.fullName}</h3>
                            <p className="text-sm text-gray-500">Mã GV: {teacher.teacherCode}</p>
                        </div>
                        <TeacherStatusBadge status={teacher.status || 'ACTIVE'} className="ml-auto" />
                    </div>

                    <div className="grid grid-cols-2 gap-x-6">
                        <InfoRow label="Email" value={teacher.email} />
                        <InfoRow label="Điện thoại" value={teacher.phone} />
                        <InfoRow label="Ngày sinh" value={formatDate(teacher.dateOfBirth)} />
                        <InfoRow label="Giới tính" value={teacher.gender === 'MALE' ? 'Nam' : teacher.gender === 'FEMALE' ? 'Nữ' : teacher.gender} />
                        <InfoRow label="Địa chỉ" value={teacher.address} />
                        <InfoRow
                            label="Bộ môn"
                            value={teacher.subjectName || '—'}
                        />
                        <InfoRow label="Bằng cấp" value={teacher.degree} />
                        <InfoRow label="Lớp chủ nhiệm" value={teacher.homeroomClassName} />
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={() => onEdit(teacher)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Chỉnh sửa
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default TeacherDetailModal;
