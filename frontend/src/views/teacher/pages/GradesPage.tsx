import React, { useEffect, useState, useCallback } from "react";
// Removed unused imports
import { 
    Save, FileText, Download, Upload, AlertCircle, Calculator, CheckCircle
} from "lucide-react";
import { teacherService } from "../../../services/teacherService";
import type { GradeBook, StudentGrade, AssignedClass } from "../../../services/teacherService";

const GradeInput: React.FC<{
    value: number | null;
    onChange: (val: number | null) => void;
    disabled: boolean;
    max?: number;
}> = ({ value, onChange, disabled, max = 10 }) => {
    // Determine initial string value
    const [localVal, setLocalVal] = useState(value !== null ? value.toString() : "");

    // Sync generic value prop with local input state when value changes externally
    useEffect(() => {
        setLocalVal(value !== null ? value.toString() : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalVal(val); // Update UI immediately

        if (val === "") {
            onChange(null);
            return;
        }

        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= max) {
            onChange(num);
        }
        // If invalid number, we don't call onChange but keep localVal as is (user typing)
    };

    return (
        <input
            type="number"
            min="0"
            max={max}
            step="0.1"
            title="Grade Input"
            className={`w-16 p-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-300"
            }`}
            value={localVal}
            onChange={handleChange}
            disabled={disabled}
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
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    
    const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    const handleGradeChange = (studentId: string, type: 'REGULAR' | 'MID_TERM' | 'FINAL_TERM', index: number | undefined, newValue: number | null) => {
        if (!gradeBook) return;

        const updatedStudents = gradeBook.students.map(s => {
            if (s.studentId !== studentId) return s;

            const existingGradeIndex = s.grades.findIndex(g => g.type === type && g.index === index);
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
        } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
            setMsg({ type: 'error', text: "Lỗi khi lưu điểm. Vui lòng thử lại." });
        } finally {
            setSaving(false);
        }
    };

    const getGradeValue = (student: StudentGrade, type: string, index?: number) => {
        const found = student.grades.find(g => g.type === type && g.index === index);
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
        const final = getGradeValue(student, 'FINAL_TERM');
        if (final !== null) {
            total += final * 3;
            weight += 3;
        }

        return weight > 0 ? (total / weight).toFixed(1) : "-";
    };

    return (
        <div className="space-y-6">
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
                        <Upload className="w-4 h-4" />
                        Nhập Excel
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Xuất báo cáo
                    </button>
                    {gradeBook?.canEdit && (
                        <button 
                            onClick={handleSave}
                            disabled={saving}
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
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {msg.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                            {msg.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Grade Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {!selectedClassId ? (
                     <div className="p-12 text-center text-gray-500">
                        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
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
                                    <th className="px-4 py-3 text-center border-l bg-blue-50/50" colSpan={gradeBook.regularAssessmentCount}>
                                        Đánh giá thường xuyên (HS1)
                                    </th>
                                    <th className="px-4 py-3 w-24 text-center border-l bg-purple-50/50">Giữa kỳ (HS2)</th>
                                    <th className="px-4 py-3 w-24 text-center border-l bg-orange-50/50">Cuối kỳ (HS3)</th>
                                    <th className="px-4 py-3 w-20 text-center border-l">TBM</th>
                                    <th className="px-4 py-3 w-24 text-center">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {gradeBook.students.map((student, idx) => (
                                    <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{student.studentCode}</td>
                                        <td className="px-4 py-3 font-medium text-blue-600">{student.fullName}</td>
                                        
                                        {/* Regular Assessment Columns */}
                                        {Array.from({ length: gradeBook.regularAssessmentCount }).map((_, i) => (
                                            <td key={`reg-${i}`} className="px-2 py-3 text-center bg-blue-50/30 border-l border-gray-100">
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
                                            {calculateAverage(student, gradeBook.regularAssessmentCount)}
                                        </td>
                                        
                                        {/* Note */}
                                        <td className="px-4 py-3">
                                            <input type="text" className="w-full text-xs border-0 bg-transparent focus:ring-0 text-gray-500" placeholder="Thêm..." />
                                        </td>
                                    </tr>
                                ))}
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
        </div>
    );
};

export default GradesPage;
