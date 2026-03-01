import { useOutletContext } from "react-router-dom";
import type { TeacherProfile } from "../../../services/teacherService";

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

export default function ClassMapPage() {
    const { teacherProfile } = useOutletContext<OutletContextType>();

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Sơ đồ lớp</h1>
                <p className="text-gray-500">
                    {teacherProfile?.isHomeroomTeacher 
                        ? "Quản lý sơ đồ chỗ ngồi học sinh trong lớp chủ nhiệm"
                        : "Xem sơ đồ chỗ ngồi các lớp bạn dạy"
                    }
                </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                {!teacherProfile?.isHomeroomTeacher && (
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg mb-4 text-sm">
                        Bạn đang ở chế độ xem. Chỉ giáo viên chủ nhiệm mới có thể chỉnh sửa sơ đồ lớp.
                    </div>
                )}
                <p className="text-gray-500 text-center py-8">
                    Tính năng đang được phát triển...
                </p>
            </div>
        </div>
    );
}
