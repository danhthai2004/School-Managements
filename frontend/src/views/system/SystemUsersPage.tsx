import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemService, type UserListDto, type SchoolDto } from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";

export default function SystemUsersPage() {
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [enabledFilter, setEnabledFilter] = useState<string>("");

  const loadData = async () => {
    try {
      const [usersData, schoolsData] = await Promise.all([
        systemService.listUsers({
          role: roleFilter || undefined,
          schoolId: schoolFilter || undefined,
          enabled: enabledFilter === "" ? undefined : enabledFilter === "true",
          pendingDelete: false,
        }),
        systemService.listSchools(),
      ]);
      setUsers(usersData);
      setSchools(schoolsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, schoolFilter, enabledFilter]);

  const handleEnable = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await systemService.enableUser(id);
      setSuccess("Đã kích hoạt tài khoản");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi kích hoạt"));
    }
  };

  const handleDisable = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await systemService.disableUser(id);
      setSuccess("Đã vô hiệu hoá tài khoản");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi vô hiệu hoá"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận đánh dấu xóa tài khoản này? Tài khoản sẽ được chuyển vào mục chờ xóa.")) return;
    setError(null);
    setSuccess(null);
    try {
      await systemService.markPendingDelete(id);
      setSuccess("Đã đánh dấu xóa tài khoản. Tài khoản sẽ tự động bị xóa sau 14 ngày.");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý tài khoản</h1>
          <p className="text-slate-500 mt-1">Danh sách tất cả người dùng trong hệ thống</p>
        </div>
        <Link
          to="/system/users/pending"
          className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-medium hover:bg-rose-200 transition-colors"
        >
          Chờ xóa
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <select
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="SCHOOL_ADMIN">SCHOOL_ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
            <option value="GUARDIAN">GUARDIAN</option>
          </select>

          <select
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="">Tất cả trường</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <select
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã vô hiệu hoá</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không có tài khoản nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Họ tên</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vai trò</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Trường</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Trạng thái</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.fullName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.schoolCode || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                        user.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.enabled ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.role !== "SYSTEM_ADMIN" && (
                        <>
                          {user.enabled ? (
                            <button
                              onClick={() => handleDisable(user.id)}
                              className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              Vô hiệu
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnable(user.id)}
                              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                            >
                              Kích hoạt
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
