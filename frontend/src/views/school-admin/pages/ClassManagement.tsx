import { useEffect, useState } from "react";
import { Edit, Trash2, ArrowUpCircle } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import {
    schoolAdminService,
    type ClassRoomDto,
    type UserDto,
    type CombinationDto,
    type RoomDto
} from "../../../services/schoolAdminService";
import { PlusIcon } from "../SchoolAdminIcons";
import AddClassModal from "../components/class/AddClassModal";
import EditClassModal from "../components/class/EditClassModal";
import DeleteConfirmModal from "../components/class/DeleteConfirmModal";
import PromotionModal from "../components/class/PromotionModal";

// ==================== PAGE COMPONENT ====================

const ClassManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [teachers, setTeachers] = useState<UserDto[]>([]);
    const [combinations, setCombinations] = useState<CombinationDto[]>([]);
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [editingClass, setEditingClass] = useState<ClassRoomDto | null>(null);
    const [deletingClass, setDeletingClass] = useState<ClassRoomDto | null>(null);
    const [promotingClass, setPromotingClass] = useState<ClassRoomDto | null>(null);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");

    // Initial load
    useEffect(() => {
        fetchData();
    }, []);

    // Helper to open modals based on query params or other triggers if needed
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setShowAddModal(true);
            // Clear param after opening
            setSearchParams(params => {
                params.delete('action');
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [classesData, teachersData, combinationsData, statsData, roomsData] = await Promise.all([
                schoolAdminService.listClasses(),
                schoolAdminService.listTeachers(),
                schoolAdminService.listCombinations(),
                schoolAdminService.getStats(),
                schoolAdminService.listActiveRooms()
            ]);
            setClasses(classesData);
            setTeachers(teachersData);
            setCombinations(combinationsData);
            setRooms(roomsData);
            if (statsData?.currentAcademicYear) {
                setCurrentAcademicYear(statsData.currentAcademicYear);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải danh sách lớp học...</div>;
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">{error}</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quản lý lớp học</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                    <PlusIcon />
                    <span>Thêm lớp học</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên lớp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Khối</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Năm học</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổ hợp / Ban</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">GVCN</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sĩ số</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {classes.map((cls) => (
                            <tr key={cls.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <Link to={`/school-admin/classes/${cls.id}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                        title="Xem danh sách học sinh"
                                    >
                                        {cls.name}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{cls.grade}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.academicYear}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.roomName || "—"}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {cls.combinationName ? (
                                        <span className="text-blue-600 font-medium">{cls.combinationName}</span>
                                    ) : (
                                        cls.department === 'TU_NHIEN' ? 'Tự nhiên' :
                                            cls.department === 'XA_HOI' ? 'Xã hội' :
                                                cls.department === 'KHONG_PHAN_BAN' ? 'Không phân ban' : '—'
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{cls.homeroomTeacherName || "—"}</td>
                                <td className="px-6 py-4 text-gray-600">{cls.studentCount} / {cls.maxCapacity}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${cls.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {cls.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng HĐ'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingClass(cls); setShowEditModal(true); }}
                                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {cls.grade < 12 && cls.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => { setPromotingClass(cls); setShowPromotionModal(true); }}
                                                className="text-violet-600 hover:bg-violet-50 p-1.5 rounded-lg transition-colors"
                                                title="Xét lên lớp"
                                            >
                                                <ArrowUpCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setDeletingClass(cls); setShowDeleteModal(true); }}
                                            className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                            title="Xóa lớp học"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {classes.length === 0 && (
                            <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">Chưa có lớp học nào</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AddClassModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchData}
                teachers={teachers}
                combinations={combinations}
                rooms={rooms}
                defaultAcademicYear={currentAcademicYear}
            />
            <EditClassModal
                isOpen={showEditModal}
                classData={editingClass}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                }}
                onSuccess={fetchData}
                teachers={teachers}
                combinations={combinations}
                rooms={rooms}
            />
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                classData={deletingClass}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingClass(null);
                }}
                onSuccess={fetchData}
            />
            <PromotionModal
                isOpen={showPromotionModal}
                onClose={() => {
                    setShowPromotionModal(false);
                    setPromotingClass(null);
                }}
                onSuccess={fetchData}
                classData={promotingClass}
                allClasses={classes}
            />
        </div >
    );
}

export default ClassManagement;
