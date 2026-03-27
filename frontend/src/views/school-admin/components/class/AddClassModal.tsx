import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    schoolAdminService,
    type UserDto,
    type CreateClassRoomRequest,
    type CombinationDto,
    type RoomDto
} from "../../../../services/schoolAdminService";
import { semesterService, type AcademicYearDto } from "../../../../services/semesterService";
import { XIcon } from "../../SchoolAdminIcons";

interface AddClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    teachers: UserDto[];
    combinations: CombinationDto[];
    rooms: RoomDto[];
    defaultAcademicYear: string;
}

function AddClassModal({ isOpen, onClose, onSuccess, teachers, combinations, rooms, defaultAcademicYear }: AddClassModalProps) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState(10);
    const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
    const [maxCapacity, setMaxCapacity] = useState(35);
    const [roomId, setRoomId] = useState("");
    const [combinationId, setCombinationId] = useState("");
    const [homeroomTeacherId, setHomeroomTeacherId] = useState("");
    const [academicYears, setAcademicYears] = useState<AcademicYearDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchAcademicYears();
        }
    }, [isOpen]);

    const fetchAcademicYears = async () => {
        setLoadingYears(true);
        try {
            const years = await semesterService.listAcademicYears();
            // Filter: only show ACTIVE or UPCOMING
            const filtered = years.filter(y => y.status === 'ACTIVE' || y.status === 'UPCOMING');
            setAcademicYears(filtered);

            // If current academicYear is empty or not in the list, try to find the ACTIVE one
            const activeYear = filtered.find(y => y.status === 'ACTIVE');
            if (activeYear && !academicYear) {
                setAcademicYear(activeYear.name);
            } else if (!academicYear && filtered.length > 0) {
                setAcademicYear(filtered[0].name);
            }
        } catch (err) {
            console.error("Failed to fetch academic years", err);
        } finally {
            setLoadingYears(false);
        }
    };

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
                roomId: roomId || undefined,
                combinationId: combinationId || undefined
            };
            if (homeroomTeacherId) {
                req.homeroomTeacherId = homeroomTeacherId;
            }
            await schoolAdminService.createClass(req);
            setName("");
            setGrade(10);
            setMaxCapacity(35);
            setRoomId("");
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
                                    <select
                                        value={academicYear}
                                        onChange={(e) => setAcademicYear(e.target.value)}
                                        required
                                        disabled={loadingYears}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white disabled:bg-gray-50"
                                    >
                                        {academicYears.length === 0 && <option value="">Đang tải...</option>}
                                        {academicYears.map(y => (
                                            <option key={y.id} value={y.name}>
                                                {y.name}
                                            </option>
                                        ))}
                                    </select>
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng học</label>
                                    <select
                                        value={roomId}
                                        onChange={(e) => setRoomId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">-- Chọn phòng học --</option>
                                        {rooms.filter(r => r.status === 'ACTIVE').map((r) => (
                                            <option key={r.id} value={r.id}>{r.name} {r.building ? `(${r.building})` : ''} - {r.capacity} chỗ</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Quản lý phòng học tại mục Phòng học</p>
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

export default AddClassModal;
