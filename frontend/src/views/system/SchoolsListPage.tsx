import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  systemService,
  type SchoolDto,
  type ProvinceDto,
  type WardDto,
  type SchoolRegistryDto,
  type SchoolLevel,
} from "../../services/systemService";
import { extractErrorMessage } from "../../utils/errorUtils";

const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  PRIMARY: "Tiểu học (Cấp 1)",
  SECONDARY: "THCS (Cấp 2)",
  HIGH_SCHOOL: "THPT (Cấp 3)",
};

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
  const [registry, setRegistry] = useState<SchoolRegistryDto[]>([]);

  // Form values
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | null>(null);
  const [registryCode, setRegistryCode] = useState<string>("");
  const [wardCode, setWardCode] = useState<number | null>(null);
  const [address, setAddress] = useState("");

  // Selected school info (for auto-fill display)
  const selectedSchool = registry.find((r) => r.code === registryCode);

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
      systemService
        .getWardsByProvince(provinceCode)
        .then(setWards)
        .catch(console.error);
    } else {
      setWards([]);
    }
    setWardCode(null);
  }, [provinceCode]);

  // Load school registry when province or level changes
  useEffect(() => {
    if (provinceCode) {
      systemService
        .getSchoolRegistry(provinceCode, schoolLevel ?? undefined)
        .then(setRegistry)
        .catch(console.error);
    } else {
      setRegistry([]);
    }
    setRegistryCode("");
  }, [provinceCode, schoolLevel]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registryCode || !provinceCode) {
      setError("Vui lòng chọn tỉnh/thành và trường học");
      return;
    }
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      await systemService.createSchool({
        registryCode,
        provinceCode,
        wardCode: wardCode ?? undefined,
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
    setSchoolLevel(null);
    setRegistryCode("");
    setWardCode(null);
    setAddress("");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách trường học</h1>
          <p className="text-slate-500 mt-1">Quản lý tất cả trường trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          + Tạo trường mới
        </button>
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
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Tạo trường mới</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Row 1: Province & School Level */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tỉnh/Thành phố <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Cấp học</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={schoolLevel ?? ""}
                  onChange={(e) => setSchoolLevel((e.target.value || null) as SchoolLevel | null)}
                >
                  <option value="">-- Tất cả cấp --</option>
                  <option value="PRIMARY">Tiểu học (Cấp 1)</option>
                  <option value="SECONDARY">THCS (Cấp 2)</option>
                  <option value="HIGH_SCHOOL">THPT (Cấp 3)</option>
                </select>
              </div>
            </div>

            {/* Row 2: School Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chọn trường <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={registryCode}
                onChange={(e) => setRegistryCode(e.target.value)}
                required
                disabled={!provinceCode}
              >
                <option value="">
                  {provinceCode ? "-- Chọn trường --" : "-- Vui lòng chọn tỉnh/thành trước --"}
                </option>
                {registry.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled info */}
            {selectedSchool && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900">Thông tin trường (tự động điền)</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Mã trường:</span>{" "}
                    <span className="font-medium">{selectedSchool.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cấp học:</span>{" "}
                    <span className="font-medium">
                      {SCHOOL_LEVEL_LABELS[selectedSchool.schoolLevel]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Khu vực tuyển sinh:</span>{" "}
                    <span className="font-medium">{selectedSchool.enrollmentArea || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Ward & Address */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phường/Xã</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={wardCode ?? ""}
                  onChange={(e) => setWardCode(e.target.value ? Number(e.target.value) : null)}
                  disabled={!provinceCode}
                >
                  <option value="">-- Chọn phường/xã (tuỳ chọn) --</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ chi tiết</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: Số 123, đường ABC"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Tạo trường"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools Grid */}
      {loading ? (
        <div className="text-center text-slate-500 py-8">Đang tải...</div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          Chưa có trường nào. Bấm "Tạo trường mới" để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Link
              key={school.id}
              to={`/system/schools/${school.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 grid place-items-center">
                  <SchoolIcon />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{school.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{school.code}</p>
                  {school.provinceName && (
                    <p className="text-xs text-slate-400 mt-1">{school.provinceName}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">Nhấn để xem chi tiết</span>
                <span className="text-blue-600">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolIcon() {
  return (
    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M10 10h4" />
    </svg>
  );
}
