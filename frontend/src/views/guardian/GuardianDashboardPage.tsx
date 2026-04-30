import { useState, useEffect, useCallback } from "react";
import { BookOpen, CheckCircle, TrendingUp, Bell, Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";
import { useOutletContext, Link } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";
import { guardianService, type GuardianDto } from "../../services/guardianService.ts";
import type { AttendanceSummaryDto, ExamScheduleDto } from "../../services/studentService.ts";

const periodTimes: Record<number, string> = {
    1: "07:00 - 07:45",
    2: "07:50 - 08:35",
    3: "08:40 - 09:25",
    4: "09:35 - 10:20",
    5: "10:35 - 11:20",
    6: "13:30 - 14:15",
    7: "14:20 - 15:05",
    8: "15:10 - 15:55",
    9: "16:05 - 16:50",
    10: "16:55 - 17:40",
};

const examTypeLabels: Record<string, string> = {
    REGULAR: "Thường xuyên",
    MIDTERM: "Giữa kỳ",
    FINAL: "Cuối kỳ",
};

interface NotificationDto {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}

export default function GuardianDashboardPage() {
    const { student, timetable } = useOutletContext<StudentDataProp>();
    const [guardianProfile, setGuardianProfile] = useState<GuardianDto | null>(null);
    const [attendance, setAttendance] = useState<AttendanceSummaryDto | null>(null);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [upcomingExams, setUpcomingExams] = useState<ExamScheduleDto[]>([]);
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [allNotifications, setAllNotifications] = useState<NotificationDto[]>([]);
    const [loading, setLoading] = useState(true);

    const currentDay = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();

    const currentDaySchedule = timetable.filter(
        slot => slot.dayOfWeek === currentDay && (student?.currentClassName ? slot.className === student.currentClassName : true)
    ).sort((a, b) => a.slot - b.slot);

    const fetchData = useCallback(async () => {
        if (!student?.id) return;
        setLoading(true);
        try {
            const [profile, att, scores, exams, notifsRes] = await Promise.all([
                guardianService.getUserProfileInfo(),
                guardianService.getAttendance(student.id),
                guardianService.getScores(student.id),
                guardianService.getExamSchedule(student.id),
                fetch(`${import.meta.env.VITE_API_URL || ""}/v1/notifications?page=0&size=10`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
                }).then(res => res.json())
            ]);

            setGuardianProfile(profile);
            setAttendance(att);

            // Calculate average score
            if (scores && scores.length > 0) {
                const gradedScores = scores.filter(s => s.averageScore != null);
                if (gradedScores.length > 0) {
                    const total = gradedScores.reduce((sum, s) => sum + s.averageScore!, 0);
                    setAverageScore(total / gradedScores.length);
                } else {
                    setAverageScore(null);
                }
            }

            // Filter upcoming exams
            const now = new Date();
            const futureExams = exams
                .filter(e => new Date(e.examDate) >= now)
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                .slice(0, 3);
            setUpcomingExams(futureExams);

            const fetchedNotifications = notifsRes.notifications || [];
            setAllNotifications(fetchedNotifications);
            setNotifications(fetchedNotifications.slice(0, 3));
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [student?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    const formatDaysRemaining = (dateString: string) => {
        const examDate = new Date(dateString);
        examDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diff = examDate.getTime() - today.getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Hôm nay";
        if (days < 0) return "Đã diễn ra";
        return `Còn ${days} ngày`;
    };

    const formatTimeAgo = (dateString: string) => {
        const diff = new Date().getTime() - new Date(dateString).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return "Vừa xong";
        if (mins < 60) return `${mins} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        return `${days} ngày trước`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">
                        {getGreeting()}, {guardianProfile?.fullName || 'Phụ huynh'}!
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Chào mừng bạn quay trở lại với SchoolIMS. Chúc bạn một ngày tốt lành!
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Điểm trung bình"
                    value={averageScore !== null ? averageScore.toFixed(1) : "--"}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                    subtitle="Dựa trên điểm thành phần"
                />
                <StatCard
                    title="Tỷ lệ chuyên cần"
                    value={attendance ? `${(attendance.attendanceRate).toFixed(1)}%` : "--"}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="green"
                    subtitle={`Vắng ${attendance?.absentDays || 0} tiết`}
                />
                <StatCard
                    title="Số tiết có mặt"
                    value={attendance ? `${attendance.presentDays}/${attendance.totalDays}` : "--"}
                    icon={<BookOpen className="w-5 h-5" />}
                    color="purple"
                    subtitle="Từ đầu học kỳ"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-gray-500" />
                                <h3 className="font-semibold text-gray-900">Thời khóa biểu hôm nay</h3>
                            </div>
                            <span className="text-sm text-gray-500">
                                {new Date().toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        <div className="p-4">
                            {currentDaySchedule.length > 0 ? (
                                <div className="space-y-0">
                                    {currentDaySchedule.map((slot, index) => (
                                        <div key={index} className="flex items-center py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-xl">
                                            <div className="w-24 text-sm text-gray-500 font-medium tracking-tight">
                                                {periodTimes[slot.slot] || ""}
                                            </div>
                                            <div className="flex-1 pl-4 border-l-2 border-indigo-100">
                                                <h4 className="font-semibold text-gray-900">{slot.subjectName}</h4>
                                                <p className="text-sm text-gray-500 italic">{slot.teacherName || "Giáo viên"}</p>
                                            </div>
                                            <div className="text-right text-sm text-gray-500">
                                                <div className="font-medium text-indigo-600">{slot.roomName || "N/A"}</div>
                                                <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mt-1 inline-block font-bold">Tiết {slot.slot}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Hôm nay không có lịch học</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Upcoming Exams Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <h3 className="font-semibold text-gray-900">Sắp kiểm tra</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {upcomingExams.length > 0 ? upcomingExams.map((exam, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer group">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{exam.subjectName}</h4>
                                        <p className="text-xs text-gray-500">{examTypeLabels[exam.examType] || exam.examType}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${formatDaysRemaining(exam.examDate).includes("Hôm nay") || (formatDaysRemaining(exam.examDate).includes("Còn") && parseInt(formatDaysRemaining(exam.examDate).match(/\d+/)?.[0] || "999") <= 2)
                                            ? "bg-red-100 text-red-600"
                                            : "bg-blue-100 text-blue-600"
                                            }`}>
                                            {formatDaysRemaining(exam.examDate)}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(exam.examDate).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-gray-400 py-4">Không có lịch kiểm tra sắp tới</p>
                            )}
                            <Link to="/guardian/examschedule" className="block text-center py-2">
                                <p className="text-xs text-blue-600 hover:underline italic font-medium">Xem lịch kiểm tra chi tiết</p>
                            </Link>
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Thông báo mới</h3>
                            {notifications.some(n => !n.isRead) && <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>}
                        </div>
                        <div className="p-4 space-y-3">
                            {notifications.length > 0 ? notifications.map((notif, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                                    <div className={`w-9 h-9 ${notif.isRead ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-500'} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm text-gray-900 ${notif.isRead ? 'font-medium' : 'font-bold'} truncate group-hover:text-blue-600 transition-colors`}>{notif.title}</p>
                                        <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{notif.content}</div>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatTimeAgo(notif.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-gray-400 py-4">Không có thông báo mới</p>
                            )}
                            {allNotifications.length > 3 && (
                                <Link to="/guardian/notification" className="w-full text-center text-[11px] font-bold text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 border border-blue-50">
                                    Xem tất cả ({allNotifications.length}) <ChevronRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, subtitle, change }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'yellow' | 'green' | 'purple';
    subtitle?: string;
    change?: string;
}) {
    const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
        blue: { bg: "bg-white", text: "text-blue-600", iconBg: "bg-blue-50" },
        yellow: { bg: "bg-white", text: "text-yellow-600", iconBg: "bg-yellow-50" },
        green: { bg: "bg-white", text: "text-green-600", iconBg: "bg-green-50" },
        purple: { bg: "bg-white", text: "text-purple-600", iconBg: "bg-purple-50" },
    };
    const classes = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`${classes.bg} rounded-xl p-5 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}>
            <div className="flex items-start justify-between">
                <div className={`${classes.iconBg} ${classes.text} w-10 h-10 rounded-xl flex items-center justify-center shadow-sm`}>
                    {icon}
                </div>
                {change && (
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                        {change}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>}
            </div>
        </div>
    );
}
