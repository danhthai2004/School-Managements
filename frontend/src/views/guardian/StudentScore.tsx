import { useEffect, useState, useMemo } from "react";
import type { ScoreDto } from "../../services/studentService.ts";
import { guardianService } from "../../services/guardianService.ts";
import { Download, BookOpen } from "lucide-react";
import { useSemester } from "../../context/SemesterContext";
import SemesterSelector from "../../components/common/SemesterSelector";
import { useOutletContext } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";

const getScoreColor = (score: number | null) => {
  if (!score && score !== 0) return "text-gray-400";
  if (score >= 8) return "text-green-600";
  if (score >= 6.5) return "text-blue-600";
  if (score >= 5) return "text-orange-600";
  return "text-red-600";
};

export default function StudentScore() {
  const { student } = useOutletContext<StudentDataProp>();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreDto[]>([]);
  const { activeSemester, allSemesters, loading: isContextLoading } = useSemester();
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

  // Calculate max regular score columns
  const maxRegularScores = useMemo(() => {
    if (!scores || scores.length === 0) return 1;
    const maxFound = Math.max(...scores.map(s => s.regularScores?.length || 0));
    return Math.max(1, maxFound);
  }, [scores]);


  // Initial load priority: System Active Semester
  useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  const selectedSemester = allSemesters.find(s => s.id === selectedSemesterId);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSemesterId || !student) return;
      setLoading(true);
      try {
        const data = await guardianService.getScores(student.id, selectedSemesterId);
        setScores(data);
      } catch (error) {
        console.error("Error fetching scores:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!isContextLoading) {
      fetchData();
    }
  }, [selectedSemesterId, isContextLoading, student]);

  const validScores = scores.filter(s => s.averageScore !== null && s.averageScore !== undefined);
  const overallAverage = validScores.length > 0
    ? validScores.reduce((sum, s) => sum + (s.averageScore || 0), 0) / validScores.length
    : null;

  if (loading || isContextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điểm</h1>
          <p className="text-sm text-gray-500 mt-1">
            Học kỳ {selectedSemester?.semesterNumber || "-"} - Năm học {selectedSemester?.academicYearName || "hiện tại"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SemesterSelector
            value={selectedSemesterId}
            onChange={setSelectedSemesterId}
            label=""
            className="h-[42px]"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Download className="w-4 h-4" />
            Xuất bảng điểm
          </button>
        </div>
      </div>

      {/* Score Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th rowSpan={2} className="px-6 py-4 text-left text-sm font-semibold text-gray-600 border-r border-gray-100">Môn học</th>
                <th colSpan={maxRegularScores} className="px-4 py-2 text-center text-sm font-semibold text-gray-600 border-b border-gray-100">Kiểm tra TX</th>
                <th rowSpan={2} className="px-4 py-4 text-center text-sm font-semibold text-gray-600 border-l border-gray-100">Giữa kỳ</th>
                <th rowSpan={2} className="px-4 py-4 text-center text-sm font-semibold text-gray-600 border-l border-gray-100">Cuối kỳ</th>
                <th rowSpan={2} className="px-4 py-4 text-center text-sm font-semibold text-gray-600 border-l border-gray-100">Trung bình</th>
              </tr>
              <tr className="bg-gray-50/50 border-b border-gray-100 italic">
                {Array.from({ length: maxRegularScores }).map((_, i) => (
                  <th key={i} className="px-2 py-1 text-center text-[10px] font-bold text-gray-400 uppercase border-r last:border-r-0 border-gray-100">TX{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-800">{score.subjectName}</span>
                  </td>
                  {Array.from({ length: maxRegularScores }).map((_, i) => (
                    <td key={i} className={`px-2 py-4 text-center text-sm font-bold ${getScoreColor(score.regularScores[i])}`}>
                      {score.regularScores[i] ?? "-"}
                    </td>
                  ))}
                  <td className={`px-4 py-4 text-center text-sm font-bold ${getScoreColor(score.midtermScore)}`}>
                    {score.midtermScore ?? "-"}
                  </td>
                  <td className={`px-4 py-4 text-center text-sm font-bold ${getScoreColor(score.finalScore)}`}>
                    {score.finalScore ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {score.averageScore ? (
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${score.averageScore >= 8
                        ? 'bg-green-100 text-green-600'
                        : score.averageScore >= 6.5
                          ? 'bg-blue-100 text-blue-600'
                          : score.averageScore >= 5
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                        {score.averageScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={maxRegularScores + 4} className="px-6 py-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Chưa có điểm cho học kỳ này</p>
                    <p className="text-sm text-gray-400 mt-1">Điểm sẽ hiển thị khi giáo viên nhập vào hệ thống</p>
                  </td>
                </tr>
              )}
              {/* Total row */}
              {scores.length > 0 && (
                <tr className="font-semibold border-t border-gray-100">
                  <td className="px-6 py-4 text-gray-900">Tổng kết</td>
                  <td className="px-3 py-4" colSpan={maxRegularScores + 2}></td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {overallAverage?.toFixed(1) ?? "-"}
                    </div>
                    {overallAverage && (
                      <div className="text-xs text-gray-500 mt-0.5 font-normal">
                        {overallAverage >= 8 ? 'Giỏi' : overallAverage >= 6.5 ? 'Khá' : overallAverage >= 5 ? 'Trung bình' : 'Yếu'}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}