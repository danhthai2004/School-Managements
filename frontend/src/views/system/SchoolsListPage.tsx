import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  systemService,
  type SchoolDto,
  type ProvinceDto,
  type WardDto,
} from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";
import { SchoolIcon, PlusIcon, ArrowRightIcon, XIcon } from "../../components/layout/SystemIcons";

export default function SchoolsListPage() {
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create school form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Dropdown data
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [wards, setWards] = useState<WardDto[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Form values
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [enrollmentArea, setEnrollmentArea] = useState("");
  const [priorityType, setPriorityType] = useState(""); // "" or "DTNT"
  const [address, setAddress] = useState("");

  const loadData = async () => {
    try {
      const data = await systemService.listSchools();
      setSchools(data);
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
  }, []);

  // Load wards when province changes
  useEffect(() => {
    if (provinceCode) {
      setLoadingWards(true);
      setWardCode(null);
      systemService.getWardsByProvince(provinceCode)
        .then(setWards)
        .catch((e: unknown) => console.error("Failed to load wards", e))
        .finally(() => setLoadingWards(false));
    } else {
      setWards([]);
      setWardCode(null);
    }
  }, [provinceCode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !provinceCode) {
      setError("Vui lòng nhập tên trường và chọn tỉnh/thành");
      return;
    }
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      await systemService.createSchool({
        schoolName: schoolName.trim(),
        schoolCode: schoolCode.trim() || undefined,
        provinceCode,
        wardCode: wardCode || undefined,
        enrollmentArea: enrollmentArea.trim() || undefined,
        address: address.trim() || undefined,
      });
      setSuccess("Đã tạo trường thành công");
      resetForm();
      setShowCreate(false);
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi tạo trường"));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setProvinceCode(null);
    setWardCode(null);
    setSchoolName("");
    setSchoolCode("");
    setEnrollmentArea("");
    setPriorityType("");
    setAddress("");
    setWards([]);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách trường học</h1>
          <p className="text-slate-500 mt-1">Quản lý tất cả trường trong hệ thống</p>
        </div>
        {showCreate ? (
          <button
            onClick={() => setShowCreate(false)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow"
          >
            <XIcon size={20} />
            Đóng form
          </button>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
          >
            <PlusIcon size={20} />
            Tạo trường mới
          </button>
        )}
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

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm animate-fade-in-up">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Tạo trường mới</h2>
          <form onSubmit={handleCreate} className="space-y-6">
            {/* Row 1: Name & School Code */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên trường <span className="text-rose-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">(tự động thêm "THPT" vào đầu)</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="VD: FPT"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mã trường
                  <span className="text-slate-400 font-normal ml-1">(theo BGD)</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="VD: 02000123"

                />
              </div>
            </div>

            {/* Row 2: Province & Ward */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tỉnh/Thành phố <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={provinceCode ?? ""}
                  onChange={(e) => setProvinceCode(e.target.value ? Number(e.target.value) : null)}
                  required
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phường/Xã
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  value={wardCode ?? ""}
                  onChange={(e) => setWardCode(e.target.value ? Number(e.target.value) : null)}
                  disabled={!provinceCode || loadingWards}
                >
                  <option value="">
                    {loadingWards ? "Đang tải..." : provinceCode ? "-- Chọn phường/xã --" : "-- Chọn tỉnh trước --"}
                  </option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: KVTS & DTNT */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  KVTS <span className="text-slate-400 font-normal">(Khu vực tuyển sinh)</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={enrollmentArea}
                  onChange={(e) => {
                    setEnrollmentArea(e.target.value);
                    // Reset priorityType if KV3 is selected (no DTNT option)
                    if (e.target.value === "KV3" || e.target.value === "") {
                      setPriorityType("");
                    }
                  }}
                >
                  <option value="">-- Chọn khu vực --</option>
                  <option value="KV1">KV1</option>
                  <option value="KV2">KV2</option>
                  <option value="KV3">KV3</option>
                </select>
              </div>
              {(enrollmentArea === "KV1" || enrollmentArea === "KV2") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loại ưu tiên
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={priorityType}
                    onChange={(e) => setPriorityType(e.target.value)}
                  >
                    <option value="">-- Không --</option>
                    <option value="DTNT">DTNT (Dân tộc nội trú)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Row 4: Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Địa chỉ chi tiết</label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: Số 123, Đường ABC..."
              />
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
              <span className="font-semibold">Lưu ý:</span> Tên trường sẽ được tự động thêm tiền tố <strong>"THPT "</strong> khi lưu.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70 transition-all shadow-sm hover:shadow"
              >
                {creating ? "Đang tạo..." : "Tạo trường"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <SchoolIcon size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Chưa có trường nào</h3>
          <p className="text-slate-500 mt-1 mb-6">Bắt đầu bằng cách thêm trường học mới vào hệ thống.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            + Tạo trường mới
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Link
              key={school.id}
              to={`/system/schools/${school.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 grid place-items-center text-blue-600 group-hover:scale-110 transition-transform">
                  <SchoolIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{school.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{school.code}</p>
                  {school.provinceName && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                        {school.provinceName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500 group-hover:text-blue-600 transition-colors">Xem chi tiết</span>
                <ArrowRightIcon size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
