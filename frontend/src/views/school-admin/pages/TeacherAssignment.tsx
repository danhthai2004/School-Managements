import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type ClassRoomDto } from "../../../services/schoolAdminService";
import type { TeacherAssignmentDto } from "../../../services/dtos/TeacherAssignmentDto";
import { RefreshCw, CheckCircle, AlertCircle, UserPlus, X, Filter as FilterIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function TeacherAssignment() {
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [gradeFilter, setGradeFilter] = useState<string>("ALL");
    const [assignments, setAssignments] = useState<TeacherAssignmentDto[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]); // UserDto or TeacherDto
    const [loading, setLoading] = useState(false);


    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<TeacherAssignmentDto | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

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
            toast.error("Không thể tải danh sách lớp");
        }
    };

    const fetchTeachers = async () => {
        try {
            // Need a list of ALL teachers to assign, with profile details (subjectId)
            const data = await schoolAdminService.listTeacherProfiles();
            setTeachers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAssignments = async (classId: string) => {
        setLoading(true);
        try {
            const data = await schoolAdminService.listAssignments(classId);
            setAssignments(data);

            // If explicit init required
            if (data.length === 0) {
                // Auto init? Or show button?
            }
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải phân công chuyên môn");
        } finally {
            setLoading(false);
        }
    };

    const handleInit = async () => {
        if (!confirm("Hệ thống sẽ tự động tạo danh sách phân công cho tất cả các lớp dựa trên Tổ hợp môn. Bạn có chắc chắn?")) return;
        try {
            setLoading(true);
            await schoolAdminService.initializeAssignments();
            toast.success("Khởi tạo thành công!");
            if (selectedClassId) fetchAssignments(selectedClassId);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khởi tạo");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssign = (assignment: TeacherAssignmentDto) => {
        setCurrentAssignment(assignment);
        setSelectedTeacherId(assignment.teacherId || "");
        setIsModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        if (!currentAssignment) return;
        try {
            await schoolAdminService.assignTeacher(currentAssignment.id, selectedTeacherId || null);
            toast.success("Đã cập nhật giáo viên");
            setIsModalOpen(false);
            fetchAssignments(selectedClassId);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi cập nhật");
        }
    };

    const getAssignedCount = () => assignments.filter(a => a.teacherId).length;
    const getProgressColor = () => {
        const count = getAssignedCount();
        const total = assignments.length;
        if (total === 0) return 'bg-gray-200';
        if (count === total) return 'bg-green-500';
        if (count > total / 2) return 'bg-blue-500';
        return 'bg-orange-500';
    };

    const filteredClasses = classes.filter(c => gradeFilter === "ALL" || c.grade.toString() === gradeFilter);

    return (
        <div className="space-y-6 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Phân công Chuyên môn</h1>
                    <p className="text-gray-500">Gán giáo viên phụ trách cho từng môn học của lớp</p>
                </div>
                <button
                    onClick={handleInit}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                    <RefreshCw className="w-5 h-5" />
                    Khởi tạo lại Dữ liệu
                </button>
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
                                        {assign.teacherId ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                {assign.teacherName}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Chưa gán
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenAssign(assign)}
                                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            {assign.teacherId ? 'Thay đổi' : 'Gán GV'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assign Modal */}
            {isModalOpen && currentAssignment && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[100]">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex-none z-[110]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">
                                    Phân công: {currentAssignment.subjectName}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <p className="text-sm text-gray-500 mb-2">Lớp: {currentAssignment.className}</p>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Giáo viên</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Chưa gán --</option>
                                {teachers
                                    .filter(t => {
                                        if (!currentAssignment?.subjectId) return true;
                                        // Exact match using subjects array
                                        if (t.subjects && t.subjects.some((s: any) => s.id === currentAssignment.subjectId)) {
                                            return true;
                                        }

                                        // Specialized subject match (e.g. "CD_TOAN" checking against subject codes or names)
                                        // If strict match failed, maybe check names? 
                                        // For now, let's trust the ID match. The backend allows specialization matching, 
                                        // but frontend list should probably be strict or check all subjects.

                                        // Also check if any of teacher's subjects is a "parent" of the assignment subject
                                        // e.g. Assignment is "Chuyên đề Toán" (CD_TOAN), Teacher has "Toán" (TOAN)
                                        // The backend logic: if (assignmentCode.contains(teacherSubjectCode))

                                        // We don't have codes easily here unless SubjectDto has it. 
                                        // SubjectDto has 'code'. teacher.subjects is SubjectDto[].

                                        if (t.subjects && currentAssignment.subjectName) {
                                            return t.subjects.some((s: any) => {
                                                // Name match fallback (e.g. "Toán" in "Chuyên đề Toán")
                                                return currentAssignment.subjectName.includes(s.name);
                                            });
                                        }

                                        return false;
                                    })
                                    .map(t => (
                                        <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                                    ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                * Chỉ hiển thị giáo viên giảng dạy môn {currentAssignment.subjectName}
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-none">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveAssignment}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg font-medium"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
