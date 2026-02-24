import { useState, useEffect } from "react";
import { studentService, type ScoreDto } from "../../services/studentService";
import { TrendingUp, TrendingDown, Target, Lightbulb, BookOpen, Clock, Award, AlertCircle } from "lucide-react";

export default function StudentAnalysisPage() {
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<ScoreDto[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await studentService.getScores();
                setScores(data);
            } catch (error) {
                console.error("Error fetching scores:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Phân tích dữ liệu
    const sortedScores = [...scores].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    const strengths = sortedScores.filter(s => (s.averageScore || 0) >= 8).map(s => s.subjectName);
    const weaknesses = sortedScores.filter(s => (s.averageScore || 0) < 6.5 && s.averageScore !== null).map(s => s.subjectName);

    const overallAverage = scores.length > 0
        ? scores.reduce((a, b) => a + (b.averageScore || 0), 0) / scores.length
        : 0;

    // Dự đoán học kỳ tới (demo)
    const predictedNext = Math.min(10, overallAverage + 0.2).toFixed(1);
    const potential = overallAverage >= 8 ? "Giỏi" : overallAverage >= 6.5 ? "Khá" : overallAverage >= 5 ? "Trung bình" : "Cần cố gắng";

    // Tạo gợi ý học tập dựa trên dữ liệu
    const generateSuggestions = () => {
        const suggestions = [];

        // Gợi ý cho môn yếu
        if (weaknesses.length > 0) {
            suggestions.push({
                icon: AlertCircle,
                title: `Tập trung vào ${weaknesses[0]}`,
                desc: `Cần ôn tập thêm để cải thiện điểm ${weaknesses[0]}`,
                priority: "high"
            });
        }

        // Gợi ý thời gian học
        if (overallAverage < 7) {
            suggestions.push({
                icon: Clock,
                title: "Tăng thời gian học",
                desc: "Nên học thêm 30-60 phút mỗi ngày",
                priority: "high"
            });
        }

        // Gợi ý cho môn mạnh
        if (strengths.length > 0) {
            suggestions.push({
                icon: Award,
                title: `Phát huy ${strengths[0]}`,
                desc: `Có thể tham gia các cuộc thi ${strengths[0]}`,
                priority: "low"
            });
        }

        // Mục tiêu
        suggestions.push({
            icon: Target,
            title: "Đặt mục tiêu rõ ràng",
            desc: `Phấn đấu điểm TB học kỳ 2 đạt ${Math.min(10, overallAverage + 0.5).toFixed(1)}+`,
            priority: "medium"
        });

        // Đọc sách
        suggestions.push({
            icon: BookOpen,
            title: "Đọc thêm tài liệu",
            desc: "Đọc thêm sách tham khảo để mở rộng kiến thức",
            priority: "medium"
        });

        return suggestions;
    };

    const suggestions = generateSuggestions();

    // Phân tích xu hướng theo môn
    const subjectAnalysis = sortedScores.map(score => {
        const avg = score.averageScore || 0;
        let trend: "up" | "down" | "stable" = "stable";
        let suggestion = "";

        if (avg >= 8) {
            trend = "up";
            suggestion = "Tiếp tục duy trì! Có thể thử thách với bài nâng cao.";
        } else if (avg >= 6.5) {
            trend = "stable";
            suggestion = "Khá tốt! Cần luyện thêm để đạt điểm cao hơn.";
        } else if (avg >= 5) {
            trend = "down";
            suggestion = "Cần ôn tập thêm lý thuyết và làm nhiều bài tập.";
        } else {
            trend = "down";
            suggestion = "Cần tập trung nhiều hơn vào môn này, có thể nhờ thầy cô hỗ trợ.";
        }

        return { ...score, trend, suggestion };
    });

    return (
        <div className="animate-fade-in-up space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Phân Tích & Gợi Ý Học Tập</h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-medium">Điểm mạnh</span>
                    </div>
                    {strengths.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {strengths.map(s => (
                                <span key={s} className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">{s}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/70 text-sm mt-2">Chưa có môn đạt điểm giỏi</p>
                    )}
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Cần cải thiện</span>
                    </div>
                    {weaknesses.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {weaknesses.map(s => (
                                <span key={s} className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">{s}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/70 text-sm mt-2">Tốt! Không có môn yếu</p>
                    )}
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5" />
                        <span className="font-medium">Dự đoán HK2</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{predictedNext}</p>
                    <p className="text-white/80 text-sm">Xếp loại: {potential}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Analysis */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Phân tích theo môn
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {subjectAnalysis.map((item, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{item.subjectName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${(item.averageScore || 0) >= 8 ? "text-green-600" :
                                            (item.averageScore || 0) >= 6.5 ? "text-blue-600" :
                                                (item.averageScore || 0) >= 5 ? "text-orange-600" : "text-red-600"
                                            }`}>
                                            {item.averageScore || "-"}
                                        </span>
                                        {item.trend === "up" ? (
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                        ) : item.trend === "down" ? (
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{item.suggestion}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Learning Suggestions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        Gợi ý học tập
                    </h3>
                    <div className="space-y-4">
                        {suggestions.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.priority === "high" ? "bg-red-100 text-red-600" :
                                    item.priority === "medium" ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"
                                    }`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                                </div>
                                <div className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${item.priority === "high" ? "bg-red-100 text-red-700" :
                                    item.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                                    }`}>
                                    {item.priority === "high" ? "Ưu tiên" : item.priority === "medium" ? "Nên làm" : "Gợi ý"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-xl mb-4">💡 Mẹo học tập hiệu quả</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <h4 className="font-medium mb-2">📚 Ôn tập đều đặn</h4>
                        <p className="text-white/80 text-sm">Dành 30 phút mỗi ngày để ôn lại bài học</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <h4 className="font-medium mb-2">✍️ Ghi chép cẩn thận</h4>
                        <p className="text-white/80 text-sm">Tóm tắt nội dung chính bằng sơ đồ tư duy</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <h4 className="font-medium mb-2">🎯 Làm bài tập</h4>
                        <p className="text-white/80 text-sm">Thực hành nhiều để nắm vững kiến thức</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
