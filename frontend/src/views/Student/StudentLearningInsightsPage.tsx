import { useState, useEffect } from "react";
import { learningAnalyticsService, type LearningAnalysisDto } from "../../services/learningAnalyticsService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Sparkles,
    TrendingUp,
    Target,
    AlertTriangle,
    BookOpen,
    Info,
    GraduationCap,
    Lightbulb,
    Award,
    ArrowUpRight,
} from "lucide-react";

export default function StudentLearningInsightsPage() {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<LearningAnalysisDto | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await learningAnalyticsService.getMyReport();
                setReport(data);
            } catch (err) {
                console.error("Error loading learning analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Cố vấn Học tập</h1>
                        <p className="text-sm text-gray-500">Phân tích chi tiết năng lực và lộ trình học tập cá nhân</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có báo cáo phân tích</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Hệ thống AI sẽ phân tích năng lực học tập của em sau khi có đủ dữ liệu điểm số.
                        Hãy quay lại kiểm tra sau nhé!
                    </p>
                </div>
            </div>
        );
    }

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

    const gpaDiff = report.predictedGpa && report.currentGpa
        ? report.predictedGpa - report.currentGpa
        : null;

    return (
        <div className="animate-fade-in-up space-y-6">


            {/* Top Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current GPA */}
                <div className={`bg-gradient-to-br ${getGpaBg(report.currentGpa)} rounded-2xl p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                    <div className="relative">
                        <p className="text-white/80 text-sm font-medium mb-1 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" /> GPA Hiện Tại
                        </p>
                        <p className="text-4xl font-bold mb-1">
                            {report.currentGpa?.toFixed(1) ?? "—"}
                            <span className="text-lg font-normal text-white/70">/10</span>
                        </p>
                        <p className="text-white/90 text-sm">{getGpaLabel(report.currentGpa)}</p>
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
                    <p className={`text-3xl font-bold ${getGpaColor(report.predictedGpa)}`}>
                        {report.predictedGpa?.toFixed(1) ?? "—"}
                        <span className="text-base font-normal text-gray-400">/10</span>
                    </p>
                    {gpaDiff !== null && (
                        <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${gpaDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            <ArrowUpRight className={`w-4 h-4 ${gpaDiff < 0 ? "rotate-90" : ""}`} />
                            {gpaDiff >= 0 ? "+" : ""}{gpaDiff.toFixed(1)} so với hiện tại
                        </div>
                    )}
                </div>

                {/* Analysis Date */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:opacity-10 transition-opacity">
                        <Sparkles className="w-24 h-24 text-violet-900" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-violet-500" /> Học kỳ
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{report.semesterName || "—"}</p>
                    {report.analyzedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                            Cập nhật: {new Date(report.analyzedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
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
                    {report.strengths ? (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-li:text-gray-700 prose-strong:text-emerald-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.strengths}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">AI đang phân tích...</p>
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
                    {report.weaknesses ? (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-li:text-gray-700 prose-strong:text-amber-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.weaknesses}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">AI đang phân tích...</p>
                    )}
                </div>
            </div>

            {/* Detailed Analysis */}
            {report.detailedAnalysis && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        Phân Tích Chi Tiết
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed prose-headings:text-gray-900 prose-strong:text-gray-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.detailedAnalysis}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Learning Advice */}
            {report.learningAdvice && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-6 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Lightbulb className="w-4 h-4 text-blue-600" />
                        </div>
                        Lộ Trình Học Tập — Lời Khuyên Từ AI
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed prose-headings:text-blue-900 prose-strong:text-blue-800 prose-li:marker:text-blue-500">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.learningAdvice}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Encouraging footer */}
            <div className="text-center py-4">
                <p className="text-xs text-gray-400">
                    💡 Báo cáo này được tạo bởi AI dựa trên dữ liệu điểm số và chuyên cần.
                    Hãy trao đổi với Thầy/Cô để được tư vấn thêm!
                </p>
            </div>
        </div>
    );
}
