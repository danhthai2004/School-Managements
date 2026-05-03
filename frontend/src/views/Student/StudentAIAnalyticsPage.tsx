import { useState, useEffect } from "react";
import { riskService, type RiskAssessmentDto } from "../../services/riskService";
import { studentService } from "../../services/studentService";
import { learningAnalyticsService, type LearningAnalysisDto } from "../../services/learningAnalyticsService";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Sparkles, CheckCircle, Info, Target, GraduationCap, Award, AlertTriangle, Lightbulb, BookOpen, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function StudentAIAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<RiskAssessmentDto[]>([]);
    const [latestRisk, setLatestRisk] = useState<RiskAssessmentDto | null>(null);
    const [learningReport, setLearningReport] = useState<LearningAnalysisDto | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const profile = await studentService.getProfile();

                const [historyData, latestData, learningData] = await Promise.all([
                    riskService.getStudentHistory(profile.id),
                    riskService.getLatestAssessment(profile.id),
                    learningAnalyticsService.getMyReport()
                ]);
                
                setHistory(historyData);
                setLatestRisk(latestData);
                setLearningReport(learningData);
            } catch (err) {
                console.error("Error loading combined AI analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm font-medium animate-pulse">AI đang phân tích dữ liệu...</p>
            </div>
        );
    }

    const noData = !latestRisk && history.length === 0 && !learningReport;

    if (noData) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Phân tích Học tập & Rủi ro</h1>
                        <p className="text-sm text-gray-500">Đánh giá dựa trên Điểm số và Chuyên cần</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có dữ liệu phân tích</h3>
                    <p className="text-gray-500">Hệ thống sẽ bắt đầu phân tích sau khi có đủ dữ liệu điểm số và chuyên cần.</p>
                </div>
            </div>
        );
    }

    // Chart data for Risk History
    const chartData = [...history].reverse().map((h) => ({
        date: new Date(h.assessmentDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        score: h.riskScore,
        fullDate: h.assessmentDate,
    }));

    // Helpers for GPA Colors
    const getGpaColor = (gpa: number | null) => {
        if (!gpa) return "text-gray-500";
        if (gpa >= 8.0) return "text-emerald-600";
        if (gpa >= 6.5) return "text-blue-600";
        if (gpa >= 5.0) return "text-amber-600";
        return "text-red-600";
    };

    const getGpaBg = (gpa: number | null) => {
        if (!gpa) return "from-gray-400 to-gray-500";
        if (gpa >= 8.0) return "from-emerald-500 to-teal-600";
        if (gpa >= 6.5) return "from-blue-500 to-indigo-600";
        if (gpa >= 5.0) return "from-amber-500 to-orange-600";
        return "from-red-500 to-rose-600";
    };

    const getGpaLabel = (gpa: number | null) => {
        if (!gpa) return "Chưa xác định";
        if (gpa >= 8.0) return "Xuất sắc! 🌟";
        if (gpa >= 6.5) return "Khá tốt! 👍";
        if (gpa >= 5.0) return "Cần cố gắng thêm";
        return "Cần nỗ lực nhiều hơn";
    };

    // Helpers for Risk Score colors
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-red-600";
        if (score >= 50) return "text-amber-600";
        return "text-emerald-600";
    };

    const gpaDiff = learningReport?.predictedGpa && learningReport?.currentGpa
        ? learningReport.predictedGpa - learningReport.currentGpa
        : null;

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Phân tích Học tập & Rủi ro</h1>
                    <p className="text-sm text-gray-500">Phân tích năng lực và đánh giá rủi ro dựa trên Điểm số & Chuyên cần</p>
                </div>
            </div>

            {/* Top Cards: Current GPA, Predicted GPA, Risk Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current GPA */}
                <div className={`bg-gradient-to-br ${getGpaBg(learningReport?.currentGpa ?? null)} rounded-2xl p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                    <div className="relative">
                        <p className="text-white/80 text-sm font-medium mb-1 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" /> GPA Hiện Tại
                        </p>
                        <p className="text-4xl font-bold mb-1">
                            {learningReport?.currentGpa?.toFixed(1) ?? "—"}
                            <span className="text-lg font-normal text-white/70">/10</span>
                        </p>
                        <p className="text-white/90 text-sm">{getGpaLabel(learningReport?.currentGpa ?? null)}</p>
                    </div>
                </div>

                {/* Predicted GPA */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-indigo-900" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-500" /> GPA Dự Đoán
                    </p>
                    <p className={`text-3xl font-bold ${getGpaColor(learningReport?.predictedGpa ?? null)}`}>
                        {learningReport?.predictedGpa?.toFixed(1) ?? "—"}
                        <span className="text-base font-normal text-gray-400">/10</span>
                    </p>
                    {gpaDiff !== null && (
                        <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${gpaDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            <ArrowUpRight className={`w-4 h-4 ${gpaDiff < 0 ? "rotate-90" : ""}`} />
                            {gpaDiff >= 0 ? "+" : ""}{gpaDiff.toFixed(1)} so với hiện tại
                        </div>
                    )}
                </div>

                {/* Risk Category */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <p className="text-gray-500 text-sm font-medium mb-3">Lĩnh Vực Cần Lưu Ý</p>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold border border-indigo-100">
                            {latestRisk?.riskCategory === "ACADEMIC" ? "📚 Học lực (Điểm số)"
                                : latestRisk?.riskCategory === "ATTENDANCE" ? "📋 Chuyên cần"
                                    : latestRisk?.riskCategory === "BEHAVIOR" ? "🎯 Hành vi"
                                        : latestRisk?.riskCategory === "MIXED" ? "📊 Tổng hợp (Học lực & Chuyên cần)" 
                                            : "✨ Ổn định"}
                        </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-gray-500">Chỉ số rủi ro:</span>
                        <span className={`font-bold ${getScoreColor(latestRisk?.riskScore ?? 0)}`}>{latestRisk?.riskScore ?? "—"}</span>
                    </div>
                </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Award className="w-4 h-4 text-emerald-600" />
                        </div>
                        Điểm Mạnh
                    </h3>
                    {learningReport?.strengths ? (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-li:text-gray-700 prose-strong:text-emerald-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{learningReport.strengths}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Chưa có dữ liệu phân tích điểm mạnh.</p>
                    )}
                </div>

                {/* Weaknesses */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        Môn Cần Cải Thiện
                    </h3>
                    {learningReport?.weaknesses ? (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-li:text-gray-700 prose-strong:text-amber-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{learningReport.weaknesses}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Chưa có dữ liệu môn cần cải thiện.</p>
                    )}
                </div>
            </div>

            {/* Chart + Advice Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        Biểu Đồ Biến Động Rủi Ro
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
                            <p>Cần ít nhất 2 lần đánh giá để vẽ biểu đồ xu hướng</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        💡 Chỉ số rủi ro càng thấp càng tốt. (Đánh giá dựa trên chuyên cần, điểm số, v.v.)
                    </p>
                </div>

                {/* AI Advice */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Lời Khuyên Khắc Phục (AI)
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                        {latestRisk?.aiAdvice ? (
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                <p className="text-sm text-gray-700 leading-relaxed font-medium mb-2">Về Rủi ro & Chuyên cần:</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{latestRisk.aiAdvice}</p>
                            </div>
                        ) : null}

                        {learningReport?.learningAdvice ? (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-sm text-gray-700 leading-relaxed font-medium mb-2">Lộ trình học tập:</p>
                                <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-1 prose-li:my-0.5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{learningReport.learningAdvice}</ReactMarkdown>
                                </div>
                            </div>
                        ) : null}

                        {!latestRisk?.aiAdvice && !learningReport?.learningAdvice && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500">Chưa có lời khuyên. AI sẽ phân tích sớm!</p>
                            </div>
                        )}
                    </div>

                    {/* Quick tips */}
                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 shrink-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mẹo nhanh</p>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>Đi học đều đặn, không nghỉ quá số buổi</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>Tập trung cải thiện các môn còn yếu</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Analysis */}
            {learningReport?.detailedAnalysis && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        Phân Tích Chi Tiết Quá Trình Học Tập
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed prose-headings:text-gray-900 prose-strong:text-gray-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{learningReport.detailedAnalysis}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* History Table */}
            {history.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Lịch Sử Đánh Giá Rủi Ro</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left py-3 px-4 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Ngày</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Điểm rủi ro</th>
                                    <th className="text-left py-3 px-4 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Lĩnh vực</th>
                                    <th className="text-left py-3 px-4 text-gray-500 font-bold uppercase text-[10px] tracking-wider">Nguyên nhân từ AI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.slice(0, 10).map((h) => (
                                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-700">{new Date(h.assessmentDate).toLocaleDateString("vi-VN")}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-bold ${getScoreColor(h.riskScore)}`}>{h.riskScore}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold">
                                                {h.riskCategory === 'ACADEMIC' ? 'Học lực' :
                                                 h.riskCategory === 'ATTENDANCE' ? 'Chuyên cần' :
                                                 h.riskCategory === 'MIXED' ? 'Tổng hợp' : h.riskCategory}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 max-w-md italic">{h.aiReason || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Encouraging footer */}
            <div className="text-center py-4">
                <p className="text-xs text-gray-400">
                    💡 Báo cáo này được tạo bởi AI dựa trên dữ liệu điểm số thực tế và quá trình chuyên cần của em.
                    Hãy trao đổi với Giáo viên chủ nhiệm để được hướng dẫn thêm!
                </p>
            </div>
        </div>
    );
}
