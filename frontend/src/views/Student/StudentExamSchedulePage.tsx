import { useState, useEffect, useCallback } from "react";
import { studentService, type ExamScheduleDto } from "../../services/studentService";
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Filter, RefreshCw, BookOpen } from "lucide-react";

const examTypeLabels: Record<string, string> = {
    MIDTERM: "Giữa kỳ",
    FINAL: "Cuối kỳ",
    REGULAR: "1 tiết",
    QUIZ: "15 phút",
};

const examTypeBadgeColors: Record<string, string> = {
    MIDTERM: "bg-red-500 text-white",
    FINAL: "bg-purple-500 text-white",
    REGULAR: "bg-orange-500 text-white",
    QUIZ: "bg-blue-500 text-white",
};

// Get current academic year
const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 9) {
        return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
};

// Get current semester
const getCurrentSemester = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 9 || month <= 1) return 1;
    return 2;
};

export default function StudentExamSchedulePage() {
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<ExamScheduleDto[]>([]);

    // Filters
    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number | undefined>(getCurrentSemester());
    const [selectedType, setSelectedType] = useState<string | "all">("all");

    // Generate academic year options
    const currentYear = new Date().getFullYear();
    const academicYears = [
        `${currentYear - 1}-${currentYear}`,
        `${currentYear}-${currentYear + 1}`,
        `${currentYear + 1}-${currentYear + 2}`,
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await studentService.getExamSchedule(selectedYear, selectedSemester);
            setExams(data);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedSemester]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${weekday}, ${day}/${month}`;
    };

    const formatTime = (startTime: string, duration: number) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${startTime.substring(0, 5)} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    const getDaysUntil = (dateString: string) => {
        const examDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        examDate.setHours(0, 0, 0, 0);
        const diffTime = examDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Filter exams by type (client-side)
    const filteredExams = exams.filter(exam => {
        if (selectedType !== "all" && exam.examType !== selectedType) {
            return false;
        }
        return true;
    });

    // Sort exams by date
    const sortedExams = [...filteredExams].sort((a, b) =>
        new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    );

    // Group by exam type for summary
    const examSummary = {
        midterm: sortedExams.filter(e => e.examType === "MIDTERM").length,
        final: sortedExams.filter(e => e.examType === "FINAL").length,
        upcoming: sortedExams.filter(e => getDaysUntil(e.examDate) >= 0 && e.status !== "COMPLETED").length,
        completed: sortedExams.filter(e => e.status === "COMPLETED" || getDaysUntil(e.examDate) < 0).length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lịch kiểm tra</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Theo dõi lịch thi và kiểm tra sắp tới</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                </button>
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
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {academicYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <select
                            value={selectedSemester ?? "all"}
                            onChange={(e) => setSelectedSemester(e.target.value === "all" ? undefined : Number(e.target.value))}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="all">Cả năm</option>
                            <option value={1}>HK1</option>
                            <option value={2}>HK2</option>
                        </select>

                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="all">Tất cả</option>
                            <option value="MIDTERM">Giữa kỳ</option>
                            <option value="FINAL">Cuối kỳ</option>
                            <option value="REGULAR">1 tiết</option>
                            <option value="QUIZ">15 phút</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards - Compact */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 border border-red-100">
                    <div className="text-xl font-bold text-red-600">{examSummary.midterm}</div>
                    <div className="text-xs text-red-500">Giữa kỳ</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-100">
                    <div className="text-xl font-bold text-purple-600">{examSummary.final}</div>
                    <div className="text-xs text-purple-500">Cuối kỳ</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-100">
                    <div className="text-xl font-bold text-blue-600">{examSummary.upcoming}</div>
                    <div className="text-xs text-blue-500">Sắp diễn ra</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-100">
                    <div className="text-xl font-bold text-green-600">{examSummary.completed}</div>
                    <div className="text-xs text-green-500">Hoàn thành</div>
                </div>
            </div>

            {/* Exam List - Compact Table-like */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {sortedExams.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {sortedExams.map((exam) => {
                            const daysUntil = getDaysUntil(exam.examDate);
                            const isCompleted = exam.status === "COMPLETED" || daysUntil < 0;
                            const isUrgent = !isCompleted && daysUntil <= 3 && daysUntil >= 0;

                            return (
                                <div
                                    key={exam.id}
                                    className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${isCompleted ? 'opacity-60' : ''}`}
                                >
                                    {/* Subject & Type */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-semibold text-gray-900 truncate">{exam.subjectName}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${examTypeBadgeColors[exam.examType]}`}>
                                                {examTypeLabels[exam.examType]}
                                            </span>
                                        </div>
                                        {exam.note && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                                                <AlertCircle className="w-3 h-3" />
                                                <span className="truncate">{exam.note}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-[100px]">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{formatDate(exam.examDate)}</span>
                                    </div>

                                    {/* Time */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-[120px]">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{formatTime(exam.startTime, exam.duration)}</span>
                                    </div>

                                    {/* Room */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-[70px]">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium">{exam.room || "Tại lớp"}</span>
                                    </div>

                                    {/* Status */}
                                    <div className="w-20 text-right flex-shrink-0">
                                        {isCompleted ? (
                                            <div className="flex items-center justify-end gap-1 text-green-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-xs font-medium">Xong</span>
                                            </div>
                                        ) : (
                                            <div className={`text-right ${isUrgent ? 'text-orange-500' : 'text-blue-600'}`}>
                                                <div className="text-lg font-bold leading-none">{daysUntil}</div>
                                                <div className="text-[10px] text-gray-400">ngày nữa</div>
                                            </div>
                                        )}
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
                            Năm học {selectedYear}
                            {selectedSemester && ` - Học kỳ ${selectedSemester}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Lịch kiểm tra chưa được nhà trường tạo
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
