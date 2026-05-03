import { useState, useEffect, useMemo } from "react";
import {
    learningAnalyticsService,
    type ClassLearningOverviewDto,
} from "../../../services/learningAnalyticsService";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from "recharts";
import {
    Sparkles,
    RefreshCw,
    Loader2,
    Users,
    TrendingUp,
    GraduationCap,
    AlertTriangle,
    Search,
    Filter,
    Info,
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../../context/AuthContext";

type GradeFilter = "all" | number;

export default function LearningAnalyticsDashboardPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [overview, setOverview] = useState<ClassLearningOverviewDto[]>([]);
    const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
    const [search, setSearch] = useState("");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await learningAnalyticsService.getSchoolOverview();
            setOverview(data);
        } catch (error) {
            console.error("Error loading learning analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleTriggerAnalysis = async () => {
        if (!confirm("Bạn có muốn kích hoạt AI phân tích học tập toàn trường? Quá trình có thể mất vài phút."))
            return;
        setTriggerLoading(true);
        try {
            await learningAnalyticsService.triggerSchoolAnalysis();
            await loadData();
            toast.success("Đã hoàn thành phân tích AI toàn trường!");
        } catch (error) {
            console.error("Error triggering analysis:", error);
            toast.error("Lỗi khi kích hoạt phân tích. Vui lòng thử lại.");
        } finally {
            setTriggerLoading(false);
        }
    };

    // Filters
    const filteredOverview = useMemo(() => {
        let data = overview;
        if (gradeFilter !== "all") {
            data = data.filter((c) => c.gradeLevel === gradeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter((c) => c.className.toLowerCase().includes(q));
        }
        return data;
    }, [overview, gradeFilter, search]);

    // Available grades for filter
    const availableGrades = useMemo(() => {
        const grades = [...new Set(overview.map((c) => c.gradeLevel))].sort((a, b) => a - b);
        return grades;
    }, [overview]);

    // Aggregate stats
    const stats = useMemo(() => {
        const totalStudents = filteredOverview.reduce((s, c) => s + c.totalStudents, 0);
        const totalAnalyzed = filteredOverview.reduce((s, c) => s + c.analyzedCount, 0);
        const totalExcellent = filteredOverview.reduce((s, c) => s + c.excellentCount, 0);
        const totalGood = filteredOverview.reduce((s, c) => s + c.goodCount, 0);
        const totalAverage = filteredOverview.reduce((s, c) => s + c.averageCount, 0);
        const totalWeak = filteredOverview.reduce((s, c) => s + c.weakCount, 0);

        const avgGpa =
            filteredOverview.length > 0
                ? filteredOverview.reduce((s, c) => s + (c.avgCurrentGpa ?? 0), 0) / filteredOverview.filter((c) => c.avgCurrentGpa).length || 0
                : 0;

        return { totalStudents, totalAnalyzed, totalExcellent, totalGood, totalAverage, totalWeak, avgGpa };
    }, [filteredOverview]);

    // Chart data
    const chartData = useMemo(() => {
        return filteredOverview.map((c) => ({
            name: c.className,
            "GPA Hiện tại": c.avgCurrentGpa ? +c.avgCurrentGpa.toFixed(1) : 0,
            "GPA Dự đoán": c.avgPredictedGpa ? +c.avgPredictedGpa.toFixed(1) : 0,
        }));
    }, [filteredOverview]);

    const getQualityBadge = (cls: ClassLearningOverviewDto) => {
        const gpa = cls.avgCurrentGpa ?? 0;
        if (gpa >= 8.0)
            return (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Giỏi
                </span>
            );
        if (gpa >= 6.5)
            return (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Khá
                </span>
            );
        if (gpa >= 5.0)
            return (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Trung bình
                </span>
            );
        return (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Yếu
            </span>
        );
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
            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
                {user?.role === 'SCHOOL_ADMIN' && (
                    <button
                        onClick={handleTriggerAnalysis}
                        disabled={triggerLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {triggerLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                        )}
                        {triggerLoading ? "Đang phân tích..." : "Phân tích toàn trường"}
                    </button>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Users className="w-24 h-24 text-gray-900" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1 relative z-10 flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> Tổng HS
                    </p>
                    <p className="text-3xl font-bold text-gray-900 relative z-10">{stats.totalStudents}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {stats.totalAnalyzed} đã phân tích
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <GraduationCap className="w-24 h-24 text-emerald-600" />
                    </div>
                    <p className="text-sm text-emerald-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> HS Giỏi (≥8.0)
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 relative z-10">{stats.totalExcellent}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-amber-600 mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> HS TB (5.0-6.5)
                    </p>
                    <p className="text-3xl font-bold text-amber-600 relative z-10">{stats.totalAverage}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-red-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" /> HS Yếu (&lt;5.0)
                    </p>
                    <p className="text-3xl font-bold text-red-600 relative z-10">{stats.totalWeak}</p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        GPA Trung Bình Theo Lớp
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" angle={-20} textAnchor="end" height={60} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid #e5e7eb",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="GPA Hiện tại" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`current-${index}`}
                                        fill={entry["GPA Hiện tại"] >= 8 ? "#10b981" : entry["GPA Hiện tại"] >= 6.5 ? "#6366f1" : entry["GPA Hiện tại"] >= 5 ? "#f59e0b" : "#ef4444"}
                                    />
                                ))}
                            </Bar>
                            <Bar dataKey="GPA Dự đoán" fill="#a5b4fc" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên lớp..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setGradeFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${gradeFilter === "all" ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            Tất cả
                        </button>
                        {availableGrades.map((g) => (
                            <button
                                key={g}
                                onClick={() => setGradeFilter(g)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${gradeFilter === g ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                            >
                                Khối {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Class Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left py-3.5 px-6 text-gray-500 font-semibold uppercase text-xs tracking-wider">Lớp</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">Khối</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">Sĩ số</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">Đã phân tích</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">GPA TB</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">GPA Dự đoán</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">Phân bố</th>
                                <th className="text-center py-3.5 px-4 text-gray-500 font-semibold uppercase text-xs tracking-wider">Chất lượng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOverview.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <Info className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400">
                                            {overview.length === 0
                                                ? 'Chưa có dữ liệu. Nhấn "Phân tích toàn trường" để bắt đầu.'
                                                : "Không tìm thấy lớp phù hợp với bộ lọc."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOverview.map((cls) => (
                                    <tr key={cls.classId} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 px-6 font-semibold text-gray-900">{cls.className}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold">
                                                {cls.gradeLevel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center text-gray-600">{cls.totalStudents}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`font-medium ${cls.analyzedCount >= cls.totalStudents ? "text-emerald-600" : "text-gray-500"}`}>
                                                {cls.analyzedCount}/{cls.totalStudents}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`font-bold text-base ${cls.avgCurrentGpa ? (cls.avgCurrentGpa >= 8 ? "text-emerald-600" : cls.avgCurrentGpa >= 6.5 ? "text-blue-600" : cls.avgCurrentGpa >= 5 ? "text-amber-600" : "text-red-600") : "text-gray-400"}`}>
                                                {cls.avgCurrentGpa?.toFixed(1) ?? "—"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="font-medium text-indigo-600">
                                                {cls.avgPredictedGpa?.toFixed(1) ?? "—"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {/* Distribution bar */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                    {cls.excellentCount > 0 && (
                                                        <div className="bg-emerald-500 h-full" style={{ width: `${(cls.excellentCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                                    )}
                                                    {cls.goodCount > 0 && (
                                                        <div className="bg-blue-500 h-full" style={{ width: `${(cls.goodCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                                    )}
                                                    {cls.averageCount > 0 && (
                                                        <div className="bg-amber-500 h-full" style={{ width: `${(cls.averageCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                                    )}
                                                    {cls.weakCount > 0 && (
                                                        <div className="bg-red-500 h-full" style={{ width: `${(cls.weakCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                                                {cls.excellentCount > 0 && <span className="text-emerald-600">{cls.excellentCount}G</span>}
                                                {cls.goodCount > 0 && <span className="text-blue-600">{cls.goodCount}K</span>}
                                                {cls.averageCount > 0 && <span className="text-amber-600">{cls.averageCount}TB</span>}
                                                {cls.weakCount > 0 && <span className="text-red-600">{cls.weakCount}Y</span>}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">{getQualityBadge(cls)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
