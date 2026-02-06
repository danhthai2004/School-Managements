import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, BookOpen, Clock, Users, RefreshCw, CheckCircle, Sun, Moon, X, ChevronRight, MapPin } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface Subject {
    id: string;
    name: string;
    code: string;
    isElective?: boolean;
}

interface ExamSchedule {
    id: string;
    classRoomId: string;
    classRoomName: string;
    subjectId: string;
    subjectName: string;
    examType: string;
    examDate: string;
    startTime: string;
    duration: number;
    roomNumber: string | null;
    status: string;
    note: string | null;
    academicYear: string;
    semester: number;
}

interface ExamDetailModal {
    isOpen: boolean;
    subject: string;
    date: string;
    startTime: string;
    duration: number;
    schedules: ExamSchedule[];
}

const EXAM_TYPES = [
    { value: "MIDTERM", label: "Giữa kỳ" },
    { value: "FINAL", label: "Cuối kỳ" },
];

const GRADES = [10, 11, 12];

export default function ExamScheduleManagement() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [examType, setExamType] = useState("MIDTERM");
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [selectedGrades, setSelectedGrades] = useState<number[]>([10, 11, 12]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [academicYear, setAcademicYear] = useState("2025-2026");
    const [semester, setSemester] = useState(2);

    // View state
    const [viewExamType, setViewExamType] = useState("MIDTERM");
    const [selectedViewGrade, setSelectedViewGrade] = useState<number | "all">("all");

    // Modal state for exam details
    const [detailModal, setDetailModal] = useState<ExamDetailModal>({
        isOpen: false,
        subject: "",
        date: "",
        startTime: "",
        duration: 0,
        schedules: []
    });

    useEffect(() => {
        fetchSubjects();
        fetchExamSchedules();
    }, [academicYear, semester, viewExamType]);

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE}/school/subjects`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
                setSelectedSubjects(data.map((s: Subject) => s.id));
            }
        } catch (err) {
            console.error("Error fetching subjects:", err);
        }
    };

    const fetchExamSchedules = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(
                `${API_BASE}/school/exam-schedules?academicYear=${academicYear}&semester=${semester}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setExamSchedules(data.filter((e: ExamSchedule) => e.examType === viewExamType));
            }
        } catch (err) {
            console.error("Error fetching exam schedules:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSchedule = async () => {
        if (selectedSubjects.length === 0) {
            setError("Vui lòng chọn ít nhất một môn học");
            return;
        }
        if (selectedGrades.length === 0) {
            setError("Vui lòng chọn ít nhất một khối");
            return;
        }
        if (!startDate || !endDate) {
            setError("Vui lòng chọn ngày bắt đầu và kết thúc");
            return;
        }

        setGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE}/school/exam-schedules/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    examType,
                    subjectIds: selectedSubjects,
                    grades: selectedGrades,
                    startDate,
                    endDate,
                    academicYear,
                    semester,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setSuccess(`Đã tạo thành công ${data.length} lịch thi!`);
                setViewExamType(examType);
                fetchExamSchedules();
            } else {
                const errorData = await res.json();
                setError(errorData.message || "Có lỗi xảy ra khi tạo lịch thi");
            }
        } catch (err) {
            setError("Không thể kết nối đến server");
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteSchedule = async () => {
        if (!confirm(`Bạn có chắc muốn xóa tất cả lịch thi ${viewExamType === "MIDTERM" ? "giữa kỳ" : "cuối kỳ"}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            await fetch(
                `${API_BASE}/school/exam-schedules?examType=${viewExamType}&academicYear=${academicYear}&semester=${semester}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setSuccess("Đã xóa lịch thi thành công");
            fetchExamSchedules();
        } catch (err) {
            setError("Có lỗi xảy ra khi xóa lịch thi");
        }
    };

    const toggleSubject = (subjectId: string) => {
        setSelectedSubjects((prev) =>
            prev.includes(subjectId)
                ? prev.filter((id) => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const toggleGrade = (grade: number) => {
        setSelectedGrades((prev) =>
            prev.includes(grade)
                ? prev.filter((g) => g !== grade)
                : [...prev, grade]
        );
    };

    const selectAllSubjects = () => {
        setSelectedSubjects(subjects.map((s) => s.id));
    };

    const deselectAllSubjects = () => {
        setSelectedSubjects([]);
    };

    // Open detail modal for a specific exam
    const openExamDetail = (subject: string, date: string, startTime: string, duration: number, allSchedules: ExamSchedule[]) => {
        // Filter schedules that match the subject, date, and time
        const matchingSchedules = allSchedules.filter(
            s => s.subjectName === subject && s.examDate === date && s.startTime === startTime
        );

        setDetailModal({
            isOpen: true,
            subject,
            date,
            startTime,
            duration,
            schedules: matchingSchedules.sort((a, b) => a.classRoomName.localeCompare(b.classRoomName))
        });
    };

    // Filter schedules by grade
    const filteredSchedules = selectedViewGrade === "all"
        ? examSchedules
        : examSchedules.filter(s => s.classRoomName.includes(`${selectedViewGrade}`));

    // Group schedules by date
    const groupedByDate = filteredSchedules.reduce((acc, schedule) => {
        const date = schedule.examDate;
        if (!acc[date]) acc[date] = [];
        acc[date].push(schedule);
        return acc;
    }, {} as Record<string, ExamSchedule[]>);

    // Helper to check if time is morning (before 12:00)
    const isMorning = (time: string) => {
        const hour = parseInt(time.split(':')[0]);
        return hour < 12;
    };

    // Group by morning/afternoon within each date
    const getSessionSchedules = (schedules: ExamSchedule[], morning: boolean) => {
        return schedules
            .filter(s => isMorning(s.startTime) === morning)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    // Get unique subjects for a session (for display) - group by subject+time
    const getUniqueSubjectsForSession = (schedules: ExamSchedule[]) => {
        const seen = new Map<string, ExamSchedule>();
        schedules.forEach(s => {
            const key = `${s.subjectName}-${s.startTime}`;
            if (!seen.has(key)) {
                seen.set(key, s);
            }
        });
        return Array.from(seen.values());
    };

    // Count classes for a specific subject+time slot
    const countClassesForSlot = (allSchedules: ExamSchedule[], subject: string, startTime: string) => {
        return allSchedules.filter(s => s.subjectName === subject && s.startTime === startTime).length;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
        });
    };

    const formatFullDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatTime = (timeStr: string) => {
        return timeStr.substring(0, 5);
    };

    const formatEndTime = (timeStr: string, duration: number) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    // Group classes by grade for display in modal
    const groupClassesByGrade = (schedules: ExamSchedule[]) => {
        const groups: Record<string, ExamSchedule[]> = {};
        schedules.forEach(s => {
            const grade = s.classRoomName.match(/\d+/)?.[0] || "Khác";
            const gradeKey = `Khối ${grade}`;
            if (!groups[gradeKey]) groups[gradeKey] = [];
            groups[gradeKey].push(s);
        });
        return groups;
    };

    return (
        <div className="space-y-6">
            {/* Detail Modal */}
            {detailModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in-up">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">{detailModal.subject}</h3>
                                    <p className="text-blue-100 text-sm mt-1">
                                        {formatFullDate(detailModal.date)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatTime(detailModal.startTime)} - {formatEndTime(detailModal.startTime, detailModal.duration)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    <span>{detailModal.schedules.length} lớp thi</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body - Class List */}
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                            {Object.entries(groupClassesByGrade(detailModal.schedules)).map(([grade, classes]) => (
                                <div key={grade} className="mb-4 last:mb-0">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        {grade}
                                        <span className="text-gray-400 font-normal">({classes.length} lớp)</span>
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {classes.map((c) => (
                                            <div
                                                key={c.id}
                                                className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg px-3 py-2 transition-colors"
                                            >
                                                <div className="font-medium text-gray-900 text-sm">{c.classRoomName}</div>
                                                {c.roomNumber && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {c.roomNumber}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lịch kiểm tra</h1>
                    <p className="text-gray-500 mt-1">Tạo và quản lý lịch thi giữa kỳ, cuối kỳ</p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠️</span> {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> {success}
                    <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Tạo lịch kiểm tra
                        </h2>

                        <div className="space-y-4">
                            {/* Exam Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Loại kỳ thi</label>
                                <div className="flex gap-2">
                                    {EXAM_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => setExamType(type.value)}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${examType === type.value
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Academic Year & Semester */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
                                    <input
                                        type="text"
                                        value={academicYear}
                                        onChange={(e) => setAcademicYear(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="2025-2026"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
                                    <select
                                        value={semester}
                                        onChange={(e) => setSemester(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={1}>Học kỳ 1</option>
                                        <option value={2}>Học kỳ 2</option>
                                    </select>
                                </div>
                            </div>

                            {/* Grades */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Chọn khối
                                </label>
                                <div className="flex gap-2">
                                    {GRADES.map((grade) => (
                                        <button
                                            key={grade}
                                            onClick={() => toggleGrade(grade)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedGrades.includes(grade)
                                                ? "bg-green-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            Khối {grade}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Subjects */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        <BookOpen className="w-4 h-4 inline mr-1" />
                                        Môn học ({selectedSubjects.length}/{subjects.length})
                                    </label>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={selectAllSubjects} className="text-blue-600 hover:underline">
                                            Chọn tất cả
                                        </button>
                                        <span className="text-gray-400">|</span>
                                        <button onClick={deselectAllSubjects} className="text-gray-500 hover:underline">
                                            Bỏ chọn
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                    {subjects.map((subject) => (
                                        <label
                                            key={subject.id}
                                            className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSubjects.includes(subject.id)}
                                                onChange={() => toggleSubject(subject.id)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{subject.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerateSchedule}
                                disabled={generating}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Đang tạo lịch...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-5 h-5" />
                                        Tạo lịch kiểm tra
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Schedule View - Calendar Style */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold text-gray-900">Lịch thi</h2>
                                    <div className="flex gap-1">
                                        {EXAM_TYPES.map((type) => (
                                            <button
                                                key={type.value}
                                                onClick={() => setViewExamType(type.value)}
                                                className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${viewExamType === type.value
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedViewGrade}
                                        onChange={(e) => setSelectedViewGrade(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    >
                                        <option value="all">Tất cả khối</option>
                                        {GRADES.map(g => (
                                            <option key={g} value={g}>Khối {g}</option>
                                        ))}
                                    </select>
                                    {examSchedules.length > 0 && (
                                        <button
                                            onClick={handleDeleteSchedule}
                                            className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Xóa
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : Object.keys(groupedByDate).length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Chưa có lịch thi nào</p>
                                    <p className="text-sm mt-1">Tạo lịch thi mới ở bên trái</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(groupedByDate)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([date, schedules]) => {
                                            const morningSchedules = getSessionSchedules(schedules, true);
                                            const afternoonSchedules = getSessionSchedules(schedules, false);
                                            const morningSubjects = getUniqueSubjectsForSession(morningSchedules);
                                            const afternoonSubjects = getUniqueSubjectsForSession(afternoonSchedules);

                                            return (
                                                <div key={date} className="bg-gray-50 rounded-xl overflow-hidden">
                                                    {/* Date Header */}
                                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span className="font-medium">{formatDate(date)}</span>
                                                        </div>
                                                        <span className="text-blue-100 text-sm">
                                                            {schedules.length} bài thi
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                                                        {/* Morning Session */}
                                                        <div className="p-3">
                                                            <div className="flex items-center gap-2 mb-2 text-orange-600">
                                                                <Sun className="w-4 h-4" />
                                                                <span className="text-sm font-medium">Buổi sáng</span>
                                                                <span className="text-xs text-gray-400">
                                                                    ({morningSchedules.length} lịch)
                                                                </span>
                                                            </div>
                                                            {morningSubjects.length === 0 ? (
                                                                <p className="text-sm text-gray-400 italic">Không có lịch thi</p>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {morningSubjects.map((s, i) => {
                                                                        const classCount = countClassesForSlot(morningSchedules, s.subjectName, s.startTime);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => openExamDetail(s.subjectName, date, s.startTime, s.duration, morningSchedules)}
                                                                                className="w-full flex items-center gap-2 text-sm bg-white px-2.5 py-2 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group text-left"
                                                                            >
                                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                                <span className="text-blue-600 font-medium min-w-[90px]">
                                                                                    {formatTime(s.startTime)} - {formatEndTime(s.startTime, s.duration)}
                                                                                </span>
                                                                                <span className="text-gray-800 font-medium truncate flex-1">{s.subjectName}</span>
                                                                                <span className="text-xs bg-gray-100 group-hover:bg-blue-100 px-2 py-0.5 rounded-full text-gray-600 group-hover:text-blue-600">
                                                                                    {classCount} lớp
                                                                                </span>
                                                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Afternoon Session */}
                                                        <div className="p-3">
                                                            <div className="flex items-center gap-2 mb-2 text-purple-600">
                                                                <Moon className="w-4 h-4" />
                                                                <span className="text-sm font-medium">Buổi chiều</span>
                                                                <span className="text-xs text-gray-400">
                                                                    ({afternoonSchedules.length} lịch)
                                                                </span>
                                                            </div>
                                                            {afternoonSubjects.length === 0 ? (
                                                                <p className="text-sm text-gray-400 italic">Không có lịch thi</p>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {afternoonSubjects.map((s, i) => {
                                                                        const classCount = countClassesForSlot(afternoonSchedules, s.subjectName, s.startTime);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => openExamDetail(s.subjectName, date, s.startTime, s.duration, afternoonSchedules)}
                                                                                className="w-full flex items-center gap-2 text-sm bg-white px-2.5 py-2 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-colors group text-left"
                                                                            >
                                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                                <span className="text-purple-600 font-medium min-w-[90px]">
                                                                                    {formatTime(s.startTime)} - {formatEndTime(s.startTime, s.duration)}
                                                                                </span>
                                                                                <span className="text-gray-800 font-medium truncate flex-1">{s.subjectName}</span>
                                                                                <span className="text-xs bg-gray-100 group-hover:bg-purple-100 px-2 py-0.5 rounded-full text-gray-600 group-hover:text-purple-600">
                                                                                    {classCount} lớp
                                                                                </span>
                                                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Summary Footer */}
                        {Object.keys(groupedByDate).length > 0 && (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
                                <span className="text-gray-500">
                                    📅 {Object.keys(groupedByDate).length} ngày thi |
                                    📝 {filteredSchedules.length} lịch thi
                                </span>
                                <span className="text-gray-500">
                                    Năm học {academicYear} - HK{semester}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
