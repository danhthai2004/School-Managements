import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Edit, Trash2 } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import {
    schoolAdminService,
    type ClassRoomDto,
    type UserDto,
    type CreateClassRoomRequest,
    type CombinationDto
} from "../../../services/schoolAdminService";
import { PlusIcon, XIcon } from "../SchoolAdminIcons";

// ==================== MODAL COMPONENTS (Internal) ====================

interface AddClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    teachers: UserDto[];
    combinations: CombinationDto[];
    defaultAcademicYear: string;
}

// Removed client-side getCurrentAcademicYear


function AddClassModal({ isOpen, onClose, onSuccess, teachers, combinations, defaultAcademicYear }: AddClassModalProps) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState(10);
    const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
    const [maxCapacity, setMaxCapacity] = useState(35);
    const [roomNumber, setRoomNumber] = useState("");
    const [department, setDepartment] = useState<'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI'>("KHONG_PHAN_BAN");
    const [combinationId, setCombinationId] = useState("");
    const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const req: CreateClassRoomRequest = {
                name: name.trim(),
                grade,
                academicYear: academicYear.trim(),
                maxCapacity,
                roomNumber: roomNumber.trim() || undefined,
                department,
                combinationId: combinationId || undefined
            };
            if (homeroomTeacherId) {
                req.homeroomTeacherId = homeroomTeacherId;
            }
            await schoolAdminService.createClass(req);
            setName("");
            setGrade(10);
            setMaxCapacity(35);
            setRoomNumber("");
            setDepartment("KHONG_PHAN_BAN");
            setCombinationId("");
            setHomeroomTeacherId("");
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tạo lớp học.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col z-[100] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-5 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Thêm lớp học mới</h2>
                                <p className="text-blue-100 text-sm">Tạo lớp học cho năm học {defaultAcademicYear}</p>
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
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Section 1: Basic Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin cơ bản</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên lớp <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ví dụ: 12A1"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối <span className="text-red-500">*</span></label>
                                    <select
                                        value={grade}
                                        onChange={(e) => setGrade(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                    >
                                        {[10, 11, 12].map((g) => <option key={g} value={g}>Khối {g}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Năm học <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={academicYear}
                                        onChange={(e) => setAcademicYear(e.target.value)}
                                        placeholder="2024-2025"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sĩ số tối đa <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        value={maxCapacity}
                                        onChange={(e) => setMaxCapacity(Number(e.target.value))}
                                        min={1}
                                        max={35}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Tối đa 35 học sinh/lớp</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Academic Settings */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Cài đặt học tập</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tổ hợp môn (GDPT 2018)</label>
                                    <select
                                        value={combinationId}
                                        onChange={(e) => setCombinationId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">-- Chọn tổ hợp môn --</option>
                                        {combinations.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} {c.code ? `(${c.code})` : ''}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Chọn tổ hợp thay cho phân ban truyền thống</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng học</label>
                                        <input
                                            type="text"
                                            value={roomNumber}
                                            onChange={(e) => setRoomNumber(e.target.value)}
                                            placeholder="VD: A201"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phân ban (Cũ)</label>
                                        <select
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value as any)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                        >
                                            <option value="KHONG_PHAN_BAN">Không phân ban</option>
                                            <option value="TU_NHIEN">Ban Tự nhiên</option>
                                            <option value="XA_HOI">Ban Xã hội</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Teacher Assignment */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Giáo viên chủ nhiệm</h3>
                            </div>
                            <select
                                value={homeroomTeacherId}
                                onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                            >
                                <option value="">-- Chọn giáo viên --</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang tạo...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Tạo lớp học</span>
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

interface EditClassModalProps {
    isOpen: boolean;
    classData: ClassRoomDto | null;
    onClose: () => void;
    onSuccess: () => void;
    teachers: UserDto[];
    combinations: CombinationDto[];
}

function EditClassModal({ isOpen, classData, onClose, onSuccess, teachers, combinations }: EditClassModalProps) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState(10);
    const [academicYear, setAcademicYear] = useState("");
    const [maxCapacity, setMaxCapacity] = useState(35);
    const [roomNumber, setRoomNumber] = useState("");
    const [department, setDepartment] = useState<'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI'>("KHONG_PHAN_BAN");
    const [combinationId, setCombinationId] = useState("");
    const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (classData) {
            setName(classData.name);
            setGrade(classData.grade);
            setAcademicYear(classData.academicYear);
            setMaxCapacity(classData.maxCapacity);
            setRoomNumber(classData.roomNumber || "");
            setDepartment((classData.department as any) || "KHONG_PHAN_BAN");
            setCombinationId(classData.combinationId || "");
            setHomeroomTeacherId(classData.homeroomTeacherId || "");
        }
    }, [classData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classData) return;
        setLoading(true);
        setError(null);

        try {
            const req: CreateClassRoomRequest = {
                name: name.trim(),
                grade,
                academicYear: academicYear.trim(),
                maxCapacity,
                roomNumber: roomNumber.trim() || undefined,
                department,
                combinationId: combinationId || undefined
            };
            if (homeroomTeacherId) {
                req.homeroomTeacherId = homeroomTeacherId;
            }
            await schoolAdminService.updateClass(classData.id, req);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể cập nhật lớp học.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !classData) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col z-[100] animate-in zoom-in-95 duration-300">
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
                                <h2 className="text-xl font-bold text-white">Chỉnh sửa lớp học</h2>
                                <p className="text-blue-100 text-sm">Cập nhật thông tin lớp {classData.name}</p>
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
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Section 1: Basic Information */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Thông tin cơ bản</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên lớp <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối <span className="text-red-500">*</span></label>
                                    <select
                                        value={grade}
                                        onChange={(e) => setGrade(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                    >
                                        {[10, 11, 12].map((g) => <option key={g} value={g}>Khối {g}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Năm học <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={academicYear}
                                        onChange={(e) => setAcademicYear(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sĩ số tối đa <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        value={maxCapacity}
                                        onChange={(e) => setMaxCapacity(Number(e.target.value))}
                                        min={1}
                                        max={35}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Academic Settings */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Cài đặt học tập</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tổ hợp môn (GDPT 2018)</label>
                                    <select
                                        value={combinationId}
                                        onChange={(e) => setCombinationId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">-- Chọn tổ hợp môn --</option>
                                        {combinations.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng học</label>
                                        <input
                                            type="text"
                                            value={roomNumber}
                                            onChange={(e) => setRoomNumber(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phân ban (Cũ)</label>
                                        <select
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value as any)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                        >
                                            <option value="KHONG_PHAN_BAN">Không phân ban</option>
                                            <option value="TU_NHIEN">Ban Tự nhiên</option>
                                            <option value="XA_HOI">Ban Xã hội</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Teacher Assignment */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-800">Giáo viên chủ nhiệm</h3>
                            </div>
                            <select
                                value={homeroomTeacherId}
                                onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                            >
                                <option value="">-- Chọn giáo viên --</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang lưu...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Lưu thay đổi</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa lớp học?</h3>
                    <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa lớp <span className="font-semibold text-gray-900">{classData.name}</span>? Hành động này không thể hoàn tác.</p>
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

const ClassManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [teachers, setTeachers] = useState<UserDto[]>([]);
    const [combinations, setCombinations] = useState<CombinationDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [editingClass, setEditingClass] = useState<ClassRoomDto | null>(null);
    const [deletingClass, setDeletingClass] = useState<ClassRoomDto | null>(null);
    const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");

    // Initial load
    useEffect(() => {
        fetchData();
    }, []);

    // Helper to open modals based on query params or other triggers if needed
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setShowAddModal(true);
            // Clear param after opening
            setSearchParams(params => {
                params.delete('action');
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [classesData, teachersData, combinationsData, statsData] = await Promise.all([
                schoolAdminService.listClasses(),
                schoolAdminService.listTeachers(),
                schoolAdminService.listCombinations(),
                schoolAdminService.getStats()
            ]);
            setClasses(classesData);
            setTeachers(teachersData);
            setCombinations(combinationsData);
            if (statsData?.currentAcademicYear) {
                setCurrentAcademicYear(statsData.currentAcademicYear);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải danh sách lớp học...</div>;
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">{error}</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quản lý lớp học</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <PlusIcon />
                    <span>Thêm lớp học</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên lớp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Khối</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Năm học</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổ hợp / Ban</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">GVCN</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sĩ số</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {classes.map((cls) => (
                            <tr key={cls.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <Link to={`/school-admin/classes/${cls.id}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                        title="Xem danh sách học sinh"
                                    >
                                        {cls.name}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{cls.grade}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.academicYear}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.roomNumber || "—"}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {cls.combinationName ? (
                                        <span className="text-blue-600 font-medium">{cls.combinationName}</span>
                                    ) : (
                                        cls.department === 'TU_NHIEN' ? 'Tự nhiên' :
                                            cls.department === 'XA_HOI' ? 'Xã hội' :
                                                cls.department === 'KHONG_PHAN_BAN' ? 'Không phân ban' : '—'
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{cls.homeroomTeacherName || "—"}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.studentCount} / {cls.maxCapacity}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${cls.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {cls.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng HĐ'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingClass(cls); setShowEditModal(true); }}
                                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setDeletingClass(cls); setShowDeleteModal(true); }}
                                            className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                            title="Xóa lớp học"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {classes.length === 0 && (
                            <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">Chưa có lớp học nào</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AddClassModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchData}
                teachers={teachers}
                combinations={combinations}
                defaultAcademicYear={currentAcademicYear}
            />
            <EditClassModal
                isOpen={showEditModal}
                classData={editingClass}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                }}
                onSuccess={fetchData}
                teachers={teachers}
                combinations={combinations}
            />
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                classData={deletingClass}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingClass(null);
                }}
                onSuccess={fetchData}
            />
        </div>
    );
}

export default ClassManagement;
