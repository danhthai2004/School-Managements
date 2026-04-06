import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { schoolAdminService, type ClassRoomDto, type StudentDto } from "../../../services/schoolAdminService";
import { ArrowLeft, Users, Calendar, DoorOpen, GraduationCap } from "lucide-react";
import { StatusBadge } from "../../../components/common";

const ClassDetailView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [classData, setClassData] = useState<ClassRoomDto | null>(null);
    const [students, setStudents] = useState<StudentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchData(id);
        }
    }, [id]);

    const fetchData = async (classId: string) => {
        setLoading(true);
        setError(null);
        try {
            const [clsData, studentsData] = await Promise.all([
                schoolAdminService.getClass(classId),
                schoolAdminService.listStudents(classId)
            ]);
            setClassData(clsData);
            setStudents(studentsData);
        } catch (err: any) {
            console.error("Failed to fetch class details", err);
            setError(err?.response?.data?.message || "Không thể tải thông tin lớp học.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                <span className="text-slate-600 font-medium">Đang tải thông tin lớp học...</span>
            </div>
        );
    }

    if (error || !classData) {
        return (
            <div className="max-w-4xl mx-auto mt-8">
                <button
                    onClick={() => navigate('/school-admin/classes')}
                    className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Quay lại danh sách lớp
                </button>
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-2xl text-center">
                    <p className="font-medium text-lg mb-2">Đã có lỗi xảy ra</p>
                    <p>{error || "Không tìm thấy thông tin lớp học"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-12 animate-fade-in-up">
            {/* Header / Navigation */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/school-admin/classes')}
                    className="flex items-center text-slate-500 hover:text-blue-600 transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Quay lại danh sách lớp
                </button>
            </div>

            {/* Class Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{classData.name}</h1>
                            <div className="flex items-center text-blue-100 space-x-6">
                                <span className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                    <GraduationCap className="w-4 h-4 mr-2" />
                                    Khối {classData.grade}
                                </span>
                                <span className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {classData.academicYear}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-blue-100 text-sm mb-1 uppercase tracking-wider font-medium">Sĩ số</div>
                            <div className="text-4xl font-bold">{students.length}/{classData.maxCapacity}</div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex items-start p-4 bg-slate-50 rounded-xl">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg mr-4">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Giáo viên chủ nhiệm</div>
                            <div className="font-semibold text-slate-800 text-lg">{classData.homeroomTeacherName || "Chưa phân công"}</div>
                        </div>
                    </div>

                    <div className="flex items-start p-4 bg-slate-50 rounded-xl">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg mr-4">
                            <DoorOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Phòng học</div>
                            <div className="font-semibold text-slate-800 text-lg">{classData.roomName || "Chưa xếp phòng"}</div>
                        </div>
                    </div>

                    <div className="flex items-start p-4 bg-slate-50 rounded-xl">
                        <div className="bg-purple-100 text-purple-600 p-3 rounded-lg mr-4">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Tổ hợp / Ban</div>
                            <div className="font-semibold text-slate-800 text-lg">
                                {classData.combinationName || (
                                    classData.department === 'TU_NHIEN' ? 'Ban Tự nhiên' :
                                        classData.department === 'XA_HOI' ? 'Ban Xã hội' : 'Không phân ban'
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Users className="w-5 h-5 mr-3 text-blue-600" />
                        Danh sách học sinh
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">STT</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã học sinh</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ và tên</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày sinh</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Giới tính</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Điện thoại</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map((student, index) => (
                                <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.studentCode}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">{student.fullName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{student.dateOfBirth || "—"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {student.gender === 'MALE' ? 'Nam' : student.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{student.phone || "—"}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <StatusBadge status={student.status || 'ACTIVE'} />
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Lớp chưa có học sinh nào.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClassDetailView;
