import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemService, type SchoolDto } from "../../services/systemService";
import { useCountdown } from "../../utils/countdownUtils";
import { extractErrorMessage } from "../../utils/errorUtils";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../../components/common/Pagination";

export default function PendingDeleteSchoolsPage() {
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData: paginatedSchools,
    goToPage,
    setPageSize,
    totalItems
  } = usePagination(schools, 50);

  const loadData = async () => {
    try {
      const data = await systemService.listPendingDeleteSchools();
      setSchools(data);
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
      await systemService.restoreSchool(id);
      setSuccess("Đã khôi phục trường");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi khôi phục"));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Xác nhận XÓA VĨNH VIỄN trường này và TẤT CẢ dữ liệu liên quan? Hành động này không thể hoàn tác!")) return;
    setError(null);
    setSuccess(null);
    try {
      await systemService.permanentDeleteSchool(id);
      setSuccess("Đã xóa vĩnh viễn trường");
      loadData();
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Lỗi khi xóa"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trường chờ xóa</h1>
          <p className="text-slate-500 mt-1">
            Các trường sẽ tự động xóa sau 14 ngày kể từ khi đánh dấu
          </p>
        </div>
        <Link
          to="/system/schools"
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
        ) : schools.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không có trường nào đang chờ xóa</div>
        ) : (
          <>
          <table className="w-full">
            <thead className="bg-rose-50 border-b border-rose-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Tên trường</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Mã trường</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Tỉnh/Thành phố</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-rose-700">Thời gian còn lại</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-rose-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchools.map((school) => (
                <PendingSchoolRow
                  key={school.id}
                  school={school}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              ))}
            </tbody>
          </table>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </div>
    </div>
  );
}

function PendingSchoolRow({
  school,
  onRestore,
  onPermanentDelete,
}: {
  school: SchoolDto;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}) {
  const countdown = useCountdown(school.pendingDeleteAt);

  return (
    <tr className="hover:bg-rose-50/50">
      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{school.name}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{school.code}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{school.provinceName || "-"}</td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-rose-600">{countdown}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onRestore(school.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium"
          >
            ✅ Khôi phục
          </button>
          <button
            onClick={() => onPermanentDelete(school.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 font-medium"
          >
            🗑️ Xóa ngay
          </button>
        </div>
      </td>
    </tr>
  );
}
