import { useState, useEffect, useMemo } from "react";
import {
    learningAnalyticsService,
    type ClassLearningOverviewDto,
} from "../../../services/learningAnalyticsService";
import {
    riskService,
    type ClassRiskOverviewDto,
    type RiskAssessmentDto,
} from "../../../services/riskService";
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
    PieChart,
    Pie,
} from "recharts";
import {
    Sparkles,
    RefreshCw,
    Loader2,
    Users,
    TrendingUp,
    AlertTriangle,
    Search,
    Info,
    Shield,
    ClipboardList,
    BellRing,
    Activity,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import ConfirmationModal from "../../../components/common/ConfirmationModal";

type GradeFilter = "all" | number;

export default function AIAnalyticsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Data states
    const [learningOverview, setLearningOverview] = useState<ClassLearningOverviewDto[]>([]);
    const [riskOverview, setRiskOverview] = useState<ClassRiskOverviewDto[]>([]);
    const [alerts, setAlerts] = useState<RiskAssessmentDto[]>([]);

    // Filter states
    const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
    const [search, setSearch] = useState("");

    const loadData = async () => {
        setLoading(true);
        try {
            const [learningData, riskData, alertsData] = await Promise.all([
                learningAnalyticsService.getSchoolOverview(),
                riskService.getSchoolOverview(),
                riskService.getPendingAlerts(),
            ]);
            setLearningOverview(learningData);
            setRiskOverview(riskData);
            setAlerts(alertsData);
        } catch (error) {
            console.error("Error loading combined AI analytics:", error);
            toast.error("Không thể tải dữ liệu phân tích AI.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleTriggerAnalysis = async () => {
        setIsConfirmModalOpen(false);
        setTriggerLoading(true);
        try {
            // Trigger both analyses
            await Promise.all([
                learningAnalyticsService.triggerSchoolAnalysis(),
                riskService.triggerAnalysis()
            ]);
            await loadData();
            toast.success("Đã hoàn thành phân tích AI toàn diện!");
        } catch (error) {
            console.error("Error triggering comprehensive analysis:", error);
            toast.error("Lỗi khi kích hoạt phân tích. Vui lòng thử lại.");
        } finally {
            setTriggerLoading(false);
        }
    };

    const handleFeedback = async (assessmentId: string, feedback: "ACKNOWLEDGED" | "FALSE_POSITIVE") => {
        try {
            await riskService.submitFeedback({ assessmentId, feedback });
            setAlerts(prev => prev.filter(a => a.id !== assessmentId));
            toast.success("Đã gửi phản hồi thành công.");
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast.error("Lỗi khi gửi phản hồi.");
        }
    };

    // Merged Filtered Data
    const mergedData = useMemo(() => {
        const learningMap = new Map(learningOverview.map(l => [l.classId, l]));
        const riskMap = new Map(riskOverview.map(r => [r.classId, r]));
        
        // Get all unique class IDs
        const allClassIds = Array.from(new Set([
            ...learningOverview.map(l => l.classId),
            ...riskOverview.map(r => r.classId)
        ]));

        const combined = allClassIds.map(id => {
            const l = learningMap.get(id);
            const r = riskMap.get(id);
            return {
                classId: id,
                className: l?.className || r?.className || "Lớp không xác định",
                gradeLevel: l?.gradeLevel || r?.grade || 0,
                totalStudents: l?.totalStudents || r?.totalStudents || 0,
                analyzedCount: l?.analyzedCount || 0,
                avgPredictedGpa: l?.avgPredictedGpa || null,
                avgCurrentGpa: l?.avgCurrentGpa || null,
                excellentCount: l?.excellentCount || 0,
                goodCount: l?.goodCount || 0,
                averageCount: l?.averageCount || 0,
                weakCount: l?.weakCount || 0,
                riskLevel: r?.riskLevel || "SAFE",
                highRiskCount: r?.highRiskCount || 0,
                mediumRiskCount: r?.mediumRiskCount || 0,
                lowRiskCount: r?.lowRiskCount || 0,
            };
        });

        let filtered = combined;
        if (gradeFilter !== "all") {
            filtered = filtered.filter((c) => c.gradeLevel === gradeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter((c) => c.className.toLowerCase().includes(q));
        }
        return filtered;
    }, [learningOverview, riskOverview, gradeFilter, search]);

    const availableGrades = useMemo(() => {
        const grades = [...new Set(mergedData.map((c) => c.gradeLevel))].filter(g => g > 0).sort((a, b) => a - b);
        return grades;
    }, [mergedData]);

    // Aggregate stats
    const stats = useMemo(() => {
        const totalStudents = mergedData.reduce((s, c) => s + c.totalStudents, 0);
        const totalAnalyzed = mergedData.reduce((s, c) => s + c.analyzedCount, 0);
        const totalExcellent = mergedData.reduce((s, c) => s + c.excellentCount, 0);
        const totalGood = mergedData.reduce((s, c) => s + c.goodCount, 0);
        const totalAverage = mergedData.reduce((s, c) => s + c.averageCount, 0);
        const totalWeak = mergedData.reduce((s, c) => s + c.weakCount, 0);

        const totalDangerClasses = mergedData.filter(c => c.riskLevel === "DANGER").length;
        const totalWatchClasses = mergedData.filter(c => c.riskLevel === "WATCH").length;

        return { totalStudents, totalAnalyzed, totalExcellent, totalGood, totalAverage, totalWeak, totalDangerClasses, totalWatchClasses };
    }, [mergedData]);

    const chartData = useMemo(() => {
        return mergedData.map((c) => ({
            name: c.className,
            "GPA Hiện tại": c.avgCurrentGpa ? +c.avgCurrentGpa.toFixed(1) : 0,
            "GPA Dự đoán": c.avgPredictedGpa ? +c.avgPredictedGpa.toFixed(1) : 0,
        }));
    }, [mergedData]);

    // Risk category breakdown from real alerts data
    const riskCategoryStats = useMemo(() => {
        const catMap: Record<string, number> = {};
        alerts.forEach(a => {
            catMap[a.riskCategory] = (catMap[a.riskCategory] || 0) + 1;
        });
        const labelMap: Record<string, string> = {
            ACADEMIC: "Học lực",
            ATTENDANCE: "Chuyên cần",
            BEHAVIOR: "Hành vi",
            MIXED: "Tổng hợp",
            OPERATIONAL: "Vận hành",
        };
        const colorMap: Record<string, string> = {
            ACADEMIC: "#6366f1",
            ATTENDANCE: "#f59e0b",
            BEHAVIOR: "#ef4444",
            MIXED: "#8b5cf6",
            OPERATIONAL: "#64748b",
        };
        return Object.entries(catMap).map(([key, value]) => ({
            name: labelMap[key] || key,
            value,
            fill: colorMap[key] || "#94a3b8",
        }));
    }, [alerts]);

    const getRiskBadge = (level: string) => {
        switch (level) {
            case "DANGER": return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-bold border border-red-200 uppercase tracking-tight"><div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" /> Nguy cơ cao</span>;
            case "WATCH": return <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200 uppercase tracking-tight"><div className="w-1 h-1 rounded-full bg-amber-500" /> Theo dõi</span>;
            default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 uppercase tracking-tight"><div className="w-1 h-1 rounded-full bg-emerald-500" /> An toàn</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm font-medium animate-pulse">Đang tải dữ liệu phân tích AI...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Phân tích Học tập & Rủi ro</h1>
                        <p className="text-sm text-gray-500">Đánh giá và Cảnh báo sớm dựa trên <span className="font-semibold text-indigo-600">Điểm số</span> và <span className="font-semibold text-indigo-600">Chuyên cần</span></p>
                    </div>
                </div>

                <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={triggerLoading}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
                    title="Phân tích đồng thời dữ liệu Điểm số và Chuyên cần"
                >
                    {triggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {triggerLoading ? "Đang xử lý..." : "Phân tích Điểm số & Chuyên cần"}
                </button>
            </div>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleTriggerAnalysis}
                title="Kích hoạt Phân tích AI"
                message={
                    <div className="space-y-2">
                        <p>Bạn có muốn kích hoạt hệ thống AI phân tích dữ liệu toàn trường?</p>
                        <ul className="text-xs list-disc list-inside opacity-70 space-y-1">
                            <li>Dự báo học lực từng học sinh</li>
                            <li>Đánh giá nguy cơ dựa trên chuyên cần</li>
                            <li>Quá trình có thể mất vài phút tùy lượng dữ liệu</li>
                        </ul>
                    </div>
                }
                confirmText="Bắt đầu phân tích"
                variant="primary"
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Users className="w-24 h-24 text-gray-900" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1 relative z-10 flex items-center gap-1.5">
                        <Activity className="w-4 h-4" /> Tổng số HS
                    </p>
                    <p className="text-3xl font-bold text-gray-900 relative z-10">{stats.totalStudents}</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.totalAnalyzed} HS đã phân tích</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <p className="text-sm text-emerald-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> HS Xuất sắc & Giỏi
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 relative z-10">{stats.totalExcellent + stats.totalGood}</p>
                    <p className="text-xs text-emerald-400 mt-1">Chiếm {Math.round(((stats.totalExcellent + stats.totalGood) / Math.max(stats.totalStudents, 1)) * 100)}% tổng số</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <p className="text-sm text-red-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" /> HS Yếu & Kém
                    </p>
                    <p className="text-3xl font-bold text-red-600 relative z-10">{stats.totalWeak}</p>
                    <p className="text-xs text-red-400 mt-1">Cần sự can thiệp từ giáo viên</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <p className="text-sm text-indigo-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> Lớp có rủi ro cao
                    </p>
                    <p className="text-3xl font-bold text-indigo-600 relative z-10">{stats.totalDangerClasses}</p>
                    <p className="text-xs text-indigo-400 mt-1">{stats.totalWatchClasses} lớp cần theo dõi</p>
                </div>
            </div>

            {/* Emergency Alerts Section */}
            {alerts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-red-600 animate-bounce" />
                            Danh sách Cảnh báo Khẩn cấp ({alerts.length})
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-100">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-red-200 hover:shadow-sm transition-all group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.riskScore >= 80 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{alert.studentName}</h4>
                                                <span className="text-xs text-gray-400">#{alert.studentCode}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{alert.className}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Điểm rủi ro: <span className="font-bold text-red-600">{alert.riskScore}</span> • 
                                                Phân loại: <span className="font-medium text-indigo-600">{
                                                    alert.riskCategory === 'ACADEMIC' ? 'Học lực' :
                                                    alert.riskCategory === 'ATTENDANCE' ? 'Chuyên cần' :
                                                    alert.riskCategory === 'BEHAVIOR' ? 'Hành vi' :
                                                    alert.riskCategory === 'MIXED' ? 'Tổng hợp' : alert.riskCategory
                                                }</span>
                                            </p>
                                            {alert.aiReason && (
                                                <p className="text-sm text-gray-600 mt-2 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic">
                                                    "{alert.aiReason}"
                                                </p>
                                            )}
                                            {alert.aiAdvice && (
                                                <div className="mt-2 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> Lời khuyên AI
                                                    </p>
                                                    <p className="text-xs text-indigo-800 leading-relaxed">
                                                        {alert.aiAdvice}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleFeedback(alert.id, "ACKNOWLEDGED")}
                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/10"
                                        >
                                            <ThumbsUp className="w-3 h-3" /> Xác nhận
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(alert.id, "FALSE_POSITIVE")}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                                        >
                                            <ThumbsDown className="w-3 h-3" /> Bỏ qua
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Learning Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        GPA Trung Bình & Dự báo Theo Lớp
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#9ca3af" angle={-20} textAnchor="end" height={60} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                                cursor={{ fill: '#f9fafb' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 500 }} />
                            <Bar dataKey="GPA Hiện tại" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`current-${index}`}
                                        fill={entry["GPA Hiện tại"] >= 8 ? "#10b981" : entry["GPA Hiện tại"] >= 6.5 ? "#4f46e5" : entry["GPA Hiện tại"] >= 5 ? "#f59e0b" : "#ef4444"}
                                    />
                                ))}
                            </Bar>
                            <Bar dataKey="GPA Dự đoán" fill="#a5b4fc" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Risk Category Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        Phân bổ Rủi ro theo Lĩnh vực
                    </h3>
                    {riskCategoryStats.length > 0 ? (
                        <div className="flex flex-col items-center gap-4">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={riskCategoryStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {riskCategoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-3">
                                {riskCategoryStats.map((cat) => (
                                    <div key={cat.name} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.fill }} />
                                        <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
                                        <span className="text-xs font-bold text-gray-900">{cat.value}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-400 text-center mt-1">
                                Dữ liệu từ {alerts.length} cảnh báo đang chờ xử lý — AI đánh giá dựa trên Điểm số & Chuyên cần
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                            <Shield className="w-12 h-12 text-emerald-200 mb-3" />
                            <p className="text-sm font-medium text-emerald-600">Không có cảnh báo rủi ro</p>
                            <p className="text-xs text-gray-400 mt-1">Toàn bộ học sinh đang trong tình trạng an toàn</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Integrated Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-bold text-gray-900">Chi tiết Phân tích theo Lớp</h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm lớp..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                />
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setGradeFilter("all")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${gradeFilter === "all" ? "bg-white shadow-sm text-indigo-700" : "text-gray-500"}`}
                                >
                                    Tất cả
                                </button>
                                {availableGrades.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGradeFilter(g)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${gradeFilter === g ? "bg-white shadow-sm text-indigo-700" : "text-gray-500"}`}
                                    >
                                        Khối {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/50 text-left">
                                <th className="py-4 px-6 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Lớp</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">Sĩ số</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">Phân tích</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">GPA TB</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">GPA Dự đoán</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider" title="Đánh giá dựa trên Điểm số & Chuyên cần">Mức độ rủi ro</th>
                                <th className="py-4 px-6 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Phân bổ Học lực</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {mergedData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-gray-400">
                                        <Info className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">Không có dữ liệu lớp học phù hợp.</p>
                                    </td>
                                </tr>
                            ) : (
                                mergedData.map((cls) => (
                                    <tr key={cls.classId} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="py-4 px-6">
                                            <span className="font-bold text-gray-900">{cls.className}</span>
                                            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">KHỐI {cls.gradeLevel}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center text-gray-600 font-medium">{cls.totalStudents}</td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-xs font-bold ${cls.analyzedCount >= cls.totalStudents ? "text-emerald-600" : "text-indigo-600"}`}>
                                                    {cls.analyzedCount}/{cls.totalStudents}
                                                </span>
                                                <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="bg-indigo-500 h-full" style={{ width: `${(cls.analyzedCount / cls.totalStudents) * 100}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-gray-700">
                                            {cls.avgCurrentGpa?.toFixed(1) || "—"}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-indigo-600">
                                            {cls.avgPredictedGpa?.toFixed(1) || "—"}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex justify-center">
                                                {getRiskBadge(cls.riskLevel)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex mb-1 min-w-[120px]">
                                                {cls.excellentCount > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(cls.excellentCount / cls.totalStudents) * 100}%` }} />}
                                                {cls.goodCount > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(cls.goodCount / cls.totalStudents) * 100}%` }} />}
                                                {cls.averageCount > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(cls.averageCount / cls.totalStudents) * 100}%` }} />}
                                                {cls.weakCount > 0 && <div className="bg-red-500 h-full" style={{ width: `${(cls.weakCount / cls.totalStudents) * 100}%` }} />}
                                            </div>
                                            <div className="flex gap-2 text-[9px] font-bold text-gray-400 uppercase">
                                                {cls.excellentCount > 0 && <span className="text-emerald-600">{cls.excellentCount}G</span>}
                                                {cls.goodCount > 0 && <span className="text-blue-600">{cls.goodCount}K</span>}
                                                {cls.weakCount > 0 && <span className="text-red-600">{cls.weakCount}Y</span>}
                                            </div>
                                        </td>
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
