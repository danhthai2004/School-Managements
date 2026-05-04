import { useState, useEffect } from "react";
import { riskService, type RiskAssessmentDto } from "../../services/riskService";
import { studentService } from "../../services/studentService";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus, Sparkles, CheckCircle, Info } from "lucide-react";

export default function MyRiskAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<RiskAssessmentDto[]>([]);
    const [latest, setLatest] = useState<RiskAssessmentDto | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const profile = await studentService.getProfile();

                const [historyData, latestData] = await Promise.all([
                    riskService.getStudentHistory(profile.id),
                    riskService.getLatestAssessment(profile.id),
                ]);
                setHistory(historyData);
                setLatest(latestData);
            } catch (err) {
                console.error("Error loading risk data:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Chart data (sắp xếp cũ -> mới cho LineChart)
    const chartData = [...history].reverse().map((h) => ({
        date: new Date(h.assessmentDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        score: h.riskScore,
        fullDate: h.assessmentDate,
    }));

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-red-600";
        if (score >= 50) return "text-amber-600";
        return "text-emerald-600";
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return "from-red-500 to-rose-600";
        if (score >= 50) return "from-amber-500 to-orange-600";
        return "from-emerald-500 to-teal-600";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Cần chú ý nhiều";
        if (score >= 50) return "Cần cố gắng thêm";
        if (score >= 30) return "Khá ổn định";
        return "Rất tốt! 🎉";
    };

    const getTrendIcon = (trend: string | null) => {
        switch (trend) {
            case "IMPROVING": return <TrendingUp className="w-5 h-5 text-emerald-500" />;
            case "DECLINING": case "CRITICAL": return <TrendingDown className="w-5 h-5 text-red-500" />;
            default: return <Minus className="w-5 h-5 text-gray-400" />;
        }
    };

    const getTrendLabel = (trend: string | null) => {
        switch (trend) {
            case "IMPROVING": return "Đang tiến bộ";
            case "DECLINING": return "Cần cải thiện";
            case "CRITICAL": return "Cần hỗ trợ";
            default: return "Ổn định";
        }
    };

    const noData = !latest && history.length === 0;

    return (
        <div className="animate-fade-in-up space-y-6">


            {noData ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có dữ liệu phân tích</h3>
                    <p className="text-gray-500">Hệ thống sẽ bắt đầu phân tích sau khi có đủ dữ liệu điểm số và chuyên cần.</p>
                </div>
            ) : (
                <>
                    {/* Top Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Current Score */}
                        <div className={`bg-gradient-to-br ${getScoreBg(latest?.riskScore ?? 0)} rounded-2xl p-6 text-white relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                            <div className="relative">
                                <p className="text-white/80 text-sm font-medium mb-1">Chỉ Số Hiện Tại</p>
                                <p className="text-5xl font-bold mb-2">{latest?.riskScore ?? "—"}<span className="text-xl font-normal">/100</span></p>
                                <p className="text-white/90 text-sm">{getScoreLabel(latest?.riskScore ?? 0)}</p>
                            </div>
                        </div>

                        {/* Trend */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-gray-500 text-sm font-medium mb-3">Xu Hướng</p>
                            <div className="flex items-center gap-3 mb-2">
                                {getTrendIcon(latest?.riskTrend ?? null)}
                                <span className="text-xl font-bold text-gray-900">{getTrendLabel(latest?.riskTrend ?? null)}</span>
                            </div>
                            <p className="text-sm text-gray-500">So với lần đánh giá trước</p>
                        </div>

                        {/* Category */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <p className="text-gray-500 text-sm font-medium mb-3">Lĩnh Vực Chính</p>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold">
                                    {latest?.riskCategory === "ACADEMIC" ? "📚 Học tập"
                                        : latest?.riskCategory === "ATTENDANCE" ? "📋 Chuyên cần"
                                            : latest?.riskCategory === "BEHAVIOR" ? "🎯 Hành vi"
                                                : "📊 Tổng hợp"}
                                </span>
                            </div>
                            {latest?.assessmentDate && (
                                <p className="text-xs text-gray-400 mt-3">
                                    Cập nhật: {new Date(latest.assessmentDate).toLocaleDateString("vi-VN")}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Chart + Advice */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Trend Chart */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                Biểu Đồ Biến Động
                            </h3>
                            {chartData.length > 1 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "1px solid #e5e7eb",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                            }}
                                            formatter={(value: number | undefined) => [`${value ?? 0} điểm`, "Chỉ số rủi ro"]}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fill="url(#riskGradient)" dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[280px] text-gray-400">
                                    <p>Cần ít nhất 2 lần đánh giá để vẽ biểu đồ</p>
                                </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                💡 Chỉ số càng thấp càng tốt. Dưới 30 = Rất tốt, 30-50 = Ổn, 50-80 = Cần cải thiện
                            </p>
                        </div>

                        {/* AI Advice */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                Lời Khuyên Từ AI
                            </h3>
                            <div className="space-y-4">
                                {latest?.aiAdvice ? (
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                        <p className="text-sm text-gray-700 leading-relaxed">{latest.aiAdvice}</p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500">Chưa có lời khuyên. AI sẽ phân tích sớm!</p>
                                    </div>
                                )}

                                {latest?.aiReason && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-xs font-medium text-amber-700 mb-1">Lý do đánh giá:</p>
                                        <p className="text-sm text-gray-700">{latest.aiReason}</p>
                                    </div>
                                )}
                            </div>

                            {/* Quick tips */}
                            <div className="mt-6 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mẹo nhanh</p>
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Đi học đều đặn, đúng giờ</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Ôn bài 30 phút mỗi ngày</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Hỏi thầy cô khi chưa hiểu bài</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Table */}
                    {history.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Lịch Sử Đánh Giá</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 text-gray-500 font-medium">Ngày</th>
                                            <th className="text-center py-3 px-4 text-gray-500 font-medium">Điểm</th>
                                            <th className="text-center py-3 px-4 text-gray-500 font-medium">Xu hướng</th>
                                            <th className="text-left py-3 px-4 text-gray-500 font-medium">Lĩnh vực</th>
                                            <th className="text-left py-3 px-4 text-gray-500 font-medium">Nhận xét</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.slice(0, 10).map((h) => (
                                            <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4">{new Date(h.assessmentDate).toLocaleDateString("vi-VN")}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`font-bold ${getScoreColor(h.riskScore)}`}>{h.riskScore}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">{getTrendIcon(h.riskTrend)}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{h.riskCategory}</span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{h.aiReason || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
