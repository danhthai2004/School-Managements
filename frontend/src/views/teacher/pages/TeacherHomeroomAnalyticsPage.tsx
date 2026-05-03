import { useState, useEffect } from "react";
import { learningAnalyticsService, type LearningAnalysisDto } from "../../../services/learningAnalyticsService";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";
import {
    Users,
    GraduationCap,
    TrendingUp,
    AlertTriangle,
    Search,
    Brain,
} from "lucide-react";
import StudentLearningProfileCard from "../../school-admin/components/StudentLearningProfileCard";

export default function TeacherHomeroomAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<LearningAnalysisDto[]>([]);
    const [search, setSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<LearningAnalysisDto | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await learningAnalyticsService.getHomeroomStudentsReports();
            setStudents(data);
        } catch (error) {
            console.error("Error loading homeroom analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredStudents = students.filter(s =>
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        totalStudents: students.length,
        totalAnalyzed: students.filter(s => s.predictedGpa !== null).length,
        totalExcellent: students.filter(s => s.predictedGpa && s.predictedGpa >= 8.0).length,
        totalAverage: students.filter(s => s.predictedGpa && s.predictedGpa >= 5.0 && s.predictedGpa < 6.5).length,
        totalWeak: students.filter(s => s.predictedGpa && s.predictedGpa < 5.0).length,
    };

    const chartData = students
        .filter(s => s.predictedGpa !== null || s.currentGpa !== null)
        .map(s => {
            const lastName = s.studentName.split(" ").pop() || s.studentName;
            return {
                name: lastName,
                fullName: s.studentName,
                "GPA Hiện tại": s.currentGpa || 0,
                "GPA Dự đoán": s.predictedGpa || 0,
            };
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1200px] mx-auto pb-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Users className="w-24 h-24 text-gray-900" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1 relative z-10 flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> Tổng số học sinh
                    </p>
                    <p className="text-3xl font-bold text-gray-900 relative z-10">{stats.totalStudents}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {stats.totalAnalyzed} HS đã được phân tích
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <GraduationCap className="w-24 h-24 text-emerald-600" />
                    </div>
                    <p className="text-sm text-emerald-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> HS Giỏi (GPA ≥8.0)
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 relative z-10">{stats.totalExcellent}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-amber-600 mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> HS Trung Bình
                    </p>
                    <p className="text-3xl font-bold text-amber-600 relative z-10">{stats.totalAverage}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 relative overflow-hidden group hover:shadow-md hover:border-red-200 transition-all">
                    <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 font-medium mb-1 relative z-10 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" /> HS Yếu (GPA &lt;5.0)
                    </p>
                    <p className="text-3xl font-bold text-red-600 relative z-10">{stats.totalWeak}</p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-500" />
                        So sánh GPA Hiện tại và Dự đoán của học sinh
                    </h3>
                    <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={chartData} barGap={0} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 11 }} 
                                stroke="#9ca3af" 
                                angle={-45} 
                                textAnchor="end" 
                                height={60} 
                            />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid #e5e7eb",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                }}
                                formatter={(value: any) => Number(value).toFixed(2)}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, marginTop: '20px' }} />
                            <Bar dataKey="GPA Hiện tại" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={20}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`current-${index}`}
                                        fill={entry["GPA Hiện tại"] >= 8 ? "#10b981" : entry["GPA Hiện tại"] >= 6.5 ? "#6366f1" : entry["GPA Hiện tại"] >= 5 ? "#f59e0b" : "#ef4444"}
                                    />
                                ))}
                            </Bar>
                            <Bar dataKey="GPA Dự đoán" fill="#a5b4fc" radius={[2, 2, 0, 0]} maxBarSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-semibold text-gray-900">Danh sách học sinh</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên học sinh..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="p-4 rounded-tl-2xl">Mã HS</th>
                                <th className="p-4">Họ và tên</th>
                                <th className="p-4 text-center">Đã phân tích</th>
                                <th className="p-4 text-center">GPA Hiện tại</th>
                                <th className="p-4 text-center">GPA Dự đoán</th>
                                <th className="p-4 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.map((s) => {
                                const hasAnalysis = s.predictedGpa !== null;
                                return (
                                    <tr
                                        key={s.studentId}
                                        onClick={() => hasAnalysis && setSelectedStudent(s)}
                                        className={`transition-colors ${hasAnalysis ? "hover:bg-indigo-50/50 cursor-pointer" : ""}`}
                                    >
                                        <td className="p-4 text-sm font-medium text-gray-900">{s.studentCode}</td>
                                        <td className="p-4 text-sm font-semibold text-gray-900">{s.studentName}</td>
                                        <td className="p-4 text-center">
                                            {hasAnalysis ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    Đã phân tích
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                    Chưa có
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center font-medium text-gray-600">
                                            {s.currentGpa ? s.currentGpa.toFixed(2) : "—"}
                                        </td>
                                        <td className={`p-4 text-center font-bold ${
                                            !s.predictedGpa ? "text-gray-400" :
                                            s.predictedGpa >= 8.0 ? "text-emerald-600" :
                                            s.predictedGpa >= 6.5 ? "text-blue-600" :
                                            s.predictedGpa >= 5.0 ? "text-amber-600" : "text-red-600"
                                        }`}>
                                            {s.predictedGpa ? s.predictedGpa.toFixed(2) : "—"}
                                        </td>
                                        <td className="p-4">
                                            {hasAnalysis ? (
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        s.predictedGpa! >= 8.0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                        s.predictedGpa! >= 6.5 ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                                        s.predictedGpa! >= 5.0 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                        "bg-red-50 text-red-700 border border-red-100"
                                                    }`}>
                                                        {s.predictedGpa! >= 8.0 ? "Giỏi" : s.predictedGpa! >= 6.5 ? "Khá" : s.predictedGpa! >= 5.0 ? "Trung Bình" : "Yếu"}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-center text-sm text-gray-400">—</div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Không tìm thấy học sinh nào
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-xl animate-fade-in-up">
                        <button 
                            onClick={() => setSelectedStudent(null)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-100"
                        >
                            ✕
                        </button>
                        <StudentLearningProfileCard studentId={selectedStudent.studentId} />
                    </div>
                </div>
            )}
        </div>
    );
}
