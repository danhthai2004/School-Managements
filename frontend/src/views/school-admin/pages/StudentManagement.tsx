import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    schoolAdminService,
    type StudentDto,
    type ClassRoomDto,
    type ImportStudentResult
} from "../../../services/schoolAdminService";
import { PlusIcon } from "../SchoolAdminIcons";
import { StatusBadge } from '../../../components/common/StatusBadge';
import BatchDeleteModal from '../../../components/common/BatchDeleteModal';
import { formatDate } from "../../../utils/dateHelpers";
import SuccessToast from "../../../components/common/SuccessToast";


// Extracted modal components
import ImportSuccessToast from "../components/student/ImportSuccessToast";
import AddStudentModal from "../components/student/AddStudentModal";
import StudentDetailModal from "../components/student/StudentDetailModal";

import EditStudentModal from "../components/student/EditStudentModal";
import ImportExcelModal from "../components/student/ImportExcelModal";

// ==================== PAGE COMPONENT ====================

const StudentManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [students, setStudents] = useState<StudentDto[]>([]);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");

    // Modal states
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [importToastResult, setImportToastResult] = useState<ImportStudentResult | null>(null);
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);


    // Bulk selection state
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Success toast state
    const [successToastOpen, setSuccessToastOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [gradeFilter, setGradeFilter] = useState<string>("");
    const [classFilter, setClassFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");


    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Computed filtered students
    const filteredStudents = students.filter(stu => {
        // Search by name or student code
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!stu.fullName?.toLowerCase().includes(term) && !stu.studentCode?.toLowerCase().includes(term)) {
                return false;
            }
        }
        // Filter by grade (extract from class name, e.g., "10A1" -> grade 10)
        if (gradeFilter) {
            const classGrade = stu.currentClassName?.match(/^(\d+)/)?.[1];
            if (classGrade !== gradeFilter) return false;
        }
        // Filter by class
        if (classFilter && stu.currentClassId !== classFilter) return false;
        // Filter by status
        if (statusFilter && stu.status !== statusFilter) return false;

        return true;
    });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, gradeFilter, classFilter, statusFilter]);

    // Pagination computed values
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    useEffect(() => {
        fetchData();
        setSelectedStudentIds(new Set()); // Reset selection on fetch
    }, []);

    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setShowAddStudentModal(true);
            setSearchParams(params => {
                params.delete('action');
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [studentsData, classesData, statsData] = await Promise.all([
                schoolAdminService.listStudents(searchParams.get("classId") || undefined),
                schoolAdminService.listClasses(),
                schoolAdminService.getStats()
            ]);
            setStudents(studentsData);
            setClasses(classesData);
            if (statsData?.currentAcademicYear) {
                setCurrentAcademicYear(statsData.currentAcademicYear);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải dữ liệu.");
        } finally {
            if (!silent) setLoading(false);
        }
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all visible students
            const allIds = paginatedStudents.map(s => s.id);
            setSelectedStudentIds(new Set(allIds));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedStudentIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedStudentIds(newSelected);
    };



    const handleBulkDelete = async () => {
        try {
            const result = await schoolAdminService.bulkDeleteStudents(Array.from(selectedStudentIds));

            if (result.deleted > 0) {
                await fetchData(true); // Silent refresh
                setSelectedStudentIds(new Set());
                // Optional: Toast can still optionally show success if desired, but modal handles it too.
                // Keeping toast for consistency if users like it.
                setSuccessMessage(`Đã xóa thành công ${result.deleted} học sinh`);
                setSuccessToastOpen(true);
            }

            return result; // RETURN result for BatchDeleteModal
        } catch (error) {
            alert("Có lỗi xảy ra khi xóa học sinh");
            return { deleted: 0, failed: selectedStudentIds.size, errors: ["Lỗi hệ thống"] };
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải danh sách học sinh...</div>;
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">{error}</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Danh sách học sinh</h2>
                <div className="flex items-center gap-3">
                    {selectedStudentIds.size > 0 && (
                        <button
                            onClick={() => setShowBatchDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all border border-red-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Xóa {selectedStudentIds.size} mục</span>
                        </button>
                    )}
                    <button
                        onClick={() => {
                            // Export to CSV
                            const headers = ['Mã HS', 'Họ tên', 'Giới tính', 'Ngày sinh', 'Lớp', 'Trạng thái', 'Email', 'SĐT'];
                            const rows = filteredStudents.map(stu => [
                                stu.studentCode || '',
                                stu.fullName || '',
                                stu.gender === 'MALE' ? 'Nam' : stu.gender === 'FEMALE' ? 'Nữ' : 'Khác',
                                formatDate(stu.dateOfBirth),
                                stu.currentClassName || '',
                                stu.status === 'ACTIVE' ? 'Đang học' : stu.status === 'GRADUATED' ? 'Đã TN' : stu.status === 'TRANSFERRED' ? 'Chuyển trường' : 'Tạm nghỉ',
                                stu.email || '',
                                stu.phone || ''
                            ]);
                            const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `danh_sach_hoc_sinh_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
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

            {/* Filter Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center gap-4">
                {/* Search Input */}
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

                {/* Grade Filter */}
                <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả khối</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                </select>

                {/* Class Filter */}
                <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả lớp</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang học</option>
                    <option value="GRADUATED">Đã tốt nghiệp</option>
                    <option value="TRANSFERRED">Chuyển trường</option>
                    <option value="SUSPENDED">Tạm nghỉ</option>
                </select>



                {/* Results count */}
                <span className="text-sm text-slate-500 ml-auto">
                    {filteredStudents.length} / {students.length} học sinh
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>

                            <th className="px-6 py-3 w-4">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={paginatedStudents.length > 0 && Array.from(selectedStudentIds).length === paginatedStudents.length && paginatedStudents.every(s => selectedStudentIds.has(s.id))}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã HS</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Giới tính</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày sinh</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>

                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {paginatedStudents.map((stu) => (
                            <tr
                                key={stu.id}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => {
                                    setSelectedStudent(stu);
                                    setShowDetailModal(true);
                                }}
                            >

                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedStudentIds.has(stu.id)}
                                        onChange={() => handleSelectOne(stu.id)}
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
                        {paginatedStudents.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    {students.length === 0
                                        ? 'Chưa có học sinh nào. Bấm "Thêm học sinh" để bắt đầu.'
                                        : 'Không tìm thấy học sinh nào phù hợp với bộ lọc.'}
                                </td>
                            </tr>
                        )}

                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredStudents.length)} / {filteredStudents.length} học sinh
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ← Trước
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            )}

            <AddStudentModal
                isOpen={showAddStudentModal}
                onClose={() => setShowAddStudentModal(false)}
                onSuccess={() => {
                    fetchData();
                    setSuccessMessage("Thêm học sinh thành công!");
                    setSuccessToastOpen(true);
                }}
                classes={classes}
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
                    fetchData();
                    setSuccessMessage("Cập nhật thông tin học sinh thành công!");
                    setSuccessToastOpen(true);
                }}
            />
            <ImportExcelModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchData}
                onImportComplete={(result) => setImportToastResult(result)}
                defaultAcademicYear={currentAcademicYear}
            />
            <ImportSuccessToast
                result={importToastResult}
                onClose={() => setImportToastResult(null)}
            />
            <BatchDeleteModal
                isOpen={showBatchDeleteModal}
                onClose={() => setShowBatchDeleteModal(false)}
                onConfirm={handleBulkDelete}
                title="Xóa học sinh"
                message={`Bạn có chắc chắn muốn xóa ${selectedStudentIds.size} học sinh đã chọn?`}
                itemCount={selectedStudentIds.size}
                itemName="học sinh"
            />
            <SuccessToast
                isOpen={successToastOpen}
                onClose={() => setSuccessToastOpen(false)}
                message={successMessage}
                subtitle="Tự động đóng sau 3 giây"
            />
        </div>
    );
};

export default StudentManagement;
