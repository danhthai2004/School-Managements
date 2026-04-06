import { useState, useEffect } from "react";
import { riskService, type RiskAssessmentDto } from "../../../services/riskService";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, Sparkles } from "lucide-react";

export default function StudentRiskProfileCard({ studentId }: { studentId: string }) {
    const [history, setHistory] = useState<RiskAssessmentDto[]>([]);
    const [latest, setLatest] = useState<RiskAssessmentDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) return;
        const loadRiskData = async () => {
            setLoading(true);
            try {
                const [historyData, latestData] = await Promise.all([
                    riskService.getStudentHistory(studentId),
                    riskService.getLatestAssessment(studentId)
                ]);
                setHistory(historyData);
                setLatest(latestData);
            } catch (err) {
                console.error("Failed to load risk profile", err);
            } finally {
                setLoading(false);
            }
        };
        loadRiskData();
    }, [studentId]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!latest && history.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center h-full flex flex-col justify-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Chưa có dữ liệu phân tích</p>
                <p className="text-xs text-gray-400 mt-1">Đang chờ AI tổng hợp dữ liệu</p>
            </div>
        );
    }

    const chartData = [...history].reverse().map(h => ({
        date: new Date(h.assessmentDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        score: h.riskScore
    }));

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-red-600";
        if (score >= 50) return "text-amber-600";
        return "text-emerald-600";
    };



    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Phân Tích Rủi Ro</h2>
                </div>
                {latest && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Mức độ:</span>
                        <span className={`font-bold text-lg ${getScoreColor(latest.riskScore)}`}>
                            {latest.riskScore}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 flex-1 flex flex-col">
                {/* AI Reason/Advice */}
                {latest && (
                    <div className="mb-6 space-y-3">
                        {latest.aiReason && (
                            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-lg">
                                <span className="font-semibold text-gray-900 mr-2">Nhận xét:</span>
                                {latest.aiReason}
                            </div>
                        )}
                        {latest.aiAdvice && (
                            <div className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                <span className="font-semibold text-indigo-900 mr-2">Đề xuất:</span>
                                {latest.aiAdvice}
                            </div>
                        )}
                    </div>
                )}

                {/* Chart */}
                <div className="mt-auto">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Biểu đồ rủi ro</h3>
                    {chartData.length > 1 ? (
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#9ca3af" />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
                                        formatter={(value: number | undefined) => [`${value ?? 0} điểm`, "Chỉ số"]}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                            Cần ít nhất 2 lần đánh giá <br /> để vẽ biểu đồ
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
