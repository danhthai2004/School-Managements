import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { schoolAdminService, type SchoolStatsDto } from "../../../services/schoolAdminService";
import {
    ClassIcon,
    TeacherIcon,
    StudentIcon,
    CalendarIcon,
    PlusIcon,
    AccountIcon,
    ReportIcon
} from "../SchoolAdminIcons";
import { SkeletonCard } from "../../../components/common/Skeleton";

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1000, skipFormat = false }: { value: number | string; duration?: number; skipFormat?: boolean }) => {
    const [displayValue, setDisplayValue] = useState(0);

    // Check if the value is strictly numeric (prevents "2025-2026" from being parsed as 2025)
    const isNumeric = typeof value === "number" || (!isNaN(Number(value)) && String(value).trim() !== "");
    const numericValue = isNumeric ? Number(value) : 0;

    useEffect(() => {
        if (!isNumeric) return;

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            const currentValue = Math.floor(startValue + (numericValue - startValue) * easeOutQuad);

            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [numericValue, duration, isNumeric]);

    if (!isNumeric) {
        return <span>{value}</span>;
    }

    // skipFormat = true để không thêm dấu phẩy
    return <span className="animate-count-up">{skipFormat ? displayValue : displayValue.toLocaleString()}</span>;
};

// Stat Card with Animation
const StatCard = ({
    icon,
    label,
    value,
    color,
    delay = 0,
    skipFormat = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: "blue" | "orange" | "green" | "purple";
    delay?: number;
    skipFormat?: boolean;
}) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-500",
        orange: "bg-orange-50 text-orange-500",
        green: "bg-green-50 text-green-500",
        purple: "bg-purple-50 text-purple-500",
    };

    return (
        <div
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                        <AnimatedCounter value={value} skipFormat={skipFormat} />
                    </p>
                </div>
            </div>
        </div>
    );
};

// Quick Action Button
const QuickActionButton = ({
    icon,
    label,
    onClick,
    variant = "primary",
    delay = 0,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
    delay?: number;
}) => {
    const isPrimary = variant === "primary";

    return (
        <button
            onClick={onClick}
            className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group text-center animate-fade-in-up ${isPrimary ? "hover:border-blue-200" : "hover:border-gray-200"
                }`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${isPrimary ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                }`}>
                {icon}
            </div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
    );
};

const DashboardOverview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<SchoolStatsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    return (
        <div className="animate-fade-in">
            {/* Welcome Banner */}
            <div className="mb-8 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                    <h2 className="text-2xl font-bold mb-1">
                        {getGreeting()}, {user?.fullName || 'Admin'}! 👋
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Chào mừng bạn quay trở lại với SchoolIMS
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            icon={<ClassIcon />}
                            label="Tổng số lớp"
                            value={stats?.totalClasses || 0}
                            color="blue"
                            delay={0}
                        />
                        <StatCard
                            icon={<TeacherIcon />}
                            label="Số giáo viên"
                            value={stats?.totalTeachers || 0}
                            color="orange"
                            delay={100}
                        />
                        <StatCard
                            icon={<StudentIcon />}
                            label="Tổng học sinh"
                            value={stats?.totalStudents || 0}
                            color="green"
                            delay={200}
                        />
                        <StatCard
                            icon={<CalendarIcon />}
                            label="Năm học"
                            value={stats?.currentAcademicYear || 'N/A'}
                            color="purple"
                            delay={300}
                            skipFormat={true}
                        />
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Thao tác nhanh</h3>
                <p className="text-gray-500 text-sm mb-4">Các chức năng thường dùng</p>

                <div className="grid grid-cols-4 gap-4">
                    <QuickActionButton
                        icon={<PlusIcon />}
                        label="Thêm lớp học"
                        onClick={() => navigate('/school-admin/classes?action=add')}
                        variant="primary"
                        delay={0}
                    />
                    <QuickActionButton
                        icon={<StudentIcon />}
                        label="Thêm học sinh"
                        onClick={() => navigate('/school-admin/students?action=add')}
                        variant="primary"
                        delay={100}
                    />
                    <QuickActionButton
                        icon={<AccountIcon />}
                        label="Quản lý tài khoản"
                        onClick={() => navigate('/school-admin/accounts')}
                        variant="secondary"
                        delay={200}
                    />
                    <QuickActionButton
                        icon={<ReportIcon />}
                        label="Báo cáo hoạt động"
                        onClick={() => navigate('/school-admin/reports')}
                        variant="secondary"
                        delay={300}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
