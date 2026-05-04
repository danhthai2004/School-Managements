import { useState, useEffect } from "react";
import {
    learningAnalyticsService,
    type LearningAnalysisDto,
} from "../../../services/learningAnalyticsService";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Sparkles,
    RefreshCw,
    Loader2,
    Info,
    Award,
    AlertTriangle,
    Lightbulb,
    TrendingUp,
    GraduationCap,
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";

interface Props {
    studentId: string;
}

export default function StudentLearningProfileCard({ studentId }: Props) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [report, setReport] = useState<LearningAnalysisDto | null>(null);
    const [history, setHistory] = useState<LearningAnalysisDto[]>([]);

    const loadData = async () => {
        try {
            const [reportData, historyData] = await Promise.all([
                learningAnalyticsService.getStudentReport(studentId),
                learningAnalyticsService.getStudentHistory(studentId),
            ]);
            setReport(reportData);
            setHistory(historyData);
        } catch (err) {
            console.error("Error loading learning analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [studentId]);

    const handleTrigger = async () => {
        setTriggerLoading(true);
        try {
            const result = await learningAnalyticsService.triggerStudentAnalysis(studentId);
            if (result) {
                setReport(result);
                await loadData(); // refresh history
            }
            toast.success("Đã phân tích học tập thành công!");
        } catch (err) {
            console.error("Error triggering analysis:", err);
            toast.error("Lỗi khi phân tích. Vui lòng thử lại.");
        } finally {
            setTriggerLoading(false);
        }
    };

    // Chart data
    const chartData = [...history].reverse().map((h) => ({
        date: h.analyzedAt ? new Date(h.analyzedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "",
        currentGpa: h.currentGpa,
        predictedGpa: h.predictedGpa,
        semester: h.semesterName,
    }));

    const getGpaColor = (gpa: number | null) => {
        if (!gpa) return "text-gray-500";
        if (gpa >= 8.0) return "text-emerald-600";
        if (gpa >= 6.5) return "text-blue-600";
        if (gpa >= 5.0) return "text-amber-600";
        return "text-red-600";
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Đang tải phân tích AI...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Phân Tích Học Tập</h2>
                </div>
                <button
                    onClick={handleTrigger}
                    disabled={triggerLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {triggerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {triggerLoading ? "Đang phân tích..." : "Phân tích ngay"}
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {!report ? (
                    <div className="text-center py-8">
                        <Info className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">
                            Chưa có báo cáo AI. Nhấn "Phân tích ngay" để bắt đầu.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* GPA Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5" /> GPA Hiện tại
                                </p>
                                <p className={`text-2xl font-bold ${getGpaColor(report.currentGpa)}`}>
                                    {report.currentGpa?.toFixed(1) ?? "—"}
                                    <span className="text-sm font-normal text-gray-400">/10</span>
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> GPA Dự đoán
                                </p>
                                <p className={`text-2xl font-bold ${getGpaColor(report.predictedGpa)}`}>
                                    {report.predictedGpa?.toFixed(1) ?? "—"}
                                    <span className="text-sm font-normal text-gray-400">/10</span>
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60">
                                <p className="text-xs text-gray-500 mb-1">Học kỳ</p>
                                <p className="text-sm font-semibold text-gray-900">{report.semesterName || "—"}</p>
                                {report.analyzedAt && (
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {new Date(report.analyzedAt).toLocaleDateString("vi-VN")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {report.strengths && (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5" /> Điểm mạnh
                                    </p>
                                    <div className="prose prose-sm max-w-none text-gray-700 prose-strong:text-emerald-700 text-xs leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.strengths}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            {report.weaknesses && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Cần cải thiện
                                    </p>
                                    <div className="prose prose-sm max-w-none text-gray-700 prose-strong:text-amber-700 text-xs leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.weaknesses}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Learning Advice */}
                        {report.learningAdvice && (
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                                    <Lightbulb className="w-3.5 h-3.5" /> Lời khuyên từ AI
                                </p>
                                <div className="prose prose-sm max-w-none text-gray-700 text-xs leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.learningAdvice}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* GPA Trend Chart */}
                        {chartData.length > 1 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-indigo-500" /> Xu hướng GPA
                                </h4>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "1px solid #e5e7eb",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                fontSize: "12px",
                                            }}
                                            formatter={(value: number | undefined, name: string | undefined) => [value?.toFixed(1) ?? "—", name === "currentGpa" ? "GPA Hiện tại" : "GPA Dự đoán"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="currentGpa"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fill="url(#gpaGradient)"
                                            dot={{ fill: "#6366f1", strokeWidth: 2, r: 3 }}
                                            name="GPA Hiện tại"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="predictedGpa"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            fill="url(#predictedGradient)"
                                            dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                                            name="GPA Dự đoán"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
