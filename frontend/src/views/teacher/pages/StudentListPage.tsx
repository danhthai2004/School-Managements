import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { teacherService, type HomeroomStudent, type TeacherProfile } from "../../../services/teacherService";
import { StatusBadge } from "../../../components/common/StatusBadge";

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

import { createPortal } from "react-dom";

// Helper to get conduct badge color
const getConductBadgeClass = (grade?: string) => {
    switch (grade) {
        case "Xuất sắc": return "bg-green-100 text-green-700";
        case "Tốt": return "bg-blue-100 text-blue-700";
        case "Khá": return "bg-amber-100 text-amber-700";
        case "Trung bình": return "bg-orange-100 text-orange-700";
        case "Yếu": return "bg-red-100 text-red-700";
        default: return "bg-gray-100 text-gray-600";
    }
};

// Helper to translate status
const translateStatus = (status: string) => {
    switch (status) {
        case "ACTIVE": return "Đang học";
        case "SUSPENDED": return "Tạm nghỉ";
        case "TRANSFERRED": return "Chuyển trường";
        case "GRADUATED": return "Đã tốt nghiệp";
        default: return status;
    }
};

// Statistics Card Component (Updated with hover effects from TeacherDashboard)
const StatCard = ({ icon, label, value, subValue, colorClass, delay = 0 }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue?: string;
    colorClass: string;
    delay?: number;
}) => (
    <div
        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                {icon}
            </div>
        </div>
    </div>
);

