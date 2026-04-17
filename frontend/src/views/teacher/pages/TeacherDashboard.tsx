import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    teacherService,
} from "../../../services/teacherService";
import type {
    TeacherProfile,
    TeacherDashboardStats,
    TodayScheduleItem,
    StudentRiskAnalysis,
    AIRecommendation,
} from "../../../services/teacherService";
import {
    StudentIcon,
    ClassIcon,
    CheckCircleIcon,
    WarningIcon,
    CalendarIcon,
} from "../TeacherIcons";
import { useAuth } from "../../../context/AuthContext";
import {
    Brain,
    Lightbulb,
    GraduationCap,
    ClipboardCheck,
    AlertTriangle,
    Circle,
    TrendingUp,
    TrendingDown,
    Zap,
    ChevronRight
} from "lucide-react";

// Animated Counter Component (synced with Admin Dashboard)
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

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

export default function TeacherDashboard() {
    const { teacherProfile } = useOutletContext<OutletContextType>();
    const { user } = useAuth();
    const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
    const [schedule, setSchedule] = useState<TodayScheduleItem[]>([]);
    const [riskAnalysis, setRiskAnalysis] = useState<StudentRiskAnalysis[]>([]);
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [teacherProfile]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, scheduleData] = await Promise.all([
                teacherService.getStats(),
                teacherService.getTodaySchedule(),
            ]);
            setStats(statsData);
            setSchedule(scheduleData);

            // Fetch AI data only for homeroom teachers
            if (teacherProfile?.isHomeroomTeacher) {
                const [riskData, recData] = await Promise.all([
                    teacherService.getRiskAnalysis(),
                    teacherService.getRecommendations(),
                ]);
                setRiskAnalysis(riskData);
                setRecommendations(recData);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get greeting based on time of day (synced with Admin)
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isHomeroom = teacherProfile?.isHomeroomTeacher;

    return (
        <div className="animate-fade-in-up">
            {/* Welcome Banner - Gradient (synced with Admin Dashboard) */}
            <div className="mb-8 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                    <h2 className="text-2xl font-bold mb-1">
                        {getGreeting()}, {user?.fullName || 'Thầy/Cô'}!
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Chào mừng bạn quay trở lại với SchoolIMS
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                {/* Tổng số học sinh (homeroom) / Lớp được phân công (subject) */}
                <StatCard
                    title={isHomeroom ? "Tổng số học sinh" : "Lớp được phân công"}
                    value={isHomeroom ? stats?.totalStudents || 0 : stats?.totalAssignedClasses || 0}
                    icon={<StudentIcon />}
                    bgColor="bg-blue-50"
                    iconColor="text-blue-500"
                />

                {/* Lớp chủ nhiệm (homeroom) / Tiết dạy hôm nay (subject) */}
                <StatCard
                    title={isHomeroom ? "Lớp chủ nhiệm" : "Tiết dạy hôm nay"}
                    value={isHomeroom ? stats?.homeroomClassName || "N/A" : stats?.todayPeriods || 0}
                    subtitle={isHomeroom ? `${stats?.totalStudents || 0} học sinh` : undefined}
                    icon={<ClassIcon />}
                    bgColor="bg-blue-50"
                    iconColor="text-blue-500"
                />

                {/* Điểm danh hôm nay (homeroom only) */}
                {isHomeroom && (
                    <StatCard
                        title="Điểm danh hôm nay"
                        value={`${stats?.todayAttendance?.present || 0}/${stats?.todayAttendance?.total || 0}`}
                        icon={<CheckCircleIcon />}
                        bgColor="bg-green-50"
                        iconColor="text-green-500"
                    />
                )}

                {/* Học sinh cần chú ý (homeroom only) */}
                {isHomeroom && (
                    <StatCard
                        title="Học sinh cần chú ý"
                        value={stats?.studentsNeedingAttention || 0}
                        icon={<WarningIcon />}
                        bgColor="bg-red-50"
                        iconColor="text-red-500"
                    />
                )}
            </div>

            {/* Lịch dạy hôm nay */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarIcon />
                        <h2 className="text-lg font-bold text-gray-900">Lịch dạy hôm nay</h2>
                    </div>
                </div>

                <div className="p-4">
                    {schedule.length > 0 ? (
                        <div className="space-y-0">
                            {schedule.map((item, index) => (
                                <div key={index} className="flex items-center py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-xl">
                                    <div className="w-32 text-sm text-gray-500 font-medium tracking-tight">
                                        {item.startTime} - {item.endTime}
                                    </div>
                                    <div className="flex-1 pl-4 border-l-2 border-indigo-100">
                                        <h4 className="font-semibold text-gray-900">{item.subjectName}</h4>
                                        <p className="text-sm text-gray-500 italic">Lớp {item.className}</p>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        <div className="font-medium text-indigo-600">Phòng {item.roomNumber || "N/A"}</div>
                                        <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mt-1 inline-block font-bold">Tiết {item.periodNumber}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <CalendarIcon />
                            <p className="font-medium mt-3">Hôm nay không có lịch dạy</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            {isHomeroom && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Phân tích rủi ro AI */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                                <Brain className="w-5 h-5 line-height-0" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Phân tích rủi ro AI</h2>
                        </div>

                        <div className="space-y-4">
                            {riskAnalysis.length > 0 ? (
                                riskAnalysis.slice(0, 2).map((student) => (
                                    <RiskCard key={student.studentId} student={student} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 italic text-sm bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    Chưa có dữ liệu phân tích rủi ro
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Đề xuất từ AI */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Đề xuất từ AI</h2>
                        </div>

                        <div className="space-y-4">
                            {recommendations.length > 0 ? (
                                recommendations.slice(0, 3).map((rec) => (
                                    <RecommendationCard key={rec.id} recommendation={rec} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 italic text-sm bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    Chưa có đề xuất từ AI
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==================== HELPER COMPONENTS ====================

function StatCard({
    title,
    value,
    subtitle,
    icon,
    bgColor,
    iconColor,
    change,
    changePositive,
    delay = 0,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    bgColor: string;
    iconColor: string;
    change?: string;
    changePositive?: boolean;
    delay?: number;
}) {
    return (
        <div
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 leading-none">
                        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
                    </p>
                    {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
                    {change && (
                        <div className={`flex items-center gap-1 text-xs mt-2 font-bold ${changePositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{change}</span>
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center ${iconColor} flex-shrink-0 shadow-sm`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function RiskCard({ student }: { student: StudentRiskAnalysis }) {
    const riskColors = {
        HIGH: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", label: "Rủi ro cao", icon: AlertTriangle },
        MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", label: "Trung bình", icon: Zap },
        LOW: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", label: "Ổn định", icon: ClipboardCheck },
    };
    const colors = riskColors[student.riskLevel];
    const StatusIcon = colors.icon;

    return (
        <div className="border border-gray-100 rounded-xl p-4 bg-white hover:border-indigo-100 transition-all group">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm border border-indigo-100">
                    {student.studentName.charAt(0)}
                </div>
                <div className="flex-1">
                    <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xs">{student.studentName}</p>
                    <div className="flex gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {colors.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {student.riskType}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3 mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {student.metrics.map((metric, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tight text-slate-500 mb-1.5">
                            <span>{metric.label}</span>
                            <span>{metric.value} / {metric.maxValue}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${(metric.value / metric.maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggestions */}
            <div className="text-sm">
                <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">Đề xuất can thiệp:</p>
                <ul className="space-y-1.5">
                    {student.suggestions.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                            <Circle className="w-1.5 h-1.5 text-indigo-500 mt-1.5 fill-indigo-500" />
                            <span>{s}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function RecommendationCard({ recommendation }: { recommendation: AIRecommendation }) {
    const priorityColors = {
        HIGH: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
        MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
        LOW: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    };
    const colors = priorityColors[recommendation.priority];

    const typeIcons = {
        ACADEMIC: GraduationCap,
        ATTENDANCE: ClipboardCheck,
        DISCIPLINE: AlertTriangle,
    };
    const IconComponent = typeIcons[recommendation.type] || GraduationCap;

    return (
        <div className="border border-gray-100 rounded-xl p-4 hover:border-amber-100 transition-all overflow-hidden bg-white">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                    <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-bold text-gray-900 tracking-tight text-sm uppercase">{recommendation.title}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {recommendation.priority === 'HIGH' ? 'Ưu tiên cao' :
                                recommendation.priority === 'MEDIUM' ? 'Ưu tiên TB' : 'Ưu tiên thấp'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">{recommendation.description}</p>
                    <div className="space-y-1.5 mb-3">
                        {recommendation.actions.map((action, idx) => (
                            <div key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                                <Circle className="w-1.5 h-1.5 text-blue-500 mt-1.5 fill-blue-500" />
                                <span>{action}</span>
                            </div>
                        ))}
                    </div>
                    <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-black uppercase tracking-widest transition-all hover:gap-2">
                        Thực hiện ngay
                        <ChevronRight className="w-3 h-3" strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
