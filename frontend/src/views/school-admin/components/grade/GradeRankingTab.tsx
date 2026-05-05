import React from "react";
import { AlertCircle } from "lucide-react";
import type { StudentRankingDto } from "../../../../services/adminGradeService";

interface GradeRankingTabProps {
    rankings: StudentRankingDto[];
    selectedClass: string;
}

const GradeRankingTab: React.FC<GradeRankingTabProps> = ({ rankings, selectedClass }) => {
    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-500"><AlertCircle size={20} /></div>
                    <div>
                        <h4 className="font-medium text-blue-900">Bảng xếp hạng lớp</h4>
                        <p className="text-sm text-blue-700 mt-1">Hệ thống sẽ tự động cập nhật lại GPA của toàn bộ học sinh trong lớp mỗi khi giáo viên hoặc Quản trị viên thay đổi điểm.</p>
                    </div>
                </div>
            </div>

            {selectedClass ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto relative scrollbar-thin">
                    <table className="w-full text-left text-sm text-gray-600 border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Hạng</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Học sinh</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GPA</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Học lực</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rankings.map((r) => (
                                <tr key={r.studentId} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                                        {r.rankInClass === 1 ? <span className="text-yellow-500">🥇 1</span> :
                                            r.rankInClass === 2 ? <span className="text-gray-400">🥈 2</span> :
                                                r.rankInClass === 3 ? <span className="text-amber-700">🥉 3</span> :
                                                    r.rankInClass || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <p className="font-medium text-gray-900">{r.fullName}</p>
                                        <p className="text-xs text-gray-500">{r.studentCode}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{r.gpa?.toFixed(2) || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {r.performanceCategory ? (
                                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${r.performanceCategory === 'Giỏi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                r.performanceCategory === 'Khá' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    r.performanceCategory === 'Trung bình' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {r.performanceCategory}
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {rankings.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu xếp hạng</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p>Vui lòng chọn lớp để xem bảng xếp hạng</p>
                </div>
            )}
        </div>
    );
};

export default GradeRankingTab;
