import { useState, useEffect } from "react";
import { riskService, type ClassRiskOverviewDto, type RiskAssessmentDto } from "../../../services/riskService";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Users, Loader2, ThumbsUp, ThumbsDown, Map, BellRing, MessageSquare, Activity } from "lucide-react";
import { useToast } from "../../../context/ToastContext";

export default function RiskDashboardPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [overview, setOverview] = useState<ClassRiskOverviewDto[]>([]);
    const [alerts, setAlerts] = useState<RiskAssessmentDto[]>([]);
    const [activeTab, setActiveTab] = useState<"heatmap" | "alerts">("heatmap");

    const loadData = async () => {
        setLoading(true);
        try {
            const [overviewData, alertsData] = await Promise.all([
                riskService.getSchoolOverview(),
                riskService.getPendingAlerts(),
            ]);
            setOverview(overviewData);
            setAlerts(alertsData);
        } catch (error) {
            console.error("Error loading risk data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleTriggerAnalysis = async () => {
        if (!confirm("Bạn có muốn kích hoạt phân tích AI ngay bây giờ? Quá trình có thể mất 1-2 phút.")) return;
        setTriggerLoading(true);
        try {
            await riskService.triggerAnalysis();
            await loadData();
            toast.success("Đã kích hoạt AI phân tích thành công!");
        } catch (error) {
            console.error("Error triggering analysis:", error);
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

    const getRiskBadge = (level: string) => {
        switch (level) {
            case "DANGER": return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold border border-red-200"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> Nguy cơ cao</span>;
            case "WATCH": return <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Theo dõi</span>;
            default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> An toàn</span>;
        }
    };


    // Stats
    const totalClasses = overview.length;
    const dangerClasses = overview.filter(c => c.riskLevel === "DANGER").length;
    const watchClasses = overview.filter(c => c.riskLevel === "WATCH").length;
    const safeClasses = overview.filter(c => c.riskLevel === "SAFE").length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Risk Analytics Dashboard</h1>
                        <p className="text-sm text-gray-500">Tổng quan rủi ro toàn trường theo AI phân tích</p>
                    </div>
                </div>
                <button
                    onClick={handleTriggerAnalysis}
                    disabled={triggerLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                    {triggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {triggerLoading ? "Đang phân tích..." : "Kích hoạt AI phân tích"}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Users className="w-24 h-24 text-gray-900" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1 relative z-10 flex items-center gap-1.5">
                        <Activity className="w-4 h-4" /> Tổng số lớp
                    </p>
                    <p className="text-3xl font-bold text-gray-900 relative z-10">{totalClasses}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-red-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" /> Nguy cơ cao
                    </p>
                    <p className="text-3xl font-bold text-red-600 relative z-10">{dangerClasses}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-amber-600 mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Theo dõi
                    </p>
                    <p className="text-3xl font-bold text-amber-600 relative z-10">{watchClasses}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-600 mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> An toàn
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 relative z-10">{safeClasses}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-xl w-fit">
                <button onClick={() => setActiveTab("heatmap")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "heatmap" ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"}`}>
                    <Map className="w-4 h-4" /> Heatmap Lớp Học
                </button>
                <button onClick={() => setActiveTab("alerts")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all relative ${activeTab === "alerts" ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"}`}>
                    <BellRing className="w-4 h-4" /> Cảnh Báo ({alerts.length})
                    {alerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    {alerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
            </div>

            {/* Heatmap Tab */}
            {activeTab === "heatmap" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {overview.map((cls) => (
                        <div key={cls.classId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900">{cls.className}</h3>
                                {getRiskBadge(cls.riskLevel)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                <Users className="w-4 h-4" /> {cls.totalStudents} học sinh
                            </div>

                            {/* Risk distribution bar */}
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                {cls.highRiskCount > 0 && (
                                    <div className="bg-red-500 h-full" style={{ width: `${(cls.highRiskCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                )}
                                {cls.mediumRiskCount > 0 && (
                                    <div className="bg-amber-500 h-full" style={{ width: `${(cls.mediumRiskCount / Math.max(cls.totalStudents, 1)) * 100}%` }} />
                                )}
                                <div className="bg-emerald-500 h-full flex-1" />
                            </div>

                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                {cls.highRiskCount > 0 && <span className="text-red-600">{cls.highRiskCount} cao</span>}
                                {cls.mediumRiskCount > 0 && <span className="text-amber-600">{cls.mediumRiskCount} TB</span>}
                                <span className="text-emerald-600">{cls.lowRiskCount} an toàn</span>
                            </div>
                        </div>
                    ))}

                    {overview.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400">
                            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                            <p>Chưa có dữ liệu phân tích. Hãy nhấn "Kích hoạt AI phân tích" để bắt đầu.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Alerts Tab */}
            {activeTab === "alerts" && (
                <div className="space-y-3">
                    {alerts.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                            <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Không có cảnh báo nào!</h3>
                            <p className="text-gray-500 text-sm">Tất cả học sinh đang trong trạng thái an toàn hoặc đã được xử lý.</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.riskScore >= 80 ? "bg-red-100" : "bg-amber-100"}`}>
                                            <AlertTriangle className={`w-6 h-6 ${alert.riskScore >= 80 ? "text-red-600" : "text-amber-600"}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{alert.studentName} <span className="text-gray-400 font-normal text-sm">({alert.studentCode})</span></h4>
                                            <p className="text-sm text-gray-500">{alert.className} • Điểm rủi ro: <span className={`font-bold ${alert.riskScore >= 80 ? "text-red-600" : "text-amber-600"}`}>{alert.riskScore}</span></p>
                                            {alert.aiReason && <p className="text-sm text-gray-600 mt-2 flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100"><MessageSquare className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" /> <span className="leading-relaxed">{alert.aiReason}</span></p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleFeedback(alert.id, "ACKNOWLEDGED")}
                                            className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium"
                                            title="Xác nhận & xử lý"
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" /> Xác nhận
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(alert.id, "FALSE_POSITIVE")}
                                            className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium"
                                            title="Báo động giả"
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" /> Bỏ qua
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
