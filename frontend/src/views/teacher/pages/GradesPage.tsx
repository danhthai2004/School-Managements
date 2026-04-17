import React, { useEffect, useState, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
    Save, Download, Upload, AlertCircle, Calculator, CheckCircle, Plus, X, HelpCircle,
    ChevronDown, ChevronRight, Users, BookOpen
} from "lucide-react";
import { teacherService } from "../../../services/teacherService";
import type { GradeBook, StudentGrade, AssignedClass, SubGradeColumn, SubGradeValue, TeacherProfile, HomeroomGradeSummary } from "../../../services/teacherService";

// ==================== COMPONENTS ====================

const GradeInput: React.FC<{
    value: number | null;
    onChange: (val: number | null) => void;
    disabled: boolean;
    max?: number;
}> = ({ value, onChange, disabled, max = 10 }) => {
    const [localVal, setLocalVal] = useState(value !== null ? value.toString() : "");

    useEffect(() => {
        setLocalVal(value !== null ? value.toString() : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalVal(val);
        if (val === "") { onChange(null); return; }
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= max) onChange(num);
    };

    return (
        <input
            type="number" min="0" max={max} step="0.1" title="Grade Input"
            className={`w-16 p-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-300"
                }`}
            value={localVal} onChange={handleChange} disabled={disabled}
        />
    );
};

// Add Column Dropdown
const AddColumnDropdown: React.FC<{
    onAdd: (category: 'ORAL' | 'TEST_15MIN') => void;
}> = ({ onAdd }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100 transition-colors"
                title="Thêm cột điểm thành phần"
            >
                <Plus className="w-3 h-3" /> Thêm cột
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                    <button
                        onClick={() => { onAdd('ORAL'); setOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-gray-700 rounded-t-lg"
                    >
                        📝 Điểm miệng
                    </button>
                    <button
                        onClick={() => { onAdd('TEST_15MIN'); setOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-gray-700 rounded-b-lg border-t"
                    >
                        📋 Kiểm tra 15 phút
                    </button>
                </div>
            )}
        </div>
    );
};

// Resolve Popup (class-wide, triggered from header)
const ResolvePopup: React.FC<{
    onResolve: (strategy: 'AVERAGE' | 'MAX') => void;
    onClose: () => void;
    totalSubColumns: number;
    regularCount: number;
}> = ({ onResolve, onClose, totalSubColumns, regularCount }) => {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Chọn cách tính ĐĐGtx</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Có {totalSubColumns} đầu điểm thành phần nhưng chỉ {regularCount} cột ĐĐGtx.<br />
                    Chọn cách tính cho <strong>tất cả học sinh</strong>:
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => onResolve('AVERAGE')}
                        className="w-full flex items-center p-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all"
                    >
                        <div className="text-left">
                            <p className="font-medium text-gray-800">📊 Lấy trung bình</p>
                            <p className="text-xs text-gray-500">Tính TB tất cả đầu điểm cho mỗi HS</p>
                        </div>
                    </button>
                    <button
                        onClick={() => onResolve('MAX')}
                        className="w-full flex items-center p-3 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition-all"
                    >
                        <div className="text-left">
                            <p className="font-medium text-gray-800">🏆 Lấy điểm cao nhất</p>
                            <p className="text-xs text-gray-500">Lấy {regularCount} điểm cao nhất cho mỗi HS</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Overwrite Confirmation Popup
const OverwriteConfirmPopup: React.FC<{
    studentsWithExisting: number;
    onConfirmNew: () => void;
    onKeepOld: () => void;
    onClose: () => void;
}> = ({ studentsWithExisting, onConfirmNew, onKeepOld, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-amber-700">⚠️ Có điểm ĐĐGtx sẵn</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Có <strong>{studentsWithExisting}</strong> học sinh đã có điểm ĐĐGtx trước đó.
                    Bạn muốn:
                </p>
                <div className="space-y-3">
                    <button
                        onClick={onConfirmNew}
                        className="w-full p-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all text-left"
                    >
                        <p className="font-medium text-gray-800">🔄 Ghi đè điểm mới</p>
                        <p className="text-xs text-gray-500">Thay thế điểm ĐĐGtx cũ bằng điểm tính từ điểm thành phần</p>
                    </button>
                    <button
                        onClick={onKeepOld}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-left"
                    >
                        <p className="font-medium text-gray-800">📌 Giữ điểm cũ</p>
                        <p className="text-xs text-gray-500">Chỉ tính điểm mới cho HS chưa có điểm ĐĐGtx</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== HOMEROOM GRADE SUMMARY VIEW ====================

const perfColor = (cat: string) => {
    switch (cat) {
        case 'Giỏi': return 'bg-emerald-100 text-emerald-800';
        case 'Khá': return 'bg-blue-100 text-blue-800';
        case 'Trung bình': return 'bg-amber-100 text-amber-800';
        case 'Yếu': return 'bg-orange-100 text-orange-800';
        case 'Kém': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-500';
    }
};

const avgColor = (val: number | null) => {
    if (val === null) return 'text-gray-400';
    if (val >= 8.0) return 'text-emerald-600 font-bold';
    if (val >= 6.5) return 'text-blue-600 font-semibold';
    if (val >= 5.0) return 'text-amber-600';
    if (val >= 3.5) return 'text-orange-600';
    return 'text-red-600';
};

const HomeroomGradeSummaryView: React.FC = () => {
    const [semester, setSemester] = useState(1);
    const [summary, setSummary] = useState<HomeroomGradeSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await teacherService.getHomeroomGradeSummary(semester);
            setSummary(data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Không thể tải bảng tổng hợp điểm.");
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [semester]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // Count performance stats
    const perfStats = summary ? {
        gioi: summary.students.filter(s => s.performanceCategory === 'Giỏi').length,
        kha: summary.students.filter(s => s.performanceCategory === 'Khá').length,
        tb: summary.students.filter(s => s.performanceCategory === 'Trung bình').length,
        yeu: summary.students.filter(s => s.performanceCategory === 'Yếu' || s.performanceCategory === 'Kém').length,
    } : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Tổng hợp điểm lớp chủ nhiệm
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {summary ? `${summary.className} — Năm học ${summary.academicYear}` : 'Xem tổng hợp học lực toàn lớp'}
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Semester selector */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setSemester(1)}
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${semester === 1 ? 'bg-white shadow-sm text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                            Học kỳ I
                        </button>
                        <button onClick={() => setSemester(2)}
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${semester === 2 ? 'bg-white shadow-sm text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                            Học kỳ II
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Performance Stats Cards */}
            {perfStats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <span className="text-emerald-600 font-bold text-sm">G</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{perfStats.gioi}</p>
                                <p className="text-xs text-gray-500">Giỏi</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">K</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{perfStats.kha}</p>
                                <p className="text-xs text-gray-500">Khá</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <span className="text-amber-600 font-bold text-sm">TB</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{perfStats.tb}</p>
                                <p className="text-xs text-gray-500">Trung bình</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <span className="text-red-600 font-bold text-sm">Y</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{perfStats.yeu}</p>
                                <p className="text-xs text-gray-500">Yếu / Kém</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Đang tải bảng tổng hợp...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="w-16 h-16 mx-auto text-red-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Không thể tải dữ liệu</h3>
                        <p>{error}</p>
                    </div>
                ) : summary && summary.subjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Chưa có môn học</h3>
                        <p>Chưa có thời khóa biểu cho lớp này.</p>
                    </div>
                ) : summary ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-3 w-10 text-center sticky left-0 bg-gray-50 z-10">#</th>
                                    <th className="px-3 py-3 w-24 sticky left-10 bg-gray-50 z-10">Mã HS</th>
                                    <th className="px-3 py-3 min-w-[160px] sticky left-[7rem] bg-gray-50 z-10">Họ và tên</th>
                                    {summary.subjects.map(sub => (
                                        <th key={sub.subjectId} className="px-3 py-3 text-center border-l border-gray-200 min-w-[80px]">
                                            <span className="text-xs">{sub.subjectName}</span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-center border-l-2 border-indigo-200 bg-indigo-50/50 min-w-[70px]">TBC</th>
                                    <th className="px-3 py-3 text-center border-l border-gray-200 min-w-[90px]">Xếp loại</th>
                                    <th className="px-3 py-3 w-10 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {summary.students.map((student, idx) => {
                                    const isExpanded = expandedStudent === student.studentId;
                                    return (
                                        <React.Fragment key={student.studentId}>
                                            <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}>
                                                <td className="px-3 py-3 text-center text-gray-500 sticky left-0 bg-white z-10">{idx + 1}</td>
                                                <td className="px-3 py-3 font-medium text-gray-900 sticky left-10 bg-white z-10">{student.studentCode}</td>
                                                <td className="px-3 py-3 font-medium text-blue-600 sticky left-[7rem] bg-white z-10">{student.fullName}</td>
                                                {summary.subjects.map(sub => {
                                                    const detail = student.subjectGrades[sub.subjectId];
                                                    const avg = detail?.average ?? null;
                                                    return (
                                                        <td key={sub.subjectId} className={`px-3 py-3 text-center border-l border-gray-100 ${avgColor(avg)}`}>
                                                            {avg !== null ? avg.toFixed(1) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className={`px-3 py-3 text-center border-l-2 border-indigo-200 bg-indigo-50/30 font-bold ${avgColor(student.overallAverage)}`}>
                                                    {student.overallAverage !== null ? student.overallAverage.toFixed(1) : '-'}
                                                </td>
                                                <td className="px-3 py-3 text-center border-l border-gray-100">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${perfColor(student.performanceCategory)}`}>
                                                        {student.performanceCategory}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </td>
                                            </tr>
                                            {/* Expanded detail row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan={summary.subjects.length + 6} className="px-6 py-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {summary.subjects.map(sub => {
                                                                const detail = student.subjectGrades[sub.subjectId];
                                                                if (!detail) return null;
                                                                return (
                                                                    <div key={sub.subjectId} className="bg-white rounded-lg border border-gray-200 p-3">
                                                                        <h5 className="font-medium text-gray-800 text-xs mb-2 flex items-center justify-between">
                                                                            {sub.subjectName}
                                                                            <span className={`text-sm ${avgColor(detail.average)}`}>
                                                                                {detail.average !== null ? detail.average.toFixed(1) : '-'}
                                                                            </span>
                                                                        </h5>
                                                                        <div className="space-y-1 text-xs text-gray-600">
                                                                            <div className="flex justify-between">
                                                                                <span>ĐĐGtx:</span>
                                                                                <span>{detail.regularGrades.map((g) => g !== null ? g.toFixed(1) : '-').join(', ')}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>Giữa kỳ (HS2):</span>
                                                                                <span className="font-medium">{detail.midTerm !== null ? detail.midTerm.toFixed(1) : '-'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>Cuối kỳ (HS3):</span>
                                                                                <span className="font-medium">{detail.finalTerm !== null ? detail.finalTerm.toFixed(1) : '-'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================

const GradesPage = () => {
    const { teacherProfile } = useOutletContext<{ teacherProfile: TeacherProfile | null }>();
    const isHomeroom = teacherProfile?.isHomeroomTeacher ?? false;
    const [activeTab, setActiveTab] = useState<'subject' | 'homeroom'>('subject');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [selectedSemester, setSelectedSemester] = useState<number>(1);

    const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [resolvePopup, setResolvePopup] = useState<number | null>(null); // column index (1, 2, etc.)
    const [overwritePopup, setOverwritePopup] = useState<{ strategy: 'AVERAGE' | 'MAX', studentsWithExisting: number, colIndex: number } | null>(null);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const profile = await teacherService.getProfile();
                setAssignedClasses(profile.assignedClasses || []);
                if (profile.assignedClasses?.length > 0) {
                    const first = profile.assignedClasses[0];
                    setSelectedClassId(first.classId);
                    setSelectedSubjectId(first.subjectId);
                }
            } catch (err) {
                console.error("Failed to load classes", err);
            }
        };
        fetchClasses();
    }, []);

    const fetchGrades = useCallback(async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        setLoading(true);
        setMsg(null);
        try {
            const data = await teacherService.getGradeBook(selectedClassId, selectedSubjectId, selectedSemester);
            setGradeBook(data);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.response?.data?.message || "Không thể tải bảng điểm." });
            setGradeBook(null);
        } finally {
            setLoading(false);
        }
    }, [selectedClassId, selectedSubjectId, selectedSemester]);

    useEffect(() => { fetchGrades(); }, [fetchGrades]);

    // ==================== HANDLERS ====================

    const handleGradeChange = (studentId: string, type: 'REGULAR' | 'MID_TERM' | 'FINAL_TERM', index: number | undefined, newValue: number | null) => {
        if (!gradeBook) return;
        const updatedStudents = gradeBook.students.map(s => {
            if (s.studentId !== studentId) return s;
            const existingIdx = s.grades.findIndex(g => g.type === type && g.index === index);
            const newGrades = [...s.grades];
            if (existingIdx >= 0) {
                newGrades[existingIdx] = { ...newGrades[existingIdx], value: newValue };
            } else {
                newGrades.push({ type, index, value: newValue });
            }
            return { ...s, grades: newGrades };
        });
        setGradeBook({ ...gradeBook, students: updatedStudents });
    };

    const handleSubGradeChange = (studentId: string, category: string, subIndex: number, newValue: number | null) => {
        if (!gradeBook) return;
        const updatedStudents = gradeBook.students.map(s => {
            if (s.studentId !== studentId) return s;
            const subGrades = [...(s.subGrades || [])];
            const existingIdx = subGrades.findIndex(sg => sg.category === category && sg.subIndex === subIndex);
            if (existingIdx >= 0) {
                subGrades[existingIdx] = { ...subGrades[existingIdx], value: newValue };
            } else {
                subGrades.push({ category: category as 'ORAL' | 'TEST_15MIN', subIndex, value: newValue });
            }
            return { ...s, subGrades };
        });
        setGradeBook({ ...gradeBook, students: updatedStudents });
    };

    const handleAddColumn = (category: 'ORAL' | 'TEST_15MIN') => {
        if (!gradeBook) return;
        const existingCols = (gradeBook.subGradeColumns || []).filter(c => c.category === category);
        const maxIndex = existingCols.reduce((max, c) => Math.max(max, c.subIndex), 0);
        const newIndex = maxIndex + 1;
        const label = (category === 'ORAL' ? 'Miệng ' : "15' ") + newIndex;
        const newCol: SubGradeColumn = { category, subIndex: newIndex, label };
        const updatedColumns = [...(gradeBook.subGradeColumns || []), newCol];
        // Sort: ORAL first, then TEST_15MIN, within each group by subIndex
        updatedColumns.sort((a, b) => {
            if (a.category !== b.category) return a.category === 'ORAL' ? -1 : 1;
            return a.subIndex - b.subIndex;
        });
        setGradeBook({ ...gradeBook, subGradeColumns: updatedColumns });
    };

    const handleRemoveColumn = async (category: string, subIndex: number) => {
        if (!gradeBook) return;
        // Remove column from local state
        const updatedColumns = (gradeBook.subGradeColumns || []).filter(
            c => !(c.category === category && c.subIndex === subIndex)
        );
        // Remove corresponding sub-grade values from all students
        const updatedStudents = gradeBook.students.map(s => ({
            ...s,
            subGrades: (s.subGrades || []).filter(
                sg => !(sg.category === category && sg.subIndex === subIndex)
            )
        }));
        setGradeBook({ ...gradeBook, subGradeColumns: updatedColumns, students: updatedStudents });
        // Also delete from backend if data was persisted
        if (selectedClassId && selectedSubjectId) {
            try {
                await teacherService.removeSubGradeColumn(
                    selectedClassId, selectedSubjectId, selectedSemester, category, subIndex
                );
            } catch { /* column may not exist in DB yet */ }
        }
    };

    const handleResolve = (strategy: 'AVERAGE' | 'MAX') => {
        if (!gradeBook || resolvePopup === null) return;
        const colIndex = resolvePopup;
        setResolvePopup(null);

        // Check if any students already have a value at this specific REGULAR column
        const studentsWithExisting = gradeBook.students.filter(s =>
            s.grades.some(g => g.type === 'REGULAR' && g.index === colIndex && g.value !== null)
        ).length;

        if (studentsWithExisting > 0) {
            setOverwritePopup({ strategy, studentsWithExisting, colIndex });
        } else {
            applyResolve(strategy, false, colIndex);
        }
    };

    const applyResolve = (strategy: 'AVERAGE' | 'MAX', skipExisting: boolean, colIndex: number) => {
        if (!gradeBook) return;

        const updatedStudents = gradeBook.students.map(student => {
            const subValues = (student.subGrades || [])
                .filter(sg => sg.value !== null)
                .map(sg => sg.value as number);

            if (subValues.length === 0) return student;

            // If skipExisting, don't overwrite this student's column if it already has a value
            if (skipExisting && student.grades.some(g => g.type === 'REGULAR' && g.index === colIndex && g.value !== null)) {
                return student;
            }

            const newGrades = [...student.grades];
            let computedValue: number;

            if (strategy === 'MAX') {
                const sorted = [...subValues].sort((a, b) => b - a);
                // For column index N, take the Nth highest score (0-indexed: colIndex-1)
                computedValue = (colIndex - 1) < sorted.length ? sorted[colIndex - 1] : sorted[sorted.length - 1];
            } else {
                computedValue = Math.round((subValues.reduce((a, b) => a + b, 0) / subValues.length) * 10) / 10;
            }

            const existingIdx = newGrades.findIndex(g => g.type === 'REGULAR' && g.index === colIndex);
            if (existingIdx >= 0) {
                newGrades[existingIdx] = { ...newGrades[existingIdx], value: computedValue };
            } else {
                newGrades.push({ type: 'REGULAR', index: colIndex, value: computedValue });
            }

            return { ...student, grades: newGrades };
        });

        setGradeBook({ ...gradeBook, students: updatedStudents });
        setOverwritePopup(null);
        setMsg({ type: 'success', text: `Đã tính ĐĐG${colIndex} (${strategy === 'AVERAGE' ? 'trung bình' : 'cao nhất'}) cho cả lớp! Nhấn Lưu để lưu lại.` });
        setTimeout(() => setMsg(null), 5000);
    };

    const handleSave = async () => {
        if (!gradeBook) return;
        setSaving(true);
        try {
            await teacherService.saveGrades({
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                semester: selectedSemester,
                students: gradeBook.students
            });
            setMsg({ type: 'success', text: "Lưu điểm thành công!" });
            setTimeout(() => setMsg(null), 3000);
        } catch {
            setMsg({ type: 'error', text: "Lỗi khi lưu điểm. Vui lòng thử lại." });
        } finally {
            setSaving(false);
        }
    };

    // ==================== HELPERS ====================

    const getGradeValue = (student: StudentGrade, type: string, index?: number) => {
        const found = student.grades.find(g => g.type === type && g.index === index);
        return found ? found.value : null;
    };

    const getSubGradeValue = (student: StudentGrade, category: string, subIndex: number): SubGradeValue | undefined => {
        return (student.subGrades || []).find(sg => sg.category === category && sg.subIndex === subIndex);
    };

    const subGradeColumns: SubGradeColumn[] = gradeBook?.subGradeColumns || [];
    const totalSubGradeColumns = subGradeColumns.length;
    const regularCount = gradeBook?.regularAssessmentCount || 2;
    const hasOverflow = totalSubGradeColumns > regularCount;

    const calculateAverage = (student: StudentGrade) => {
        let total = 0;
        let weight = 0;

        for (let i = 1; i <= regularCount; i++) {
            const val = getGradeValue(student, 'REGULAR', i);
            if (val !== null) { total += val; weight += 1; }
        }

        const mid = getGradeValue(student, 'MID_TERM');
        if (mid !== null) { total += mid * 2; weight += 2; }

        const final_ = getGradeValue(student, 'FINAL_TERM');
        if (final_ !== null) { total += final_ * 3; weight += 3; }

        return weight > 0 ? (total / weight).toFixed(1) : "-";
    };

    // ==================== RENDER ====================

    return (
        <div className="space-y-6">
            {/* Tab Bar — only shown for GVCN */}
            {isHomeroom && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('subject')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'subject'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Calculator className="w-4 h-4" />
                            Nhập điểm bộ môn
                        </button>
                        <button
                            onClick={() => setActiveTab('homeroom')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'homeroom'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            Tổng hợp lớp {teacherProfile?.homeroomClassName || 'CN'}
                        </button>
                    </nav>
                </div>
            )}

            {/* Homeroom Summary Tab */}
            {activeTab === 'homeroom' && isHomeroom ? (
                <HomeroomGradeSummaryView />
            ) : (
            <>
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-blue-600" />
                        Quản lý điểm số
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Nhập và theo dõi kết quả học tập</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Upload className="w-4 h-4" /> Nhập Excel
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" /> Xuất báo cáo
                    </button>
                    {gradeBook?.canEdit && (
                        <button
                            onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lớp & Môn học</label>
                    <select
                        className="w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={selectedSubjectId ? `${selectedClassId}|${selectedSubjectId}` : ""}
                        onChange={(e) => {
                            const [cid, sid] = e.target.value.split("|");
                            setSelectedClassId(cid);
                            setSelectedSubjectId(sid);
                        }}
                    >
                        <option value="">Chọn lớp học phần...</option>
                        {assignedClasses.map((ac, idx) => (
                            <option key={`${ac.classId}-${ac.subjectId}-${idx}`} value={`${ac.classId}|${ac.subjectId}`}>
                                {ac.className} - {ac.subjectName}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setSelectedSemester(1)}
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${selectedSemester === 1 ? 'bg-white shadow-sm text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Học kỳ I
                        </button>
                        <button
                            onClick={() => setSelectedSemester(2)}
                            className={`px-4 py-1.5 text-sm rounded-md transition-all ${selectedSemester === 2 ? 'bg-white shadow-sm text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Học kỳ II
                        </button>
                    </div>
                </div>

                <div className="ml-auto">
                    {msg && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {msg.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Overflow info banner */}
            {gradeBook && hasOverflow && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-700">
                    <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium">Có {totalSubGradeColumns} đầu điểm thành phần nhưng chỉ {regularCount} cột ĐĐGtx</h4>
                        <p className="text-sm mt-1">Nhấn vào dấu <strong>?</strong> ở cột ĐĐGtx để chọn cách tính: lấy trung bình hoặc lấy điểm cao nhất.</p>
                    </div>
                </div>
            )}

            {/* Grade Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {!selectedClassId ? (
                    <div className="p-12 text-center text-gray-500">
                        <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Chưa chọn lớp học</h3>
                        <p>Vui lòng chọn lớp và môn học để nhập điểm</p>
                    </div>
                ) : loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Đang tải bảng điểm...</p>
                    </div>
                ) : !gradeBook ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="w-16 h-16 mx-auto text-red-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Không có dữ liệu</h3>
                        <p>{msg?.type === 'error' ? msg.text : "Không thể tải dữ liệu bảng điểm."}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">#</th>
                                    <th className="px-4 py-3 w-32">Mã HS</th>
                                    <th className="px-4 py-3 min-w-[150px]">Họ và tên</th>

                                    {/* Sub-Grade Columns (Điểm thành phần) */}
                                    {subGradeColumns.length > 0 && (
                                        <th className="px-2 py-3 text-center border-l bg-emerald-50/50" colSpan={subGradeColumns.length}>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xs">Điểm thành phần</span>
                                                {gradeBook.canEdit && (
                                                    <AddColumnDropdown onAdd={handleAddColumn} />
                                                )}
                                            </div>
                                        </th>
                                    )}
                                    {subGradeColumns.length === 0 && gradeBook.canEdit && (
                                        <th className="px-2 py-3 text-center border-l bg-emerald-50/50">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-xs text-gray-400">ĐTP</span>
                                                <AddColumnDropdown onAdd={handleAddColumn} />
                                            </div>
                                        </th>
                                    )}

                                    {/* Regular Assessment Columns (ĐĐGtx) */}
                                    <th className="px-4 py-3 text-center border-l bg-blue-50/50" colSpan={regularCount}>
                                        Đánh giá thường xuyên (HS1)
                                    </th>
                                    <th className="px-4 py-3 w-24 text-center border-l bg-purple-50/50">Giữa kỳ (HS2)</th>
                                    <th className="px-4 py-3 w-24 text-center border-l bg-orange-50/50">Cuối kỳ (HS3)</th>
                                    <th className="px-4 py-3 w-20 text-center border-l">TBM</th>
                                    <th className="px-4 py-3 w-24 text-center">Ghi chú</th>
                                </tr>
                                {/* Sub-header row for column labels — always show ĐĐG labels */}
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th colSpan={3}></th>
                                    {subGradeColumns.map(col => (
                                        <th key={`${col.category}-${col.subIndex}`} className="px-1 py-1 text-center bg-emerald-50/30 border-l border-gray-100">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <span className="text-[10px] font-normal text-gray-500">{col.label}</span>
                                                {gradeBook.canEdit && (
                                                    <button
                                                        onClick={() => handleRemoveColumn(col.category, col.subIndex)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                        title="Xóa cột"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {Array.from({ length: regularCount }).map((_, i) => (
                                        <th key={`reg-label-${i}`} className="px-1 py-1 text-center bg-blue-50/30 border-l border-gray-100">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-[10px] font-normal text-gray-500">ĐĐG{i + 1}</span>
                                                {hasOverflow && gradeBook.canEdit && (
                                                    <button
                                                        onClick={() => setResolvePopup(i + 1)}
                                                        className="text-amber-500 hover:text-amber-700 transition-colors"
                                                        title={`Tính điểm ĐĐG${i + 1} từ điểm thành phần`}
                                                    >
                                                        <HelpCircle className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="border-l"></th>
                                    <th className="border-l"></th>
                                    <th className="border-l"></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {gradeBook.students.map((student, idx) => {
                                    return (
                                        <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{student.studentCode}</td>
                                            <td className="px-4 py-3 font-medium text-blue-600">{student.fullName}</td>

                                            {/* Sub-Grade Inputs */}
                                            {subGradeColumns.map(col => {
                                                const sgv = getSubGradeValue(student, col.category, col.subIndex);
                                                return (
                                                    <td key={`sg-${col.category}-${col.subIndex}`}
                                                        className="px-1 py-3 text-center bg-emerald-50/20 border-l border-gray-100">
                                                        <div className="flex justify-center">
                                                            <GradeInput
                                                                value={sgv?.value ?? null}
                                                                onChange={(v) => handleSubGradeChange(student.studentId, col.category, col.subIndex, v)}
                                                                disabled={!gradeBook.canEdit}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            {subGradeColumns.length === 0 && gradeBook.canEdit && (
                                                <td className="px-2 py-3 text-center text-gray-300 border-l border-gray-100 text-xs">—</td>
                                            )}

                                            {/* Regular Assessment Columns (ĐĐGtx) */}
                                            {Array.from({ length: regularCount }).map((_, i) => {
                                                const regValue = getGradeValue(student, 'REGULAR', i + 1);
                                                return (
                                                    <td key={`reg-${i}`} className="px-2 py-3 text-center bg-blue-50/30 border-l border-gray-100">
                                                        <div className="flex justify-center">
                                                            <GradeInput
                                                                value={regValue}
                                                                onChange={(v) => handleGradeChange(student.studentId, 'REGULAR', i + 1, v)}
                                                                disabled={!gradeBook.canEdit}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* Mid Term */}
                                            <td className="px-2 py-3 text-center bg-purple-50/30 border-l border-gray-100">
                                                <div className="flex justify-center">
                                                    <GradeInput
                                                        value={getGradeValue(student, 'MID_TERM')}
                                                        onChange={(v) => handleGradeChange(student.studentId, 'MID_TERM', undefined, v)}
                                                        disabled={!gradeBook.canEdit}
                                                    />
                                                </div>
                                            </td>

                                            {/* Final Term */}
                                            <td className="px-2 py-3 text-center bg-orange-50/30 border-l border-gray-100">
                                                <div className="flex justify-center">
                                                    <GradeInput
                                                        value={getGradeValue(student, 'FINAL_TERM')}
                                                        onChange={(v) => handleGradeChange(student.studentId, 'FINAL_TERM', undefined, v)}
                                                        disabled={!gradeBook.canEdit}
                                                    />
                                                </div>
                                            </td>

                                            {/* Average */}
                                            <td className="px-4 py-3 text-center font-bold text-gray-800 border-l border-gray-100">
                                                {calculateAverage(student)}
                                            </td>

                                            {/* Note */}
                                            <td className="px-4 py-3">
                                                <input type="text" className="w-full text-xs border-0 bg-transparent focus:ring-0 text-gray-500" placeholder="Thêm..." />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


            {!gradeBook?.canEdit && gradeBook && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <h4 className="font-medium">Chế độ xem</h4>
                        <p className="text-sm mt-1">Bạn đang xem điểm với vai trò Giáo viên chủ nhiệm. Chỉ giáo viên bộ môn được phân công mới có thể chỉnh sửa điểm này.</p>
                    </div>
                </div>
            )}

            {/* Resolve Popup */}
            {resolvePopup !== null && (
                <ResolvePopup
                    totalSubColumns={totalSubGradeColumns}
                    regularCount={regularCount}
                    onResolve={handleResolve}
                    onClose={() => setResolvePopup(null)}
                />
            )}

            {/* Overwrite Confirmation */}
            {overwritePopup && (
                <OverwriteConfirmPopup
                    studentsWithExisting={overwritePopup.studentsWithExisting}
                    onConfirmNew={() => applyResolve(overwritePopup.strategy, false, overwritePopup.colIndex)}
                    onKeepOld={() => applyResolve(overwritePopup.strategy, true, overwritePopup.colIndex)}
                    onClose={() => setOverwritePopup(null)}
                />
            )}
            </>
            )}
        </div>
    );
};

export default GradesPage;
