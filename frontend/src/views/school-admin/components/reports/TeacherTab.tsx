import type { TeacherReportDto } from "../../../../services/schoolReportService";
import StatCard from "./StatCard";
import { Users, UserCheck, UserX, BookOpen } from "lucide-react";

const TeacherTab = ({ data }: { data: TeacherReportDto }) => {
    // Find max teacher count for progress bar scaling
    const maxTeachers = Math.max(...data.teachersBySubject.map(s => s.teacherCount), 1);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users />} label="Tổng số giáo viên" value={data.totalTeachers} color="blue" />
                <StatCard icon={<UserCheck />} label="Đang hoạt động" value={data.activeTeachers} color="green" />
                <StatCard icon={<UserX />} label="Đã nghỉ/Tạm dừng" value={data.inactiveTeachers} color="orange" />
                <StatCard icon={<BookOpen />} label="Số bộ môn" value={data.teachersBySubject.length} color="indigo" />
            </div>

            {/* Combined Personnel Distribution Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900">Phân bổ nhân sự theo bộ môn</h3>
                    <p className="text-sm text-gray-500 mt-1">Danh sách chi tiết số lượng giáo viên theo từng chuyên môn giảng dạy</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {data.teachersBySubject.sort((a, b) => b.teacherCount - a.teacherCount).map((subject) => (
                            <div key={subject.subjectId} className="group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-800 text-sm leading-tight">
                                        {subject.subjectName}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black whitespace-nowrap ml-4">
                                        {subject.teacherCount} GV
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                                        style={{ width: `${(subject.teacherCount / maxTeachers) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {data.teachersBySubject.length === 0 && (
                        <div className="py-20 text-center">
                            <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-400">Chưa có dữ liệu phân bổ bộ môn</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Optional workload list if needed */}
            {data.workloadList && data.workloadList.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Top phân công giảng dạy</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Giáo viên</th>
                                    <th className="px-6 py-4">Môn dạy</th>
                                    <th className="px-6 py-4 text-center">Số lớp</th>
                                    <th className="px-6 py-4 text-center">Số tiết/tuần</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {data.workloadList.slice(0, 5).map((w) => (
                                    <tr key={w.teacherId} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{w.teacherName}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">{w.teacherCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{w.primarySubject}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-gray-900">{w.assignedClasses}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-bold">
                                                {w.totalPeriodsPerWeek} tiết
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherTab;
