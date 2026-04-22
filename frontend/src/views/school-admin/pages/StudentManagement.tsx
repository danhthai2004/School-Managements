import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    schoolAdminService,
    type StudentDto,
    type ClassRoomDto,
    type ImportStudentResult,
    type CombinationDto
} from "../../../services/schoolAdminService";
import { PlusIcon } from "../SchoolAdminIcons";
import { StatusBadge } from '../../../components/common/StatusBadge';
import BatchDeleteModal from '../../../components/common/BatchDeleteModal';
import { formatDate } from "../../../utils/dateHelpers";
import Pagination from "../../../components/common/Pagination";
// ... (imports)
import { NoAcademicYearState } from "../../../components/common/EmptyState";
import { useToast } from "../../../context/ToastContext";





// Extracted modal components
import ImportStudentResultModal from "../components/student/ImportStudentResultModal";
import AddStudentModal from "../components/student/AddStudentModal";
import StudentDetailModal from "../components/student/StudentDetailModal";

import EditStudentModal from "../components/student/EditStudentModal";
import ImportExcelModal from "../components/student/ImportExcelModal";
import BulkAssignModal from "../components/student/BulkAssignModal";

// ==================== PAGE COMPONENT ====================

const StudentManagement = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Data states
    const [students, setStudents] = useState<StudentDto[]>([]);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [combinations, setCombinations] = useState<CombinationDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");

    // Pagination & Filter states
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [gradeFilter, setGradeFilter] = useState<string>("");
    const [classFilter, setClassFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [unassignedFilter, setUnassignedFilter] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'fullName', direction: 'asc' });

    // Modal states
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [importToastResult, setImportToastResult] = useState<ImportStudentResult | null>(null);
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    const { showSuccess, toast } = useToast();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Initial load for supplementary data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [classesData, statsData, combinationsData] = await Promise.all([
                    schoolAdminService.listClasses(),
                    schoolAdminService.getStats(),
                    schoolAdminService.listCombinations()
                ]);
                setClasses(classesData);
                setCombinations(combinationsData);
                if (statsData?.currentAcademicYear) {
                    setCurrentAcademicYear(statsData.currentAcademicYear);
                }
            } catch (err: any) {
                console.error("Failed to load supplementary data", err);
            }
        };
        loadInitialData();
    }, []);

    // Fetch students when filters or pagination change
    useEffect(() => {
        fetchStudents();
        setSelectedStudentIds(new Set());
        setLastClickedIndex(null);
    }, [page, pageSize, debouncedSearch, gradeFilter, classFilter, statusFilter, sortConfig, unassignedFilter]);

    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setShowAddStudentModal(true);
            setSearchParams(params => {
                params.delete('action');
                return params;
            });
        }
        // If classId is in URL, set filter
        const classIdInUrl = searchParams.get("classId");
        if (classIdInUrl) {
            setClassFilter(classIdInUrl);
        }
    }, [searchParams, setSearchParams]);

    const fetchStudents = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await schoolAdminService.listStudents({
                page,
                size: pageSize,
                search: debouncedSearch || undefined,
                grade: gradeFilter ? parseInt(gradeFilter) : undefined,
                classId: classFilter || undefined,
                status: statusFilter || undefined,
                sortBy: sortConfig?.key || 'fullName',
                sortDir: sortConfig?.direction || 'asc',
                unassigned: unassignedFilter || undefined
            });

            setStudents(response.content);
            setTotalElements(response.totalElements);
            setTotalPages(response.totalPages);
            if (!silent) setLoading(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách học sinh.");
            if (!silent) setLoading(false);
        }
    };

    const sortedClasses = useMemo(() => {
        return [...classes].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [classes]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const SortHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => (
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

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(new Set(students.map(s => s.id)));
        } else {
            setSelectedStudentIds(new Set());
        }
        setLastClickedIndex(null);
    };

    const handleSelectOne = (id: string, index: number, e: React.MouseEvent) => {
        const newSelected = new Set(selectedStudentIds);

        if (e.shiftKey && lastClickedIndex !== null) {
            // Select range between lastClickedIndex and current index
            const from = Math.min(lastClickedIndex, index);
            const to = Math.max(lastClickedIndex, index);
            const shouldSelect = !newSelected.has(id);
            for (let i = from; i <= to; i++) {
                if (students[i]) {
                    if (shouldSelect) newSelected.add(students[i].id);
                    else newSelected.delete(students[i].id);
                }
            }
        } else {
            if (newSelected.has(id)) newSelected.delete(id);
            else newSelected.add(id);
        }

        setSelectedStudentIds(newSelected);
        setLastClickedIndex(index);
    };

    const handleBulkDelete = async () => {
        try {
            const result = await schoolAdminService.bulkDeleteStudents(Array.from(selectedStudentIds));
            if (result.deleted > 0) {
                fetchStudents(true);
                setSelectedStudentIds(new Set());
                showSuccess(`Đã xóa thành công ${result.deleted} học sinh`);
            }
            return result;
        } catch (error) {
            toast.error("Có lỗi xảy ra khi xóa học sinh");
            return { deleted: 0, failed: selectedStudentIds.size, errors: ["Lỗi hệ thống"] };
        }
    };

    if (loading && students.length === 0) {
        return <div className="p-8 text-center text-gray-500">Đang tải danh sách học sinh...</div>;
    }

    if (error) {
        if (error.includes("Năm học hiện tại không tìm thấy")) {
            return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fade-in-up">
                    <NoAcademicYearState onAction={() => navigate("/school-admin/semesters")} />
                </div>
            );
        }
        return <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">{error}</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Danh sách học sinh</h2>
                <div className="flex items-center gap-3">
                    {selectedStudentIds.size > 0 && (
                        <>
                            <button
                                onClick={() => setShowBulkAssignModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all border border-blue-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>Phân lớp ({selectedStudentIds.size})</span>
                            </button>
                            <button
                                onClick={() => setShowBatchDeleteModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all border border-red-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Xóa {selectedStudentIds.size} mục</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={async () => {
                            try {
                                const blob = await schoolAdminService.exportStudents(classFilter);
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                const filename = `danh_sach_hoc_sinh_${new Date().toISOString().split('T')[0]}.xlsx`;
                                link.setAttribute('download', filename);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                                showSuccess("Đã xuất file Excel!");
                            } catch (error) {
                                toast.error("Không thể xuất file Excel.");
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Xuất Excel</span>
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Import từ Excel</span>
                    </button>
                    <button
                        onClick={() => setShowAddStudentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <PlusIcon />
                        <span>Thêm học sinh</span>
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc mã HS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                    />
                </div>

                <select
                    value={gradeFilter}
                    onChange={(e) => { setGradeFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả khối</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                </select>

                <select
                    value={unassignedFilter ? "__UNASSIGNED__" : classFilter}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__UNASSIGNED__") {
                            setUnassignedFilter(true);
                            setClassFilter("");
                        } else {
                            setUnassignedFilter(false);
                            setClassFilter(val);
                        }
                        setPage(0);
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả lớp</option>
                    <option value="__UNASSIGNED__">Chưa phân lớp</option>
                    {sortedClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang học</option>
                    <option value="GRADUATED">Đã tốt nghiệp</option>
                    <option value="TRANSFERRED">Chuyển trường</option>
                    <option value="SUSPENDED">Tạm nghỉ</option>
                </select>

                <span className="text-sm text-slate-500 ml-auto">
                    Hiển thị {students.length} / {totalElements} học sinh
                </span>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center p-20 text-gray-400 italic">Đang cập nhật danh sách...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 w-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={students.length > 0 && Array.from(selectedStudentIds).length === students.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <SortHeader label="Mã HS" sortKey="studentCode" />
                                <SortHeader label="Họ tên" sortKey="fullName" />
                                <SortHeader label="Giới tính" sortKey="gender" />
                                <SortHeader label="Ngày sinh" sortKey="dateOfBirth" />
                                <SortHeader label="Lớp" sortKey="currentClassName" />
                                <SortHeader label="Trạng thái" sortKey="status" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {students.map((stu, index) => (
                                <tr
                                    key={stu.id}
                                    className={`hover:bg-blue-50 cursor-pointer transition-colors select-none ${selectedStudentIds.has(stu.id) ? 'bg-blue-50/60' : ''}`}
                                    onClick={() => {
                                        setSelectedStudent(stu);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedStudentIds.has(stu.id)}
                                            onChange={() => {}}
                                            onClick={(e) => { e.stopPropagation(); handleSelectOne(stu.id, index, e); }}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{stu.studentCode}</td>
                                    <td className="px-6 py-4 text-sm text-blue-600 hover:underline" onClick={(e) => { e.stopPropagation(); window.location.href = `/school-admin/students/${stu.id}`; }}>{stu.fullName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {stu.gender === 'MALE' ? 'Nam' : stu.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(stu.dateOfBirth)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{stu.currentClassName || '—'}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={stu.status || 'ACTIVE'} />
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        Không tìm thấy học sinh nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
                    totalItems={totalElements}
                />
            )}

            <AddStudentModal
                isOpen={showAddStudentModal}
                onClose={() => setShowAddStudentModal(false)}
                onSuccess={() => {
                    fetchStudents();
                    showSuccess("Thêm học sinh thành công!");
                }}
                classes={classes}
                combinations={combinations}
                defaultAcademicYear={currentAcademicYear}
            />

            <StudentDetailModal
                isOpen={showDetailModal}
                student={selectedStudent}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedStudent(null);
                }}
                onEdit={() => {
                    setShowDetailModal(false);
                    setEditingStudent(selectedStudent);
                    setShowEditModal(true);
                }}
            />
            <EditStudentModal
                isOpen={showEditModal}
                student={editingStudent}
                classes={classes}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingStudent(null);
                }}
                onSuccess={() => {
                    fetchStudents();
                    showSuccess("Cập nhật thông tin học sinh thành công!");
                }}
            />
            <ImportExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchStudents}
                onImportComplete={(result) => {
                    setImportToastResult(result);
                }}
            />
            <ImportStudentResultModal
                result={importToastResult}
                onClose={() => setImportToastResult(null)}
            />
            <BulkAssignModal
                isOpen={showBulkAssignModal}
                onClose={() => setShowBulkAssignModal(false)}
                selectedIds={Array.from(selectedStudentIds)}
                classes={classes}
                onSuccess={() => {
                    fetchStudents(true);
                    setSelectedStudentIds(new Set());
                }}
            />
            <BatchDeleteModal
                isOpen={showBatchDeleteModal}
                onClose={() => setShowBatchDeleteModal(false)}
                onConfirm={handleBulkDelete}
                title="Xóa học sinh"
                message={
                    Array.from(selectedStudentIds).filter(id => students.find(s => s.id === id)?.hasAccount).length > 0
                        ? `Trong đó có ${Array.from(selectedStudentIds).filter(id => students.find(s => s.id === id)?.hasAccount).length} học sinh đang có tài khoản hệ thống. Tài khoản đăng nhập của các học sinh này cũng sẽ bị xóa vĩnh viễn.`
                        : `Bạn có chắc chắn muốn xóa ${selectedStudentIds.size} học sinh đã chọn?`
                }
                itemCount={selectedStudentIds.size}
                itemName="học sinh"
                confirmLabel={
                    Array.from(selectedStudentIds).some(id => students.find(s => s.id === id)?.hasAccount)
                        ? "Tôi xác nhận xóa hồ sơ và tài khoản của các học sinh này"
                        : undefined
                }
            />
        </div>
    );
};

export default StudentManagement;
