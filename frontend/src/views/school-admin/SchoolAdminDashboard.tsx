import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    schoolAdminService,
    type SchoolStatsDto,
    type ClassRoomDto,
    type UserDto,
    type CreateClassRoomRequest,
} from "../../services/schoolAdminService";

// ==================== LUCIDE-STYLE ICONS ====================
const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
    </svg>
);

const ClassIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
    </svg>
);

const TeacherIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

const StudentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
);

const AccountIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" x2="19" y1="8" y2="14" />
        <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
);

const ReportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

// ==================== MODAL COMPONENT ====================
interface AddClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    teachers: UserDto[];
}

function AddClassModal({ isOpen, onClose, onSuccess, teachers }: AddClassModalProps) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState(10);
    const [academicYear, setAcademicYear] = useState("2024-2025");
    const [maxCapacity, setMaxCapacity] = useState(35);
    const [roomNumber, setRoomNumber] = useState("");
    const [department, setDepartment] = useState<'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI'>("KHONG_PHAN_BAN");
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Thêm lớp học mới</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <XIcon />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Tên lớp <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ví dụ: 12A1"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Khối <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={grade}
                                onChange={(e) => setGrade(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                            >
                                {[10, 11, 12].map((g) => (
                                    <option key={g} value={g}>Khối {g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Năm học <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                placeholder="2024-2025"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Sĩ số <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={maxCapacity}
                            onChange={(e) => setMaxCapacity(Number(e.target.value))}
                            min={1}
                            max={35}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Tối đa 35 học sinh/lớp</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phòng học
                            </label>
                            <input
                                type="text"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                placeholder="VD: A201"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phân ban
                            </label>
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value as any)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                            >
                                <option value="KHONG_PHAN_BAN">Không phân ban</option>
                                <option value="TU_NHIEN">Ban Tự nhiên</option>
                                <option value="XA_HOI">Ban Xã hội</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Giáo viên chủ nhiệm
                        </label>
                        <select
                            value={homeroomTeacherId}
                            onChange={(e) => setHomeroomTeacherId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                        >
                            <option value="">-- Chọn giáo viên --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.fullName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50">
                            {loading ? "Đang tạo..." : "Tạo lớp học"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== EDIT CLASS MODAL ====================
interface EditClassModalProps {
    isOpen: boolean;
    classData: ClassRoomDto | null;
    onClose: () => void;
    onSuccess: () => void;
    teachers: UserDto[];
}

function EditClassModal({ isOpen, classData, onClose, onSuccess, teachers }: EditClassModalProps) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState(10);
    const [academicYear, setAcademicYear] = useState("");
    const [maxCapacity, setMaxCapacity] = useState(35);
    const [roomNumber, setRoomNumber] = useState("");
    const [department, setDepartment] = useState<'KHONG_PHAN_BAN' | 'TU_NHIEN' | 'XA_HOI'>("KHONG_PHAN_BAN");
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Sửa lớp học</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white"><XIcon /></button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp *</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Khối *</label>
                            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                {[10, 11, 12].map((g) => <option key={g} value={g}>Khối {g}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Năm học *</label>
                            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sĩ số *</label>
                            <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(Number(e.target.value))}
                                min={1} max={35} required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phòng học</label>
                            <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phân ban</label>
                            <select value={department} onChange={(e) => setDepartment(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                <option value="KHONG_PHAN_BAN">Không phân ban</option>
                                <option value="TU_NHIEN">Ban Tự nhiên</option>
                                <option value="XA_HOI">Ban Xã hội</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GVCN</label>
                        <select value={homeroomTeacherId} onChange={(e) => setHomeroomTeacherId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                            <option value="">-- Chọn giáo viên --</option>
                            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50">
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== DELETE CONFIRM MODAL ====================
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
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function SchoolAdminDashboard() {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState<SchoolStatsDto | null>(null);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [teachers, setTeachers] = useState<UserDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassRoomDto | null>(null);
    const [deletingClass, setDeletingClass] = useState<ClassRoomDto | null>(null);
    const [activeMenu, setActiveMenu] = useState("overview");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const isSchoolAdmin = useMemo(() => user?.role === "SCHOOL_ADMIN", [user?.role]);

    const fetchData = async () => {
        try {
            const [statsData, classesData, teachersData] = await Promise.all([
                schoolAdminService.getStats(),
                schoolAdminService.listClasses(),
                schoolAdminService.listTeachers(),
            ]);
            setStats(statsData);
            setClasses(classesData);
            setTeachers(teachersData);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSchoolAdmin) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [isSchoolAdmin]);

    // Access denied
    if (!isSchoolAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Không có quyền truy cập</h1>
                    <p className="text-white/70 mb-6">Trang này chỉ dành cho <span className="text-indigo-400 font-medium">SCHOOL_ADMIN</span>.</p>
                    <div className="flex gap-3 justify-center">
                        <Link to="/dashboard" className="px-6 py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-100 transition-colors">
                            Về Dashboard
                        </Link>
                        <button onClick={logout} className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/10">
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: "overview", label: "Tổng quan", icon: <HomeIcon /> },
        { id: "accounts", label: "Quản lý tài khoản", icon: <UsersIcon /> },
        { id: "schedule", label: "Quản lý lịch học", icon: <CalendarIcon /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar - Fixed */}
            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                {/* Logo & Toggle */}
                <div className={`p-4 border-b border-gray-200 ${!sidebarCollapsed ? 'h-16 flex items-center' : ''}`}>
                    {sidebarCollapsed ? (
                        // Collapsed: Stack logo and toggle vertically, centered
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(false)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Mở rộng"
                            >
                                <MenuIcon />
                            </button>
                        </div>
                    ) : (
                        // Expanded: Logo left, toggle right
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg text-gray-900">SchoolIMS</h1>
                                    <p className="text-xs text-gray-500">School Admin</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Thu gọn"
                            >
                                <MenuIcon />
                            </button>
                        </div>
                    )}
                </div>

                {/* Menu */}
                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveMenu(item.id)}
                            title={sidebarCollapsed ? item.label : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm ${activeMenu === item.id
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            {item.icon}
                            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={logout}
                        title={sidebarCollapsed ? 'Đăng xuất' : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogoutIcon />
                        {!sidebarCollapsed && <span className="font-medium">Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center sticky top-0 z-30">
                    <div className="flex items-center justify-between w-full">
                        {/* Search */}
                        <div className="relative w-96">
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon />
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <BellIcon />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-2 py-1 transition-colors"
                                >
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.email}</p>
                                        <p className="text-xs text-gray-500">Quản trị viên</p>
                                    </div>
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                                        {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
                                    </div>
                                </button>

                                {/* Profile Dropdown */}
                                {profileDropdownOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        />
                                        {/* Dropdown Menu */}
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    // TODO: Navigate to profile page
                                                }}
                                            >
                                                <UserIcon />
                                                <span>Thông tin cá nhân</span>
                                            </button>
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    // TODO: Navigate to change password page
                                                }}
                                            >
                                                <LockIcon />
                                                <span>Đổi mật khẩu</span>
                                            </button>
                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    logout();
                                                }}
                                            >
                                                <LogoutIcon />
                                                <span>Đăng xuất</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-8 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* Welcome Banner */}
                            <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
                                <h2 className="text-2xl font-bold mb-2">Chào, {user?.fullName || 'Admin'}! 👋</h2>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-4 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                                            <ClassIcon />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium mb-1">Tổng số lớp</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                                            <TeacherIcon />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium mb-1">Số giáo viên</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats?.totalTeachers || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500 flex-shrink-0">
                                            <StudentIcon />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium mb-1">Tổng học sinh</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 flex-shrink-0">
                                            <CalendarIcon />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium mb-1">Năm học</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats?.currentAcademicYear || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Thao tác nhanh</h3>
                                <p className="text-gray-500 text-sm mb-4">Các chức năng thường dùng</p>

                                <div className="grid grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group text-center"
                                    >
                                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white group-hover:scale-110 transition-transform">
                                            <PlusIcon />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Thêm lớp học</span>
                                    </button>

                                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all group text-center">
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-600 group-hover:scale-110 transition-transform">
                                            <UploadIcon />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Upload file Excel</span>
                                    </button>

                                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all group text-center">
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-600 group-hover:scale-110 transition-transform">
                                            <AccountIcon />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Quản lý tài khoản</span>
                                    </button>

                                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all group text-center">
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-600 group-hover:scale-110 transition-transform">
                                            <ReportIcon />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Báo cáo hoạt động</span>
                                    </button>
                                </div>
                            </div>

                            {/* Class List */}
                            {classes.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Danh sách lớp học</h3>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <PlusIcon />
                                            Thêm lớp
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tên lớp</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Khối</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Năm học</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Phòng</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Phân ban</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">GVCN</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Sĩ số</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Trạng thái</th>
                                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {classes.map((cls) => (
                                                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cls.name}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{cls.grade}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{cls.academicYear}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{cls.roomNumber || "—"}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {cls.department === 'TU_NHIEN' ? 'Tự nhiên' :
                                                                cls.department === 'XA_HOI' ? 'Xã hội' : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{cls.homeroomTeacherName || "—"}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{cls.maxCapacity}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls.status === 'ACTIVE'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {cls.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng HĐ'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingClass(cls);
                                                                        setShowEditModal(true);
                                                                    }}
                                                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                                >
                                                                    Sửa
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setDeletingClass(cls);
                                                                        setShowDeleteModal(true);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                                >
                                                                    Xóa
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Modals */}
            <AddClassModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchData}
                teachers={teachers}
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
