import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    schoolAdminService,
    type StudentDto,
    type ClassRoomDto,
    type UpdateStudentRequest
} from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { formatDateInput, parseDateDDMMYYYY } from "../../../../utils/dateHelpers";
import CustomDateInput from "../../../../components/common/CustomDateInput";

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

            // Set guardian info
            if (student.guardian) {
                setGuardianName(student.guardian.fullName || "");
                setGuardianPhone(student.guardian.phone || "");
                setGuardianEmail(student.guardian.email || "");
                setGuardianRelationship(student.guardian.relationship || "");
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

        // Validation: Required fields
        if (!fullName.trim()) {
            setError("Vui lòng nhập họ và tên học sinh");
            setLoading(false);
            return;
        }
        if (!dateOfBirth) {
            setError("Vui lòng nhập ngày sinh");
            setLoading(false);
            return;
        }

        // UI Validation: If guardian email is provided, name is required
        if (guardianEmail && !guardianName) {
            setError("Vui lòng nhập tên phụ huynh nếu muốn tạo tài khoản");
            setLoading(false);
            return;
        }

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
                guardian: guardianName ? {
                    id: student.guardian?.id,
                    fullName: guardianName.trim(),
                    phone: guardianPhone.trim() || undefined,
                    email: guardianEmail.trim() || undefined,
                    relationship: guardianRelationship.trim() || undefined,
                } : undefined,
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
                                <h2 className="text-xl font-bold text-white">Chỉnh sửa học sinh</h2>
                                <p className="text-blue-100 text-sm">Cập nhật thông tin học sinh {student.studentCode}</p>
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

                        {/* Student Code Display */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/60 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-xs text-blue-600 font-medium">Mã học sinh</span>
                                <p className="text-lg font-bold text-blue-900">{student.studentCode}</p>
                            </div>
                        </div>

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
                                            if (typeof target.value !== 'string') return;
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
                                        showMonthDropdown
                                        scrollableYearDropdown
                                        yearDropdownItemNumber={100}
                                        maxDate={new Date()}
                                        openToDate={dateOfBirth || new Date(2008, 0, 1)}
                                        popperProps={{ strategy: "fixed" }}
                                        popperClassName="react-datepicker-popper-fixed"
                                        shouldCloseOnSelect={false}
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
                                    <select value={gender} onChange={(e) => setGender(e.target.value as any)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="MALE">Nam</option>
                                        <option value="FEMALE">Nữ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Trạng thái</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="ACTIVE">Đang học</option>
                                        <option value="GRADUATED">Đã tốt nghiệp</option>
                                        <option value="TRANSFERRED">Chuyển trường</option>
                                        <option value="SUSPENDED">Tạm nghỉ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Nơi sinh</label>
                                    <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}
                                        placeholder="VD: Hà Nội"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Địa chỉ</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Nhập địa chỉ thường trú"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                                    <input type="email" value={email}
                                        onChange={student?.hasAccount ? undefined : (e) => setEmail(e.target.value)}
                                        readOnly={!!student?.hasAccount}
                                        disabled={!!student?.hasAccount}
                                        placeholder="example@email.com"
                                        className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all ${student?.hasAccount ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`} />
                                    {student?.hasAccount && <p className="mt-1 text-xs text-slate-400">Email không thể chỉnh sửa khi đã có tài khoản</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
                                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        placeholder="VD: 0912345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Academic Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin học tập</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Lớp học</label>
                                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">-- Chọn lớp --</option>
                                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Section 3: Guardian Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin người giám hộ</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Họ tên phụ huynh</label>
                                    <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)}
                                        placeholder="Nhập họ tên phụ huynh"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Mối quan hệ</label>
                                    <input type="text" value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)}
                                        placeholder="VD: Cha, Mẹ, Ông, Bà..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
                                    <input type="text" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
                                        placeholder="VD: 0912345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Email phụ huynh</label>
                                    <input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                    <p className="mt-1 text-xs text-slate-500">
                                        *Để cấp tài khoản, vào <strong>Quản lý tài khoản</strong> sau khi cập nhật.
                                    </p>
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

export default EditStudentModal;
