import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    schoolAdminService,
    type TeacherDto,
    type CreateTeacherRequest
} from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";
import { formatDateInput, parseDateDDMMYYYY } from "../../../../utils/dateHelpers";
import CustomDateInput from "../../../../components/common/CustomDateInput";

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
    const [subjectIds, setSubjectIds] = useState<string[]>([]);
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

            // Map subjects to IDs
            if (teacher.subjects) {
                setSubjectIds(teacher.subjects.map(s => s.id));
            } else {
                setSubjectIds([]);
            }

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
                subjectIds: subjectIds.length > 0 ? subjectIds : undefined,
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
                                    <input type="email" value={email}
                                        onChange={teacher?.hasAccount ? undefined : (e) => setEmail(e.target.value)}
                                        readOnly={!!teacher?.hasAccount}
                                        disabled={!!teacher?.hasAccount}
                                        placeholder="example@school.edu.vn"
                                        className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all ${teacher?.hasAccount ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`} />
                                    {teacher?.hasAccount && <p className="mt-1 text-xs text-slate-400">Email không thể chỉnh sửa khi đã có tài khoản</p>}
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
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Bộ môn giảng dạy</label>
                                    <div className="space-y-2">
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                if (selectedId && !subjectIds.includes(selectedId)) {
                                                    setSubjectIds([...subjectIds, selectedId]);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">-- Chọn thêm bộ môn --</option>
                                            {subjects.filter(s => !subjectIds.includes(s.id)).map((sub: any) => (
                                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                                            ))}
                                        </select>

                                        <div className="flex flex-wrap gap-2 min-h-[30px]">
                                            {subjectIds.map(id => {
                                                const sub = subjects.find(s => s.id === id);
                                                return (
                                                    <span key={id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {sub?.name || 'Unknown'}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubjectIds(subjectIds.filter(sid => sid !== id))}
                                                            className="ml-2 text-blue-400 hover:text-blue-600 focus:outline-none"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                            {subjectIds.length === 0 && (
                                                <span className="text-gray-400 text-sm italic py-1">Chưa chọn môn nào</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
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

export default EditTeacherModal;
