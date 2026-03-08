import { useOutletContext } from "react-router-dom";
import type { TeacherProfile } from "../../../services/teacherService";

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

export default function SettingsPage() {
    const { teacherProfile } = useOutletContext<OutletContextType>();

    if (!teacherProfile?.isHomeroomTeacher) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
                <p className="text-gray-500">Chỉ giáo viên chủ nhiệm mới có thể cài đặt lớp học.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Cài đặt lớp {teacherProfile.homeroomClassName}
                </h1>
                <p className="text-gray-500">Quản lý cài đặt cho lớp chủ nhiệm của bạn</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-gray-500 text-center py-8">
                    Tính năng đang được phát triển...
                </p>
            </div>
        </div>
    );
}
