import { useEffect, useState } from "react";
import { ClipboardList, Calendar, Bell } from "lucide-react";
import { systemService, type NotificationDto } from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../../components/common/Pagination";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetGroup, setTargetGroup] = useState<"ALL" | "TEACHER" | "STUDENT" | "GUARDIAN">("ALL");
  const [creating, setCreating] = useState(false);

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData: paginatedNotifications,
    goToPage,
    setPageSize,
    totalItems
  } = usePagination(notifications, 50);

  const loadData = async () => {
    try {
      const notifs = await systemService.listNotifications();
      setNotifications(notifs);
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

    setCreating(true);
    try {
      await systemService.createNotification({
        title: title.trim(),
        content: content.trim(),
        type: "OTHER",
        targetGroup,
      });
      setSuccess("Đã tạo thông báo thành công");
      setTitle("");
      setContent("");
      setTargetGroup("ALL");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi tạo thông báo"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa thông báo này?")) return;
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

  const getTargetGroupLabel = (target: string) => {
    switch (target) {
      case "ALL": return "Tất cả";
      case "TEACHER": return "Giáo viên";
      case "STUDENT": return "Học sinh";
      case "GUARDIAN": return "Phụ huynh";
      case "CLASS": return "Lớp học";
      case "GRADE": return "Khối";
      default: return target;
    }
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
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
            <input
              id="title"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề thông báo"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
            <textarea
              id="content"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-24"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung thông báo..."
              required
            />
          </div>

          <div>
            <label htmlFor="targetGroup" className="block text-sm font-medium text-slate-700 mb-1">Đối tượng ưu tiên (Hệ thống)</label>
            <select
              id="targetGroup"
              className="w-full md:w-1/3 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value as "ALL" | "TEACHER" | "STUDENT" | "GUARDIAN")}
            >
              <option value="ALL">Tất cả (ALL)</option>
              <option value="TEACHER">Tất cả Giáo viên</option>
              <option value="STUDENT">Tất cả Học sinh</option>
              <option value="GUARDIAN">Tất cả Phụ huynh</option>
            </select>
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
          <div>
            <div className="divide-y divide-slate-100">
              {paginatedNotifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      {(() => {
                        const iconClass = "w-5 h-5 text-blue-600";
                        if (notif.type === "EXAM") return <ClipboardList className={iconClass} />;
                        if (notif.type === "SCHEDULE") return <Calendar className={iconClass} />;
                        return <Bell className={iconClass} />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{notif.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{notif.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-blue-700 font-medium border border-blue-100">
                          {getTargetGroupLabel(notif.targetGroup)}
                        </span>
                        {notif.type !== 'SYSTEM' && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">
                            {notif.type}
                          </span>
                        )}
                        <span>{new Date(notif.createdAt).toLocaleString("vi-VN")}</span>
                        <span>bởi {notif.createdBy || 'Hệ thống'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="shrink-0 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                    >
                      Thu hồi
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
