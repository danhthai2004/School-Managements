import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { systemService, type SchoolDetailDto } from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";

export default function SchoolDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<SchoolDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // Create admin form
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const data = await systemService.getSchool(id);
      setSchool(data);
      setName(data.name);
      setCode(data.code);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccess(null);
    try {
      await systemService.updateSchool(id, { name: name.trim(), code: code.trim() });
      setSuccess("Đã cập nhật thông tin trường");
      setEditing(false);
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi cập nhật"));
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccess(null);
    setCreatingAdmin(true);
    try {
      await systemService.createSchoolAdminForSchool(id, {
        email: adminEmail.trim(),
        fullName: adminName.trim(),
      });
      setSuccess("Đã tạo School Admin. Mật khẩu tạm thời đã được gửi qua email.");
      setAdminEmail("");
      setAdminName("");
      setShowCreateAdmin(false);
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi tạo admin"));
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-500 py-8">Đang tải...</div>;
  }

  if (!school) {
    return <div className="text-center text-rose-500 py-8">Không tìm thấy trường</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/system/schools"
          className="text-slate-500 hover:text-slate-700"
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

      {/* School Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            {editing ? "Hủy" : "Chỉnh sửa"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên trường</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã trường</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              Lưu thay đổi
            </button>
          </form>
        ) : (
          <div className="text-slate-600">
            <p>Mã trường: <span className="font-medium text-slate-900">{school.code}</span></p>
          </div>
        )}
      </div>

      {/* School Admins */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">School Admins</h2>
          <button
            onClick={() => setShowCreateAdmin(!showCreateAdmin)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Thêm Admin
          </button>
        </div>

        {showCreateAdmin && (
          <form onSubmit={handleCreateAdmin} className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingAdmin ? "Đang tạo..." : "Tạo Admin"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateAdmin(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {school.admins.length === 0 ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có School Admin nào cho trường này
          </div>
        ) : (
          <div className="space-y-2">
            {school.admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div>
                  <div className="font-medium text-slate-900">{admin.fullName}</div>
                  <div className="text-sm text-slate-500">{admin.email}</div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-lg ${
                    admin.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {admin.enabled ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
