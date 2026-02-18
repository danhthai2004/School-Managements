import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { schoolAdminService } from '../../../services/schoolAdminService';
import type { StudentProfileDto, ClassRoomDto } from '../../../services/schoolAdminService';
import { XIcon } from '../SchoolAdminIcons';

// Format date for display
const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};

// Format instant for display
const formatInstant = (instantStr: string): string => {
    try {
        const date = new Date(instantStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return instantStr;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        GRADUATED: 'bg-blue-100 text-blue-700 border-blue-200',
        TRANSFERRED: 'bg-amber-100 text-amber-700 border-amber-200',
        SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
    };
    const statusLabels: Record<string, string> = {
        ACTIVE: 'Đang học',
        GRADUATED: 'Đã tốt nghiệp',
        TRANSFERRED: 'Chuyển trường',
        SUSPENDED: 'Tạm nghỉ',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {statusLabels[status] || status}
        </span>
    );
};

const TransferModal = ({
    isOpen,
    studentName,
    classes,
    currentClassId,
    onClose,
    onTransfer
}: {
    isOpen: boolean;
    studentName: string;
    classes: ClassRoomDto[];
    currentClassId: string | null;
    onClose: () => void;
    onTransfer: (newClassId: string) => void;
}) => {
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleTransfer = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            await onTransfer(selectedClassId);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-[100] transform transition-all scale-100">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Chuyển lớp</h3>
                        <p className="text-sm text-gray-500">Học sinh: {studentName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Chọn lớp mới để chuyển học sinh. Lịch sử đăng ký cũ sẽ được bảo lưu.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lớp mới <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-all"
                                >
                                    <option value="">-- Chọn lớp mới --</option>
                                    {classes
                                        .filter(c => c.id !== currentClassId && c.status === 'ACTIVE')
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={!selectedClassId || loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        Xác nhận chuyển
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default function StudentProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<StudentProfileDto | null>(null);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const [profileData, classesData] = await Promise.all([
                    schoolAdminService.getStudentProfile(id),
                    schoolAdminService.listClasses()
                ]);
                setProfile(profileData);
                setClasses(classesData);
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Không thể tải thông tin học sinh');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleTransfer = async (newClassId: string) => {
        if (!id) return;
        try {
            const updatedProfile = await schoolAdminService.transferStudent(id, newClassId);
            setProfile(updatedProfile);
            setShowTransferModal(false);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Không thể chuyển lớp');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="text-red-500 text-lg">{error || 'Không tìm thấy học sinh'}</div>
                <button
                    onClick={() => navigate('/school-admin/students')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    // Get initials for avatar
    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return parts[parts.length - 1].charAt(0).toUpperCase();
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in-up">
            {/* Back Button */}
            <div>
                <button
                    onClick={() => navigate('/school-admin/students')}
                    className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                    <div className="p-1 rounded-full group-hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    Quay lại danh sách
                </button>
            </div>

            {/* Header Card - Option 3 Layout */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                    {/* Avatar Placeholder */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shadow-blue-500/20 shrink-0 ring-4 ring-white border border-gray-100">
                        {getInitials(profile.fullName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3 min-w-0">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{profile.fullName}</h1>
                        </div>

                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                                <span className="font-medium text-gray-700">{profile.studentCode}</span>
                            </div>
                            <span className="text-gray-300">|</span>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-blue-700 font-medium">{profile.currentClassName || 'Chưa xếp lớp'}</span>
                            </div>
                        </div>

                        {/* Status Badge - Moved below Student Code per request */}
                        <div className="pt-1">
                            <StatusBadge status={profile.status} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 md:self-center">
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/30 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Chuyển lớp
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid - Reverted to Previous Card Style */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Info */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Ngày sinh</p>
                                <p className="font-medium text-gray-800">{formatDate(profile.dateOfBirth)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Giới tính</p>
                                <p className="font-medium text-gray-800">
                                    {profile.gender === 'MALE' ? 'Nam' : profile.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Nơi sinh</p>
                                <p className="font-medium text-gray-800">{profile.birthPlace || '—'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Ngày nhập học</p>
                                <p className="font-medium text-gray-800">{formatDate(profile.enrollmentDate)}</p>
                            </div>
                            <div className="col-span-2 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
                                <p className="font-medium text-gray-800">{profile.address || '—'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Email</p>
                                <p className="font-medium text-gray-800">{profile.email || '—'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Điện thoại</p>
                                <p className="font-medium text-gray-800">{profile.phone || '—'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Lớp hiện tại</p>
                                <p className="font-medium text-blue-600">{profile.currentClassName || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Guardian & History */}
                <div className="space-y-6">
                    {/* Guardian Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Phụ huynh</h2>
                        </div>
                        <div className="p-6">
                            {profile.guardian ? (
                                <div className="space-y-3">
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60">
                                        <p className="font-semibold text-gray-900">{profile.guardian.fullName}</p>
                                        {profile.guardian.relationship && <p className="text-xs text-blue-600 font-medium">{profile.guardian.relationship}</p>}
                                        {profile.guardian.phone && <p className="text-sm text-gray-600 mt-1">📞 {profile.guardian.phone}</p>}
                                        {profile.guardian.email && <p className="text-sm text-gray-600">✉️ {profile.guardian.email}</p>}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Chưa có thông tin phụ huynh</p>
                            )}
                        </div>
                    </div>

                    {/* Enrollment History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Lịch sử lớp học</h2>
                        </div>
                        <div className="overflow-x-auto">
                            {profile.enrollmentHistory && profile.enrollmentHistory.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-3 px-6 font-semibold text-gray-500 uppercase text-xs tracking-wider">Năm học</th>
                                            <th className="text-left py-3 px-6 font-semibold text-gray-500 uppercase text-xs tracking-wider">Lớp</th>
                                            <th className="text-left py-3 px-6 font-semibold text-gray-500 uppercase text-xs tracking-wider">Ngày đăng ký</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {profile.enrollmentHistory.map((e, idx) => (
                                            <tr key={e.enrollmentId || idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="py-4 px-6 font-medium text-gray-900">{e.academicYear}</td>
                                                <td className="py-4 px-6 text-blue-600 font-medium">{e.className}</td>
                                                <td className="py-4 px-6 text-gray-600">{formatInstant(e.enrolledAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500 text-sm p-6">Chưa có lịch sử đăng ký lớp</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Placeholder for future features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-75">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-400">Điểm số (Coming soon)</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-400 text-sm">Tính năng đang phát triển...</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-75">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-400">Hạnh kiểm (Coming soon)</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-400 text-sm">Tính năng đang phát triển...</p>
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            <TransferModal
                isOpen={showTransferModal}
                studentName={profile.fullName}
                classes={classes}
                currentClassId={profile.currentClassId}
                onClose={() => setShowTransferModal(false)}
                onTransfer={handleTransfer}
            />
        </div>
    );
}
