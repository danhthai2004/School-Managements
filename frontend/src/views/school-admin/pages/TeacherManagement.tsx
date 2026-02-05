import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    schoolAdminService,
    type TeacherDto,
    type CreateTeacherRequest
} from "../../../services/schoolAdminService";
import { PlusIcon, XIcon } from "../SchoolAdminIcons";
import { TeacherStatusBadge } from "../../../components/common";

// ==================== DATE INPUT HELPERS ====================

const formatDateInput = (value: string, isDeleting: boolean = false): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);

    if (limited.length >= 5) {
        return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }

    if (limited.length >= 3) {
        if (limited.length === 4 && !isDeleting) {
            return `${limited.slice(0, 2)}/${limited.slice(2)}/`;
        }
        return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }

    if (limited.length === 2 && !isDeleting) {
        return `${limited}/`;
    }

    return limited;
};

const parseDateDDMMYYYY = (dateStr: string): string | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;

    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
        return undefined;
    }

    return `${year}-${month}-${day}`;
};

const CustomDateInput = React.forwardRef<HTMLInputElement, {
    value?: string;
    onClick?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    rawValue?: string;
}>(({ onClick, onChange, placeholder, rawValue, ...props }, ref) => (
    <input
        {...props}
        ref={ref}
        type="text"
        value={rawValue}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={10}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
    />
));

// ==================== MODAL COMPONENT ====================

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function AddTeacherModal({ isOpen, onClose, onSuccess }: AddTeacherModalProps) {
    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [dateInputValue, setDateInputValue] = useState("");
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>("MALE");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [degree, setDegree] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [createAccount, setCreateAccount] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const data = await schoolAdminService.listSubjects();
                setSubjects(data);
            } catch (err) {
                console.error("Failed to fetch subjects");
            }
        };
        if (isOpen) fetchSubjects();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let dateOfBirthStr: string | undefined = undefined;
            if (dateOfBirth) {
                const year = dateOfBirth.getFullYear();
                const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
                const day = String(dateOfBirth.getDate()).padStart(2, '0');
                dateOfBirthStr = `${year}-${month}-${day}`;
            }

            const req: CreateTeacherRequest = {
                fullName: fullName.trim(),
                dateOfBirth: dateOfBirthStr,
                gender,
                address: address.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                specialization: specialization.trim() || undefined,
                degree: degree.trim() || undefined,
                subjectId: subjectId || undefined,
                createAccount,
            };
            await schoolAdminService.createTeacher(req);
            // Reset form
            setFullName(""); setDateOfBirth(null); setDateInputValue(""); setGender("MALE");
            setAddress(""); setEmail(""); setPhone(""); setSpecialization(""); setDegree("");
            setSubjectId("");
            setCreateAccount(true);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể thêm giáo viên.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col z-[100] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-5 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Thêm giáo viên mới</h2>
                                <p className="text-blue-100 text-sm">Điền thông tin để thêm giáo viên vào hệ thống</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                            <XIcon />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Section 1: Personal Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin cá nhân</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                        placeholder="Nhập họ và tên đầy đủ"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày sinh <span className="text-red-500">*</span></label>
                                    <DatePicker
                                        selected={dateOfBirth}
                                        onChange={(date: Date | null) => {
                                            setDateOfBirth(date);
                                            if (date) {
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                setDateInputValue(`${day}/${month}/${year}`);
                                            } else {
                                                setDateInputValue('');
                                            }
                                        }}
                                        onChangeRaw={(e) => {
                                            if (!e) return;
                                            const target = e.target as HTMLInputElement;
                                            const nativeEvent = e.nativeEvent as unknown as InputEvent;
                                            const isDeleting = nativeEvent.inputType?.startsWith('delete') || false;
                                            const formatted = formatDateInput(target.value, isDeleting);
                                            setDateInputValue(formatted);
                                            const parsed = parseDateDDMMYYYY(formatted);
                                            if (parsed && formatted.length >= 10) {
                                                const [year, month, day] = parsed.split('-').map(Number);
                                                setDateOfBirth(new Date(year, month - 1, day));
                                            } else if (!formatted) {
                                                setDateOfBirth(null);
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="VD: 20/01/1990"
                                        showYearDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={100}
                                        maxDate={new Date()}
                                        wrapperClassName="w-full block"
                                        customInput={
                                            <CustomDateInput
                                                value={dateInputValue}
                                                rawValue={dateInputValue}
                                                placeholder="dd/mm/yyyy"
                                                {...{ className: "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" }}
                                            />
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Giới tính</label>
                                    <select value={gender} onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="MALE">Nam</option>
                                        <option value="FEMALE">Nữ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                        placeholder="example@school.edu.vn"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
                                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        placeholder="VD: 0912345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Địa chỉ</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Nhập địa chỉ thường trú"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Professional Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin chuyên môn</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Bộ môn giảng dạy</label>
                                    <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="">-- Chọn bộ môn --</option>
                                        {subjects.map((sub: any) => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Chuyên môn (Ghi chú)</label>
                                    <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                                        placeholder="Toán, Văn, Anh..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Bằng cấp</label>
                                    <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)}
                                        placeholder="Cử nhân, Thạc sĩ, Tiến sĩ..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Account Creation Option */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200/60">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="font-semibold text-gray-800">Tạo tài khoản đăng nhập cho giáo viên này</span>
                            </label>
                            <ul className="list-disc pl-10 mt-3 text-sm text-gray-600 space-y-1">
                                <li>Tài khoản sẽ sử dụng Email ở trên để đăng nhập</li>
                                <li>Mật khẩu ngẫu nhiên sẽ được gửi về Email</li>
                                <li>Quyền hạn: <span className="font-medium text-blue-600">TEACHER</span></li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose}
                                className="flex-1 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all">
                                Hủy bỏ
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang thêm...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Thêm giáo viên
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ==================== TEACHER DETAIL MODAL ====================

interface TeacherDetailModalProps {
    isOpen: boolean;
    teacher: TeacherDto | null;
    onClose: () => void;
    onEdit: (teacher: TeacherDto) => void;
    onDelete: (teacher: TeacherDto) => void;
}

const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '—';
    }
};

function TeacherDetailModal({ isOpen, teacher, onClose, onEdit, onDelete }: TeacherDetailModalProps) {
    if (!isOpen || !teacher) return null;

    const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
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
                        <InfoRow label="Ngày sinh" value={formatDisplayDate(teacher.dateOfBirth)} />
                        <InfoRow label="Giới tính" value={teacher.gender === 'MALE' ? 'Nam' : teacher.gender === 'FEMALE' ? 'Nữ' : teacher.gender} />
                        <InfoRow label="Địa chỉ" value={teacher.address} />
                        <InfoRow label="Chuyên môn" value={teacher.specialization} />
                        <InfoRow label="Bằng cấp" value={teacher.degree} />
                        <InfoRow label="Lớp chủ nhiệm" value={teacher.homeroomClassName} />
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
                        <button
                            onClick={() => onDelete(teacher)}
                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                        >
                            Xóa
                        </button>
                        <div className="flex gap-2">
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
            </div>
        </div>,
        document.body
    );
}

