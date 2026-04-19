import { useEffect, useState } from "react";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../components/common/Pagination";
import {
    schoolAdminService,
    type StudentDto,
    type UserDto,
    type TeacherDto,
    type BulkAccountCreationResponse,
    type GuardianDto
} from "../../../services/schoolAdminService";
import { UsersIcon, StudentIcon, KeyIcon, LockIcon, UnlockIcon, TrashIcon } from "../SchoolAdminIcons";
import { useAuth } from "../../../context/AuthContext";
import BulkAccountResultModal from "../components/account/BulkAccountResultModal";
import AccountCreationTable from "../components/account/AccountCreationTable";
import { useToast } from "../../../context/ToastContext";
import { useConfirmation } from "../../../hooks/useConfirmation";
import { vietnameseNameSort } from "../../../utils/sortUtils";

const AccountManagement = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'create-student-accounts' | 'create-teacher-accounts' | 'create-guardian-accounts'>('users');
    const [users, setUsers] = useState<UserDto[]>([]);
    const [eligibleStudents, setEligibleStudents] = useState<StudentDto[]>([]);
    const [eligibleTeachers, setEligibleTeachers] = useState<TeacherDto[]>([]);
    const [eligibleGuardians, setEligibleGuardians] = useState<GuardianDto[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // UI State
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkAccountCreationResponse | null>(null);

    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'GUARDIAN' | 'SCHOOL_ADMIN'>('ALL');

    const [bulkResultModalOpen, setBulkResultModalOpen] = useState(false);

    // Hooks
    const { showSuccess } = useToast();
    const { confirm, ConfirmationDialog } = useConfirmation();

    const filteredUsers = users.filter(user => {
        if (statusFilter !== 'ALL') {
            const isActive = statusFilter === 'ACTIVE';
            if (user.enabled !== isActive) return false;
        }
        if (roleFilter !== 'ALL') {
            if (user.role !== roleFilter) return false;
        }
        return true;
    }).sort((a, b) => vietnameseNameSort(a.fullName, b.fullName));

    const {
        paginatedData: paginatedUsers,
        currentPage: usersPage,
        totalPages: usersTotalPages,
        goToPage: setUsersPage,
        setPageSize: setUsersPageSize,
        pageSize: usersPageSize
    } = usePagination(filteredUsers, { dependencies: [statusFilter, roleFilter, activeTab] });

    const {
        paginatedData: paginatedStudents,
        currentPage: studentsPage,
        totalPages: studentsTotalPages,
        goToPage: setStudentsPage,
        setPageSize: setStudentsPageSize,
        pageSize: studentsPageSize
    } = usePagination(eligibleStudents, { dependencies: [activeTab] });

    const {
        paginatedData: paginatedTeachers,
        currentPage: teachersPage,
        totalPages: teachersTotalPages,
        goToPage: setTeachersPage,
        setPageSize: setTeachersPageSize,
        pageSize: teachersPageSize
    } = usePagination(eligibleTeachers, { dependencies: [activeTab] });

    const {
        paginatedData: paginatedGuardians,
        currentPage: guardiansPage,
        totalPages: guardiansTotalPages,
        goToPage: setGuardiansPage,
        setPageSize: setGuardiansPageSize,
        pageSize: guardiansPageSize
    } = usePagination(eligibleGuardians, { dependencies: [activeTab] });

    useEffect(() => {
        // Reset selection when tab changes
        setSelectedIds(new Set());
        setError(null);

        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'create-student-accounts') {
            fetchEligibleStudents();
        } else if (activeTab === 'create-teacher-accounts') {
            fetchEligibleTeachers();
        } else if (activeTab === 'create-guardian-accounts') {
            fetchEligibleGuardians();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.listUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách người dùng.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleStudents = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getStudentsEligibleForAccount();
            setEligibleStudents(data.sort((a, b) => vietnameseNameSort(a.fullName, b.fullName)));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách học sinh.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleTeachers = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getTeachersEligibleForAccount();
            setEligibleTeachers(data.sort((a, b) => vietnameseNameSort(a.fullName, b.fullName)));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách giáo viên.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleGuardians = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getGuardiansEligibleForAccount();
            setEligibleGuardians(data.sort((a, b) => vietnameseNameSort(a.fullName, b.fullName)));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách phụ huynh.");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = (list: any[]) => {
        if (selectedIds.size === list.length && list.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(list.map(i => i.id)));
        }
    };

    const handleCreateAccounts = async () => {
        if (selectedIds.size === 0) return;

        try {
            setCreating(true);
            setError(null);
            setResult(null);
            let response: BulkAccountCreationResponse;

            if (activeTab === 'create-student-accounts') {
                response = await schoolAdminService.createStudentAccounts(Array.from(selectedIds));
                await fetchEligibleStudents();
            } else if (activeTab === 'create-teacher-accounts') {
                response = await schoolAdminService.createTeacherAccounts(Array.from(selectedIds));
                await fetchEligibleTeachers();
            } else {
                response = await schoolAdminService.createGuardianAccounts(Array.from(selectedIds));
                await fetchEligibleGuardians();
            }

            setResult(response);
            setBulkResultModalOpen(true);
            
            if (response.created > 0) {
                showSuccess(`Đã tạo thành công ${response.created} tài khoản.`);
                setSelectedIds(new Set());
            } else if (response.errors && response.errors.length > 0) {
                // If there are errors, we might not want to show a success toast, the modal will show errors.
            } else {
                showSuccess(`Hoàn tất. ${response.skipped} tài khoản đã bỏ qua.`);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tạo tài khoản.");
        } finally {
            setCreating(false);
        }
    };

    const handleResetPassword = (userId: string, email: string) => {
        confirm({
            title: "Đặt lại mật khẩu",
            message: (
                <span>
                    Bạn có chắc chắn muốn đặt lại mật khẩu cho <strong>{email}</strong>? Mật khẩu mới sẽ được gửi qua email.
                </span>
            ),
            confirmText: "Đặt lại mật khẩu",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await schoolAdminService.resetPassword(userId);
                    showSuccess("Đã đặt lại mật khẩu thành công. Vui lòng kiểm tra email.");
                } catch (err: any) {
                    setError(err?.response?.data?.message || "Không thể đặt lại mật khẩu.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleToggleStatus = (userId: string, currentStatus: boolean, email: string) => {
        const action = currentStatus ? "khóa" : "mở khóa";
        confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản`,
            message: (
                <span>
                    Bạn có chắc chắn muốn {action} tài khoản của <strong>{email}</strong>?
                </span>
            ),
            variant: currentStatus ? 'warning' : 'success',
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await schoolAdminService.updateUserStatus(userId, !currentStatus);
                    await fetchUsers();
                    showSuccess(`Đã ${action} tài khoản thành công.`);
                } catch (err: any) {
                    setError(err?.response?.data?.message || `Không thể ${action} tài khoản.`);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleDeleteUser = (user: UserDto) => {
        confirm({
            title: "Xóa tài khoản",
            message: (
                <div>
                    <p>Bạn có chắc chắn muốn xóa tài khoản của <strong>{user.fullName}</strong> ({user.email})?</p>
                    <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                        Lưu ý: Hành động này sẽ gỡ liên kết tài khoản khỏi hồ sơ (nếu có), nhưng KHÔNG xóa hồ sơ học sinh/giáo viên.
                    </p>
                </div>
            ),
            variant: 'danger',
            confirmText: "Xóa tài khoản",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await schoolAdminService.deleteUser(user.id);
                    showSuccess("Đã xóa tài khoản thành công.");
                    await fetchUsers();
                } catch (err: any) {
                    setError(err?.response?.data?.message || "Không thể xóa tài khoản.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Columns definitions
    const studentColumns = [
        { header: "Mã HS", accessor: (item: StudentDto) => <span className="text-sm font-medium text-gray-900">{item.studentCode}</span> },
        { header: "Họ tên", accessor: (item: StudentDto) => <span className="text-sm text-gray-700">{item.fullName}</span> },
        { header: "Email", accessor: (item: StudentDto) => <span className="text-sm text-gray-600">{item.email}</span> },
        { header: "Lớp", accessor: (item: StudentDto) => <span className="text-sm text-gray-600">{item.currentClassName || '—'}</span> },
    ];

    const teacherColumns = [
        { header: "Mã GV", accessor: (item: TeacherDto) => <span className="text-sm font-medium text-gray-900">{item.teacherCode}</span> },
        { header: "Họ tên", accessor: (item: TeacherDto) => <span className="text-sm text-gray-700">{item.fullName}</span> },
        { header: "Email", accessor: (item: TeacherDto) => <span className="text-sm text-gray-600">{item.email}</span> },
    ];

    const guardianColumns = [
        { header: "Họ tên PH", accessor: (item: GuardianDto) => <span className="text-sm font-medium text-gray-900">{item.fullName}</span> },
        { header: "Email", accessor: (item: GuardianDto) => <span className="text-sm text-gray-700">{item.email}</span> },
        { header: "SĐT", accessor: (item: GuardianDto) => <span className="text-sm text-gray-600">{item.phone || '—'}</span> },
        { header: "Phụ huynh của", accessor: (item: GuardianDto) => <span className="text-sm text-gray-600">{item.studentName}</span> },
        { header: "Lớp", accessor: (item: GuardianDto) => <span className="text-sm text-gray-600">{item.studentClass}</span> },
    ];

    return (
        <div className="animate-fade-in-up">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
                <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản người dùng trong trường</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <UsersIcon />
                        Danh sách tài khoản
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('create-student-accounts')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'create-student-accounts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <StudentIcon />
                        Tạo tài khoản học sinh
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('create-teacher-accounts')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'create-teacher-accounts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <UsersIcon />
                        Tạo tài khoản giáo viên
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('create-guardian-accounts')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'create-guardian-accounts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <UsersIcon />
                        Tạo tài khoản Phụ huynh
                    </span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                    {error}
                </div>
            )}

            {loading && activeTab === 'users' ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
            ) : activeTab === 'users' ? (
                /* Users List */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
                        {/* Filters */}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option value="STUDENT">Học sinh</option>
                            <option value="TEACHER">Giáo viên</option>
                            <option value="GUARDIAN">Phụ huynh</option>
                            <option value="SCHOOL_ADMIN">Quản trị viên</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="LOCKED">Đã khóa</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vai trò</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{user.fullName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                                                user.role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {user.role === 'TEACHER' ? 'Giáo viên' :
                                                    user.role === 'STUDENT' ? 'Học sinh' :
                                                        user.role === 'SCHOOL_ADMIN' ? 'Quản trị viên' :
                                                            user.role === 'GUARDIAN' ? 'Phụ huynh' : user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${user.enabled
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.enabled ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleResetPassword(user.id, user.email)}
                                                    disabled={currentUser?.id === user.id}
                                                    className={`p-1.5 rounded-lg transition-colors ${currentUser?.id === user.id
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                                        }`}
                                                    title={currentUser?.id === user.id ? "Không thể thực hiện với chính mình" : "Đặt lại mật khẩu"}
                                                >
                                                    <KeyIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, user.enabled, user.email)}
                                                    disabled={currentUser?.id === user.id}
                                                    className={`p-1.5 rounded-lg transition-colors ${currentUser?.id === user.id
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : user.enabled
                                                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={currentUser?.id === user.id
                                                        ? "Không thể thực hiện với chính mình"
                                                        : user.enabled ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                                >
                                                    {user.enabled ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={currentUser?.id === user.id || user.role === 'SCHOOL_ADMIN' || user.role === 'SYSTEM_ADMIN'}
                                                    className={`p-1.5 rounded-lg transition-colors ${currentUser?.id === user.id || user.role === 'SCHOOL_ADMIN' || user.role === 'SYSTEM_ADMIN'
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                    title={currentUser?.id === user.id
                                                        ? "Không thể xóa chính mình"
                                                        : (user.role === 'SCHOOL_ADMIN' || user.role === 'SYSTEM_ADMIN') ? "Không thể xóa quản trị viên" : "Xóa tài khoản"}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Chưa có tài khoản nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {usersTotalPages > 1 && (
                        <Pagination
                            currentPage={usersPage}
                            totalPages={usersTotalPages}
                            onPageChange={setUsersPage}
                            pageSize={usersPageSize}
                            onPageSizeChange={setUsersPageSize}
                            totalItems={filteredUsers.length}
                        />
                    )}
                </div>
            ) : activeTab === 'create-student-accounts' ? (
                <div className="flex flex-col">
                    <AccountCreationTable
                        title="Học sinh chưa có tài khoản"
                        subtitle="Chọn học sinh để tạo tài khoản đăng nhập"
                        data={paginatedStudents}
                        columns={studentColumns}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={() => toggleSelectAll(paginatedStudents)}
                        onCreate={handleCreateAccounts}
                        creating={creating}
                        emptyMessage={<>Không có học sinh nào đủ điều kiện tạo tài khoản.<br /><span className="text-xs">(Cần có email và chưa có tài khoản)</span></>}
                    />
                    {studentsTotalPages > 1 && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <Pagination
                                currentPage={studentsPage}
                                totalPages={studentsTotalPages}
                                onPageChange={setStudentsPage}
                                pageSize={studentsPageSize}
                                onPageSizeChange={setStudentsPageSize}
                                totalItems={eligibleStudents.length}
                            />
                        </div>
                    )}
                </div>
            ) : activeTab === 'create-teacher-accounts' ? (
                <div className="flex flex-col">
                    <AccountCreationTable
                        title="Giáo viên chưa có tài khoản"
                        subtitle="Chọn giáo viên để tạo tài khoản đăng nhập"
                        data={paginatedTeachers}
                        columns={teacherColumns}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={() => toggleSelectAll(paginatedTeachers)}
                        onCreate={handleCreateAccounts}
                        creating={creating}
                        emptyMessage={<>Không có giáo viên nào đủ điều kiện tạo tài khoản.<br /><span className="text-xs">(Cần có email và chưa có tài khoản)</span></>}
                    />
                    {teachersTotalPages > 1 && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <Pagination
                                currentPage={teachersPage}
                                totalPages={teachersTotalPages}
                                onPageChange={setTeachersPage}
                                pageSize={teachersPageSize}
                                onPageSizeChange={setTeachersPageSize}
                                totalItems={eligibleTeachers.length}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col">
                    <AccountCreationTable
                        title="Phụ huynh chưa có tài khoản"
                        subtitle="Chọn phụ huynh để tạo hoặc liên kết tài khoản"
                        data={paginatedGuardians}
                        columns={guardianColumns}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={() => toggleSelectAll(paginatedGuardians)}
                        onCreate={handleCreateAccounts}
                        creating={creating}
                        createButtonLabel={`Tạo/Liên kết tài khoản (${selectedIds.size})`}
                        emptyMessage={<>Không có phụ huynh nào đủ điều kiện tạo tài khoản.<br /><span className="text-xs">(Cần có email và chưa có tài khoản)</span></>}
                    />
                    {guardiansTotalPages > 1 && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <Pagination
                                currentPage={guardiansPage}
                                totalPages={guardiansTotalPages}
                                onPageChange={setGuardiansPage}
                                pageSize={guardiansPageSize}
                                onPageSizeChange={setGuardiansPageSize}
                                totalItems={eligibleGuardians.length}
                            />
                        </div>
                    )}
                </div>
            )}

            <ConfirmationDialog />

            <BulkAccountResultModal
                isOpen={bulkResultModalOpen}
                onClose={() => setBulkResultModalOpen(false)}
                result={result}
            />
        </div>
    );
};

export default AccountManagement;
