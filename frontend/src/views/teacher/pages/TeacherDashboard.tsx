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

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

export default function TeacherDashboard() {
    const { teacherProfile } = useOutletContext<OutletContextType>();
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
            {/* Welcome Banner */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard - AI Insights</h1>
                <p className="text-gray-500">Chào mừng quay trở lại! Hệ thống AI đã phân tích và đưa ra các đề xuất cho bạn.</p>
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
                    change={isHomeroom ? "+12 so với HK trước" : undefined}
                    changePositive
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
                        change={`${Math.round(((stats?.todayAttendance?.present || 0) / (stats?.todayAttendance?.total || 1)) * 100)}% có mặt`}
                        changePositive
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
                        change="-2 so với tuần trước"
                        changePositive={false}
                    />
                )}

                {/* For subject teachers, show placeholder cards */}
                {!isHomeroom && (
                    <>
                        <StatCard
                            title="Bài tập đã giao"
                            value={12}
                            icon={<ClassIcon />}
                            bgColor="bg-orange-50"
                            iconColor="text-orange-500"
                        />
                        <StatCard
                            title="Bài tập cần chấm"
                            value={8}
                            icon={<CheckCircleIcon />}
                            bgColor="bg-purple-50"
                            iconColor="text-purple-500"
                        />
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            {isHomeroom && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Phân tích rủi ro AI */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">🧠</span>
                            <h2 className="text-lg font-bold text-gray-900">Phân tích rủi ro AI</h2>
                        </div>

                        <div className="space-y-4">
                            {riskAnalysis.length > 0 ? (
                                riskAnalysis.slice(0, 2).map((student) => (
                                    <RiskCard key={student.studentId} student={student} />
                                ))
                            ) : (
                                <MockRiskCards />
                            )}
                        </div>
                    </div>

                    {/* Đề xuất từ AI */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">💡</span>
                            <h2 className="text-lg font-bold text-gray-900">Đề xuất từ AI</h2>
                        </div>

                        <div className="space-y-4">
                            {recommendations.length > 0 ? (
                                recommendations.slice(0, 3).map((rec) => (
                                    <RecommendationCard key={rec.id} recommendation={rec} />
                                ))
                            ) : (
                                <MockRecommendations />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lịch dạy hôm nay */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon />
                    <h2 className="text-lg font-bold text-gray-900">Lịch dạy hôm nay</h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                    {schedule.length > 0 ? (
                        schedule.map((item, index) => (
                            <ScheduleCard key={index} item={item} />
                        ))
                    ) : (
                        <MockSchedule />
                    )}
                </div>
            </div>

            {/* Bottom Stats (homeroom only) */}
            {isHomeroom && (
                <div className="grid grid-cols-4 gap-6">
                    <BottomStatCard
                        icon="📊"
                        label="GPA trung bình lớp"
                        value={stats?.averageGpa?.toFixed(1) || "7.8"}
                        bgColor="bg-blue-50"
                        iconBg="bg-blue-100"
                    />
                    <BottomStatCard
                        icon="📈"
                        label="Chuyên cần TB"
                        value={`${stats?.attendanceRate || 92}%`}
                        bgColor="bg-green-50"
                        iconBg="bg-green-100"
                    />
                    <BottomStatCard
                        icon="🏆"
                        label="Học sinh xuất sắc"
                        value={stats?.excellentStudents || 12}
                        bgColor="bg-yellow-50"
                        iconBg="bg-yellow-100"
                    />
                    <BottomStatCard
                        icon="📝"
                        label="Bài tập chưa nộp"
                        value={stats?.pendingAssignments || 8}
                        bgColor="bg-orange-50"
                        iconBg="bg-orange-100"
                    />
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
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    bgColor: string;
    iconColor: string;
    change?: string;
    changePositive?: boolean;
}) {
    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
                    {change && (
                        <p className={`text-xs mt-1 ${changePositive ? 'text-green-600' : 'text-red-500'}`}>
                            {changePositive ? '↑' : '↓'} {change}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center ${iconColor} flex-shrink-0`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function RiskCard({ student }: { student: StudentRiskAnalysis }) {
    const riskColors = {
        HIGH: { bg: "bg-red-100", text: "text-red-600", label: "Rủi ro cao" },
        MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-600", label: "Trung bình" },
        LOW: { bg: "bg-green-100", text: "text-green-600", label: "Ổn định" },
    };
    const colors = riskColors[student.riskLevel];

    return (
        <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                    {student.studentName.charAt(0)}
                </div>
                <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.studentName}</p>
                    <div className="flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {colors.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                            {student.riskType}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-2 mb-3">
                {student.metrics.map((metric, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{metric.label}</span>
                            <span>{metric.value}/{metric.maxValue}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(metric.value / metric.maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggestions */}
            <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Đề xuất can thiệp:</p>
                <ul className="space-y-1">
                    {student.suggestions.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">○</span>
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
        HIGH: { bg: "bg-red-100", text: "text-red-600" },
        MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-600" },
        LOW: { bg: "bg-green-100", text: "text-green-600" },
    };
    const colors = priorityColors[recommendation.priority];

    const typeIcons = {
        ACADEMIC: "📚",
        ATTENDANCE: "📋",
        DISCIPLINE: "⚠️",
    };

    return (
        <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcons[recommendation.type]}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {recommendation.priority === 'HIGH' ? 'Ưu tiên cao' : 
                             recommendation.priority === 'MEDIUM' ? 'Ưu tiên TB' : 'Ưu tiên thấp'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{recommendation.description}</p>
                    <div className="space-y-1">
                        {recommendation.actions.map((action, idx) => (
                            <p key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-blue-500">○</span>
                                <span>{action}</span>
                            </p>
                        ))}
                    </div>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Xem chi tiết và thực hiện →
                    </button>
                </div>
            </div>
        </div>
    );
}

function ScheduleCard({ item }: { item: TodayScheduleItem }) {
    return (
        <div className="min-w-48 bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                    Tiết {item.periodNumber}
                </span>
                <span className="text-xs text-gray-500">
                    {item.startTime} - {item.endTime}
                </span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">{item.subjectName}</h4>
            <p className="text-sm text-gray-500">Lớp {item.className} • Phòng {item.roomNumber}</p>
        </div>
    );
}

function BottomStatCard({
    icon,
    label,
    value,
    bgColor,
    iconBg,
}: {
    icon: string;
    label: string;
    value: string | number;
    bgColor: string;
    iconBg: string;
}) {
    return (
        <div className={`${bgColor} rounded-xl p-4 flex items-center gap-4`}>
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center text-xl`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

// ==================== MOCK DATA COMPONENTS ====================

function MockRiskCards() {
    return (
        <>
            <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-medium">H</div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">Hoàng Văn Em</p>
                        <div className="flex gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Rủi ro cao</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Đang giảm</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 mb-3">
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Học tập</span><span>30</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }} /></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Chuyên cần</span><span>25</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }} /></div>
                    </div>
                </div>
                <p className="text-xs text-gray-500">Điểm số giảm liên tục 3 tháng gần đây</p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium">L</div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">Lê Văn Cường</p>
                        <div className="flex gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">Trung bình</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">Ổn định</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Học tập</span><span>45</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }} /></div>
                    </div>
                </div>
            </div>
        </>
    );
}

function MockRecommendations() {
    return (
        <>
            <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-xl">📚</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">Cải thiện kết quả môn Toán</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Ưu tiên cao</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">5 học sinh có điểm môn Toán dưới trung bình. Cần can thiệp sớm.</p>
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500">○</span>
                            <span>Tổ chức buổi học phụ đạo vào thứ 7</span>
                        </p>
                        <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Xem chi tiết và thực hiện →
                        </button>
                    </div>
                </div>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-xl">📋</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">Tăng cường điểm danh</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">Ưu tiên TB</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Tỷ lệ vắng mặt tăng 15% so với tháng trước.</p>
                        <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Xem chi tiết và thực hiện →
                        </button>
                    </div>
                </div>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">Cải thiện kỷ luật lớp học</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">Ưu tiên TB</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Có 3 học sinh vi phạm kỷ luật tuần này.</p>
                        <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Xem chi tiết và thực hiện →
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function MockSchedule() {
    return (
        <>
            <div className="min-w-48 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">Tiết 1</span>
                    <span className="text-xs text-gray-500">07:00 - 07:45</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Toán</h4>
                <p className="text-sm text-gray-500">Lớp 10A1 • Phòng A101</p>
            </div>

            <div className="min-w-48 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">Tiết 2</span>
                    <span className="text-xs text-gray-500">07:50 - 08:35</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Toán</h4>
                <p className="text-sm text-gray-500">Lớp 10A2 • Phòng A102</p>
            </div>
        </>
    );
}
