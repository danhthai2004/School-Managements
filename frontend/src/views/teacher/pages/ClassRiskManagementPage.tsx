import { useState, useEffect, useMemo } from "react";
import { riskService, type RiskAssessmentDto } from "../../../services/riskService";
import {
    CheckCircle,
    Activity,
    Search,
    Calendar,
    ChevronRight,
    BrainCircuit,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

type TimeTab = "WEEK" | "MONTH" | "ALL";

export default function ClassRiskManagementPage() {
    const [alerts, setAlerts] = useState<RiskAssessmentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "ACADEMIC" | "ATTENDANCE">("ALL");
    const [timeTab, setTimeTab] = useState<TimeTab>("WEEK");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const data = await riskService.getPendingAlerts();
            setAlerts(data);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFeedback = async (alertId: string, feedback: "ACKNOWLEDGED" | "FALSE_POSITIVE") => {
        try {
            await riskService.submitFeedback({
                assessmentId: alertId,
                feedback: feedback
            });
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error("Failed to submit feedback:", error);
        }
    };

    // FILTERING LOGIC
    const filteredAlerts = useMemo(() => {
        const now = new Date();
        return alerts.filter(alert => {
            // 1. Category Filter
            const matchesFilter = filter === "ALL" || alert.riskCategory === filter;

            // 2. Search Filter
            const matchesSearch = alert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.studentCode.toLowerCase().includes(searchTerm.toLowerCase());

            // 3. Time Tab Filter
            const alertDate = new Date(alert.assessmentDate);
            let matchesTime = true;
            if (timeTab === "WEEK") {
                matchesTime = (now.getTime() - alertDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            } else if (timeTab === "MONTH") {
                matchesTime = (now.getTime() - alertDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            }

            return matchesFilter && matchesSearch && matchesTime;
        });
    }, [alerts, filter, searchTerm, timeTab]);

    // CHART DATA DERIVATION (Trend Chart)
    const trendData = useMemo(() => {
        // Simple mock trend based on filtered counts or dates
        // In a real app, this would come from a specific trend API
        const days = timeTab === "WEEK" ? 7 : timeTab === "MONTH" ? 30 : 14;
        const data = [];
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            // Count alerts for this specific day (Real count)
            const count = alerts.filter(a => {
                const ad = new Date(a.assessmentDate);
                return ad.getDate() === date.getDate() && ad.getMonth() === date.getMonth();
            }).length;

            data.push({ name: dStr, count: count }); // Data is now 100% reflective of reality
        }
        return data;
    }, [alerts, timeTab]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1200px] mx-auto pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Phân tích rủi ro học tập</h1>
                    <p className="text-gray-500 text-sm">Theo dõi biến động và dự báo rủi ro học tập của lớp.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <TabButton active={timeTab === "WEEK"} onClick={() => setTimeTab("WEEK")} label="Tuần này" />
                    <TabButton active={timeTab === "MONTH"} onClick={() => setTimeTab("MONTH")} label="Tháng này" />
                    <TabButton active={timeTab === "ALL"} onClick={() => setTimeTab("ALL")} label="Toàn bộ" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart (Area Chart) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Biến động rủi ro
                        </h3>
                        {filteredAlerts.length > 0 && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">Cần lưu ý</span>}
                    </div>
                    <div className="w-full h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Insight Section Redesigned */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex-1 bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <BrainCircuit className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Nhận xét từ AI</h3>
                            <p className="text-blue-50 text-sm leading-relaxed font-medium">
                                {filteredAlerts.length > 0
                                    ? `Phát hiện ${filteredAlerts.length} học sinh có dấu hiệu sụt giảm kết quả học tập trong ${timeTab === 'WEEK' ? 'tuần này' : 'tháng này'}. Thầy cô nên ưu tiên các trường hợp rủi ro cao.`
                                    : "Tuyệt vời! Không có rủi ro mới được ghi nhận trong khoảng thời gian này. Lớp học đang duy trì phong độ rất tốt."
                                }
                            </p>
                            <button className="mt-6 text-xs font-bold bg-white text-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-colors">
                                Xem báo cáo chi tiết <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hiển thị dữ liệu</p>
                        <p className="text-xs font-bold text-gray-900">{timeTab === "WEEK" ? "7 ngày qua" : timeTab === "MONTH" ? "30 ngày qua" : "Tất cả thời gian"}</p>
                    </div>
                </div>

                <div className="flex-1 max-w-md w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Tìm học sinh theo tên hoặc mã số..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-gray-100 border rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")} label="Tất cả" />
                    <FilterButton active={filter === "ACADEMIC"} onClick={() => setFilter("ACADEMIC")} label="Học thuật" />
                    <FilterButton active={filter === "ATTENDANCE"} onClick={() => setFilter("ATTENDANCE")} label="Chuyên cần" />
                </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Mọi thứ đều ổn</h3>
                        <p className="text-gray-500 text-sm">AI chưa thấy rủi ro nào cần xử lý trong mục này.</p>
                    </div>
                ) : (
                    filteredAlerts.map(alert => (
                        <RiskCard key={alert.id} alert={alert} onFeedback={handleFeedback} />
                    ))
                )}
            </div>
        </div>
    );
}

// ==================== SUB-COMPONENTS ====================

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all
            ${active ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
            {label}
        </button>
    );
}

function FilterButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
            ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"}`}
        >
            {label}
        </button>
    );
}

function RiskCard({ alert, onFeedback }: { alert: RiskAssessmentDto, onFeedback: (id: string, f: "ACKNOWLEDGED" | "FALSE_POSITIVE") => void }) {
    const isCritical = alert.riskScore >= 80;

    return (
        <div className={`group bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden
            ${isCritical ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500'}`}>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Avatar Section */}
                <div className="shrink-0">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base shadow-sm
                        ${isCritical ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {alert.studentName.charAt(0)}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {alert.studentName} <span className="font-medium text-gray-400 text-[11px] ml-0.5">({alert.studentCode})</span>
                        </h4>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200/50">
                            {alert.riskCategory === 'ACADEMIC' ? 'Học thuật' : 'Chuyên cần'}
                        </span>
                    </div>

                    {/* AI Insight Box - Refined */}
                    <div className="bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50 flex flex-col gap-2 max-w-3xl">
                        <div className="flex items-start gap-2">
                            <BrainCircuit className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                <span className="text-blue-600 font-extrabold mr-1">AI Ghi chú:</span>
                                {alert.aiReason}
                            </p>
                        </div>
                        {alert.aiAdvice && (
                            <div className="flex items-start gap-2 pl-5">
                                <p className="text-[11px] text-emerald-600 italic font-medium leading-relaxed border-l-2 border-emerald-200 pl-2">
                                    <span className="font-bold not-italic mr-1">Lời khuyên:</span>
                                    "{alert.aiAdvice}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Section */}
                <div className="md:w-32 flex flex-row md:flex-col gap-1.5 shrink-0">
                    <button
                        onClick={() => onFeedback(alert.id, "ACKNOWLEDGED")}
                        className="flex-1 items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm shadow-emerald-200 active:scale-95"
                    >
                        Tiếp nhận
                    </button>
                    <button
                        onClick={() => onFeedback(alert.id, "FALSE_POSITIVE")}
                        className="flex-1 items-center justify-center px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-lg hover:from-rose-600 hover:to-red-700 transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm shadow-red-200 active:scale-95"
                    >
                        Báo sai
                    </button>
                </div>
            </div>
        </div>
    );
}
