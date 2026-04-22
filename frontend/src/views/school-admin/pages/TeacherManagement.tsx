import React, { useEffect, useState } from "react";
import {
    schoolAdminService,
    type TeacherDto,
    type ImportTeacherResult
} from "../../../services/schoolAdminService";
import { PlusIcon } from "../SchoolAdminIcons";
import { TeacherStatusBadge } from '../../../components/common/StatusBadge';
import BatchDeleteModal from '../../../components/common/BatchDeleteModal';

import AddTeacherModal from "../components/teacher/AddTeacherModal";
import TeacherDetailModal from "../components/teacher/TeacherDetailModal";
import EditTeacherModal from "../components/teacher/EditTeacherModal";
import ImportTeacherExcelModal from "../components/teacher/ImportTeacherExcelModal";
import ImportTeacherResultModal from "../components/teacher/ImportTeacherResultModal";
import { useToast } from "../../../context/ToastContext";
import { vietnameseNameSort } from "../../../utils/sortUtils";
import Pagination from "../../../components/common/Pagination";



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

    // Pagination
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Bulk selection
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());


    // Success toast state - Replaced by global useToast
    const { showSuccess, toast } = useToast();

    // New State for Filter & Sort
    const [subjects, setSubjects] = useState<any[]>([]);
    const [filterSubjectId, setFilterSubjectId] = useState<string>("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof TeacherDto | 'subjectName'; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(0); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchData();
        setSelectedTeacherIds(new Set());
    }, [currentPage, pageSize, debouncedSearch]);


    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await schoolAdminService.listTeacherProfiles(currentPage, pageSize, debouncedSearch);
            setTeachers(data.content);
            setTotalItems(data.totalElements);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            if (!silent) setLoading(false);
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

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = teachers.map(t => t.id);
            setSelectedTeacherIds(new Set(allIds));
        } else {
            setSelectedTeacherIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedTeacherIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTeacherIds(newSelected);
    };



    const handleBulkDelete = async () => {
        try {
            const result = await schoolAdminService.bulkDeleteTeachers(Array.from(selectedTeacherIds));

            if (result.deleted > 0) {
                await fetchData(true); // Silent refresh
                setSelectedTeacherIds(new Set());
                showSuccess(`Đã xóa thành công ${result.deleted} giáo viên`);
            }

            return result;
        } catch (error) {
            console.error("Failed to delete teachers:", error);
            toast.error("Có lỗi xảy ra khi xóa giáo viên");
            return { deleted: 0, failed: selectedTeacherIds.size, errors: ["Lỗi hệ thống"] };
        }
    };


    // Filter & Sort Logic
    const sortedTeachers = React.useMemo(() => {
        let result = [...teachers];

        // 1. Local Filter by Subject (if needed)
        if (filterSubjectId) {
            result = result.filter(t => t.subjects && t.subjects.some(s => s.id === filterSubjectId));
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = sortConfig.key === 'subjectName' ? (a.subjectNames || '') : a[sortConfig.key as keyof TeacherDto];
                let bValue: any = sortConfig.key === 'subjectName' ? (b.subjectNames || '') : b[sortConfig.key as keyof TeacherDto];

                if (!aValue) aValue = "";
                if (!bValue) bValue = "";

                if (typeof aValue === 'string') {
                    if (sortConfig.key === 'fullName') {
                        return sortConfig.direction === 'asc'
                            ? vietnameseNameSort(aValue, bValue as string)
                            : vietnameseNameSort(bValue as string, aValue);
                    }
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue as string, 'vi')
                        : (bValue as string).localeCompare(aValue, 'vi');
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [teachers, filterSubjectId, sortConfig]);

    // const { ... } = usePagination(...) -> Removed in favor of server-side pagination state

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
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm giáo viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
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
                    {selectedTeacherIds.size > 0 && (
                        <button
                            onClick={() => setShowBatchDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all border border-red-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Xóa {selectedTeacherIds.size} mục</span>
                        </button>
                    )}

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
                                <th className="px-6 py-3 w-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={teachers.length > 0 && teachers.every(t => selectedTeacherIds.has(t.id))}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <SortHeader label="Mã GV" sortKey="teacherCode" />

                                <SortHeader label="Họ tên" sortKey="fullName" />
                                <SortHeader label="Email" sortKey="email" />
                                <SortHeader label="Điện thoại" sortKey="phone" />
                                <SortHeader label="Bộ môn" sortKey="subjectName" />
                                <SortHeader label="Lớp CN" sortKey="homeroomClassName" />
                                <SortHeader label="Trạng thái" sortKey="status" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedTeacher(teacher)}>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedTeacherIds.has(teacher.id)}
                                            onChange={() => handleSelectOne(teacher.id)}
                                        />
                                    </td>
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
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        Chưa có giáo viên nào. Bấm "Thêm giáo viên" để bắt đầu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {totalItems > pageSize && !loading && !error && (
                <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalItems / pageSize)}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={setPageSize}
                        totalItems={totalItems}
                    />
                </div>
            )}

            <AddTeacherModal
                isOpen={showAddTeacherModal}
                onClose={() => setShowAddTeacherModal(false)}
                onSuccess={() => {
                    fetchData();
                    showSuccess("Thêm giáo viên thành công!");
                }}
            />
            <TeacherDetailModal
                isOpen={selectedTeacher !== null}
                teacher={selectedTeacher}
                onClose={() => setSelectedTeacher(null)}
                onEdit={(t) => {
                    setSelectedTeacher(null);
                    setEditingTeacher(t);
                }}
            />
            <EditTeacherModal
                isOpen={editingTeacher !== null}
                teacher={editingTeacher}
                onClose={() => setEditingTeacher(null)}
                onSuccess={() => {
                    fetchData();
                    showSuccess("Cập nhật thông tin giáo viên thành công!");
                }}
            />
            <BatchDeleteModal
                isOpen={showBatchDeleteModal}
                onClose={() => setShowBatchDeleteModal(false)}
                onConfirm={handleBulkDelete}
                title="Xóa giáo viên"
                message={`Bạn có chắc chắn muốn xóa ${selectedTeacherIds.size} giáo viên đã chọn?`}
                itemCount={selectedTeacherIds.size}
                itemName="giáo viên"
            />

            <ImportTeacherExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchData}
                onImportComplete={(result) => {
                    setImportResult(result);
                }}
            />
            <ImportTeacherResultModal
                result={importResult}
                onClose={() => setImportResult(null)}
            />

        </div>
    );
};

export default TeacherManagement;
