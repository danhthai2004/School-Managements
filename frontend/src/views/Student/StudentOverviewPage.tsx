import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { studentService, type StudentDashboardDto, type TimetableSlotDto, type ExamScheduleDto } from "../../services/studentService";
import { CalendarIcon } from "../../components/layout/SystemIcons";
import { Bell, BookOpen, TrendingUp, CheckCircle, ChevronRight, X } from "lucide-react";

const periodTimes: Record<number, string> = {
    1: "07:00 - 07:45",
    2: "07:50 - 08:35",
    3: "08:40 - 09:25",
    4: "09:35 - 10:20",
    5: "10:35 - 11:20",
};

const examTypeLabels: Record<string, string> = {
    MIDTERM: "Giữa kỳ",
    FINAL: "Cuối kỳ",
    REGULAR: "1 tiết",
    QUIZ: "15 phút",
};

export default function StudentOverviewPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<StudentDashboardDto | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await studentService.getDashboard();
                setDashboard(data);
            } catch (error) {
                console.error("Error fetching dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    if (loading || !dashboard) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                    <h2 className="text-2xl font-bold mb-1">
                        {getGreeting()}, {user?.fullName || dashboard.profile.fullName}! 👋
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Chúc bạn học tốt - {dashboard.semester}
                    </p>
                </div>
            </div>

            {/* Stats Cards - 3 cards layout like the design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Điểm trung bình"
                    value={dashboard.averageScore?.toFixed(1) || "-"}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                    change="+0.2"
                    subtitle="Học kỳ 1"
                />
                <StatCard
                    title="Số môn học"
                    value={dashboard.totalSubjects}
                    icon={<BookOpen className="w-5 h-5" />}
                    color="yellow"
                    subtitle="Học kỳ 1"
                />
                <StatCard
                    title="Chuyên cần"
                    value={`${dashboard.attendanceRate}%`}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="green"
                    subtitle="Vắng 1 buổi"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule - takes 2 columns */}
                <div className="lg:col-span-2">
                    <TodayScheduleCard slots={dashboard.todaySchedule} />
                </div>

                {/* Right column - Exams and Notifications */}
                <div className="space-y-6">
                    {/* Upcoming Exams */}
                    <UpcomingExamsCard exams={dashboard.upcomingExams} />

                    {/* Notifications */}
                    <NotificationsCard />
                </div>
            </div>
        </div>
    );
}

function TodayScheduleCard({ slots }: { slots: TimetableSlotDto[] }) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Thời khóa biểu hôm nay</h3>
                </div>
                <span className="text-sm text-gray-500">{formattedDate}</span>
            </div>
            <div className="p-4">
                {slots.length > 0 ? (
                    <div className="space-y-0">
                        {slots.map((slot, index) => (
                            <div key={index} className="flex items-center py-3 border-b border-gray-50 last:border-0">
                                <div className="w-24 text-sm text-gray-500">
                                    {periodTimes[slot.period] || ""}
                                </div>
                                <div className="flex-1 pl-4 border-l-2 border-gray-200">
                                    <h4 className="font-medium text-gray-900">{slot.subjectName}</h4>
                                    <p className="text-sm text-gray-500">{slot.teacherName}</p>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    <div>P.{slot.room || "-"}</div>
                                    <div>{slot.period}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Hôm nay không có lịch học</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function UpcomingExamsCard({ exams }: { exams: ExamScheduleDto[] }) {
    const getDaysUntil = (dateString: string) => {
        const examDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        examDate.setHours(0, 0, 0, 0);
        const diffTime = examDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const upcomingExams = exams.filter(e => getDaysUntil(e.examDate) >= 0).slice(0, 3);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">Sắp kiểm tra</h3>
            </div>
            <div className="p-4 space-y-3">
                {upcomingExams.length > 0 ? (
                    upcomingExams.map((exam, index) => {
                        const daysUntil = getDaysUntil(exam.examDate);
                        return (
                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
                                <div>
                                    <h4 className="font-medium text-gray-900">{exam.subjectName}</h4>
                                    <p className="text-xs text-gray-500">
                                        {examTypeLabels[exam.examType] || exam.examType}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full ${daysUntil <= 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        Còn {daysUntil} ngày
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">{formatDate(exam.examDate)}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        Không có lịch kiểm tra sắp tới
                    </div>
                )}
            </div>
        </div>
    );
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    createdByEmail: string;
}

function NotificationsCard() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllModal, setShowAllModal] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                const API_BASE = import.meta.env.VITE_API_URL || "";
                const res = await fetch(`${API_BASE}/student/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setAllNotifications(data);
                    setNotifications(data.slice(0, 3)); // Take first 3 only for preview
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatFullDate = (dateString: string) => {
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${mins}`;
    };

    return (
        <>
            {/* All Notifications Modal */}
            {showAllModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Tất cả thông báo ({allNotifications.length})</h3>
                            <button onClick={() => setShowAllModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
                            {allNotifications.length > 0 ? (
                                allNotifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => { setSelectedNotif(notif); setShowAllModal(false); }}
                                        className="flex items-start gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-gray-100"
                                    >
                                        <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 font-medium">{notif.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notif.createdAt)} • {notif.createdByEmail?.split('@')[0] || 'Admin'}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">Chưa có thông báo</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedNotif && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg leading-tight">{selectedNotif.title}</h3>
                                    <p className="text-blue-100 text-sm mt-1">{formatFullDate(selectedNotif.createdAt)}</p>
                                </div>
                                <button onClick={() => setSelectedNotif(null)} className="p-1 hover:bg-white/20 rounded-lg ml-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <span className="bg-gray-100 px-2 py-1 rounded">Từ: {selectedNotif.createdByEmail || 'Admin'}</span>
                            </div>
                            <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
                                {selectedNotif.message || 'Không có nội dung chi tiết.'}
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Thông báo mới</h3>
                </div>
                <div className="p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => setSelectedNotif(notif)}
                                className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            >
                                <Bell className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 font-medium truncate">{notif.title}</p>
                                    <p className="text-xs text-gray-500">{formatTimeAgo(notif.createdAt)} • {notif.createdByEmail?.split('@')[0] || 'Admin'}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            Chưa có thông báo mới
                        </div>
                    )}
                    {allNotifications.length > 3 && (
                        <button
                            onClick={() => setShowAllModal(true)}
                            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2 flex items-center justify-center gap-1"
                        >
                            Xem tất cả ({allNotifications.length}) <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

function StatCard({ title, value, icon, color, subtitle, change }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
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
                <div className={`${classes.iconBg} ${classes.text} w-10 h-10 rounded-xl flex items-center justify-center`}>
                    {icon}
                </div>
                {change && (
                    <span className="text-xs text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                        {change}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-gray-500">{title}</p>
                <p className={`text-3xl font-bold text-gray-900 mt-1`}>{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}
