import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    schoolAdminService,
    type StudentDto,
    type ClassRoomDto,
    type CreateStudentRequest,
    type UpdateStudentRequest,
    type ImportStudentResult
} from "../../../services/schoolAdminService";
import { PlusIcon, XIcon } from "../SchoolAdminIcons";

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

const formatDate = (dateString: string | null | undefined): string => {
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

const CustomDateInput = React.forwardRef<HTMLInputElement, {
    value?: string;
    onClick?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    rawValue?: string;
}>(({ value, onClick, onChange, placeholder, rawValue, ...props }, ref) => (
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

// ==================== SUCCESS TOAST COMPONENT ====================

interface ImportSuccessToastProps {
    result: ImportStudentResult | null;
    onClose: () => void;
}

function ImportSuccessToast({ result, onClose }: ImportSuccessToastProps) {
    const timerRef = React.useRef<number | null>(null);

    useEffect(() => {
        if (result) {
            // Clear any existing timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            // Set new timer
            timerRef.current = window.setTimeout(() => {
                onClose();
            }, 3000);
        }
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [result]); // Only depend on result, not onClose

    if (!result) return null;

    return (
        <div
            className="fixed top-4 right-4 z-[9999]"
            style={{
                animation: 'slideIn 0.3s ease-out'
            }}
        >
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[320px]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Import hoàn tất!</h4>
                        <p className="text-xs text-gray-500">Tự động đóng sau 3 giây</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
                        <XIcon />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
                        <p className="text-xs text-green-700">Thành công</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{result.failedCount}</p>
                        <p className="text-xs text-red-700">Thất bại</p>
                    </div>
                </div>
                {result.assignedToClassCount > 0 && (
                    <div className="mt-2 bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-sm text-blue-700">
                            <strong>{result.assignedToClassCount}</strong> học sinh đã phân lớp
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== MODAL COMPONENTS (Internal) ====================

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: ClassRoomDto[];
}

function AddStudentModal({ isOpen, onClose, onSuccess, classes }: AddStudentModalProps) {
    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [dateInputValue, setDateInputValue] = useState("");
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>("MALE");
    const [birthPlace, setBirthPlace] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [classId, setClassId] = useState("");
    const [guardianName, setGuardianName] = useState("");
    const [guardianPhone, setGuardianPhone] = useState("");
    const [guardianEmail, setGuardianEmail] = useState("");
    const [guardianRelationship, setGuardianRelationship] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            const req: CreateStudentRequest = {
                fullName: fullName.trim(),
                dateOfBirth: dateOfBirthStr,
                gender,
                birthPlace: birthPlace.trim() || undefined,
                address: address.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                classId: classId || undefined,
                guardians: guardianName ? [{
                    fullName: guardianName.trim(),
                    phone: guardianPhone.trim() || undefined,
                    email: guardianEmail.trim() || undefined,
                    relationship: guardianRelationship.trim() || undefined,
                }] : undefined,
            };
            await schoolAdminService.createStudent(req);
            setFullName(""); setDateOfBirth(null); setDateInputValue(""); setGender("MALE");
            setBirthPlace(""); setAddress(""); setEmail(""); setPhone(""); setClassId("");
            setGuardianName(""); setGuardianPhone(""); setGuardianEmail(""); setGuardianRelationship("");
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể thêm học sinh.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Thêm học sinh mới</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white"><XIcon /></button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                    <h3 className="font-semibold text-gray-700 border-b pb-2">Thông tin cá nhân</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên *</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
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
                                    const isDeleting = (e.nativeEvent as any).inputType?.startsWith('delete');
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
                                placeholderText="VD: 20/01/2005"
                                showYearDropdown
                                scrollableYearDropdown
                                yearDropdownItemNumber={100}
                                maxDate={new Date()}
                                wrapperClassName="w-full block"
                                customInput={
                                    <CustomDateInput
                                        value={dateInputValue}
                                        rawValue={dateInputValue}
                                        placeholder="dd/mm/yyyy (VD: 20/01/2005)"
                                        {...{ className: "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" }}
                                    />
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white">
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nơi sinh</label>
                            <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-700 border-b pb-2 mt-6">Thông tin học tập</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
                        <select value={classId} onChange={(e) => setClassId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white">
                            <option value="">-- Chọn lớp --</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>)}
                        </select>
                    </div>

                    <h3 className="font-semibold text-gray-700 border-b pb-2 mt-6">Thông tin người giám hộ</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên</label>
                            <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quan hệ</label>
                            <input type="text" value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)}
                                placeholder="Cha, Mẹ, Ông, Bà..."
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SĐT</label>
                            <input type="text" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg disabled:opacity-50">
                            {loading ? "Đang thêm..." : "Thêm học sinh"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== VIEW STUDENT DETAIL MODAL ====================

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
    const statusText = student.status === 'ACTIVE' ? 'Đang học' : student.status === 'GRADUATED' ? 'Đã tốt nghiệp' : student.status === 'TRANSFERRED' ? 'Chuyển trường' : student.status === 'SUSPENDED' ? 'Tạm nghỉ' : student.status;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Thông tin chi tiết học sinh</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
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
                            <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {statusText}
                            </span>
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
        </div>
    );
}

interface DeleteStudentModalProps {
    isOpen: boolean;
    student: StudentDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

function DeleteStudentModal({ isOpen, student, onClose, onSuccess }: DeleteStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!student) return;
        setLoading(true);
        setError(null);

        try {
            await schoolAdminService.deleteStudent(student.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể xóa học sinh.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
                            {loading ? "Đang xóa..." : "Xóa"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== EDIT STUDENT MODAL ====================

interface EditStudentModalProps {
    isOpen: boolean;
    student: StudentDto | null;
    classes: ClassRoomDto[];
    onClose: () => void;
    onSuccess: () => void;
}

function EditStudentModal({ isOpen, student, classes, onClose, onSuccess }: EditStudentModalProps) {
    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [dateInputValue, setDateInputValue] = useState("");
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>("MALE");
    const [birthPlace, setBirthPlace] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED'>("ACTIVE");
    const [classId, setClassId] = useState("");
    const [guardianName, setGuardianName] = useState("");
    const [guardianPhone, setGuardianPhone] = useState("");
    const [guardianEmail, setGuardianEmail] = useState("");
    const [guardianRelationship, setGuardianRelationship] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when student changes
    useEffect(() => {
        if (student) {
            setFullName(student.fullName || "");
            setGender((student.gender as 'MALE' | 'FEMALE' | 'OTHER') || "MALE");
            setBirthPlace(student.birthPlace || "");
            setAddress(student.address || "");
            setEmail(student.email || "");
            setPhone(student.phone || "");
            setStatus((student.status as 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED') || "ACTIVE");
            setClassId(student.currentClassId || "");

            // Set date of birth
            if (student.dateOfBirth) {
                try {
                    const date = new Date(student.dateOfBirth);
                    if (!isNaN(date.getTime())) {
                        setDateOfBirth(date);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        setDateInputValue(`${day}/${month}/${year}`);
                    }
                } catch {
                    setDateOfBirth(null);
                    setDateInputValue("");
                }
            } else {
                setDateOfBirth(null);
                setDateInputValue("");
            }

            // Set guardian info (first guardian only for simplicity)
            if (student.guardians && student.guardians.length > 0) {
                const guardian = student.guardians[0];
                setGuardianName(guardian.fullName || "");
                setGuardianPhone(guardian.phone || "");
                setGuardianEmail(guardian.email || "");
                setGuardianRelationship(guardian.relationship || "");
            } else {
                setGuardianName("");
                setGuardianPhone("");
                setGuardianEmail("");
                setGuardianRelationship("");
            }

            setError(null);
        }
    }, [student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

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

            const req: UpdateStudentRequest = {
                fullName: fullName.trim(),
                dateOfBirth: dateOfBirthStr,
                gender,
                birthPlace: birthPlace.trim() || undefined,
                address: address.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                status,
                classId: classId || undefined,
                guardians: guardianName ? [{
                    fullName: guardianName.trim(),
                    phone: guardianPhone.trim() || undefined,
                    email: guardianEmail.trim() || undefined,
                    relationship: guardianRelationship.trim() || undefined,
                }] : [],
            };

            await schoolAdminService.updateStudent(student.id, req);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể cập nhật học sinh.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Chỉnh sửa học sinh</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white"><XIcon /></button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                    {/* Student Code (readonly) */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Mã học sinh</span>
                        <p className="text-sm font-medium text-gray-900">{student.studentCode}</p>
                    </div>

                    <h3 className="font-semibold text-gray-700 border-b pb-2">Thông tin cá nhân</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên *</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
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
                                    const isDeleting = (e.nativeEvent as any).inputType?.startsWith('delete');
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
                                placeholderText="VD: 20/01/2005"
                                showYearDropdown
                                scrollableYearDropdown
                                yearDropdownItemNumber={100}
                                maxDate={new Date()}
                                wrapperClassName="w-full block"
                                customInput={
                                    <CustomDateInput
                                        value={dateInputValue}
                                        rawValue={dateInputValue}
                                        placeholder="dd/mm/yyyy (VD: 20/01/2005)"
                                        {...{ className: "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" }}
                                    />
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white">
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white">
                                <option value="ACTIVE">Đang học</option>
                                <option value="GRADUATED">Đã tốt nghiệp</option>
                                <option value="TRANSFERRED">Chuyển trường</option>
                                <option value="SUSPENDED">Tạm nghỉ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nơi sinh</label>
                            <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-700 border-b pb-2 mt-6">Thông tin học tập</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
                        <select value={classId} onChange={(e) => setClassId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white">
                            <option value="">-- Chọn lớp --</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>)}
                        </select>
                    </div>

                    <h3 className="font-semibold text-gray-700 border-b pb-2 mt-6">Thông tin người giám hộ</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên</label>
                            <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quan hệ</label>
                            <input type="text" value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)}
                                placeholder="Cha, Mẹ, Ông, Bà..."
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SĐT</label>
                            <input type="text" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg disabled:opacity-50">
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== IMPORT EXCEL MODAL ====================

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onImportComplete: (result: ImportStudentResult) => void;
}

function ImportExcelModal({ isOpen, onClose, onSuccess, onImportComplete }: ImportExcelModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [academicYear, setAcademicYear] = useState(() => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    });
    const [grade, setGrade] = useState(10);
    const [autoAssign, setAutoAssign] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
                setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Vui lòng chọn file Excel');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const importResult = await schoolAdminService.importStudentsFromExcel(
                file,
                academicYear,
                grade,
                autoAssign
            );

            if (importResult.successCount > 0) {
                onSuccess();
            }
            // Close form immediately and show toast
            handleClose();
            onImportComplete(importResult);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không thể import file.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 sticky top-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Import học sinh từ Excel</h2>
                        <button onClick={handleClose} className="text-white/80 hover:text-white">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                        <p className="font-medium text-blue-800 mb-2">Hướng dẫn:</p>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li>File Excel phải có cột <strong>Họ tên</strong> (bắt buộc)</li>
                            <li>Các cột tùy chọn: Ngày sinh, Giới tính, Ban, Nơi sinh, Địa chỉ, Email, SĐT</li>
                            <li>Thông tin phụ huynh: Họ tên, SĐT, Quan hệ</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Upload Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* File Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Chọn file Excel *
                            </label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="excel-file-input"
                                />
                                <label htmlFor="excel-file-input" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                        <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-slate-600">
                                            {file ? file.name : 'Click để chọn file hoặc kéo thả vào đây'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Năm học</label>
                                <input
                                    type="text"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="2024-2025"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Khối lớp</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value={10}>Khối 10</option>
                                    <option value={11}>Khối 11</option>
                                    <option value={12}>Khối 12</option>
                                </select>
                            </div>
                        </div>

                        {/* Auto assign */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoAssign}
                                onChange={(e) => setAutoAssign(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                                <span className="font-medium text-slate-700">Tự động phân lớp</span>
                                <p className="text-xs text-slate-500">Hệ thống sẽ tự động phân bổ học sinh vào các lớp còn chỗ</p>
                            </div>
                        </label>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                            >
                                {loading ? 'Đang import...' : 'Import'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ==================== PAGE COMPONENT ====================

const StudentManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [students, setStudents] = useState<StudentDto[]>([]);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [deletingStudent, setDeletingStudent] = useState<StudentDto | null>(null);
    const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [importToastResult, setImportToastResult] = useState<ImportStudentResult | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setShowAddStudentModal(true);
            setSearchParams(params => {
                params.delete('action');
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [studentsData, classesData] = await Promise.all([
                schoolAdminService.listStudents(),
                schoolAdminService.listClasses(),
            ]);
            setStudents(studentsData);
            setClasses(classesData);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải danh sách học sinh...</div>;
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">{error}</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Danh sách học sinh</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Import từ Excel</span>
                    </button>
                    <button
                        onClick={() => setShowAddStudentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <PlusIcon />
                        <span>Thêm học sinh</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã HS</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Giới tính</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày sinh</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map((stu) => (
                            <tr
                                key={stu.id}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => {
                                    setSelectedStudent(stu);
                                    setShowDetailModal(true);
                                }}
                            >
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{stu.studentCode}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{stu.fullName}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {stu.gender === 'MALE' ? 'Nam' : stu.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(stu.dateOfBirth)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{stu.currentClassName || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${stu.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {stu.status === 'ACTIVE' ? 'Đang học' : stu.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    Chưa có học sinh nào. Bấm "Thêm học sinh" để bắt đầu.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AddStudentModal
                isOpen={showAddStudentModal}
                onClose={() => setShowAddStudentModal(false)}
                onSuccess={fetchData}
                classes={classes}
            />
            <DeleteStudentModal
                isOpen={showDeleteStudentModal}
                student={deletingStudent}
                onClose={() => {
                    setShowDeleteStudentModal(false);
                    setDeletingStudent(null);
                }}
                onSuccess={fetchData}
            />
            <StudentDetailModal
                isOpen={showDetailModal}
                student={selectedStudent}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedStudent(null);
                }}
                onEdit={() => {
                    setShowDetailModal(false);
                    setEditingStudent(selectedStudent);
                    setShowEditModal(true);
                }}
                onDelete={() => {
                    setShowDetailModal(false);
                    setDeletingStudent(selectedStudent);
                    setShowDeleteStudentModal(true);
                }}
            />
            <EditStudentModal
                isOpen={showEditModal}
                student={editingStudent}
                classes={classes}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingStudent(null);
                }}
                onSuccess={fetchData}
            />
            <ImportExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchData}
                onImportComplete={(result) => setImportToastResult(result)}
            />
            <ImportSuccessToast
                result={importToastResult}
                onClose={() => setImportToastResult(null)}
            />
        </div>
    );
};

export default StudentManagement;
