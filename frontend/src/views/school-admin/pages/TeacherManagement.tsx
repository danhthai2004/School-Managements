import React, { useEffect, useState } from "react";
import {
    schoolAdminService,
    type TeacherDto,
    type ImportTeacherResult
} from "../../../services/schoolAdminService";
import { PlusIcon } from "../SchoolAdminIcons";
import { TeacherStatusBadge } from "../../../components/common";
import AddTeacherModal from "../components/teacher/AddTeacherModal";
import TeacherDetailModal from "../components/teacher/TeacherDetailModal";
import EditTeacherModal from "../components/teacher/EditTeacherModal";
import DeleteTeacherModal from "../components/teacher/DeleteTeacherModal";
import ImportTeacherExcelModal from "../components/teacher/ImportTeacherExcelModal";
import ImportTeacherSuccessToast from "../components/teacher/ImportTeacherSuccessToast";

// ==================== PAGE COMPONENT ======================================

const TeacherManagement = () => {

    // ... (keep existing state)
    const [teachers, setTeachers] = useState<TeacherDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importResult, setImportResult] = useState<ImportTeacherResult | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherDto | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<TeacherDto | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<TeacherDto | null>(null);

    // New State for Filter & Sort
    const [subjects, setSubjects] = useState<any[]>([]);
    const [filterSubjectId, setFilterSubjectId] = useState<string>("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof TeacherDto | 'subjectName'; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchData();
        fetchSubjects();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.listTeacherProfiles();
            setTeachers(data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const data = await schoolAdminService.listSubjects();
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
        }
    };

    // Filter & Sort Logic
    const filteredTeachers = React.useMemo(() => {
        let result = [...teachers];

        // 1. Filter by Subject
        if (filterSubjectId) {
            const filterSubject = subjects.find(s => s.id === filterSubjectId);
            if (filterSubject) {
                result = result.filter(t => {
                    if (t.subjects && t.subjects.some(s => s.id === filterSubjectId)) {
                        return true;
                    }
                    if (t.subjects) {
                        return false;
                    }
                    return false;
                });
            }
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = sortConfig.key === 'subjectName' ? (a.subjectNames || '') : a[sortConfig.key as keyof TeacherDto];
                let bValue: any = sortConfig.key === 'subjectName' ? (b.subjectNames || '') : b[sortConfig.key as keyof TeacherDto];

                // Handle null/undefined
                if (!aValue) aValue = "";
                if (!bValue) bValue = "";

                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue as string)
                        : (bValue as string).localeCompare(aValue);
                }

                // Fallback for non-string
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [teachers, filterSubjectId, sortConfig]);

    const handleSort = (key: keyof TeacherDto | 'subjectName') => {
        setSortConfig(current => {
            if (current?.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null; // Reset sort
            }
            return { key, direction: 'asc' };
        });
    };

    // Helper to render sort icon
    const SortHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: keyof TeacherDto | 'subjectName', className?: string }) => (
        <th
            className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {label}
                <span className="text-gray-400">
                    {sortConfig?.key === sortKey ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                    ) : (
                        <span className="opacity-0 group-hover:opacity-50">⇅</span>
                    )}
                </span>
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Danh sách giáo viên</h2>
                <div className="flex gap-2">
                    <select
                        value={filterSubjectId}
                        onChange={(e) => setFilterSubjectId(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                    >
                        <option value="">Tất cả bộ môn</option>
                        {subjects.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Import Excel</span>
                    </button>
                    <button
                        onClick={() => setShowAddTeacherModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <PlusIcon />
                        <span>Thêm giáo viên</span>
                    </button>
                </div>
            </div>

            {loading && <div className="p-8 text-center text-gray-500">Đang tải danh sách...</div>}
            {error && <div className="m-6 bg-red-50 text-red-600 p-4 rounded">{error}</div>}

            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortHeader label="Mã GV" sortKey="teacherCode" />
                                <SortHeader label="Họ tên" sortKey="fullName" />
                                <SortHeader label="Email" sortKey="email" />
                                <SortHeader label="Điện thoại" sortKey="phone" />
                                <SortHeader label="Bộ môn" sortKey="subjectName" />
                                <SortHeader label="Chuyên môn" sortKey="specialization" />
                                <SortHeader label="Lớp CN" sortKey="homeroomClassName" />
                                <SortHeader label="Trạng thái" sortKey="status" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedTeacher(teacher)}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{teacher.teacherCode}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{teacher.fullName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.email || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.phone || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {teacher.subjects && teacher.subjects.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {teacher.subjects.map(sub => (
                                                    <span key={sub.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                        {sub.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.specialization || '—'}</td>
                                    <td className="px-6 py-4">
                                        {teacher.homeroomClassName ? (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                                {teacher.homeroomClassName}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <TeacherStatusBadge status={teacher.status || 'ACTIVE'} />
                                    </td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Chưa có giáo viên nào. Bấm "Thêm giáo viên" để bắt đầu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <AddTeacherModal
                isOpen={showAddTeacherModal}
                onClose={() => setShowAddTeacherModal(false)}
                onSuccess={fetchData}
            />
            <TeacherDetailModal
                isOpen={selectedTeacher !== null}
                teacher={selectedTeacher}
                onClose={() => setSelectedTeacher(null)}
                onEdit={(t) => {
                    setSelectedTeacher(null);
                    setEditingTeacher(t);
                }}
                onDelete={(t) => {
                    setSelectedTeacher(null);
                    setDeletingTeacher(t);
                }}
            />
            <EditTeacherModal
                isOpen={editingTeacher !== null}
                teacher={editingTeacher}
                onClose={() => setEditingTeacher(null)}
                onSuccess={fetchData}
            />
            <DeleteTeacherModal
                isOpen={deletingTeacher !== null}
                teacher={deletingTeacher}
                onClose={() => setDeletingTeacher(null)}
                onSuccess={fetchData}
            />
            <ImportTeacherExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchData}
                onImportComplete={(result) => setImportResult(result)}
            />
            <ImportTeacherSuccessToast
                result={importResult}
                onClose={() => setImportResult(null)}
            />
        </div>
    );
};

export default TeacherManagement;