// ==================== EDIT TEACHER MODAL ====================

interface EditTeacherModalProps {
    isOpen: boolean;
    teacher: TeacherDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function EditTeacherModal({ isOpen, teacher, onClose, onSuccess }: EditTeacherModalProps) {
    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [dateInputValue, setDateInputValue] = useState("");
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>("MALE");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [degree, setDegree] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const data = await schoolAdminService.listSubjects();
                setSubjects(data);
            } catch (err) {
                console.error("Failed to fetch subjects");
            }
        };
        if (isOpen) fetchSubjects();
    }, [isOpen]);

    useEffect(() => {
        if (teacher) {
            setFullName(teacher.fullName || "");
            setGender((teacher.gender as 'MALE' | 'FEMALE' | 'OTHER') || "MALE");
            setAddress(teacher.address || "");
            setEmail(teacher.email || "");
            setPhone(teacher.phone || "");
            setSpecialization(teacher.specialization || "");
            setDegree(teacher.degree || "");
            setSubjectId(teacher.subjectId || "");
            if (teacher.dateOfBirth) {
                const d = new Date(teacher.dateOfBirth);
                setDateOfBirth(d);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                setDateInputValue(`${day}/${month}/${year}`);
            } else {
                setDateOfBirth(null);
                setDateInputValue("");
            }
        }
    }, [teacher]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher) return;
        setLoading(true);
        setError(null);

        try {
            let dateOfBirthStr: string | undefined = undefined;
            if (dateOfBirth) {
                const year = dateOfBirth.getFullYear();
                const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
                const day = String(dateOfBirth.getDate()).padStart(2, '0');
                dateOfBirthStr = `${year}-${month}-${day}`;
            }

            const req: CreateTeacherRequest = {
                fullName: fullName.trim(),
                dateOfBirth: dateOfBirthStr,
                gender,
                address: address.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                specialization: specialization.trim() || undefined,
                degree: degree.trim() || undefined,
                subjectId: subjectId || undefined,
                createAccount: false, // Don't create account on edit
            };
            await schoolAdminService.updateTeacher(teacher.id, req);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể cập nhật giáo viên.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !teacher) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col z-[100] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-5 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Chỉnh sửa giáo viên</h2>
                                <p className="text-blue-100 text-sm">Cập nhật thông tin giáo viên {teacher.teacherCode}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                            <XIcon />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Section 1: Personal Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin cá nhân</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                        placeholder="Nhập họ và tên đầy đủ"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày sinh</label>
                                    <DatePicker
                                        selected={dateOfBirth}
                                        onChange={(date: Date | null) => {
                                            setDateOfBirth(date);
                                            if (date) {
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                setDateInputValue(`${day}/${month}/${year}`);
                                            } else {
                                                setDateInputValue('');
                                            }
                                        }}
                                        onChangeRaw={(e) => {
                                            if (!e) return;
                                            const target = e.target as HTMLInputElement;
                                            const nativeEvent = e.nativeEvent as unknown as InputEvent;
                                            const isDeleting = nativeEvent.inputType?.startsWith('delete') || false;
                                            const formatted = formatDateInput(target.value, isDeleting);
                                            setDateInputValue(formatted);
                                            const parsed = parseDateDDMMYYYY(formatted);
                                            if (parsed && formatted.length >= 10) {
                                                const [year, month, day] = parsed.split('-').map(Number);
                                                setDateOfBirth(new Date(year, month - 1, day));
                                            } else if (!formatted) {
                                                setDateOfBirth(null);
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="VD: 20/01/1990"
                                        showYearDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={100}
                                        maxDate={new Date()}
                                        wrapperClassName="w-full block"
                                        customInput={
                                            <CustomDateInput
                                                rawValue={dateInputValue}
                                                placeholder="dd/mm/yyyy"
                                                {...{ className: "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" }}
                                            />
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Giới tính</label>
                                    <select value={gender} onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="MALE">Nam</option>
                                        <option value="FEMALE">Nữ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@school.edu.vn"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
                                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        placeholder="VD: 0912345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Địa chỉ</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Nhập địa chỉ thường trú"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Professional Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin chuyên môn</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Bộ môn giảng dạy</label>
                                    <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="">-- Chọn bộ môn --</option>
                                        {subjects.map((sub: any) => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Bằng cấp</label>
                                    <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)}
                                        placeholder="Cử nhân, Thạc sĩ, Tiến sĩ..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Chuyên môn (Ghi chú)</label>
                                    <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                                        placeholder="Ghi chú thêm về chuyên môn..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose}
                                className="flex-1 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all">
                                Hủy bỏ
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ==================== DELETE TEACHER MODAL ====================

interface DeleteTeacherModalProps {
    isOpen: boolean;
    teacher: TeacherDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function DeleteTeacherModal({ isOpen, teacher, onClose, onSuccess }: DeleteTeacherModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!teacher) return;
        setLoading(true);
        setError(null);

        try {
            await schoolAdminService.deleteTeacher(teacher.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể xóa giáo viên.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !teacher) return null;

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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa giáo viên?</h3>
                    <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa giáo viên <span className="font-semibold text-gray-900">{teacher.fullName}</span>? Hành động này không thể hoàn tác.</p>
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

// ==================== PAGE COMPONENT ====================

const TeacherManagement = () => {

    // ... (keep existing state)
    const [teachers, setTeachers] = useState<TeacherDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherDto | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<TeacherDto | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<TeacherDto | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.listTeacherProfiles();
            setTeachers(data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Danh sách giáo viên</h2>
                <button
                    onClick={() => setShowAddTeacherModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <PlusIcon />
                    <span>Thêm giáo viên</span>
                </button>
            </div>

            {loading && <div className="p-8 text-center text-gray-500">Đang tải danh sách...</div>}
            {error && <div className="m-6 bg-red-50 text-red-600 p-4 rounded">{error}</div>}

            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã GV</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Điện thoại</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Chuyên môn</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp CN</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {teachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedTeacher(teacher)}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{teacher.teacherCode}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{teacher.fullName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.email || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.phone || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.specialization || '—'}</td>
                                    <td className="px-6 py-4">
                                        {teacher.homeroomClassName ? (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                                {teacher.homeroomClassName}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <TeacherStatusBadge status={teacher.status || 'ACTIVE'} />
                                    </td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Chưa có giáo viên nào. Bấm "Thêm giáo viên" để bắt đầu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <AddTeacherModal
                isOpen={showAddTeacherModal}
                onClose={() => setShowAddTeacherModal(false)}
                onSuccess={fetchData}
            />
            <TeacherDetailModal
                isOpen={selectedTeacher !== null}
                teacher={selectedTeacher}
                onClose={() => setSelectedTeacher(null)}
                onEdit={(t) => {
                    setSelectedTeacher(null);
                    setEditingTeacher(t);
                }}
                onDelete={(t) => {
                    setSelectedTeacher(null);
                    setDeletingTeacher(t);
                }}
            />
            <EditTeacherModal
                isOpen={editingTeacher !== null}
                teacher={editingTeacher}
                onClose={() => setEditingTeacher(null)}
                onSuccess={fetchData}
            />
            <DeleteTeacherModal
                isOpen={deletingTeacher !== null}
                teacher={deletingTeacher}
                onClose={() => setDeletingTeacher(null)}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default TeacherManagement;
