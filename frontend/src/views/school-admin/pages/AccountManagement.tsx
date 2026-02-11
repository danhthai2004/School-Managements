import { useEffect, useState } from "react";
import {
    schoolAdminService,
    type StudentDto,
    type UserDto,
    type TeacherDto,
    type BulkAccountCreationResponse
} from "../../../services/schoolAdminService";
import { PlusIcon, StudentIcon, UsersIcon, KeyIcon, LockIcon, UnlockIcon } from "../SchoolAdminIcons";
import { useAuth } from "../../../context/AuthContext";

const AccountManagement = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'create-student-accounts' | 'create-teacher-accounts' | 'create-guardian-accounts'>('users');
    const [users, setUsers] = useState<UserDto[]>([]);
    const [eligibleStudents, setEligibleStudents] = useState<StudentDto[]>([]);
    const [eligibleTeachers, setEligibleTeachers] = useState<TeacherDto[]>([]);
    const [eligibleGuardians, setEligibleGuardians] = useState<import("../../../services/schoolAdminService").GuardianDto[]>([]);

    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkAccountCreationResponse | null>(null);

    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'GUARDIAN' | 'SCHOOL_ADMIN'>('ALL');

    const filteredUsers = users.filter(user => {
        if (statusFilter !== 'ALL') {
            const isActive = statusFilter === 'ACTIVE';
            if (user.enabled !== isActive) return false;
        }
        if (roleFilter !== 'ALL') {
            if (user.role !== roleFilter) return false;
        }
        return true;
    });

    useEffect(() => {
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
            setError(null);
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
            setError(null);
            const data = await schoolAdminService.getStudentsEligibleForAccount();
            setEligibleStudents(data);
            setSelectedStudents(new Set());
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách học sinh.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleTeachers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await schoolAdminService.getTeachersEligibleForAccount();
            setEligibleTeachers(data);
            setSelectedStudents(new Set());
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách giáo viên.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleGuardians = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await schoolAdminService.getGuardiansEligibleForAccount();
            setEligibleGuardians(data);
            setSelectedStudents(new Set());
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách phụ huynh.");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudents(newSet);
    };

    const toggleSelectAll = (list: any[]) => {
        if (selectedStudents.size === list.length && list.length > 0) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(list.map(i => i.id)));
        }
    };

    const handleCreateAccounts = async () => {
        if (selectedStudents.size === 0) return;

        try {
            setCreating(true);
            setError(null);
            setResult(null);
            let response: BulkAccountCreationResponse;

            if (activeTab === 'create-student-accounts') {
                response = await schoolAdminService.createStudentAccounts(Array.from(selectedStudents));
                await fetchEligibleStudents();
            } else if (activeTab === 'create-teacher-accounts') {
                response = await schoolAdminService.createTeacherAccounts(Array.from(selectedStudents));
                await fetchEligibleTeachers();
            } else {
                response = await schoolAdminService.createGuardianAccounts(Array.from(selectedStudents));
                await fetchEligibleGuardians();
            }

            setResult(response);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tạo tài khoản.");
        } finally {
            setCreating(false);
        }
    };

    const handleResetPassword = async (userId: string, email: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${email}? Mật khẩu mới sẽ được gửi qua email.`)) {
            return;
        }

        try {
            setLoading(true);
            await schoolAdminService.resetPassword(userId);
            alert(`Đã đặt lại mật khẩu cho thành công. Vui lòng kiểm tra email.`);
        } catch (err: any) {
            alert(err?.response?.data?.message || "Không thể đặt lại mật khẩu.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? "khóa" : "mở khóa";
        if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản này?`)) {
            return;
        }

        try {
            setLoading(true);
            await schoolAdminService.updateUserStatus(userId, !currentStatus);
            await fetchUsers(); // Refresh list
        } catch (err: any) {
            alert(err?.response?.data?.message || `Không thể ${action} tài khoản.`);
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
                <p className="text-gray-500 text-sm mt-1">Quản lý tài khoản người dùng trong trường</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users'
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
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create-student-accounts'
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
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create-teacher-accounts'
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
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create-guardian-accounts'
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

            {result && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
                    <p className="font-medium">Kết quả xử lý:</p>
                    <p>Đã xử lý thành công (Tạo mới/Liên kết): {result.created}</p>
                    {result.skipped > 0 && <p>Bỏ qua/Lỗi: {result.skipped}</p>}
                    {result.errors.length > 0 && (
                        <ul className="mt-2 text-xs">
                            {result.errors.slice(0, 5).map((e, i) => {
                                const message = e.includes(': ') ? e.split(': ').slice(1).join(': ') : e;
                                return <li key={i}>• {message}</li>;
                            })}
                        </ul>
                    )}
                </div>
            )}

            {loading ? (
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
                                {filteredUsers.map((user) => (
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
                                                    onClick={() => handleToggleStatus(user.id, user.enabled)}
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
                </div>
            ) : activeTab === 'create-student-accounts' ? (
                /* Create Student Accounts */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Học sinh chưa có tài khoản</h2>
                            <p className="text-sm text-gray-500">Chọn học sinh để tạo tài khoản đăng nhập</p>
                        </div>
                        <button
                            onClick={handleCreateAccounts}
                            disabled={selectedStudents.size === 0 || creating}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PlusIcon />
                            <span>{creating ? 'Đang tạo...' : `Tạo tài khoản (${selectedStudents.size})`}</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.size === eligibleStudents.length && eligibleStudents.length > 0}
                                            onChange={() => toggleSelectAll(eligibleStudents)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã HS</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {eligibleStudents.map((stu) => (
                                    <tr key={stu.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(stu.id)}
                                                onChange={() => toggleSelect(stu.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{stu.studentCode}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{stu.fullName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{stu.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{stu.currentClassName || '—'}</td>
                                    </tr>
                                ))}
                                {eligibleStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Không có học sinh nào đủ điều kiện tạo tài khoản.<br />
                                            <span className="text-xs">(Cần có email và chưa có tài khoản)</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'create-teacher-accounts' ? (
                /* Create Teacher Accounts */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Giáo viên chưa có tài khoản</h2>
                            <p className="text-sm text-gray-500">Chọn giáo viên để tạo tài khoản đăng nhập</p>
                        </div>
                        <button
                            onClick={handleCreateAccounts}
                            disabled={selectedStudents.size === 0 || creating}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PlusIcon />
                            <span>{creating ? 'Đang tạo...' : `Tạo tài khoản (${selectedStudents.size})`}</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.size === eligibleTeachers.length && eligibleTeachers.length > 0}
                                            onChange={() => toggleSelectAll(eligibleTeachers)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã GV</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Chuyên môn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {eligibleTeachers.map((teacher) => (
                                    <tr key={teacher.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(teacher.id)}
                                                onChange={() => toggleSelect(teacher.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{teacher.teacherCode}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{teacher.fullName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{teacher.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{teacher.specialization || '—'}</td>
                                    </tr>
                                ))}
                                {eligibleTeachers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Không có giáo viên nào đủ điều kiện tạo tài khoản.<br />
                                            <span className="text-xs">(Cần có email và chưa có tài khoản)</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Create Guardian Accounts */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Phụ huynh chưa có tài khoản</h2>
                            <p className="text-sm text-gray-500">Chọn phụ huynh để tạo hoặc liên kết tài khoản</p>
                        </div>
                        <button
                            onClick={handleCreateAccounts}
                            disabled={selectedStudents.size === 0 || creating}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PlusIcon />
                            <span>{creating ? 'Đang xử lý...' : `Tạo/Liên kết tài khoản (${selectedStudents.size})`}</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.size === eligibleGuardians.length && eligibleGuardians.length > 0}
                                            onChange={() => toggleSelectAll(eligibleGuardians)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên PH</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SĐT</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phụ huynh của</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {eligibleGuardians.map((guardian) => (
                                    <tr key={guardian.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(guardian.id)}
                                                onChange={() => toggleSelect(guardian.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{guardian.fullName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{guardian.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{guardian.phone || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{guardian.studentName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{guardian.studentClass}</td>
                                    </tr>
                                ))}
                                {eligibleGuardians.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Không có phụ huynh nào đủ điều kiện tạo tài khoản.<br />
                                            <span className="text-xs">(Cần có email và chưa có tài khoản)</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};


export default AccountManagement;
