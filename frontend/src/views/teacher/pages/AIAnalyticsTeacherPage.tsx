import { useState, lazy, Suspense } from "react";
import { Sparkles, Shield, GraduationCap } from "lucide-react";

const ClassRiskContent = lazy(() => import("./ClassRiskManagementPage"));
const LearningAnalyticsContent = lazy(() => import("./TeacherHomeroomAnalyticsPage"));

type Tab = "risk" | "learning";

export default function AIAnalyticsTeacherPage() {
    const [activeTab, setActiveTab] = useState<Tab>("risk");

    return (
        <div className="space-y-6">
            {/* Page Title + Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Phân tích Học tập</h1>
                        <p className="text-sm text-gray-500">Cảnh báo rủi ro và phân tích chất lượng học tập của lớp</p>
                    </div>
                </div>

                <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab("risk")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "risk" ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"}`}
                    >
                        <Shield className="w-4 h-4" /> Cảnh báo Rủi ro
                    </button>
                    <button
                        onClick={() => setActiveTab("learning")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "learning" ? "bg-white shadow-sm text-indigo-700 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"}`}
                    >
                        <GraduationCap className="w-4 h-4" /> Cố vấn Học tập
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <div className="animate-fade-in-up">
                    {activeTab === "risk" && <ClassRiskContent />}
                    {activeTab === "learning" && <LearningAnalyticsContent />}
                </div>
            </Suspense>
        </div>
    );
}
