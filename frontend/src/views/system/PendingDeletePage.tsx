import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemService, type UserListDto } from "../../services/systemService";
import { useCountdown } from "../../utils/countdownUtils";
import { extractErrorMessage } from "../../utils/errorUtils";

export default function PendingDeletePage() {
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await systemService.listPendingDeleteUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await systemService.restoreUser(id);
      setSuccess("Đã khôi phục tài khoản");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi khôi phục"));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Xác nhận XÓA VĨNH VIỄN tài khoản này? Hành động này không thể hoàn tác!")) return;
    setError(null);
    setSuccess(null);
    try {
      await systemService.permanentDeleteUser(id);
      setSuccess("Đã xóa vĩnh viễn tài khoản");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tài khoản chờ xóa</h1>
          <p className="text-gray-500 mt-1">
            Các tài khoản sẽ tự động xóa sau 14 ngày kể từ khi đánh dấu
          </p>
        </div>
        <Link
          to="/system/users"
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          ← Quay lại
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không có tài khoản nào đang chờ xóa</div>
        ) : (
          <table className="w-full">
            <thead className="bg-rose-50 border-b border-rose-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Họ tên</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Vai trò</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Thời gian còn lại</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-rose-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <PendingUserRow
                  key={user.id}
                  user={user}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PendingUserRow({
  user,
  onRestore,
  onPermanentDelete,
}: {
  user: UserListDto;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}) {
  const countdown = useCountdown(user.pendingDeleteAt);

  return (
    <tr className="hover:bg-rose-50/50">
      <td className="px-4 py-3 text-sm text-slate-900">{user.email}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{user.fullName}</td>
      <td className="px-4 py-3">
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-rose-600">{countdown}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onRestore(user.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium"
          >
            ✅ Khôi phục
          </button>
          <button
            onClick={() => onPermanentDelete(user.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 font-medium"
          >
            🗑️ Xóa ngay
          </button>
        </div>
      </td>
    </tr>
  );
}
