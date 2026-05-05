import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminGradeService } from '../../../services/adminGradeService';
import type { GradeBookDto, StudentGradeDto } from '../../../services/adminGradeService';
import { Save, AlertCircle, FileText, CheckCircle, Search, Plus, Minus, Award } from 'lucide-react';
import { vietnameseNameSort } from '../../../utils/sortUtils';
import { useConfirmation } from '../../../hooks/useConfirmation';
import { toast } from 'react-hot-toast';

interface AdminGradeBookTabProps {
    classId: string;
    semesterId: string;
    subjects: { id: string; name: string }[];
}

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
        if (isFocused) return "border-blue-400 ring-4 ring-blue-500/10 bg-white shadow-sm z-10 relative";
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

export default function AdminGradeBookTab({ classId, semesterId, subjects }: AdminGradeBookTabProps) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [gradeBook, setGradeBook] = useState<GradeBookDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localRegularCount, setLocalRegularCount] = useState<number>(1);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'NAME' | 'CODE'>('NAME');
    const { confirm, ConfirmationDialog } = useConfirmation();

    useEffect(() => {
        if (subjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [subjects, selectedSubjectId]);

    const fetchGrades = useCallback(async () => {
        if (!classId || !selectedSubjectId || !semesterId) return;

        setLoading(true);
        setMsg(null);
        try {
            const data = await adminGradeService.getGradeBook(classId, selectedSubjectId, semesterId);
            setGradeBook(data);
            setLocalRegularCount(data.regularAssessmentCount || 1);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.response?.data?.message || "Không thể tải bảng điểm." });
            setGradeBook(null);
        } finally {
            setLoading(false);
        }
    }, [classId, selectedSubjectId, semesterId]);

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    const handleGradeChange = (studentId: string, type: 'REGULAR' | 'MIDTERM' | 'FINAL', index: number | undefined, newValue: number | null) => {
        if (!gradeBook) return;

        const updatedStudents = gradeBook.students.map((s: StudentGradeDto) => {
            if (s.studentId !== studentId) return s;

            const existingGradeIndex = s.grades.findIndex((g: any) => g.type === type && g.index == index);
            const newGrades = [...s.grades];

            if (existingGradeIndex >= 0) {
                newGrades[existingGradeIndex] = { ...newGrades[existingGradeIndex], value: newValue };
            } else {
                newGrades.push({ type, index: index || null, value: newValue });
            }

            return { ...s, grades: newGrades };
        });

        setGradeBook({ ...gradeBook, students: updatedStudents });
    };

    const handleAddColumn = () => {
        if (localRegularCount < 10) setLocalRegularCount(prev => prev + 1);
        else {
            setMsg({ type: 'error', text: "Tối đa 10 cột điểm thường xuyên." });
            setTimeout(() => setMsg(null), 3000);
        }
    };

    const handleRemoveColumn = () => {
        if (localRegularCount <= 1) return;
        const hasDataInLastColumn = gradeBook?.students.some((s: StudentGradeDto) => {
            const found = s.grades.find((g: any) => g.type === 'REGULAR' && g.index === localRegularCount);
            return found && found.value !== null && found.value !== undefined;
        });

        if (hasDataInLastColumn) {
            setMsg({ type: 'error', text: `Cột thứ ${localRegularCount} đang có điểm. Vui lòng xóa trắng điểm ở cột này trước khi thu hồi.` });
            setTimeout(() => setMsg(null), 4000);
            return;
        }
        setLocalRegularCount(prev => prev - 1);
    };

    const processedStudents = useMemo(() => {
        if (!gradeBook) return [];
        let filtered = gradeBook.students.filter((s: StudentGradeDto) =>
            s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return [...filtered].sort((a: StudentGradeDto, b: StudentGradeDto) => {
            if (sortBy === 'CODE') return a.studentCode.localeCompare(b.studentCode);
            else return vietnameseNameSort(a.fullName, b.fullName);
        });
    }, [gradeBook, sortBy, searchQuery]);

    const handleSave = () => {
        if (!gradeBook || !semesterId) return;

        confirm({
            title: "Xác nhận ghi đè điểm",
            variant: 'warning',
            message: (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Bạn đang thực hiện quyền Quản trị để ghi đè điểm số. Hành động này sẽ được ghi vào nhật ký hệ thống.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Lý do điều chỉnh (Bắt buộc):</label>
                        <textarea
                            id="save-reason-input"
                            autoFocus
                            placeholder="VD: Sửa lỗi nhập liệu theo yêu cầu của giáo viên..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none"
                            onChange={(e) => {
                                (window as any)._saveReason = e.target.value;
                            }}
                        />
                    </div>
                </div>
            ),
            confirmText: "Lưu thay đổi",
            onConfirm: async () => {
                const reason = (window as any)._saveReason || "";
                if (!reason.trim()) {
                    toast.error("Vui lòng nhập lý do điều chỉnh");
                    throw new Error("Reason required");
                }

                setSaving(true);
                try {
                    await adminGradeService.saveGradeBook(classId, selectedSubjectId, gradeBook.students, reason, semesterId);
                    toast.success("Ghi đè điểm thành công!");
                } catch (err: any) {
                    toast.error(err.response?.data?.message || "Lỗi khi lưu điểm.");
                    throw err;
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    const getGradeValue = (student: StudentGradeDto, type: string, index?: number) => {
        const found = student.grades.find((g: any) => g.type === type && g.index == index);
        return found ? found.value : null;
    };

    const calculateAverage = (student: StudentGradeDto, regularCount: number) => {
        let total = 0; let weight = 0;
        for (let i = 1; i <= regularCount; i++) {
            const val = getGradeValue(student, 'REGULAR', i);
            if (val !== null) { total += val; weight += 1; }
        }
        const mid = getGradeValue(student, 'MIDTERM');
        if (mid !== null) { total += mid * 2; weight += 2; }
        const final_ = getGradeValue(student, 'FINAL');
        if (final_ !== null) { total += final_ * 3; weight += 3; }
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

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none font-medium text-slate-700 w-full md:w-64"
                    >
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !gradeBook}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>Đang lưu...</>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Lưu điểm
                            </>
                        )}
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {msg.text}
                </div>
            )}

            <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
                {loading ? (
                    <div className="p-16 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-slate-200 border-t-blue-600 mx-auto"></div>
                        <p className="mt-4 text-slate-500 font-medium">Đang tải bảng điểm...</p>
                    </div>
                ) : !gradeBook ? (
                    <div className="p-16 text-center">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Không có dữ liệu</h3>
                        <p className="text-slate-400 text-sm">Vui lòng chọn lớp và môn học hợp lệ.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortBy("CODE")}>Mã HS</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortBy("NAME")}>Họ và tên</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase" colSpan={localRegularCount}>
                                        <div className="flex items-center justify-center gap-1.5 relative">
                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div> Thường xuyên
                                            <div className="flex items-center gap-0.5 ml-2">
                                                <button onClick={handleRemoveColumn} className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-slate-400" disabled={localRegularCount <= 1}><Minus className="w-3.5 h-3.5" /></button>
                                                <button onClick={handleAddColumn} className="p-1 hover:bg-emerald-50 hover:text-emerald-500 rounded text-slate-400" disabled={localRegularCount >= 10}><Plus className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 w-24 text-center text-xs font-semibold text-gray-500 uppercase"><div className="flex items-center justify-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-400"></div> Giữa kỳ</div></th>
                                    <th className="px-6 py-3 w-24 text-center text-xs font-semibold text-gray-500 uppercase"><div className="flex items-center justify-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Cuối kỳ</div></th>
                                    <th className="px-6 py-3 w-20 text-center text-xs font-semibold text-gray-500 uppercase"><div className="flex items-center justify-center gap-1.5"><Award className="w-3.5 h-3.5 text-blue-500" /> TBM</div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedStudents.map((student, idx) => {
                                    const avg = calculateAverage(student, localRegularCount);
                                    return (
                                        <tr key={student.studentId} className="hover:bg-blue-50 transition-colors">
                                            <td className="px-6 py-4 text-center text-gray-500 text-xs font-medium">{idx + 1}</td>
                                            <td className="px-6 py-4"><span className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md font-mono">{student.studentCode}</span></td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.fullName}</td>
                                            {Array.from({ length: localRegularCount }).map((_, i) => (
                                                <td key={`reg-${i}`} className="px-1.5 py-4 text-center">
                                                    <GradeInput value={getGradeValue(student, 'REGULAR', i + 1)} onChange={(v) => handleGradeChange(student.studentId, 'REGULAR', i + 1, v)} disabled={false} />
                                                </td>
                                            ))}
                                            <td className="px-1.5 py-4 text-center bg-violet-50/20">
                                                <GradeInput value={getGradeValue(student, 'MIDTERM')} onChange={(v) => handleGradeChange(student.studentId, 'MIDTERM', undefined, v)} disabled={false} />
                                            </td>
                                            <td className="px-1.5 py-4 text-center bg-amber-50/20">
                                                <GradeInput value={getGradeValue(student, 'FINAL')} onChange={(v) => handleGradeChange(student.studentId, 'FINAL', undefined, v)} disabled={false} />
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className={`text-sm font-semibold ${getAverageColor(avg)}`}>{avg}</span></td>
                                        </tr>
                                    );
                                })}
                                {processedStudents.length === 0 && (
                                    <tr><td colSpan={5 + localRegularCount} className="text-center py-8 text-gray-500">Không tìm thấy học sinh</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-red-800 text-sm">Chế độ chỉnh sửa (Quyền Quản trị)</h4>
                    <p className="text-xs text-red-600 mt-1">Bất kỳ thay đổi nào tại đây sẽ ghi đè lên điểm hiện tại của học sinh. Bạn bắt buộc phải ghi lại lý do để lưu vào Lịch sử chỉnh sửa hệ thống.</p>
                </div>
            </div>

            <ConfirmationDialog />
        </div>
    );
}
