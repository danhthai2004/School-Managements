import { useEffect, useState } from "react";
import { schoolAdminService, type SubjectDto } from "../../../services/schoolAdminService";
import { Layers, Book, Bookmark } from "lucide-react";
import CombinationManagement from "./CombinationManagement";

export default function SubjectManagement() {
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'COMPULSORY' | 'ELECTIVE' | 'SPECIALIZED' | 'COMBINATION'>('COMPULSORY');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const data = await schoolAdminService.listSubjects();
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredSubjects = (type: string) => {
        return subjects.filter(s => s.type === type);
    };



    const renderSubjectTable = (type: 'COMPULSORY' | 'ELECTIVE' | 'SPECIALIZED') => {
        const filtered = getFilteredSubjects(type);

        if (loading) {
            return (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã Môn</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên Môn</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ban (Stream)</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Số tiết/tuần</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((subject) => {

                            return (
                                <tr key={subject.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-medium text-gray-900">
                                            {subject.code || "—"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {subject.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {subject.stream ? (
                                            <span className={`text-xs px-2 py-1 rounded-full ${subject.stream === 'TU_NHIEN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {subject.stream === 'TU_NHIEN' ? 'Tự Nhiên' : 'Xã Hội'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 pl-12">
                                        {subject.totalLessons || "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${type === 'COMPULSORY' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                            {type === 'COMPULSORY' ? 'Bắt buộc' : 'Tự chọn'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Không có dữ liệu môn học
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Môn học & Tổ hợp</h1>
                <p className="text-gray-500 mt-1">Chương trình Giáo dục Phổ thông 2018 </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('COMPULSORY')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'COMPULSORY'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Book className="w-4 h-4" />
                        Môn Bắt Buộc
                    </button>

                    <button
                        onClick={() => setActiveTab('ELECTIVE')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'ELECTIVE'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Layers className="w-4 h-4" />
                        Môn Tự Chọn
                    </button>

                    <button
                        onClick={() => setActiveTab('SPECIALIZED')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'SPECIALIZED'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Bookmark className="w-4 h-4" />
                        Chuyên Đề Học Tập
                    </button>

                    <button
                        onClick={() => setActiveTab('COMBINATION')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                            ${activeTab === 'COMBINATION'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Layers className="w-4 h-4" />
                        Tổ Hợp Môn (Ban)
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'COMPULSORY' && renderSubjectTable('COMPULSORY')}
                {activeTab === 'ELECTIVE' && renderSubjectTable('ELECTIVE')}
                {activeTab === 'SPECIALIZED' && renderSubjectTable('SPECIALIZED')}
                {activeTab === 'COMBINATION' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                        {/* Embed the existing Combination Management Component */}
                        {/* We might want to suppress its header title since we have a main header now, 
                             or keep it. For now, just embedding. */}
                        <CombinationManagement />
                    </div>
                )}
            </div>
        </div>
    );
}
