import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    schoolAdminService,
    type ClassRoomDto,
    type StudentDto,
    type BulkPromoteRequest,
    type BulkPromoteResponse
} from "../../../../services/schoolAdminService";
import { semesterService, type AcademicYearDto } from "../../../../services/semesterService";
import { XIcon } from "../../SchoolAdminIcons";

interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classData: ClassRoomDto | null;
    allClasses: ClassRoomDto[];
}

function PromotionModal({ isOpen, onClose, onSuccess, classData, allClasses }: PromotionModalProps) {
    const [students, setStudents] = useState<StudentDto[]>([]);
    const [targetAcademicYear, setTargetAcademicYear] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [academicYears, setAcademicYears] = useState<AcademicYearDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [result, setResult] = useState<BulkPromoteResponse | null>(null);
    const [step, setStep] = useState<'select' | 'result'>('select');

    const targetGrade = classData ? classData.grade + 1 : 0;

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAcademicYears();
            if (classData) {
                setLoadingStudents(true);
                schoolAdminService.listStudents({ classId: classData.id, size: 1000 }).then(response => {
                    setStudents(response.content.filter((s: StudentDto) => s.status === 'ACTIVE'));
                    setLoadingStudents(false);
                }).catch(() => setLoadingStudents(false));

                // Compute default next academic year
                const parts = classData.academicYear.split('-');
                if (parts.length === 2 && !targetAcademicYear) {
                    setTargetAcademicYear(`${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`);
                }
            }
        }
    }, [isOpen, classData]);

    const fetchAcademicYears = async () => {
        setLoadingYears(true);
        try {
            const years = await semesterService.listAcademicYears();
            if (!Array.isArray(years)) {
                setAcademicYears([]);
                return;
            }
            // Promoting usually goes to UPCOMING, but allow ACTIVE just in case
            const filtered = years.filter(y => y.status === 'ACTIVE' || y.status === 'UPCOMING');
            setAcademicYears(filtered);
        } catch (err) {
            console.error("Failed to fetch academic years", err);
            setAcademicYears([]);
        } finally {
            setLoadingYears(false);
        }
    };


    // Check if target classes exist
    const targetClassesExist = allClasses.some(c =>
        c.grade === targetGrade && c.academicYear === targetAcademicYear && c.status === 'ACTIVE'
    );

    const toggleAll = () => {
        if (selectedIds.size === students.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map(s => s.id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handlePromote = async () => {
        if (selectedIds.size === 0) return;
        setLoading(true);
        try {
            const req: BulkPromoteRequest = {
                studentIds: Array.from(selectedIds),
                targetGrade,
                targetAcademicYear
            };
            const res = await schoolAdminService.promoteStudents(req);
            setResult(res);
            setStep('result');
            if (res.promoted > 0) onSuccess();
        } catch (err: any) {
            setResult({
                promoted: 0,
                skipped: selectedIds.size,
                errors: [err?.response?.data?.message || 'Đã xảy ra lỗi']
            });
            setStep('result');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('select');
        setSelectedIds(new Set());
        setResult(null);
        setStudents([]);
        onClose();
    };

    if (!isOpen || !classData) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Xét lên lớp – {classData.name}</h3>
                            <p className="text-sm text-gray-500">
                                {step === 'select' && `Khối ${classData.grade} → Khối ${targetGrade} • Năm học ${targetAcademicYear}`}
                                {step === 'result' && 'Kết quả xét lên lớp'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <XIcon />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {step === 'select' && (
                        <div>
                            {/* Target academic year config */}
                            <div className="mb-4 flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm học đích</label>
                                    <select
                                        value={targetAcademicYear}
                                        onChange={e => setTargetAcademicYear(e.target.value)}
                                        disabled={loadingYears}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white cursor-pointer disabled:bg-slate-50"
                                    >
                                        <option value="">-- Chọn năm học --</option>
                                        {Array.isArray(academicYears) && academicYears.map(y => (
                                            <option key={y.id} value={y.name}>
                                                {y.name}
                                            </option>
                                        ))}

                                        {/* Fallback if computed year is not in list */}
                                        {targetAcademicYear && !academicYears.some(y => y.name === targetAcademicYear) && (
                                            <option value={targetAcademicYear}>{targetAcademicYear}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khối đích</label>
                                    <input type="text" value={`Khối ${targetGrade}`} disabled
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-gray-50 text-gray-500 text-sm" />
                                </div>
                            </div>

                            {!targetClassesExist && targetAcademicYear && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-amber-700">
                                        ⚠️ Chưa có lớp ACTIVE ở khối {targetGrade} cho năm học {targetAcademicYear}.
                                    </p>
                                </div>
                            )}

                            {loadingStudents ? (
                                <div className="text-center py-8 text-gray-400">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                                    <p>Đang tải danh sách học sinh...</p>
                                </div>
                            ) : students.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p>Không có học sinh ACTIVE nào trong lớp này</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === students.length && students.length > 0}
                                                onChange={toggleAll}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            Chọn tất cả ({students.length})
                                        </label>
                                        <span className="text-sm text-blue-600 font-medium">
                                            Đã chọn: {selectedIds.size}
                                        </span>
                                    </div>
                                    <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="w-10 px-3 py-2"></th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Mã HS</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Họ tên</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Giới tính</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {Array.isArray(students) && students.map(s => (
                                                    <tr key={s.id}
                                                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedIds.has(s.id) ? 'bg-blue-50/30' : ''}`}
                                                        onClick={() => toggleOne(s.id)}
                                                    >
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(s.id)}
                                                                onChange={() => toggleOne(s.id)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{s.studentCode}</td>
                                                        <td className="px-3 py-2 font-medium text-gray-900">{s.fullName}</td>
                                                        <td className="px-3 py-2 text-gray-500">
                                                            {s.gender === 'MALE' ? 'Nam' : s.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                                        </td>
                                                    </tr>
                                                ))}

                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 'result' && result && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-green-600">{result.promoted}</p>
                                    <p className="text-sm text-green-700 mt-1">Thành công</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-amber-600">{result.skipped}</p>
                                    <p className="text-sm text-amber-700 mt-1">Bỏ qua</p>
                                </div>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <p className="text-sm font-medium text-red-700 mb-2">Chi tiết lỗi:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-600 max-h-40 overflow-y-auto">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    {step === 'select' && (
                        <>
                            <button onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >Hủy</button>
                            <button
                                onClick={handlePromote}
                                disabled={selectedIds.size === 0 || loading || !targetAcademicYear}
                                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>Xét lên lớp ({selectedIds.size} HS)</>
                                )}
                            </button>
                        </>
                    )}
                    {step === 'result' && (
                        <button onClick={handleClose}
                            className="ml-auto px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                        >Đóng</button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default PromotionModal;
