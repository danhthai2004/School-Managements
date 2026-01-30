import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  systemService,
  type SchoolDetailDto,
  type ProvinceDto,
  type WardDto,
} from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";

export default function SchoolDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<SchoolDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dropdown data
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [wards, setWards] = useState<WardDto[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState<number | null>(null);
  const [enrollmentArea, setEnrollmentArea] = useState("");
  const [address, setAddress] = useState("");

  // Create admin form
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Delete school
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    if (!id) return;
    try {
      const data = await systemService.getSchool(id);
      setSchool(data);
      // Populate edit form with current values
      setName(data.name);
      setCode(data.code);
      setProvinceCode(data.provinceCode);
      setWardCode(data.wardCode);
      setEnrollmentArea(data.enrollmentArea || "");
      setAddress(data.address || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadProvinces = async () => {
    try {
      const data = await systemService.getProvinces();
      setProvinces(data);
    } catch (e) {
      console.error("Failed to load provinces", e);
    }
  };

  useEffect(() => {
    loadData();
    loadProvinces();
  }, [id]);

  // Load wards when province changes (for editing)
  useEffect(() => {
    if (provinceCode && editing) {
      setLoadingWards(true);
      systemService
        .getWardsByProvince(provinceCode)
        .then(setWards)
        .catch((e) => console.error("Failed to load wards", e))
        .finally(() => setLoadingWards(false));
    } else if (!provinceCode) {
      setWards([]);
    }
  }, [provinceCode, editing]);

  // Load wards for display when school data loads
  useEffect(() => {
    if (school?.provinceCode && !editing) {
      systemService
        .getWardsByProvince(school.provinceCode)
        .then(setWards)
        .catch((e) => console.error("Failed to load wards", e));
    }
  }, [school?.provinceCode]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await systemService.updateSchool(id, {
        name: name.trim(),
        code: code.trim(),
        provinceCode: provinceCode || undefined,
        wardCode: wardCode || undefined,
        enrollmentArea: enrollmentArea.trim() || undefined,
        address: address.trim() || undefined,
      });
      setSuccess("Đã cập nhật thông tin trường");
      setEditing(false);
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi cập nhật"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // Reset form to original values
    if (school) {
      setName(school.name);
      setCode(school.code);
      setProvinceCode(school.provinceCode);
      setWardCode(school.wardCode);
      setEnrollmentArea(school.enrollmentArea || "");
      setAddress(school.address || "");
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

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    setDeleting(true);
    try {
      await systemService.deleteSchool(id);
      setSuccess("Đã đánh dấu trường chờ xóa");
      setConfirmDelete(false);
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa trường"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    setError(null);
    setRestoring(true);
    try {
      await systemService.restoreSchool(id);
      setSuccess("Đã khôi phục trường");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi khôi phục"));
    } finally {
      setRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!id) return;
    setError(null);
    setDeleting(true);
    try {
      await systemService.permanentDeleteSchool(id);
      navigate("/system/schools", {
        state: { message: "Đã xóa vĩnh viễn trường và tất cả người dùng thuộc trường" },
      });
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa vĩnh viễn"));
      setConfirmPermanentDelete(false);
    } finally {
      setDeleting(false);
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
        <Link to="/system/schools" className="text-slate-500 hover:text-slate-700">
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
        {/* Pending Delete Notice */}
        {school.pendingDeleteAt && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 font-medium mb-2">⚠️ Trường đang chờ xóa</p>
            <p className="text-amber-600 text-sm mb-4">
              Trường này đã được đánh dấu chờ xóa. Bạn có thể khôi phục hoặc xóa vĩnh viễn.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {restoring ? "Đang khôi phục..." : "Khôi phục trường"}
              </button>
              <button
                onClick={() => setConfirmPermanentDelete(true)}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        )}

        {/* Permanent Delete Confirmation */}
        {confirmPermanentDelete && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-300 rounded-xl">
            <p className="text-rose-800 font-bold mb-2">⚠️ CẢNH BÁO: Xóa vĩnh viễn</p>
            <p className="text-rose-700 text-sm mb-4">
              Hành động này sẽ xóa hoàn toàn trường "{school.name}" và TẤT CẢ người dùng thuộc trường
              này.
              <br />
              <strong>Không thể hoàn tác!</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-700 text-white rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50"
              >
                {deleting ? "Đang xóa..." : "Xác nhận xóa vĩnh viễn"}
              </button>
              <button
                onClick={() => setConfirmPermanentDelete(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{school.name}</h1>
          {!school.pendingDeleteAt && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => (editing ? handleCancelEdit() : setEditing(true))}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                {editing ? "Hủy" : "Chỉnh sửa"}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-sm bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
              >
                Xóa trường
              </button>
            </div>
          )}
        </div>

        {/* Soft Delete Confirmation */}
        {confirmDelete && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-rose-800 font-medium mb-3">
              Bạn có chắc chắn muốn đánh dấu xóa trường "{school.name}"?
            </p>
            <p className="text-rose-600 text-sm mb-4">
              Trường sẽ được chuyển sang trạng thái chờ xóa. Bạn có thể khôi phục hoặc xóa vĩnh viễn
              sau.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Đang xóa..." : "Đánh dấu chờ xóa"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Row 1: Name & Code */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên trường <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: THPT Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mã trường <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: 02000123"
                  required
                />
              </div>
            </div>

            {/* Row 2: Province & Ward */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tỉnh/Thành phố
                </label>
                <select
                  aria-label="Tỉnh/Thành phố"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={provinceCode ?? ""}
                  onChange={(e) => {
                    const newProvince = e.target.value ? Number(e.target.value) : null;
                    setProvinceCode(newProvince);
                    setWardCode(null); // Reset ward when province changes
                  }}
                >
                  <option value="">-- Chọn tỉnh/thành --</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phường/Xã</label>
                <select
                  aria-label="Phường/Xã"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  value={wardCode ?? ""}
                  onChange={(e) => setWardCode(e.target.value ? Number(e.target.value) : null)}
                  disabled={!provinceCode || loadingWards}
                >
                  <option value="">
                    {loadingWards
                      ? "Đang tải..."
                      : provinceCode
                        ? "-- Chọn phường/xã --"
                        : "-- Chọn tỉnh trước --"}
                  </option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Enrollment Area */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  KVTS <span className="text-slate-400 font-normal">(Khu vực tuyển sinh)</span>
                </label>
                <select
                  aria-label="Khu vực tuyển sinh"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={enrollmentArea}
                  onChange={(e) => setEnrollmentArea(e.target.value)}
                >
                  <option value="">-- Chọn khu vực --</option>
                  <option value="KV1">KV1</option>
                  <option value="KV2">KV2</option>
                  <option value="KV2-NT">KV2-NT</option>
                  <option value="KV3">KV3</option>
                </select>
              </div>
              <div></div>
            </div>

            {/* Row 4: Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Địa chỉ chi tiết
              </label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: Số 123, Đường ABC..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70 transition-all shadow-sm hover:shadow"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Mã trường:</span>
                <span className="font-medium text-slate-900 ml-2">{school.code}</span>
              </div>
              <div>
                <span className="text-sm text-slate-500">KVTS:</span>
                <span className="font-medium text-slate-900 ml-2">
                  {school.enrollmentArea || "Chưa cập nhật"}
                </span>
              </div>
            </div>

            {/* Location Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Tỉnh/Thành phố:</span>
                <span className="font-medium text-slate-900 ml-2">
                  {school.provinceName || "Chưa cập nhật"}
                </span>
              </div>
              <div>
                <span className="text-sm text-slate-500">Phường/Xã:</span>
                <span className="font-medium text-slate-900 ml-2">
                  {school.wardName || "Chưa cập nhật"}
                </span>
              </div>
            </div>

            {/* Full Address (combined) */}
            <div>
              <span className="text-sm text-slate-500">Địa chỉ đầy đủ:</span>
              <span className="font-medium text-slate-900 ml-2">
                {(() => {
                  const parts = [
                    school.address,
                    school.wardName,
                    school.provinceName,
                  ].filter(Boolean);
                  return parts.length > 0 ? parts.join(", ") : "Chưa cập nhật";
                })()}
              </span>
            </div>
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
