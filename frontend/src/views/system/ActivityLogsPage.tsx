import { useEffect, useState } from "react";
import { systemService, type ActivityLogDto } from "../../services/systemService";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await systemService.listActivityLogs(page, 20);
      setLogs(data.content);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      USER_CREATED: "Tạo tài khoản",
      USER_ENABLED: "Kích hoạt tài khoản",
      USER_DISABLED: "Vô hiệu hoá tài khoản",
      USER_PENDING_DELETE: "Đánh dấu xóa",
      USER_RESTORED: "Khôi phục tài khoản",
      USER_PERMANENT_DELETED: "Xóa vĩnh viễn",
      USER_AUTO_DELETED: "Tự động xóa (14 ngày)",
      USER_PASSWORD_RESET: "Reset mật khẩu",
      SCHOOL_CREATED: "Tạo trường",
      SCHOOL_UPDATED: "Cập nhật trường",
      NOTIFICATION_CREATED: "Tạo thông báo",
      NOTIFICATION_DELETED: "Xóa thông báo",
      LOGIN_SUCCESS: "Đăng nhập",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes("DELETE")) return "bg-rose-100 text-rose-700";
    if (action.includes("CREATED")) return "bg-emerald-100 text-emerald-700";
    if (action.includes("ENABLED") || action.includes("RESTORED")) return "bg-blue-100 text-blue-700";
    if (action.includes("DISABLED")) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo hoạt động</h1>
        <p className="text-slate-500 mt-1">Lịch sử các thao tác trong hệ thống</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Chưa có hoạt động nào</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Thời gian</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Hành động</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Người thực hiện</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {log.performedByEmail || "Hệ thống"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  ← Trước
                </button>
                <span className="text-sm text-slate-600">
                  Trang {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
