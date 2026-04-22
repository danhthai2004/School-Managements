import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Save, FileText, Download, Upload, AlertCircle, CheckCircle, Users, Award, Plus, Minus, Search
} from "lucide-react";
import { teacherService } from "../../../services/teacherService";
import type { GradeBook, StudentGrade, AssignedClass } from "../../../services/teacherService";
import { vietnameseNameSort } from "../../../utils/sortUtils";
import { useSemester } from "../../../context/SemesterContext";
import SemesterSelector from "../../../components/common/SemesterSelector";
import ImportGradesModal from "../components/grades/ImportGradesModal";

const GradeInput: React.FC<{
    value: number | null;
    onChange: (val: number | null) => void;
    disabled: boolean;
    max?: number;
}> = ({ value, onChange, disabled, max = 10 }) => {
    const [localVal, setLocalVal] = useState(value !== null ? value.toString() : "");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setLocalVal(value !== null ? value.toString() : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalVal(val);

        if (val === "") {
            onChange(null);
            return;
        }

        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= max) {
            onChange(num);
        }
    };

    const getVariantStyles = () => {
        if (disabled) return "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200";
        if (isFocused) {
            return "border-blue-400 ring-4 ring-blue-500/10 bg-white shadow-sm z-10 relative";
        }
        return "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm";
    };

    const getValueColor = () => {
        if (disabled) return "";
        if (value === null) return "text-slate-400";
        if (value >= 8) return "text-emerald-600 font-semibold";
        if (value >= 6.5) return "text-blue-600 font-medium";
        if (value >= 5) return "text-amber-600 font-medium";
        return "text-red-500 font-semibold";
    };

    return (
        <input
            type="number"
            min="0"
            max={max}
            step="0.1"
            title="Nhập điểm"
            className={`w-[60px] py-1.5 text-center text-sm rounded-lg border outline-none transition-all duration-200 ${getVariantStyles()} ${getValueColor()}`}
            value={localVal}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="—"
        />
    );
};

