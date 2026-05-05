import React, { useState, useEffect, useMemo } from "react";
import { Trophy, History, BookOpen, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useConfirmation } from "../../../hooks/useConfirmation";
import { adminGradeService } from "../../../services/adminGradeService";
import type { GradingConfigDto, GradeEntryStatusDto, GradeHistoryDto, StudentRankingDto } from "../../../services/adminGradeService";
import { schoolAdminService } from "../../../services/schoolAdminService";
import type { SemesterDto, ClassRoomDto, SubjectDto } from "../../../services/schoolAdminService";
import AdminGradeBookTab from "../components/AdminGradeBookTab";
import { vietnameseNameSort } from "../../../utils/sortUtils";
import GradeStatusTab from "../components/grade/GradeStatusTab";
import GradeRankingTab from "../components/grade/GradeRankingTab";
import GradeHistoryTab from "../components/grade/GradeHistoryTab";
import GradeConfigTab from "../components/grade/GradeConfigTab";

export default function GradeManagementPage() {
    const [activeTab, setActiveTab] = useState<"status" | "history" | "ranking" | "book" | "config">("status");
    const [semesters, setSemesters] = useState<SemesterDto[]>([]);
    const [classes, setClasses] = useState<ClassRoomDto[]>([]);
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    // Data states
    const [config, setConfig] = useState<GradingConfigDto | null>(null);
    const [statusData, setStatusData] = useState<GradeEntryStatusDto | null>(null);
    const [historyData, setHistoryData] = useState<GradeHistoryDto[]>([]);
    const [rankings, setRankings] = useState<StudentRankingDto[]>([]);

    const sortedRankings = useMemo(() => {
        if (!rankings || rankings.length === 0) return [];

        const hasRankData = rankings.some(r => r.rankInClass !== null && r.rankInClass !== undefined);

        if (hasRankData) {
            // Sort by Rank (Ascending)
            return [...rankings].sort((a, b) => {
                const rankA = a.rankInClass ?? 9999;
                const rankB = b.rankInClass ?? 9999;
                return rankA - rankB;
            });
        } else {
            // Sort by Name
            return [...rankings].sort((a, b) => vietnameseNameSort(a.fullName, b.fullName));
        }
    }, [rankings]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchTabContent();
        }
    }, [activeTab, selectedSemester, selectedClass]);

    const loadInitialData = async () => {
        try {
            const [semestersRes, classesRes, subjectsRes] = await Promise.all([
                schoolAdminService.listSemesters(),
                schoolAdminService.listClasses(),
                schoolAdminService.listSubjects()
            ]);
            setSemesters(semestersRes);
            setClasses(classesRes);
            setSubjects(subjectsRes);

            const activeSem = semestersRes.find(s => s.status === 'ACTIVE');
            if (activeSem) {
                setSelectedSemester(activeSem.id);
            } else if (semestersRes.length > 0) {
                setSelectedSemester(semestersRes[0].id);
            }
        } catch (error) {
            toast.error("Không thể tải dữ liệu khởi tạo");
        }
    };

    const fetchTabContent = async () => {
        setIsLoading(true);
        try {
            if (activeTab === "config") {
                const conf = await adminGradeService.getConfig();
                setConfig(conf);
            } else if (activeTab === "status") {
                const st = await adminGradeService.getEntryStatus(selectedSemester);
                setStatusData(st);
            } else if (activeTab === "history") {
                const hist = await adminGradeService.getHistory(0, 100, selectedSemester, selectedClass || undefined);
                setHistoryData(hist.content || []);
            } else if (activeTab === "ranking") {
                if (selectedClass) {
                    const rnk = await adminGradeService.getRankings(selectedClass, selectedSemester);
                    setRankings(rnk);
                } else {
                    setRankings([]);
                }
            }
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        try {
            await adminGradeService.updateConfig(config);
            toast.success("Cập nhật cấu hình thành công");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Lỗi khi cập nhật");
        }
    };

    const { confirm, ConfirmationDialog } = useConfirmation();

    const handleToggleLock = (classId: string, isLocked: boolean) => {
        if (isLocked) {
            confirm({
                title: "Mở khóa nhập điểm",
                message: "Bạn có chắc chắn muốn mở khóa nhập điểm cho lớp này?",
                variant: 'success',
                onConfirm: async () => {
                    await adminGradeService.unlockClass(classId, selectedSemester);
                    toast.success("Đã mở khóa nhập điểm");
                    fetchTabContent();
                }
            });
        } else {
            confirm({
                title: "Khóa nhập điểm",
                message: (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">Vui lòng nhập lý do khóa nhập điểm cho lớp này:</p>
                        <textarea
                            id="lock-reason-input"
                            autoFocus
                            placeholder="VD: Đã hết hạn nhập điểm hoặc cần kiểm tra lại..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none min-h-[80px] resize-none"
                            onChange={(e) => {
                                (window as any)._lockReason = e.target.value;
                            }}
                        />
                    </div>
                ),
                variant: 'warning',
                confirmText: "Khóa điểm",
                onConfirm: async () => {
                    const reason = (window as any)._lockReason || "";
                    if (!reason.trim()) {
                        toast.error("Vui lòng nhập lý do khóa điểm");
                        throw new Error("Reason required");
                    }
                    await adminGradeService.lockClass(classId, selectedSemester, reason);
                    toast.success("Đã khóa nhập điểm");
                    fetchTabContent();
                }
            });
        }
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-lg font-semibold text-gray-900">Quản lý Điểm & Xếp hạng</h1>
                    <p className="text-sm text-slate-500 mt-1">Giám sát tiến độ nhập điểm, lịch sử sửa điểm và xếp loại học sinh</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-100 rounded-xl">
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[180px]"
                    >
                        <option value="">Chọn học kỳ...</option>
                        {semesters.map(s => (
                            <option key={s.id} value={s.id}>{s.academicYearName} - Kỳ {s.semesterNumber}</option>
                        ))}
                    </select>

                    {(activeTab === "history" || activeTab === "ranking" || activeTab === "book") && (
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[180px]"
                        >
                            <option value="">Chọn lớp học...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: "status", label: "Trạng thái Nhập liệu", icon: <CheckCircle2 size={18} /> },
                    { id: "book", label: "Sổ điểm chi tiết", icon: <BookOpen size={18} /> },
                    { id: "history", label: "Lịch sử Sửa điểm", icon: <History size={18} /> },
                    { id: "ranking", label: "Xếp hạng", icon: <Trophy size={18} /> },
                    { id: "config", label: "Cấu hình Trọng số", icon: <Settings size={18} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                {isLoading ? (
                    <div className="p-6 space-y-6 animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200"></div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg w-full"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tab: Status */}
                        {activeTab === "status" && statusData && (
                            <GradeStatusTab 
                                statusData={statusData}
                                expandedClassId={expandedClassId}
                                setExpandedClassId={setExpandedClassId}
                                handleToggleLock={handleToggleLock}
                            />
                        )}

                        {activeTab === "history" && (
                            <GradeHistoryTab historyData={historyData} />
                        )}

                        {activeTab === "ranking" && (
                            <GradeRankingTab 
                                rankings={sortedRankings}
                                selectedClass={selectedClass}
                            />
                        )}

                        {activeTab === "book" && (
                            <AdminGradeBookTab 
                                classId={selectedClass}
                                semesterId={selectedSemester}
                                subjects={subjects}
                            />
                        )}

                        {activeTab === "config" && config && (
                            <GradeConfigTab 
                                config={config}
                                onSubmit={handleUpdateConfig}
                                onConfigChange={(field, value) => setConfig({ ...config, [field]: parseFloat(value) || 0 })}
                            />
                        )}
                    </>
                )}
            </div>

            <ConfirmationDialog />
        </div>
    );
}
