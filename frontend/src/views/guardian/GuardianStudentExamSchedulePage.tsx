import { Calendar, Filter, FileText, Trophy, Clock, CheckCircle } from "lucide-react";

import { useOutletContext } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";
import { useEffect, useState, useCallback } from "react";
import { type ExamScheduleDto } from "../../services/studentService.ts";
import { guardianService } from "../../services/guardianService.ts";
import { useSemester } from "../../context/SemesterContext";
import SemesterSelector from "../../components/common/SemesterSelector";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

const examTypeLabels: Record<string, string> = {
  REGULAR: "Thường xuyên",
  MIDTERM: "Giữa kỳ",
  FINAL: "Cuối kỳ",
}

export default function GuardianStudentExamSchedulePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [exams, setExams] = useState<ExamScheduleDto[]>([]);

  const { student, timetable } = useOutletContext<StudentDataProp>();

  // Global context
  const { activeSemester, allSemesters, loading: isContextLoading } = useSemester();
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

  // Initial load priority: System Active Semester
  useEffect(() => {
    if (!selectedSemesterId && activeSemester) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  const selectedSemester = allSemesters.find(s => s.id === selectedSemesterId);

  // Filters
  const [selectedType, setSelectedType] = useState<string | "all">("all");

  const fetchData = useCallback(async (silent = false) => {
    if (!student || !selectedSemesterId) return;
    if (!silent) setLoading(true);
    try {
      const data = await guardianService.getExamSchedule(
        student.id,
        selectedSemesterId
      );
      setExams(data);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [student, selectedSemesterId]);

  useEffect(() => {
    if (!timetable || isContextLoading || !selectedSemesterId) return;
    fetchData();
  }, [fetchData, timetable, isContextLoading, selectedSemesterId]);

  // Auto-refresh seamlessly
  useAutoRefresh(() => {
    if (selectedSemesterId) fetchData(true);
  }, { interval: 60000, revalidateOnFocus: true });


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${weekday}, ${day}/${month}`;
  }

  const formatTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${startTime.substring(0, 5)} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  // Get the date difference between exam date and today
  const getDaysUntil = (dateString: string) => {
    const examDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Check if exam is completed based on end time (date + startTime + duration)
  const isExamCompleted = (exam: ExamScheduleDto) => {
    if (exam.status === "COMPLETED") return true;

    const now = new Date();
    const examDate = new Date(exam.examDate);

    // Parse start time (HH:mm:ss or HH:mm)
    const [hours, minutes] = exam.startTime.split(':').map(Number);

    // Calculate end time
    const endMinutes = hours * 60 + minutes + exam.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    // Set exam and datetime
    examDate.setHours(endHours, endMins, 0, 0);

    // If current time is past exam end time, it's completed
    return now > examDate;
  }

  // Filter exams by type (client-side)
  const filteredExams = exams.filter(exam => {
    if (selectedType !== "all" && exam.examType !== selectedType) {
      return false;
    }
    return true;
  })

  // Sort exams by date
  const sortedExams = [...filteredExams].sort((a, b) =>
    new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  // Group by exam type for summary
  const examSummary = {
    midterm: sortedExams.filter(e => e.examType === "MIDTERM").length,
    final: sortedExams.filter(e => e.examType === "FINAL").length,
    upcoming: sortedExams.filter(e => !isExamCompleted(e)).length,
    completed: sortedExams.filter(e => isExamCompleted(e)).length,
  }

  if (loading || isContextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch kiểm tra</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi lịch thi và kiểm tra sắp tới</p>
        </div>
      </div>

      {/* Filters - Inline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Bộ lọc</span>
          </div>
          <div className="h-5 w-px bg-gray-200"></div>

          {/* Filters in one row */}
          <div className="flex flex-wrap items-center gap-2">
            <SemesterSelector
              value={selectedSemesterId}
              onChange={setSelectedSemesterId}
              label=""
              className="h-[42px]"
            />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-600 outline-none h-[42px]"
            >
              <option value="all">Tất cả bài thi</option>
              <option value="REGULAR">Thường xuyên</option>
              <option value="MIDTERM">Giữa kỳ</option>
              <option value="FINAL">Cuối kỳ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards - Premium Style with Icons and Animations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Giữa kỳ"
          value={examSummary.midterm}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Cuối kỳ"
          value={examSummary.final}
          icon={<Trophy className="w-5 h-5" />}
          color="indigo"
          delay={100}
        />
        <StatCard
          title="Sắp diễn ra"
          value={examSummary.upcoming}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          delay={200}
        />
        <StatCard
          title="Hoàn thành"
          value={examSummary.completed}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
          delay={300}
        />
      </div>

      {/* Exam List - Dashboard Style List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        {sortedExams.length > 0 ? (
          <div className="space-y-3">
            {sortedExams.map((exam) => {
              const daysUntil = getDaysUntil(exam.examDate);
              const isCompleted = isExamCompleted(exam);
              const isUrgent = !isCompleted && daysUntil <= 2 && daysUntil >= 0;

              return (
                <div key={exam.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${isCompleted ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'}`}>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{exam.subjectName}</h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{examTypeLabels[exam.examType] || exam.examType}</span>
                      <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                      <span>{formatTime(exam.startTime, exam.duration)}</span>
                      <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                      <span>P. {exam.room || "Tại lớp"}</span>
                    </div>
                    {exam.note && (
                      <div className="text-xs text-orange-500 mt-1">Lưu ý: {exam.note}</div>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-0 sm:text-right flex items-center justify-between sm:block">
                    {!isCompleted ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        Còn {daysUntil} ngày
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                        Hoàn thành
                      </span>
                    )}
                    <p className="text-xs text-gray-500 sm:mt-1.5 font-medium">{formatDate(exam.examDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Chưa có lịch kiểm tra</p>
            <p className="text-sm text-gray-400 mt-1">
              Năm học {selectedSemester?.academicYearName || "hiện tại"}
              {selectedSemester?.semesterNumber ? ` - Học kỳ ${selectedSemester.semesterNumber}` : ""}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Lịch kiểm tra chưa được nhà trường tạo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== HELPER COMPONENTS ====================

const AnimatedCounter = ({ value, duration = 1000 }: { value: number | string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const isNumeric = typeof value === "number" || (!isNaN(Number(value)) && String(value).trim() !== "");
  const numericValue = isNumeric ? Number(value) : 0;

  useEffect(() => {
    if (!isNumeric) return;
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentValue = Math.floor(numericValue * easeOutQuad);
      setDisplayValue(currentValue);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numericValue, duration, isNumeric]);

  if (!isNumeric) return <span>{value}</span>;
  return <span>{displayValue.toLocaleString()}</span>;
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "indigo" | "amber" | "emerald";
  delay?: number;
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  };

  const classes = colorClasses[color];

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 ${classes.bg} ${classes.text} rounded-xl flex items-center justify-center shadow-sm border ${classes.border}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-gray-900 mt-1 leading-none">
          <AnimatedCounter value={value} />
        </p>
        {subtitle && <p className="text-[10px] text-gray-400 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