// Student Detail Modal
const StudentDetailModal = ({ student, onClose }: { student: HomeroomStudent | null; onClose: () => void }) => {
    if (!student) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-[101]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Thông tin học sinh</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    {/* Avatar and name */}
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                            {student.fullName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{student.fullName}</h3>
                            <p className="text-sm text-gray-500">MSHS: {student.studentCode}</p>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Giới tính</p>
                            <p className="text-sm font-medium text-gray-900">
                                {student.gender === 'MALE' ? 'Nam' : student.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                            <StatusBadge status={student.status} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Điện thoại</p>
                            <p className="text-sm font-medium text-gray-900">{student.phone || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{student.email || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">GPA trung bình</p>
                            <p className="text-sm font-medium text-gray-900">
                                {student.averageGpa ? student.averageGpa.toFixed(1) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Tỷ lệ chuyên cần</p>
                            <p className="text-sm font-medium text-gray-900">
                                {student.attendanceRate ? `${student.attendanceRate.toFixed(0)}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Hạnh kiểm</p>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConductBadgeClass(student.conductGrade)}`}>
                                {student.conductGrade || '—'}
                            </span>
                        </div>
                    </div>

                    {/* Parent contact */}
                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Liên hệ phụ huynh</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Điện thoại PH</p>
                                <p className="text-sm font-medium text-gray-900">{student.parentPhone || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Email PH</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{student.parentEmail || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default function StudentListPage() {
    const { teacherProfile } = useOutletContext<OutletContextType>();
    const [students, setStudents] = useState<HomeroomStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [conductFilter, setConductFilter] = useState<string>("ALL");
    const [selectedStudent, setSelectedStudent] = useState<HomeroomStudent | null>(null);

    useEffect(() => {
        if (teacherProfile?.isHomeroomTeacher) {
            fetchStudents();
        }
    }, [teacherProfile]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await teacherService.getHomeroomStudents();
            setStudents(data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách học sinh");
        } finally {
            setLoading(false);
        }
    };

    // Filter and search students
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            // Search filter
            const matchesSearch = searchQuery === "" ||
                student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email?.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter === "ALL" || student.status === statusFilter;

            // Conduct filter
            const matchesConduct = conductFilter === "ALL" || student.conductGrade === conductFilter;

            return matchesSearch && matchesStatus && matchesConduct;
        });
    }, [students, searchQuery, statusFilter, conductFilter]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = students.length;
        const excellent = students.filter(s => (s.averageGpa || 0) >= 8.0).length;
        const needsAttention = students.filter(s => (s.averageGpa || 0) < 5.0 || (s.attendanceRate || 100) < 80).length;
        const averageGpa = total > 0
            ? students.reduce((sum, s) => sum + (s.averageGpa || 0), 0) / total
            : 0;

        return { total, excellent, needsAttention, averageGpa };
    }, [students]);

    // Export to Excel function
    const handleExportExcel = () => {
        const headers = ["MSHS", "Họ tên", "Giới tính", "Email", "SĐT", "GPA", "Chuyên cần", "Hạnh kiểm", "Trạng thái"];
        const csvContent = [
            headers.join(","),
            ...filteredStudents.map(s => [
                s.studentCode,
                `"${s.fullName}"`,
                s.gender === 'MALE' ? 'Nam' : s.gender === 'FEMALE' ? 'Nữ' : 'Khác',
                s.email || '',
                s.phone || '',
                s.averageGpa?.toFixed(1) || '',
                s.attendanceRate ? `${s.attendanceRate.toFixed(0)}%` : '',
                s.conductGrade || '',
                translateStatus(s.status)
            ].join(","))
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `danh-sach-hoc-sinh-${teacherProfile?.homeroomClassName || 'lop'}.csv`;
        link.click();
    };

    if (!teacherProfile?.isHomeroomTeacher) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
                <p className="text-gray-500">Chỉ giáo viên chủ nhiệm mới có thể xem danh sách học sinh lớp.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header aligned with actions (Outside) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Danh sách học sinh
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Lớp {teacherProfile.homeroomClassName}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Nhập File
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <StatCard
                    icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label="Tổng số học sinh"
                    value={stats.total}
                    colorClass="bg-blue-50"
                    delay={0}
                />
                <StatCard
                    icon={<svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Học sinh xuất sắc"
                    value={stats.excellent}
                    subValue="GPA ≥ 8.0"
                    colorClass="bg-emerald-50 text-emerald-500"
                    delay={100}
                />
                <StatCard
                    icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    label="Cần chú ý"
                    value={stats.needsAttention}
                    subValue="GPA < 5 hoặc CC < 80%"
                    colorClass="bg-red-50 text-red-500"
                    delay={200}
                />
                <StatCard
                    icon={<svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    label="GPA trung bình"
                    value={stats.averageGpa.toFixed(2)}
                    colorClass="bg-violet-50"
                    delay={300}
                />
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden mt-2">
                {/* Table Header & Title */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Danh sách học sinh</h2>
                    <span className="text-sm text-gray-500">
                        Hiển thị <span className="font-medium text-gray-900">{filteredStudents.length}</span> / {stats.total} học sinh
                    </span>
                </div>

                {/* Filters Row */}
                <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between text-sm">
                    <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                        {/* Search Input */}
                        <div className="w-full md:w-64 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Tìm kiếm học sinh..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm placeholder-slate-400"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:border-blue-500 outline-none cursor-pointer"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang học</option>
                            <option value="SUSPENDED">Tạm nghỉ</option>
                            <option value="TRANSFERRED">Chuyển trường</option>
                        </select>

                        {/* Conduct Filter */}
                        <select
                            value={conductFilter}
                            onChange={(e) => setConductFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:border-blue-500 outline-none cursor-pointer"
                        >
                            <option value="ALL">Tất cả hạnh kiểm</option>
                            <option value="Xuất sắc">Xuất sắc</option>
                            <option value="Tốt">Tốt</option>
                            <option value="Khá">Khá</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Yếu">Yếu</option>
                        </select>
                    </div>
                </div>

                {/* Student Table */}
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Học sinh</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">MSHS</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Liên hệ</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">GPA</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Chuyên cần</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Hạnh kiểm</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-3 text-end text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-blue-50 transition-colors group">
                                    {/* Student Name + Avatar */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {student.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 leading-none mb-1">{student.fullName}</p>
                                                <p className="text-xs text-gray-500">{student.email || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {/* MSHS */}
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md font-mono">
                                            {student.studentCode}
                                        </span>
                                    </td>
                                    {/* Contact */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm flex flex-col items-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-600">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                {student.phone || '—'}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mt-1">
                                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                PH: {student.parentEmail && student.parentEmail.length > 15 ? student.parentEmail.substring(0, 15) + '...' : (student.parentEmail || '—')}
                                            </div>
                                        </div>
                                    </td>
                                    {/* GPA */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`text-sm font-semibold ${(student.averageGpa || 0) >= 8 ? 'text-green-600' : (student.averageGpa || 0) < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {student.averageGpa?.toFixed(1) || '—'}
                                        </span>
                                    </td>
                                    {/* Attendance */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`text-sm font-medium ${(student.attendanceRate || 0) >= 90 ? 'text-green-600' : (student.attendanceRate || 0) < 80 ? 'text-red-600' : 'text-yellow-600'}`}>
                                            {student.attendanceRate ? `${student.attendanceRate.toFixed(0)}%` : '—'}
                                        </span>
                                    </td>
                                    {/* Conduct */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConductBadgeClass(student.conductGrade)} whitespace-nowrap`}>
                                            {student.conductGrade || '—'}
                                        </span>
                                    </td>
                                    {/* Status */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <StatusBadge status={student.status} />
                                    </td>
                                    {/* Actions */}
                                    <td className="px-6 py-4 text-end whitespace-nowrap">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            title="Xem chi tiết"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        {students.length === 0 ? (
                                            <div>
                                                <p className="font-medium">Chưa có học sinh nào trong lớp</p>
                                                <p className="text-sm mt-1">Liên hệ Admin để thêm học sinh vào lớp</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-medium">Không tìm thấy học sinh nào</p>
                                                <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Modal */}
            <StudentDetailModal
                student={selectedStudent}
                onClose={() => setSelectedStudent(null)}
            />
        </div >
    );
}
