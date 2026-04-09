import {useEffect, useState} from "react";
import type {ScoreDto} from "../../services/studentService.ts";
import {guardianService} from "../../services/guardianService.ts";
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
          />
        </div>
      </div>

      {/* Score Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Môn học</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600" colSpan={3}>Kiểm tra TX</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600">Giữa kỳ</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600">Cuối kỳ</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-600">Trung bình</th>
            </tr>
            </thead>
            <tbody>
            {scores.map((score, index) => (
              <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{score.subjectName}</span>
                </td>
                <td className={`px-3 py-4 text-center font-medium ${getScoreColor(score.oralScore)}`}>
                  {score.oralScore ?? "-"}
                </td>
                <td className={`px-3 py-4 text-center font-medium ${getScoreColor(score.test15Score)}`}>
                  {score.test15Score ?? "-"}
                </td>
                <td className={`px-3 py-4 text-center font-medium ${getScoreColor(score.test45Score)}`}>
                  {score.test45Score ?? "-"}
                </td>
                <td className={`px-4 py-4 text-center font-medium ${getScoreColor(score.midtermScore)}`}>
                  {score.midtermScore ?? "-"}
                </td>
                <td className={`px-4 py-4 text-center font-medium ${getScoreColor(score.finalScore)}`}>
                  {score.finalScore ?? "-"}
                </td>
                <td className="px-4 py-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${score.averageScore && score.averageScore >= 8
                                          ? 'bg-green-50 text-green-600'
                                          : score.averageScore && score.averageScore >= 6.5
                                            ? 'bg-blue-50 text-blue-600'
                                            : score.averageScore && score.averageScore >= 5
                                              ? 'bg-orange-50 text-orange-600'
                                              : score.averageScore
                                                ? 'bg-red-50 text-red-600'
                                                : 'text-gray-400'
                                        }`}>
                                            {score.averageScore?.toFixed(1) ?? "-"}
                                        </span>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-6 py-4 text-gray-900">Tổng kết</td>
              <td className="px-3 py-4" colSpan={5}></td>
              <td className="px-4 py-4 text-center">
                                    <span className={`inline-block px-4 py-1.5 rounded-lg font-bold ${overallAverage && overallAverage >= 8
                                      ? 'bg-green-100 text-green-600'
                                      : overallAverage && overallAverage >= 6.5
                                        ? 'bg-blue-100 text-blue-600'
                                        : overallAverage && overallAverage >= 5
                                          ? 'bg-orange-100 text-orange-600'
                                          : overallAverage
                                            ? 'bg-red-100 text-red-600'
                                            : 'text-gray-400'
                                    }`}>
                                        {overallAverage?.toFixed(1) ?? "-"}
                                    </span>
                {overallAverage && (
                  <div className="text-xs text-gray-500 mt-1">
                    {overallAverage >= 8 ? 'Giỏi' : overallAverage >= 6.5 ? 'Khá' : overallAverage >= 5 ? 'Trung bình' : 'Yếu'}
                  </div>
                )}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}