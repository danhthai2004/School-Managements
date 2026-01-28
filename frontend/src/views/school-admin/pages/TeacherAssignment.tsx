import { useEffect, useState } from "react";
import { schoolAdminService, type ClassRoomDto } from "../../../services/schoolAdminService";
import type { TeacherAssignmentDto } from "../../../services/dtos/TeacherAssignmentDto";
import { RefreshCw, CheckCircle, AlertCircle, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";

export default function TeacherAssignment() {
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
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
            // Need a list of ALL teachers to assign
            const data = await schoolAdminService.listTeachers();
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-center">
                <div className="flex-1 max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Lớp học</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>
                        ))}
                    </select>
                </div>

                {selectedClassId && assignments.length > 0 && (
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiến độ phân công</label>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div className={`h-2.5 rounded-full ${getProgressColor()}`} style={{ width: `${(getAssignedCount() / assignments.length) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">{getAssignedCount()}/{assignments.length} môn đã gán</p>
                    </div>
                )}
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
                                <tr key={assign.id} className="hover:bg-gray-50">
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
            {isModalOpen && currentAssignment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Phân công: {currentAssignment.subjectName}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">Lớp: {currentAssignment.className}</p>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Giáo viên</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Chưa gán --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                * Gợi ý: Nên chọn giáo viên có chuyên môn {currentAssignment.subjectName}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveAssignment}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
