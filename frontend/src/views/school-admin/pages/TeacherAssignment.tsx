import { useEffect, useState } from "react";
import { schoolAdminService, type ClassRoomDto } from "../../../services/schoolAdminService";
import type { TeacherAssignmentDto } from "../../../services/dtos/TeacherAssignmentDto";
import { RefreshCw, CheckCircle, Filter as FilterIcon } from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { useConfirmation } from "../../../hooks/useConfirmation";

export default function TeacherAssignment() {
    const { showSuccess, toast } = useToast();
    const { confirm, ConfirmationDialog } = useConfirmation();

    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [gradeFilter, setGradeFilter] = useState<string>("ALL");
    const [assignments, setAssignments] = useState<TeacherAssignmentDto[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]); // UserDto or TeacherDto
    const [loading, setLoading] = useState(false);


    const [isSaving, setIsSaving] = useState(false);
    const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchAssignments(selectedClassId);
        } else {
            setAssignments([]);
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            const data = await schoolAdminService.listClasses();
            setClasses(data);
            if (data.length > 0) {
                setSelectedClassId(data[0].id);
            }
        } catch (error) {
            console.error(error);
            console.error("Không thể tải danh sách lớp", error);
        }
    };

    const fetchTeachers = async () => {
        try {
            // Fetch a large-ish page for the dropdowns
            const data = await schoolAdminService.listTeacherProfiles(0, 1000);
            setTeachers(data.content);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAssignments = async (classId: string) => {
        setLoading(true);
        try {
            const data = await schoolAdminService.listAssignments(classId);
            setAssignments(data);

            const pending: Record<string, string> = {};
            data.forEach(a => {
                pending[a.id] = a.teacherId || "";
            });
            setPendingAssignments(pending);

            // If explicit init required
            if (data.length === 0) {
                // Auto init? Or show button?
            }
        } catch (error) {
            console.error(error);
            console.error("Không thể tải phân công chuyên môn", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInit = async () => {
        confirm({
            title: "Khởi tạo dữ liệu phân công",
            message: (
                <span>
                    Hệ thống sẽ tự động tạo danh sách phân công cho tất cả các lớp dựa trên <strong>Tổ hợp môn</strong>.<br />
                    <span className="text-sm text-gray-500 mt-2 block">
                        Lưu ý: Các phân công đã có sẽ không bị ảnh hưởng.
                    </span>
                </span>
            ),
            confirmText: "Khởi tạo ngay",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await schoolAdminService.initializeAssignments();
                    showSuccess("Khởi tạo dữ liệu thành công!");
                    if (selectedClassId) fetchAssignments(selectedClassId);
                } catch (error) {
                    console.error(error);
                    // keep simple alert or use a error toast if available, sticking to console/alert for error is distinct from confirmation request
                    toast.error("Lỗi khởi tạo dữ liệu");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const hasChanges = () => {
        return assignments.some(a => (a.teacherId || "") !== pendingAssignments[a.id]);
    };

    const handleSaveAll = async () => {
        if (!hasChanges()) return;
        setIsSaving(true);
        try {
            const updates = assignments
                .filter(a => (a.teacherId || "") !== pendingAssignments[a.id])
                .map(a => ({
                    assignmentId: a.id,
                    teacherId: pendingAssignments[a.id] ? pendingAssignments[a.id] : null
                }));

            if (updates.length > 0) {
                await schoolAdminService.bulkAssignTeachers(updates);
                showSuccess("Đã lưu tất cả thay đổi thành công!");
                fetchAssignments(selectedClassId);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi lưu phân công");
        } finally {
            setIsSaving(false);
        }
    };

    const getAssignedCount = () => assignments.filter(a => a.teacherId).length;
    const getProgressColor = () => {
        const count = getAssignedCount();
        const total = assignments.length;
        if (total === 0) return 'bg-gray-200';
        if (count === total) return 'bg-emerald-500';
        if (count > total / 2) return 'bg-blue-500';
        return 'bg-slate-400';
    };

    const filteredClasses = classes.filter(c => gradeFilter === "ALL" || c.grade.toString() === gradeFilter);

    const filterTeachersForSubject = (subjectId?: string, subjectName?: string) => {
        return teachers.filter(t => {
            if (!subjectId) return true;
            if (t.subjects && t.subjects.some((s: any) => s.id === subjectId)) {
                return true;
            }
            if (t.subjects && subjectName) {
                return t.subjects.some((s: any) => {
                    return subjectName.includes(s.name);
                });
            }
            return false;
        });
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Phân công Chuyên môn</h1>
                    <p className="text-gray-500">Gán giáo viên phụ trách cho từng môn học của lớp</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleInit}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Khởi tạo lại Dữ liệu
                    </button>
                    {hasChanges() && (
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-semibold disabled:opacity-50 hover:from-blue-700 hover:to-blue-600"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Lưu thay đổi
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <FilterIcon className="text-slate-400" size={18} />
                        Bộ lọc:
                    </div>

                    <select
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={gradeFilter}
                        onChange={(e) => {
                            setGradeFilter(e.target.value);
                            setSelectedClassId(""); // Reset class when grade changes
                        }}
                    >
                        <option value="ALL">Tất cả các khối</option>
                        <option value="10">Khối 10</option>
                        <option value="11">Khối 11</option>
                        <option value="12">Khối 12</option>
                    </select>

                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-w-[200px]"
                    >
                        <option value="">-- Chọn lớp --</option>
                        {filteredClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>
                        ))}
                    </select>

                    {selectedClassId && assignments.length > 0 && (
                        <div className="ml-auto flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-500">Tiến độ phân công</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">{getAssignedCount()}/{assignments.length} môn</span>
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${getProgressColor()}`} style={{ width: `${(getAssignedCount() / assignments.length) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Assignments List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">Chưa có dữ liệu phân công cho lớp này.</p>
                    <button onClick={handleInit} className="text-blue-600 font-medium hover:underline">
                        Click để khởi tạo
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Môn học</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiết/Tuần</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên phụ trách</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {assignments.map(assign => (
                                <tr key={assign.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                                {assign.subjectName.substring(0, 1)}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{assign.subjectName}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {assign.lessonsPerWeek} tiết
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={pendingAssignments[assign.id] || ""}
                                            onChange={(e) => setPendingAssignments({
                                                ...pendingAssignments,
                                                [assign.id]: e.target.value
                                            })}
                                            className={`w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all ${pendingAssignments[assign.id] ? 'border-gray-300 bg-white' : 'border-slate-200 bg-slate-50 font-medium'
                                                }`}
                                        >
                                            <option value="">-- Chưa gán --</option>
                                            {filterTeachersForSubject(assign.subjectId, assign.subjectName).map(t => (
                                                <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {pendingAssignments[assign.id] !== (assign.teacherId || "") && (
                                            <span className="text-blue-500 text-[10px] font-bold uppercase tracking-tight">Cần lưu</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog />
        </div>
    );
}
