import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemService, type UserListDto, type SchoolDto } from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";
import {
  UsersIcon,
  FilterIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanIcon,
  ShieldIcon,
  SchoolIcon,
  ClockIcon,
} from "../../components/layout/SystemIcons";
import Pagination from "../../components/common/Pagination";

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

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, schoolsData] = await Promise.all([
        systemService.listUsers({
          role: roleFilter || undefined,
          schoolId: schoolFilter || undefined,
          enabled: enabledFilter === "" ? undefined : enabledFilter === "true",
          pendingDelete: false,
          page: currentPage,
          size: pageSize,
        }),
        systemService.listSchools(0, 1000), // Get all schools for filter
      ]);
      setUsers(Array.isArray(usersData.content) ? usersData.content : []);
      setTotalItems(usersData.totalElements || 0);
      setSchools(Array.isArray(schoolsData.content) ? schoolsData.content : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, schoolFilter, enabledFilter, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
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
    if (
      !confirm(
        "Xác nhận đánh dấu xóa tài khoản này? Tài khoản sẽ được chuyển vào mục chờ xóa."
      )
    )
      return;
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách tất cả người dùng trong hệ thống</p>
        </div>
        <Link
          to="/system/users/pending"
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 transition-colors border border-rose-200"
        >
          <ClockIcon size={18} />
          Danh sách chờ xóa
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <FilterIcon size={18} className="text-slate-400" />
            Bộ lọc:
          </div>
          <select
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="SCHOOL_ADMIN">Quản trị trường</option>
            <option value="TEACHER">Giáo viên</option>
            <option value="STUDENT">Học sinh</option>
            <option value="GUARDIAN">Phụ huynh</option>
          </select>

          <select
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <UsersIcon size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Không tìm thấy tài khoản nào</h3>
            <p className="text-slate-500 mt-1">
              Thử thay đổi bộ lọc hoặc thêm tài khoản mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    Người dùng
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    Vai trò
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    Trường học
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">
                    Trạng thái
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{user.fullName}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldIcon size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-700 font-medium">
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.schoolCode ? (
                        <div className="flex items-center gap-2">
                          <SchoolIcon size={16} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{user.schoolCode}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Toàn hệ thống</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${user.enabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                      >
                        {user.enabled ? (
                          <>
                            <CheckCircleIcon size={12} />
                            Hoạt động
                          </>
                        ) : (
                          <>
                            <XCircleIcon size={12} />
                            Vô hiệu
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== "SYSTEM_ADMIN" && (
                          <>
                            {user.enabled ? (
                              <button
                                onClick={() => handleDisable(user.id)}
                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                title="Vô hiệu hoá"
                              >
                                <BanIcon size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnable(user.id)}
                                className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                title="Kích hoạt"
                              >
                                <CheckCircleIcon size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Xóa tài khoản"
                            >
                              <TrashIcon size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / pageSize)}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
