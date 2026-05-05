import React from "react";
import type { GradeHistoryDto } from "../../../../services/adminGradeService";

interface GradeHistoryTabProps {
    historyData: GradeHistoryDto[];
}

const GradeHistoryTab: React.FC<GradeHistoryTabProps> = ({ historyData }) => {
    return (
        <div className="p-6">
            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto relative scrollbar-thin">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Học sinh</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Môn học</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trường thay đổi</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-red-600 uppercase">Cũ</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-green-600 uppercase">Mới</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người sửa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lý do</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {historyData.map((h) => (
                            <tr key={h.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-sm text-gray-900">{h.studentName}</p>
                                    <p className="text-xs text-gray-500">{h.studentCode}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{h.subjectName}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                        {h.fieldChanged}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-red-600 line-through">{h.oldValue || '-'}</td>
                                <td className="px-6 py-4 text-sm font-medium text-green-600">{h.newValue || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{h.changedBy}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(h.changedAt).toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{h.reason}</td>
                            </tr>
                        ))}
                        {historyData.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Chưa có nhật ký sửa điểm nào</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GradeHistoryTab;
