import { useEffect, useState } from "react";
import { systemService, type NotificationDto, type SchoolDto } from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";

const ROLES = ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "GUARDIAN"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<"ALL" | "SCHOOL" | "ROLE">("ALL");
  const [targetSchoolId, setTargetSchoolId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const [notifs, schoolsData] = await Promise.all([
        systemService.listNotifications(),
        systemService.listSchools(),
      ]);
      setNotifications(notifs);
      setSchools(schoolsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate
    if (scope === "SCHOOL" && !targetSchoolId) {
      setError("Vui lòng chọn trường");
      return;
    }
    if (scope === "ROLE" && !targetRole) {
      setError("Vui lòng chọn vai trò");
      return;
    }

    setCreating(true);
    try {
      await systemService.createNotification({
        title: title.trim(),
        message: message.trim(),
        scope,
        targetSchoolId: scope === "SCHOOL" ? targetSchoolId : undefined,
        targetRole: scope === "ROLE" ? targetRole : undefined,
      });
      setSuccess("Đã tạo thông báo thành công");
      setTitle("");
      setMessage("");
      setScope("ALL");
      setTargetSchoolId("");
      setTargetRole("");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi tạo thông báo"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa thông báo này?")) return;
    setError(null);
    setSuccess(null);
    try {
      await systemService.deleteNotification(id);
      setSuccess("Đã xóa thông báo");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa"));
    }
  };

  const getScopeLabel = (notif: NotificationDto) => {
    if (notif.scope === "ALL") return "Tất cả";
    if (notif.scope === "SCHOOL") return `Trường: ${notif.targetSchoolName}`;
    if (notif.scope === "ROLE") return `Vai trò: ${notif.targetRole}`;
    return notif.scope;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
        <p className="text-sm text-gray-500 mt-1">Tạo và quản lý thông báo hệ thống</p>
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

      {/* Create Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tạo thông báo mới</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề thông báo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-24"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nội dung thông báo..."
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Đối tượng</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                value={scope}
                onChange={(e) => setScope(e.target.value as "ALL" | "SCHOOL" | "ROLE")}
              >
                <option value="ALL">Tất cả (ALL)</option>
                <option value="SCHOOL">Theo trường (SCHOOL)</option>
                <option value="ROLE">Theo vai trò (ROLE)</option>
              </select>
            </div>

            {scope === "SCHOOL" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn trường</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  value={targetSchoolId}
                  onChange={(e) => setTargetSchoolId(e.target.value)}
                >
                  <option value="">-- Chọn trường --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "ROLE" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn vai trò</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                >
                  <option value="">-- Chọn vai trò --</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Đang tạo..." : "Tạo thông báo"}
          </button>
        </form>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Danh sách thông báo</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Chưa có thông báo nào</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{notif.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded">
                        {getScopeLabel(notif)}
                      </span>
                      <span>{new Date(notif.createdAt).toLocaleString("vi-VN")}</span>
                      <span>bởi {notif.createdByEmail}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="shrink-0 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
