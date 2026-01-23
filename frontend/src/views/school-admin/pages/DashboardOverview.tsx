import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { schoolAdminService, type SchoolStatsDto } from "../../../services/schoolAdminService";
import {
    ClassIcon,
    TeacherIcon,
    StudentIcon,
    CalendarIcon,
    PlusIcon,
    AccountIcon,
    ReportIcon
} from "../SchoolAdminIcons";

const DashboardOverview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<SchoolStatsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="animate-fade-in-up">
            {/* Welcome Banner */}
            <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Chào, {user?.fullName || 'Admin'}! 👋</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                            <ClassIcon />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Tổng số lớp</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                            <TeacherIcon />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Số giáo viên</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalTeachers || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500 flex-shrink-0">
                            <StudentIcon />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Tổng học sinh</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 flex-shrink-0">
                            <CalendarIcon />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Năm học</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.currentAcademicYear || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Thao tác nhanh</h3>
                <p className="text-gray-500 text-sm mb-4">Các chức năng thường dùng</p>

                <div className="grid grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/school-admin/classes?action=add')}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group text-center"
                    >
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white group-hover:scale-110 transition-transform">
                            <PlusIcon />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Thêm lớp học</span>
                    </button>

                    <button
                        onClick={() => navigate('/school-admin/students?action=add')}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group text-center"
                    >
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white group-hover:scale-110 transition-transform">
                            <StudentIcon />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Thêm học sinh</span>
                    </button>

                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all group text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-600 group-hover:scale-110 transition-transform">
                            <AccountIcon />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Quản lý tài khoản</span>
                    </button>

                    <button className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all group text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-600 group-hover:scale-110 transition-transform">
                            <ReportIcon />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Báo cáo hoạt động</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
