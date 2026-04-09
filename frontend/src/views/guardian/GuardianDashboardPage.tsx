import { useState, useEffect } from "react";
import { BookOpen, CheckCircle, TrendingUp, Bell, Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";
import { useOutletContext, Link } from "react-router-dom";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";
import { guardianService, type GuardianDto } from "../../services/guardianService.ts";

const periodTimes: Record<number, string> = {
    1: "07:00 - 07:45",
    2: "07:50 - 08:35",
    3: "08:40 - 09:25",
    4: "09:35 - 10:20",
    5: "10:35 - 11:20",
};

export default function GuardianDashboardPage() {
    const { student, timetable } = useOutletContext<StudentDataProp>();
    const [guardianProfile, setGuardianProfile] = useState<GuardianDto | null>(null);
    const [loading, setLoading] = useState(true);

    const currentDay = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();

    const currentDaySchedule = timetable.filter(
        slot => slot.dayOfWeek === currentDay && slot.className === student?.currentClassName
    ).sort((a, b) => a.slot - b.slot);

    useEffect(() => {
        const fetchGuardianInfo = async () => {
            try {
                const info = await guardianService.getUserProfileInfo();
                setGuardianProfile(info);
            } catch (error) {
                console.error("Failed to fetch guardian info:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGuardianInfo();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
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
                    value="8.5"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                    change="+0.2"
                    subtitle="Học kỳ 1"
                />
                <StatCard
                    title="Tỷ lệ chuyên cần"
                    value="98%"
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="green"
                    subtitle="Vắng 1 buổi"
                />
                <StatCard
                    title="Số tiết hoàn thành"
                    value="20/105"
                    icon={<BookOpen className="w-5 h-5" />}
                    color="purple"
                    subtitle="Năm học này"
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
                                                <p className="text-sm text-gray-500 italic">None</p>
                                            </div>
                                            <div className="text-right text-sm text-gray-500">
                                                <div className="font-medium">P.101</div>
                                                <div className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{slot.slot}</div>
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
                             {/* Placeholder for real exams */}
                             <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer group">
                                <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Toán học</h4>
                                    <p className="text-xs text-gray-500">Giữa kỳ</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-bold">
                                        Còn 2 ngày
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">15/01/2024</p>
                                </div>
                            </div>
                            <div className="text-center py-2">
                                <p className="text-xs text-gray-400 italic">Xem thêm trong mục Lịch kiểm tra</p>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Thông báo mới</h3>
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        </div>
                        <div className="p-4 space-y-3">
                             <div className="flex items-start gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                                <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 font-bold truncate group-hover:text-blue-600 transition-colors">Lịch họp phụ huynh</p>
                                    <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">Thông báo về việc tổ chức họp...</div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span>2 giờ trước</span>
                                    </div>
                                </div>
                            </div>
                            <Link to="/guardian/notification" className="w-full text-center text-[11px] font-bold text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 border border-blue-50">
                                Xem tất cả <ChevronRight className="w-4 h-4" />
                            </Link>
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
