import { useState, useEffect } from "react";
import { riskService, type RiskAssessmentDto } from "../../../services/riskService";
import { Shield, AlertTriangle, CheckCircle, ThumbsUp, ThumbsDown } from "lucide-react";

export default function ClassRiskManagementPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<RiskAssessmentDto[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const alertsData = await riskService.getPendingAlerts();
            // Optional: Filter for teacher's homeroom class could be done here if needed
            setAlerts(alertsData);
        } catch (error) {
            console.error("Error loading risk data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleFeedback = async (assessmentId: string, feedback: "ACKNOWLEDGED" | "FALSE_POSITIVE") => {
        try {
            await riskService.submitFeedback({ assessmentId, feedback });
            setAlerts(prev => prev.filter(a => a.id !== assessmentId));
        } catch (error) {
            console.error("Error submitting feedback:", error);
        }
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
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản Lý Rủi Ro Lớp Chủ Nhiệm</h1>
                    <p className="text-sm text-gray-500 mt-1">Cảnh báo và phân tích từ AI về học tập, chuyên cần, hành vi</p>
                </div>
            </div>

            <div className="space-y-4">
                {alerts.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
                        <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Không có cảnh báo mới</h3>
                        <p className="text-sm text-gray-500 mt-1">Lớp của bạn đang hoạt động ổn định và an toàn.</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.riskScore >= 80 ? "bg-red-100" : "bg-amber-100"}`}>
                                        <AlertTriangle className={`w-6 h-6 ${alert.riskScore >= 80 ? "text-red-600" : "text-amber-600"}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-lg">
                                            {alert.studentName} <span className="text-gray-400 font-normal text-sm">({alert.studentCode})</span>
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                            <span>Mức rủi ro: <strong className={alert.riskScore >= 80 ? "text-red-600" : "text-amber-600"}>{alert.riskScore}</strong> / 100</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{alert.riskCategory}</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 leading-relaxed border border-blue-100">
                                            <strong>AI Phân Tích:</strong> {alert.aiReason}
                                        </div>
                                        {alert.aiAdvice && (
                                            <p className="mt-2 text-sm text-gray-600">
                                                <strong>Gợi ý hỗ trợ:</strong> {alert.aiAdvice}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col gap-2 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4 mt-4 md:mt-0">
                                    <button
                                        onClick={() => handleFeedback(alert.id, "ACKNOWLEDGED")}
                                        className="w-full justify-center flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-medium text-sm"
                                        title="Xác nhận mức độ rủi ro & có biện pháp hỗ trợ"
                                    >
                                        <ThumbsUp className="w-4 h-4" /> Đã tiếp nhận
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(alert.id, "FALSE_POSITIVE")}
                                        className="w-full justify-center flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                                        title="Hệ thống đánh giá sai mức độ"
                                    >
                                        <ThumbsDown className="w-4 h-4" /> Báo động giả
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
