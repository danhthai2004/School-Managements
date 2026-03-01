import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../../services/api";
import { Download, AlertCircle, Users, X, BookOpen, Trash2 } from "lucide-react";
import { schoolAdminService, type ClassRoomDto, type SubjectDto } from "../../../services/schoolAdminService";

interface TimetableDetail {
    id: string;
    classRoomId: string;
    className: string;
    classGrade: number; // Updated backend DTO
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    dayOfWeek: string;
    slotIndex: number;
    isFixed: boolean;
}

const SLOTS = [1, 2, 3, 4, 5];
const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ENGLISH_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

type CellDisplayData = TimetableDetail & { isCommon?: boolean; isMixed?: boolean; label?: string };

type ViewMode = 'CLASS' | 'GLOBAL';

export default function TimetableDetailView() {
    const { id } = useParams();

    // Data State
    // Data State
    const [details, setDetails] = useState<TimetableDetail[]>([]);
    const [classesList, setClassesList] = useState<ClassRoomDto[]>([]);
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [teachers, setTeachers] = useState<{ id: string; fullName: string; teacherCode: string }[]>([]);
    const [timetableName, setTimetableName] = useState<string>("");
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('CLASS');
    
    // Class Mode State
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    // Global Mode State
    const [selectedGrades, setSelectedGrades] = useState<number[]>([10, 11, 12]);

    // Edit State
    const [editingSlot, setEditingSlot] = useState<{ day: string; slot: number; currentSubjectId?: string; currentTeacherId?: string } | null>(null);
    const [editSubjectId, setEditSubjectId] = useState<string>("");
    const [editTeacherId, setEditTeacherId] = useState<string>("");

    useEffect(() => {
        fetchInitialData();
    }, []);

/**
     * Initial data fetch
     */
    const fetchInitialData = async () => {
        try {
            const [classes, subj, teach] = await Promise.all([
                schoolAdminService.listClasses(),
                schoolAdminService.listSubjects(),
                schoolAdminService.listTeacherProfiles()
            ]);
            setClassesList(classes);
            setSubjects(subj.filter(s => s.active));
            setTeachers(teach);
            
            // Default selected class
            if (classes.length > 0) setSelectedClassId(classes[0].id);
        } catch (err) {
            console.error("Failed to load initial data", err);
            setErrorMessage("Không thể tải dữ liệu ban đầu. Vui lòng thử lại.");
        } finally {
             setIsLoading(false);
        }
    };

    const fetchDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const params: Record<string, string> = {};
            
            // Optimize fetch based on Mode
            if (viewMode === 'CLASS') {
                if (!selectedClassId) {
                    setIsLoading(false);
                    return;
                }
                 // Get class name to filter (API uses className currently, ideally should use ID)
                 const cls = classesList.find(c => c.id === selectedClassId);
                 if (cls) params.className = cls.name;
            } else {
                // Global Mode - Fetch all to compute summary? Or filter by grades?
                // API supports 'grade' params but single integer. 
                // We'll leave filters empty to fetch ALL and client-side filter for Global View summary
            }

            const [detailsRes, infoRes] = await Promise.all([
                api.get(`/school-admin/timetables/${id}/details`, { params }),
                api.get(`/school-admin/timetables/${id}`)
            ]);
            
            setDetails(detailsRes.data);
            setTimetableName(infoRes.data.name);
        } catch {
            setErrorMessage("Không thể tải dữ liệu thời khóa biểu.");
        } finally {
            setIsLoading(false);
        }
    }, [id, viewMode, selectedClassId, classesList]);

    useEffect(() => {
        if (id) fetchDetails();
    }, [id, viewMode, selectedClassId, selectedGrades, fetchDetails]);

    const handleCellClick = (dayIndex: number, slot: number, currentDetail?: CellDisplayData) => {
        const day = ENGLISH_DAYS[dayIndex];
        setEditingSlot({
            day,
            slot,
            currentSubjectId: currentDetail?.subjectId,
            currentTeacherId: currentDetail?.teacherId
        });
        setEditSubjectId(currentDetail?.subjectId || "");
        setEditTeacherId(currentDetail?.teacherId || "");
    };

    const handleSaveSlot = async () => {
        if (!editingSlot || !id) return;

        try {
            if (viewMode === 'CLASS') {
                if (!selectedClassId) return;
                await schoolAdminService.updateClassSlot(id, {
                    classRoomId: selectedClassId,
                    dayOfWeek: editingSlot.day,
                    slotIndex: editingSlot.slot,
                    subjectId: editSubjectId || null,
                    teacherId: editTeacherId || null
                });
            } else {
                // Global Mode
                await schoolAdminService.updateGlobalSlot(id, {
                    dayOfWeek: editingSlot.day,
                    slotIndex: editingSlot.slot,
                    subjectId: editSubjectId, // Required for global
                    grades: selectedGrades
                });
            }
            // Close and Refetch
            setEditingSlot(null);
            fetchDetails();
        } catch {
            alert("Lỗi khi lưu thay đổi");
        }
    };

    const handleDeleteSlot = async () => {
        if (!editingSlot || !id) return;
        try {
            if (viewMode === 'CLASS') {
                if (!selectedClassId) return;
                await schoolAdminService.updateClassSlot(id, {
                    classRoomId: selectedClassId,
                    dayOfWeek: editingSlot.day,
                    slotIndex: editingSlot.slot,
                    subjectId: null,
                    teacherId: null
                });
            } else {
                await schoolAdminService.updateGlobalSlot(id, {
                    dayOfWeek: editingSlot.day,
                    slotIndex: editingSlot.slot,
                    subjectId: null,
                    grades: selectedGrades
                });
            }
            setEditingSlot(null);
            fetchDetails();
        } catch {
            alert("Lỗi khi xóa tiết học");
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get(`/school-admin/timetables/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${timetableName || 'timetable'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            setErrorMessage("Lỗi khi xuất file Excel");
        }
    };

    /**
     * Helper to get display data for a cell
     */
    const getCellDisplay = (dayIndex: number, slot: number): CellDisplayData | null | undefined => {
        const day = ENGLISH_DAYS[dayIndex];

        if (viewMode === 'CLASS') {
            const cls = classesList.find(c => c.id === selectedClassId);
            if (!cls) return null;
            return details.find(d => d.className === cls.name && d.dayOfWeek === day && d.slotIndex === slot);
        } else {
            // Global Mode: Check commonality across all classes in selected grades
            // Optimize: Use local filtering on details which now have classGrade
            const targetGradeDetails = details.filter(d => selectedGrades.includes(d.classGrade) && d.dayOfWeek === day && d.slotIndex === slot);
            
            // We still need to know HOW MANY classes are in these grades to know if "All have same"
            // Filter classesList for count
            const targetClassesCount = classesList.filter(c => selectedGrades.includes(c.grade)).length;
            
            if (targetClassesCount === 0) return null;
            if (targetGradeDetails.length === 0) return null; // No one has class
            
            // Check if all target classes have the SAME subject here
            // Map className to Subject
            // Count subjects
            const subjectCounts = new Map<string, number>();
            let coveredCount = 0;

            targetGradeDetails.forEach(det => {
                 subjectCounts.set(det.subjectName, (subjectCounts.get(det.subjectName) || 0) + 1);
                 coveredCount++;
            });

            if (coveredCount === 0) return null; // Empty for all
            
            // If every class has a slot here, and they are all the SAME subject
            if (subjectCounts.size === 1 && coveredCount === targetClassesCount) {
                 // All have same
                 const detail = targetGradeDetails[0];
                 return { ...detail, isCommon: true } as CellDisplayData;
            }
            
            return { isMixed: true, label: "Khác nhau" } as unknown as CellDisplayData;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* UI Feedback */}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="ml-auto hover:text-red-900" title="Đóng thông báo"><X size={16}/></button>
                </div>
            )}
            
            {isLoading && (
                 <div className="text-center py-4 bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-2 text-slate-500">Đang tải dữ liệu...</p>
                 </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chi tiết Thời Khóa Biểu</h1>
                    <div className="flex items-center gap-2 mt-1">
                        {timetableName && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                {timetableName}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('CLASS')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'CLASS' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Theo Lớp
                    </button>
                    <button 
                        onClick={() => setViewMode('GLOBAL')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'GLOBAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Thiết Lập Chung
                    </button>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Download size={18} />
                    <span>Xuất Excel</span>
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
                {viewMode === 'CLASS' ? (
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <BookOpen size={20} />
                         </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">CHỌN LỚP HỌC</label>
                            <select 
                                value={selectedClassId} 
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                title="Chọn lớp học"
                                className="min-w-[200px] bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                            >
                                {classesList.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (K{c.grade})</option>
                                ))}
                            </select>
                         </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Users size={20} />
                         </div>
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">ÁP DỤNG CHO KHỐI</label>
                             <div className="flex gap-4">
                                {[10, 11, 12].map(g => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedGrades.includes(g)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedGrades([...selectedGrades, g]);
                                                else setSelectedGrades(selectedGrades.filter(x => x !== g));
                                            }}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Khối {g}</span>
                                    </label>
                                ))}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 bg-slate-50 border-b border-r border-slate-200 w-16 text-center text-slate-500 font-semibold">Tiết</th>
                            {DAYS.map(day => (
                                <th key={day} className="p-3 bg-slate-50 border-b border-r border-slate-200 text-center text-slate-700 font-bold min-w-[140px]">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {SLOTS.map(slot => (
                            <tr key={slot} className="divide-x divide-slate-100">
                                <td className="p-3 bg-slate-50 border-b border-slate-200 text-center font-bold text-slate-500">{slot}</td>
                                {DAYS.map((_day, dayIndex) => {
                                    const cellData = getCellDisplay(dayIndex, slot);
                                    let cellContent = null;
                                    let cellClass = "hover:bg-blue-50 cursor-pointer transition-colors";

                                    if (cellData?.isMixed) {
                                         cellContent = (
                                            <div className="flex flex-col items-center justify-center p-2 text-slate-400 italic">
                                                <span>Khác nhau</span>
                                            </div>
                                         );
                                         cellClass += " bg-slate-50/50";
                                    } else if (cellData) {
                                        cellContent = (
                                            <div className="flex flex-col items-center justify-center p-2 h-full">
                                                <span className="font-bold text-blue-700 text-center text-sm">{cellData.subjectName}</span>
                                                {cellData.teacherName && (
                                                    <span className="text-xs text-slate-500 mt-1">{cellData.teacherName}</span>
                                                )}
                                                {cellData.isFixed && (
                                                     <span className="mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">
                                                        Cố định
                                                     </span>
                                                )}
                                            </div>
                                        );
                                         if (cellData.isFixed) cellClass += " bg-slate-50";
                                    } else if (viewMode === 'GLOBAL') {
                                        cellContent = (
                                            <div className="flex flex-col items-center justify-center p-2 text-slate-300 italic text-xs">
                                                <span>Hiện không có lớp</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <td 
                                            key={dayIndex} 
                                            onClick={() => handleCellClick(dayIndex, slot, cellData ?? undefined)}
                                            className={`border-b border-slate-200 h-24 p-0 align-top ${cellClass}`}
                                        >
                                            {cellContent}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">
                                {viewMode === 'CLASS' ? 'Chỉnh sửa tiết học' : 'Thiết lập chung'}
                            </h3>
                            <button onClick={() => setEditingSlot(null)} className="text-gray-400 hover:text-gray-600" title="Đóng">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                <div>
                                    <span className="font-semibold block text-xs uppercase tracking-wide text-slate-400">Thứ</span>
                                    <span className="font-medium text-slate-800">{editingSlot.day}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block text-xs uppercase tracking-wide text-slate-400">Tiết</span>
                                    <span className="font-medium text-slate-800">{editingSlot.slot}</span>
                                </div>
                                {viewMode === 'CLASS' && (
                                    <div>
                                         <span className="font-semibold block text-xs uppercase tracking-wide text-slate-400">Lớp</span>
                                         <span className="font-medium text-slate-800">{classesList.find(c => c.id === selectedClassId)?.name}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                                <select 
                                    value={editSubjectId} 
                                    onChange={(e) => setEditSubjectId(e.target.value)}
                                    title="Chọn môn học"
                                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="">-- Chọn môn học --</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>

                            {viewMode === 'CLASS' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên (Tùy chọn)</label>
                                    <select 
                                        value={editTeacherId} 
                                        onChange={(e) => setEditTeacherId(e.target.value)}
                                        title="Chọn giáo viên"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="">-- Tự động / Không chọn --</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.fullName} ({t.teacherCode})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                             {viewMode === 'GLOBAL' && (
                                <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>Thay đổi này sẽ áp dụng cho tất cả các lớp thuộc Khối {selectedGrades.join(", ")}. Các tiết học cũ tại vị trí này sẽ bị ghi đè.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={handleDeleteSlot}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors flex items-center gap-1.5"
                                title="Xóa tiết học"
                            >
                                <Trash2 size={16} />
                                Xóa
                            </button>
                            <div className="flex-1" />
                            <button 
                                onClick={() => setEditingSlot(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSaveSlot}
                                disabled={!editSubjectId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