const GradesPage = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);

    // Selection state
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const { activeSemester } = useSemester();
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    // Priority: Default to system ACTIVE semester on first load
    useEffect(() => {
        if (!selectedSemesterId && activeSemester) {
            setSelectedSemesterId(activeSemester.id);
        }
    }, [activeSemester, selectedSemesterId]);

    const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
    const [localRegularCount, setLocalRegularCount] = useState<number>(1);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sortBy, setSortBy] = useState<'NAME' | 'CODE'>('NAME');
    const [searchQuery, setSearchQuery] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);

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
        if (!selectedClassId || !selectedSubjectId || !selectedSemesterId) return;

        setLoading(true);
        setMsg(null);
        try {
            const data = await teacherService.getGradeBook(selectedClassId, selectedSubjectId, selectedSemesterId);
            setGradeBook(data);
            setLocalRegularCount(data.regularAssessmentCount || 1);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.response?.data?.message || "Không thể tải bảng điểm." });
            setGradeBook(null);
        } finally {
            setLoading(false);
        }
    }, [selectedClassId, selectedSubjectId, selectedSemesterId]);

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    const handleGradeChange = (studentId: string, type: 'REGULAR' | 'MID_TERM' | 'FINAL_TERM', index: number | undefined, newValue: number | null) => {
        if (!gradeBook) return;

        const updatedStudents = gradeBook.students.map((s: StudentGrade) => {
            if (s.studentId !== studentId) return s;

            const existingGradeIndex = s.grades.findIndex((g: any) => g.type === type && g.index == index);
            const newGrades = [...s.grades];

            if (existingGradeIndex >= 0) {
                newGrades[existingGradeIndex] = { ...newGrades[existingGradeIndex], value: newValue };
            } else {
                newGrades.push({ type, index, value: newValue });
            }

            return { ...s, grades: newGrades };
        });

        setGradeBook({ ...gradeBook, students: updatedStudents });
    };

    const handleAddColumn = () => {
        if (!gradeBook?.canEdit) return;
        if (localRegularCount < 10) {
            setLocalRegularCount((prev: number) => prev + 1);
        } else {
            setMsg({ type: 'error', text: "Tối đa 10 cột điểm thường xuyên." });
            setTimeout(() => setMsg(null), 3000);
        }
    };

    const handleRemoveColumn = () => {
        if (!gradeBook?.canEdit) return;
        if (localRegularCount <= 1) return;

        // Check if removing this column would hide existing data
        const hasDataInLastColumn = gradeBook.students.some((s: StudentGrade) => {
            const found = s.grades.find((g: any) => g.type === 'REGULAR' && g.index === localRegularCount);
            return found && found.value !== null && found.value !== undefined;
        });

        if (hasDataInLastColumn) {
            setMsg({ type: 'error', text: `Cột thứ ${localRegularCount} đang có điểm. Vui lòng xóa trắng điểm ở cột này trước khi thu hồi.` });
            setTimeout(() => setMsg(null), 4000);
            return;
        }

        setLocalRegularCount((prev: number) => prev - 1);
    };

    // Sorted and filtered students
    const processedStudents = useMemo(() => {
        if (!gradeBook) return [];

        let filtered = gradeBook.students.filter((s: StudentGrade) =>
            s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return [...filtered].sort((a: StudentGrade, b: StudentGrade) => {
            if (sortBy === 'CODE') {
                return a.studentCode.localeCompare(b.studentCode);
            } else {
                return vietnameseNameSort(a.fullName, b.fullName);
            }
        });
    }, [gradeBook, sortBy, searchQuery]);

    const handleSave = async () => {
        if (!gradeBook || !selectedSemesterId) return;
        setSaving(true);
        try {
            await teacherService.saveGrades({
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                semesterId: selectedSemesterId,
                students: gradeBook.students
            });
            setMsg({ type: 'success', text: "Lưu điểm thành công!" });
            setTimeout(() => setMsg(null), 3000);
        } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
            setMsg({ type: 'error', text: "Lỗi khi lưu điểm. Vui lòng thử lại." });
        } finally {
            setSaving(false);
        }
    };

    const getGradeValue = (student: StudentGrade, type: string, index?: number) => {
        const found = student.grades.find(g => g.type === type && g.index == index);
        return found ? found.value : null;
    };

    // Calculate average (approximate for display)
    const calculateAverage = (student: StudentGrade, regularCount: number) => {
        let total = 0;
        let weight = 0;

        // Regular (Coeff 1)
        for (let i = 1; i <= regularCount; i++) {
            const val = getGradeValue(student, 'REGULAR', i);
            if (val !== null) {
                total += val;
                weight += 1;
            }
        }

        // Mid (Coeff 2)
        const mid = getGradeValue(student, 'MID_TERM');
        if (mid !== null) {
            total += mid * 2;
            weight += 2;
        }

        // Final (Coeff 3)
        const final_ = getGradeValue(student, 'FINAL_TERM');
        if (final_ !== null) {
            total += final_ * 3;
            weight += 3;
        }

        return weight > 0 ? (total / weight).toFixed(1) : "—";
    };

    const getAverageColor = (avg: string) => {
        if (avg === "—") return "text-slate-400";
        const num = parseFloat(avg);
        if (num >= 8) return "text-emerald-600";
        if (num >= 6.5) return "text-blue-600";
        if (num >= 5) return "text-amber-600";
        return "text-red-500";
    };

    // Get selected class info for display
    const selectedAssignment = assignedClasses.find((ac: AssignedClass) => ac.classId === selectedClassId && ac.subjectId === selectedSubjectId);

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Quản lý điểm số
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Nhập và theo dõi kết quả học tập của học sinh
                    </p>
                </div>
                {/* Filters and Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên học sinh..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 bg-white shadow-sm"
                        />
                    </div>

                    {/* Sort Selector */}


                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={() => setShowImportModal(true)}
                            disabled={!selectedClassId || !selectedSubjectId || !selectedSemesterId}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload className="w-4 h-4" strokeWidth={1.8} />
                            Nhập Excel
                        </button>
                        <button
                            onClick={async () => {
                                if (selectedClassId && selectedSubjectId && selectedSemesterId) {
                                    try {
                                        const cls = selectedAssignment?.className ?? "lop";
                                        const subj = selectedAssignment?.subjectName ?? "mon";
                                        const filename = `bang_diem_${cls}_${subj}.xlsx`
                                            .replace(/\s+/g, "_")
                                            .replace(/[^a-zA-Z0-9_.\-]/g, "");
                                        await teacherService.exportGradeReport(selectedClassId, selectedSubjectId, selectedSemesterId, filename);
                                    } catch { setMsg({ type: 'error', text: 'Không thể xuất báo cáo.' }); }
                                }
                            }}
                            disabled={!selectedClassId || !selectedSubjectId || !selectedSemesterId}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" strokeWidth={1.8} />
                            Xuất báo cáo
                        </button>
                        {gradeBook?.canEdit && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" strokeWidth={1.8} />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {/* Filter Bar */}
                <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-wrap gap-4 items-end justify-between text-sm">
                    <div className="flex flex-wrap gap-5 items-end">
                        <div className="flex-1 min-w-[280px]">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                <Users className="w-3.5 h-3.5" />
                                Lớp & Môn học
                            </label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer hover:border-slate-300"
                                value={selectedSubjectId ? `${selectedClassId}|${selectedSubjectId}` : ""}
                                onChange={(e) => {
                                    const [cid, sid] = e.target.value.split("|");
                                    setSelectedClassId(cid);
                                    setSelectedSubjectId(sid);
                                }}
                            >
                                <option value="">Chọn lớp học phần...</option>
                                {assignedClasses.map((ac: AssignedClass, idx: number) => (
                                    <option key={`${ac.classId}-${ac.subjectId}-${idx}`} value={`${ac.classId}|${ac.subjectId}`}>
                                        {ac.className} — {ac.subjectName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <SemesterSelector
                            value={selectedSemesterId}
                            onChange={setSelectedSemesterId}
                            label="Học kỳ"
                        />

                        {/* Info badges */}
                        {selectedAssignment && gradeBook && (
                            <div className="ml-auto flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="font-semibold">{gradeBook.students.length}</span>
                                    <span className="text-slate-400">học sinh</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toast Message */}
                {msg && (
                    <div className={`mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {msg.text}
                    </div>
                )}

                {/* Grade Table */}
                <div className="overflow-hidden">
                    {!selectedClassId ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Chưa chọn lớp học</h3>
                            <p className="text-slate-400 text-sm">Vui lòng chọn lớp và môn học ở bộ lọc bên trên để bắt đầu nhập điểm</p>
                        </div>
                    ) : loading ? (
                        <div className="p-16 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-blue-600 mx-auto"></div>
                            <p className="mt-5 text-slate-500 font-medium">Đang tải bảng điểm...</p>
                        </div>
                    ) : !gradeBook ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <AlertCircle className="w-10 h-10 text-red-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Không có dữ liệu</h3>
                            <p className="text-slate-400 text-sm">{msg?.type === 'error' ? msg.text : "Không thể tải dữ liệu bảng điểm."}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">#</th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600 transition-colors group"
                                            onClick={() => setSortBy("CODE")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Mã HS
                                                {sortBy === "CODE" && (
                                                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[160px] cursor-pointer hover:text-blue-600 transition-colors group"
                                            onClick={() => setSortBy("NAME")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Họ và tên
                                                {sortBy === "NAME" && (
                                                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase" colSpan={localRegularCount}>
                                            <div className="flex items-center justify-center gap-1.5 relative group/header">
                                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                Thường xuyên (HS1)
                                                {gradeBook.canEdit && (
                                                    <div className="flex items-center gap-0.5 ml-2">
                                                        <button
                                                            onClick={handleRemoveColumn}
                                                            title="Bớt cột (chỉ bớt được nếu cột hoàn toàn trống)"
                                                            className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            disabled={localRegularCount <= 1}
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={handleAddColumn}
                                                            title="Thêm cột mới"
                                                            className="p-1 hover:bg-emerald-50 hover:text-emerald-500 rounded text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            disabled={localRegularCount >= 10}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-3 py-3 w-24 text-center text-xs font-semibold text-gray-500 uppercase">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                                                Giữa kỳ
                                            </div>
                                        </th>
                                        <th className="px-3 py-3 w-24 text-center text-xs font-semibold text-gray-500 uppercase">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                                Cuối kỳ
                                            </div>
                                        </th>
                                        <th className="px-3 py-3 w-20 text-center text-xs font-semibold text-gray-500 uppercase">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Award className="w-3.5 h-3.5 text-blue-500" />
                                                TBM
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {processedStudents.map((student, idx) => {
                                        const avg = calculateAverage(student, localRegularCount);
                                        return (
                                            <tr key={student.studentId} className="hover:bg-blue-50 transition-colors group">
                                                <td className="px-4 py-4 text-center text-gray-500 text-xs font-medium">{idx + 1}</td>
                                                <td className="px-4 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md font-mono">{student.studentCode}</span>
                                                </td>
                                                <td className="px-4 py-4 font-medium text-gray-900">{student.fullName}</td>

                                                {/* Regular Assessment Columns */}
                                                {Array.from({ length: localRegularCount }).map((_, i) => (
                                                    <td key={`reg-${i}`} className="px-1.5 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <GradeInput
                                                                value={getGradeValue(student, 'REGULAR', i + 1)}
                                                                onChange={(v) => handleGradeChange(student.studentId, 'REGULAR', i + 1, v)}
                                                                disabled={!gradeBook.canEdit}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}

                                                {/* Mid Term */}
                                                <td className="px-1.5 py-4 text-center bg-violet-50/20">
                                                    <div className="flex justify-center">
                                                        <GradeInput
                                                            value={getGradeValue(student, 'MID_TERM')}
                                                            onChange={(v) => handleGradeChange(student.studentId, 'MID_TERM', undefined, v)}
                                                            disabled={!gradeBook.canEdit}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Final Term */}
                                                <td className="px-1.5 py-4 text-center bg-amber-50/20">
                                                    <div className="flex justify-center">
                                                        <GradeInput
                                                            value={getGradeValue(student, 'FINAL_TERM')}
                                                            onChange={(v) => handleGradeChange(student.studentId, 'FINAL_TERM', undefined, v)}
                                                            disabled={!gradeBook.canEdit}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Average */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`text-sm font-semibold ${getAverageColor(avg)}`}>
                                                        {avg}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* View-only warning */}
            {!gradeBook?.canEdit && gradeBook && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 flex gap-4 items-start">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-amber-800">Chế độ xem</h4>
                        <p className="text-sm text-amber-600 mt-0.5">Bạn đang xem điểm với vai trò Giáo viên chủ nhiệm. Chỉ giáo viên bộ môn được phân công mới có thể chỉnh sửa điểm này.</p>
                    </div>
                </div>
            )}

            {/* Import Grades Modal */}
            <ImportGradesModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => {
                    fetchGrades();
                    setMsg({ type: 'success', text: 'Import điểm thành công!' });
                    setTimeout(() => setMsg(null), 3000);
                }}
                classId={selectedClassId}
                subjectId={selectedSubjectId}
                semesterId={selectedSemesterId}
                className={selectedAssignment?.className}
                subjectName={selectedAssignment?.subjectName}
            />
        </div>
    );
};

export default GradesPage;