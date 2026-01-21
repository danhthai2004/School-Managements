import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    schoolAdminService,
    type StudentDto,
    type ClassRoomDto,
    type CreateStudentRequest
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
                <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <PlusIcon />
                    <span>Thêm học sinh</span>
                </button>
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map((stu) => (
                            <tr key={stu.id} className="hover:bg-gray-50">
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
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => {
                                            setDeletingStudent(stu);
                                            setShowDeleteStudentModal(true);
                                        }}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
        </div>
    );
};

export default StudentManagement;
