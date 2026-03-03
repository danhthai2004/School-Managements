import { useState, useEffect, useCallback } from "react";
import { studentService, type ExamScheduleDto } from "../../services/studentService";
import { Calendar, Filter, RefreshCw } from "lucide-react";

const examTypeLabels: Record<string, string> = {
    MIDTERM: "Giữa kỳ",
    FINAL: "Cuối kỳ",
    REGULAR: "1 tiết",
    QUIZ: "15 phút",
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

        // Set exam end datetime
        examDate.setHours(endHours, endMins, 0, 0);

        // If current time is past exam end time, it's completed
        return now > examDate;
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
        upcoming: sortedExams.filter(e => !isExamCompleted(e)).length,
        completed: sortedExams.filter(e => isExamCompleted(e)).length,
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

            {/* Summary Cards - Styled with visible background colors and drop shadow */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between h-24">
                    <div className="text-2xl font-bold text-blue-800">{examSummary.midterm}</div>
                    <div className="text-sm text-blue-600 font-medium">Giữa kỳ</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between h-24">
                    <div className="text-2xl font-bold text-indigo-800">{examSummary.final}</div>
                    <div className="text-sm text-indigo-600 font-medium">Cuối kỳ</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between h-24">
                    <div className="text-2xl font-bold text-amber-800">{examSummary.upcoming}</div>
                    <div className="text-sm text-amber-600 font-medium">Sắp diễn ra</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between h-24">
                    <div className="text-2xl font-bold text-emerald-800">{examSummary.completed}</div>
                    <div className="text-sm text-emerald-600 font-medium">Hoàn thành</div>
                </div>
            </div>

            {/* Exam List - Dashboard Style List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                {sortedExams.length > 0 ? (
                    <div className="space-y-3">
                        {sortedExams.map((exam) => {
                            const daysUntil = getDaysUntil(exam.examDate);
                            const isCompleted = isExamCompleted(exam);
                            const isUrgent = !isCompleted && daysUntil <= 3 && daysUntil >= 0;

                            return (
                                <div key={exam.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-colors ${isCompleted ? 'bg-gray-50 opacity-70' : 'bg-gray-50 hover:bg-blue-50/50'}`}>
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
