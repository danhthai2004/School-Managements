import React from "react";
import { ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react";
import type { GradeEntryStatusDto } from "../../../../services/adminGradeService";

interface GradeStatusTabProps {
    statusData: GradeEntryStatusDto;
    expandedClassId: string | null;
    setExpandedClassId: (id: string | null) => void;
    handleToggleLock: (classId: string, currentStatus: boolean) => void;
}

const GradeStatusTab: React.FC<GradeStatusTabProps> = ({
    statusData,
    expandedClassId,
    setExpandedClassId,
    handleToggleLock
}) => {
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-medium text-blue-600 mb-1">Tiến độ chung</p>
                    <h3 className="text-3xl font-bold text-blue-900">{statusData.completionPercentage.toFixed(1)}%</h3>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-sm font-medium text-green-600 mb-1">Số lớp hoàn thành</p>
                    <h3 className="text-3xl font-bold text-green-900">{statusData.completedClasses} / {statusData.totalClasses}</h3>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm font-medium text-purple-600 mb-1">Điểm Giữa kỳ</p>
                    <h3 className="text-3xl font-bold text-purple-900">{statusData.filledMidtermGrades} / {statusData.totalMidtermGrades}</h3>
                    <p className="text-xs text-purple-500 mt-1">Học sinh đã có điểm GK</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <p className="text-sm font-medium text-orange-600 mb-1">Điểm Cuối kỳ</p>
                    <h3 className="text-3xl font-bold text-orange-900">{statusData.filledFinalGrades} / {statusData.totalFinalGrades}</h3>
                    <p className="text-xs text-orange-500 mt-1">Học sinh đã có điểm CK</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khối</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số HS</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Môn học</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tiến độ</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Khóa</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {statusData.classStatuses.map(c => (
                            <React.Fragment key={c.classId}>
                                <tr
                                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedClassId(expandedClassId === c.classId ? null : c.classId)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {expandedClassId === c.classId ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                                        {c.className}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{c.grade}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{c.totalStudents}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{c.totalSubjects}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${c.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${c.completionPercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-medium w-9">{c.completionPercentage.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleToggleLock(c.classId, c.isLocked)}
                                            className={`p-2 rounded-lg transition-colors ${c.isLocked ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                            title={c.isLocked ? "Mở khóa" : "Khóa"}
                                        >
                                            {c.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                    </td>
                                </tr>
                                {expandedClassId === c.classId && (
                                    <tr className="bg-slate-50/50 border-b border-gray-100 shadow-inner">
                                        <td colSpan={6} className="px-10 py-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {c.subjects && c.subjects.map(s => (
                                                    <div key={s.subjectId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-blue-300 transition-colors">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-slate-800 text-sm">{s.subjectName}</span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${s.isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {s.isComplete ? 'Hoàn thành' : 'Đang nhập'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center text-[11px]" title="Điểm kiểm tra thường xuyên (miệng, 15p...)">
                                                                <span className="text-slate-500">Thường xuyên (TX)</span>
                                                                <span className="font-semibold text-slate-700">{s.txEntered}/{s.totalStudents}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1" title={`${((s.txEntered / s.totalStudents) * 100).toFixed(1)}% học sinh đã có ít nhất 1 điểm TX`}>
                                                                <div className="h-1 rounded-full bg-blue-400" style={{ width: `${(s.txEntered / s.totalStudents) * 100}%` }}></div>
                                                            </div>

                                                            <div className="flex justify-between items-center text-[11px]" title="Điểm kiểm tra giữa học kỳ">
                                                                <span className="text-slate-500">Giữa kỳ</span>
                                                                <span className="font-semibold text-slate-700">{s.midtermEntered}/{s.totalStudents}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1" title={`${((s.midtermEntered / s.totalStudents) * 100).toFixed(1)}% học sinh đã có điểm giữa kỳ`}>
                                                                <div className="h-1 rounded-full bg-purple-400" style={{ width: `${(s.midtermEntered / s.totalStudents) * 100}%` }}></div>
                                                            </div>

                                                            <div className="flex justify-between items-center text-[11px]" title="Điểm kiểm tra cuối học kỳ">
                                                                <span className="text-slate-500">Cuối kỳ</span>
                                                                <span className="font-semibold text-slate-700">{s.finalEntered}/{s.totalStudents}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1" title={`${((s.finalEntered / s.totalStudents) * 100).toFixed(1)}% học sinh đã có điểm cuối kỳ`}>
                                                                <div className="h-1 rounded-full bg-orange-400" style={{ width: `${(s.finalEntered / s.totalStudents) * 100}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!c.subjects || c.subjects.length === 0) && (
                                                    <div className="col-span-full text-center text-sm text-slate-500 py-4 bg-white rounded-xl border border-dashed border-slate-200">
                                                        Chưa có dữ liệu phân công môn học
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {statusData.classStatuses.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GradeStatusTab;
