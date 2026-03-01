import { useEffect, useState } from "react";
import {
    schoolAdminService,
    type StudentDto,
    type SchoolUserListDto,
    type BulkAccountCreationResponse
} from "../../../services/schoolAdminService";
import { useCountdown } from "../../../utils/countdownUtils";
import { extractErrorMessage } from "../../../utils/errorUtils";
import { PlusIcon, StudentIcon, UsersIcon } from "../SchoolAdminIcons";

type TabKey = 'users' | 'create-student-accounts' | 'pending-delete';

const ROLE_LABELS: Record<string, string> = {
    TEACHER: "Giáo viên",
    STUDENT: "Học sinh",
    GUARDIAN: "Phụ huynh",
    SCHOOL_ADMIN: "Quản trị viên",
};

function CountdownCell({ pendingDeleteAt }: { pendingDeleteAt: string | null }) {
    const countdown = useCountdown(pendingDeleteAt);
    return <span className="text-sm text-orange-600 font-medium">{countdown}</span>;
}

const AccountManagement = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('users');

    // --- Tab 1: User list with status ---
    const [users, setUsers] = useState<SchoolUserListDto[]>([]);
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [enabledFilter, setEnabledFilter] = useState<string>("");

    // --- Tab 2: Create student accounts ---
    const [eligibleStudents, setEligibleStudents] = useState<StudentDto[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<BulkAccountCreationResponse | null>(null);

    // --- Tab 3: Pending delete ---
    const [pendingUsers, setPendingUsers] = useState<SchoolUserListDto[]>([]);

    // --- Shared state ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        setSuccess(null);
        setResult(null);
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'create-student-accounts') {
            fetchEligibleStudents();
        } else {
            fetchPendingUsers();
        }
    }, [activeTab]);

    // ==================== DATA FETCHING ====================

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await schoolAdminService.listUsersWithStatus();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleStudents = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getStudentsEligibleForAccount();
            setEligibleStudents(data);
            setSelectedStudents(new Set());
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tải danh sách học sinh.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const data = await schoolAdminService.listPendingDeleteUsers();
            setPendingUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ==================== TAB 1 ACTIONS ====================

    const handleEnable = async (id: string) => {
        setError(null); setSuccess(null);
        try {
            await schoolAdminService.enableUser(id);
            setSuccess("Đã kích hoạt tài khoản");
            fetchUsers();
        } catch (e: unknown) {
            setError(extractErrorMessage(e, "Lỗi khi kích hoạt"));
        }
    };

    const handleDisable = async (id: string) => {
        setError(null); setSuccess(null);
        try {
            await schoolAdminService.disableUser(id);
            setSuccess("Đã vô hiệu hoá tài khoản");
            fetchUsers();
        } catch (e: unknown) {
            setError(extractErrorMessage(e, "Lỗi khi vô hiệu hoá"));
        }
    };

    const handleDelete = async (id: string) => {
        setError(null); setSuccess(null);
        if (!window.confirm("Bạn có chắc muốn đánh dấu xóa tài khoản này? Tài khoản sẽ bị xóa vĩnh viễn sau 14 ngày.")) return;
        try {
            await schoolAdminService.markPendingDelete(id);
            setSuccess("Đã đánh dấu xóa tài khoản");
            fetchUsers();
        } catch (e: unknown) {
            setError(extractErrorMessage(e, "Lỗi khi xóa"));
        }
    };

    // ==================== TAB 2 ACTIONS ====================

    const toggleSelectStudent = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudents(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === eligibleStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(eligibleStudents.map(s => s.id)));
        }
    };

    const handleCreateAccounts = async () => {
        if (selectedStudents.size === 0) return;
        try {
            setCreating(true);
            setError(null);
            setResult(null);
            const response = await schoolAdminService.createStudentAccounts(Array.from(selectedStudents));
            setResult(response);
            await fetchEligibleStudents();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tạo tài khoản.");
        } finally {
            setCreating(false);
        }
    };

    // ==================== TAB 3 ACTIONS ====================

    const handleRestore = async (id: string) => {
        setError(null); setSuccess(null);
        try {
            await schoolAdminService.restoreUser(id);
            setSuccess("Đã khôi phục tài khoản");
            fetchPendingUsers();
        } catch (e: unknown) {
            setError(extractErrorMessage(e, "Lỗi khi khôi phục"));
        }
    };

    const handlePermanentDelete = async (id: string) => {
        setError(null); setSuccess(null);
        if (!window.confirm("Bạn có chắc muốn xóa vĩnh viễn tài khoản này? Hành động này không thể hoàn tác!")) return;
        try {
            await schoolAdminService.permanentDeleteUser(id);
            setSuccess("Đã xóa vĩnh viễn tài khoản");
            fetchPendingUsers();
        } catch (e: unknown) {
            setError(extractErrorMessage(e, "Lỗi khi xóa vĩnh viễn"));
        }
    };

    // ==================== FILTERING (Tab 1) ====================

    const filtered = users.filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (enabledFilter === "true" && !u.enabled) return false;
        if (enabledFilter === "false" && u.enabled) return false;
        return true;
    });

    // ==================== RENDER ====================

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
                    onClick={() => setActiveTab('pending-delete')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending-delete'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Chờ xóa
                        {pendingUsers.length > 0 && activeTab !== 'pending-delete' && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-500 rounded-full">
                                {pendingUsers.length}
                            </span>
                        )}
                    </span>
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
                    {success}
                </div>
            )}
            {result && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
                    <p className="font-medium">Kết quả tạo tài khoản:</p>
                    <p>Tạo thành công: {result.created}</p>
                    {result.skipped > 0 && <p>Bỏ qua: {result.skipped}</p>}
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

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                    <svg className="animate-spin h-6 w-6 mr-3 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang tải...
                </div>
            ) : activeTab === 'users' ? (
                /* ==================== TAB 1: Users List ==================== */
                <div>
                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-600">Bộ lọc:</span>
                            </div>

                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                title="Lọc theo vai trò"
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">Tất cả vai trò</option>
                                <option value="TEACHER">Giáo viên</option>
                                <option value="STUDENT">Học sinh</option>
                                <option value="GUARDIAN">Phụ huynh</option>
                            </select>

                            <select
                                value={enabledFilter}
                                onChange={(e) => setEnabledFilter(e.target.value)}
                                title="Lọc theo trạng thái"
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="true">Hoạt động</option>
                                <option value="false">Vô hiệu</option>
                            </select>

                            <span className="text-sm text-gray-500 ml-auto">{filtered.length} tài khoản</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {filtered.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">Không có người dùng nào</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-3 font-semibold text-gray-600">Họ tên</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Vai trò</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Trạng thái</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u) => (
                                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900">{u.fullName}</td>
                                            <td className="px-6 py-3 text-gray-600">{u.email}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    u.role === "TEACHER" ? "bg-blue-100 text-blue-700" :
                                                    u.role === "STUDENT" ? "bg-purple-100 text-purple-700" :
                                                    "bg-teal-100 text-teal-700"
                                                }`}>
                                                    {ROLE_LABELS[u.role] || u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                {u.enabled ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        Hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        Vô hiệu
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    {u.enabled ? (
                                                        <button
                                                            onClick={() => handleDisable(u.id)}
                                                            className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                                                            title="Vô hiệu hoá"
                                                        >
                                                            Vô hiệu
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEnable(u.id)}
                                                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                                            title="Kích hoạt"
                                                        >
                                                            Kích hoạt
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Đánh dấu xóa"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : activeTab === 'create-student-accounts' ? (
                /* ==================== TAB 2: Create Student Accounts ==================== */
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
                                            onChange={toggleSelectAll}
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
                                    <tr key={stu.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(stu.id)}
                                                onChange={() => toggleSelectStudent(stu.id)}
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
            ) : (
                /* ==================== TAB 3: Pending Delete ==================== */
                <div>
                    <div className="mb-4">
                        <p className="text-gray-500 text-sm">Tài khoản sẽ tự động bị xóa vĩnh viễn sau 14 ngày</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {pendingUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-gray-500">Không có tài khoản nào đang chờ xóa</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-3 font-semibold text-gray-600">Họ tên</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Vai trò</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Thời gian còn lại</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map((u) => (
                                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900">{u.fullName}</td>
                                            <td className="px-6 py-3 text-gray-600">{u.email}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    u.role === "TEACHER" ? "bg-blue-100 text-blue-700" :
                                                    u.role === "STUDENT" ? "bg-purple-100 text-purple-700" :
                                                    "bg-teal-100 text-teal-700"
                                                }`}>
                                                    {ROLE_LABELS[u.role] || u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <CountdownCell pendingDeleteAt={u.pendingDeleteAt} />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleRestore(u.id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        Khôi phục
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(u.id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        Xóa vĩnh viễn
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountManagement;
