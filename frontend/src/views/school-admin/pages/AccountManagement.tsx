import { useEffect, useState } from "react";
import {
    schoolAdminService,
    type StudentDto,
    type UserDto,
    type BulkAccountCreationResponse
} from "../../../services/schoolAdminService";
import { PlusIcon, StudentIcon, UsersIcon } from "../SchoolAdminIcons";

const AccountManagement = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'create-student-accounts'>('users');
    const [users, setUsers] = useState<UserDto[]>([]);
    const [eligibleStudents, setEligibleStudents] = useState<StudentDto[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkAccountCreationResponse | null>(null);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else {
            fetchEligibleStudents();
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
            // Refresh list after creation
            await fetchEligibleStudents();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể tạo tài khoản.");
        } finally {
            setCreating(false);
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
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                    {error}
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
                                // Remove UUID prefix (format: "uuid: message")
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{user.fullName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                                                user.role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {user.role === 'TEACHER' ? 'Giáo viên' :
                                                    user.role === 'STUDENT' ? 'Học sinh' :
                                                        user.role === 'SCHOOL_ADMIN' ? 'Quản trị viên' :
                                                            user.role === 'GUARDIAN' ? 'Phụ huynh' : user.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            Chưa có tài khoản nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
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
            )}
        </div>
    );
};

export default AccountManagement;
