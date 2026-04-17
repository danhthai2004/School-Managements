import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { Download, AlertCircle, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { FilterIcon } from "../../../components/layout/SystemIcons";
import { schoolAdminService, type ClassRoomDto } from "../../../services/schoolAdminService";

interface TimetableDetail {
    id: string;
    classRoomId: string;
    className: string;
    subjectName: string;
    teacherName: string;
    dayOfWeek: string;
    slotIndex: number;
}

// Morning: 1-5, Afternoon: 6-9
const MORNING_SLOTS = [1, 2, 3, 4, 5];
const AFTERNOON_SLOTS = [6, 7, 8, 9, 10];

export default function TimetableDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [details, setDetails] = useState<TimetableDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timetableName, setTimetableName] = useState<string>("");
    const [gradeFilter, setGradeFilter] = useState<string>("ALL");
    const [classSearch, setClassSearch] = useState<string>(""); // Use this as class NAME filter

    // Classes for dropdown
    const [classesList, setClassesList] = useState<ClassRoomDto[]>([]);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const data = await schoolAdminService.listClasses();
            setClassesList(data);
        } catch (err) {
            console.error("Failed to fetch classes", err);
        }
    };


    useEffect(() => {
        if (id) fetchDetails();
    }, [id, gradeFilter, classSearch]);


    const fetchDetails = async () => {
        try {
            const params: any = {};
            if (gradeFilter !== "ALL") params.grade = gradeFilter;
            if (classSearch) params.className = classSearch;

            // Also fetch timetable info to get the name
            const [detailsRes, infoRes] = await Promise.all([
                api.get(`/school-admin/timetables/${id}/details`, { params }),
                api.get(`/school-admin/timetables/${id}`)
            ]);
            setDetails(detailsRes.data);
            setTimetableName(infoRes.data.name);
        } catch (err) {
            setError("Không thể tải dữ liệu thời khóa biểu. Vui lòng kiểm tra kết nối và thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params: any = {};
            if (gradeFilter !== "ALL") params.grade = gradeFilter;
            if (classSearch) params.className = classSearch;

            const response = await api.get(`/school-admin/timetables/${id}/export`, {
                params,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${timetableName || 'timetable'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            setError("Lỗi khi xuất file Excel");
        }
    };

    const getTeacherLastName = (fullName: string | null) => {
        if (!fullName) return "-";
        const parts = fullName.split(" ");
        return parts[parts.length - 1];
    };

    // Group by Class
    const classes = Array.from(new Set(details.map(d => d.className))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Days Mapping
    const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const ENGLISH_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    const getCell = (className: string, day: string, slot: number) => {
        // Robust mapping using index
        const dayIndex = DAYS.indexOf(day);
        if (dayIndex === -1) return undefined;

        const originalDayName = ENGLISH_DAYS[dayIndex];

        return details.find(d => d.className === className && d.dayOfWeek === originalDayName && d.slotIndex === slot);
    };

    const filteredClasses = classesList
        .filter(c => gradeFilter === "ALL" || c.grade.toString() === gradeFilter)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/school-admin/schedule')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Chi tiết Thời Khóa Biểu</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500 text-sm">Xem và quản lý thời khóa biểu chi tiết</span>
                            {timetableName && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                    {timetableName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/school-admin/schedule/${id}/adjust`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                        <SlidersHorizontal size={18} />
                        <span>Tinh chỉnh</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                        <Download size={18} />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <FilterIcon className="text-slate-400" size={18} />
                        Bộ lọc:
                    </div>

                    <select
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={gradeFilter}
                        onChange={(e) => {
                            setGradeFilter(e.target.value);
                            setClassSearch(""); // Reset class when grade changes
                        }}
                    >
                        <option value="ALL">Tất cả các khối</option>
                        <option value="10">Khối 10</option>
                        <option value="11">Khối 11</option>
                        <option value="12">Khối 12</option>
                    </select>

                    <div className="relative">
                        <select
                            value={classSearch}
                            onChange={(e) => setClassSearch(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-w-[200px]"
                        >
                            <option value="">-- Tất cả lớp --</option>
                            {filteredClasses.map(c => (
                                <option key={c.id} value={c.name}>{c.name} (Khối {c.grade})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Đang tải dữ liệu...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="p-4 border-r border-gray-100 text-center font-semibold text-slate-700 min-w-[100px] sticky left-0 bg-white z-20">
                                        Lớp
                                    </th>
                                    <th className="p-2 border-r border-gray-100 text-center font-semibold text-slate-700 w-[60px] sticky left-[100px] bg-white z-20">
                                        Tiết
                                    </th>
                                    {DAYS.map(day => (
                                        <th key={day} className="p-2 border-r border-gray-100 text-center font-medium text-blue-600 bg-white min-w-[140px]">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {classes.map((cls) => (
                                    <>
                                        {/* Morning session header */}
                                        <tr key={`${cls}-morning-header`} className="bg-white border-b border-gray-100">
                                            <td className="p-2 font-bold text-slate-900 sticky left-0 bg-white border-r border-gray-100 align-middle text-center z-10" rowSpan={MORNING_SLOTS.length + 1}>
                                                {cls}
                                            </td>
                                            <td colSpan={DAYS.length + 1} className="p-1 text-center text-xs font-semibold text-blue-600 bg-white">
                                                BUỔI SÁNG
                                            </td>
                                        </tr>
                                        {MORNING_SLOTS.map((slot: number) => (
                                            <tr key={`${cls}-${slot}`} className={`border-b border-gray-100 hover:bg-slate-50/50 transition-colors ${slot === 5 ? 'border-b-2 border-gray-200' : ''}`}>
                                                {/* Slot Number */}
                                                <td className="p-2 text-center text-xs font-semibold text-slate-500 border-r border-gray-100 bg-white sticky left-[100px] z-10">
                                                    T{slot}
                                                </td>

                                                {/* Days Columns */}
                                                {DAYS.map(day => {
                                                    const lesson = getCell(cls, day, slot);
                                                    return (
                                                        <td key={`${day}-${slot}`} className="p-1 h-[50px] border-r border-gray-100 text-xs align-middle">
                                                            <div className="flex flex-col justify-center items-center h-full w-full">
                                                                {lesson ? (
                                                                    <>
                                                                        <span className="font-semibold text-slate-800 text-center">{lesson.subjectName}</span>
                                                                        <span className="text-[10px] text-slate-500 truncate w-full px-1 text-center" title={lesson.teacherName || "Chưa phân công"}>
                                                                            {getTeacherLastName(lesson.teacherName)}
                                                                        </span>
                                                                    </>
                                                                ) : <span className="text-slate-200">-</span>}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}

                                        {/* Afternoon session header */}
                                        <tr key={`${cls}-afternoon-header`} className="bg-white border-b border-gray-100">
                                            <td className="p-2 font-bold text-slate-900 sticky left-0 bg-white border-r border-gray-100 align-middle text-center z-10" rowSpan={AFTERNOON_SLOTS.length + 1}>

                                            </td>
                                            <td colSpan={DAYS.length + 1} className="p-1 text-center text-xs font-semibold text-blue-600 bg-white">
                                                BUỔI CHIỀU
                                            </td>
                                        </tr>
                                        {AFTERNOON_SLOTS.map((slot: number) => (
                                            <tr key={`${cls}-${slot}`} className={`border-b border-gray-100 hover:bg-slate-50/50 transition-colors ${slot === 9 ? 'border-b-4 border-gray-200' : ''}`}>
                                                {/* Slot Number */}
                                                <td className="p-2 text-center text-xs font-semibold text-slate-500 border-r border-gray-100 bg-white sticky left-[100px] z-10">
                                                    T{slot}
                                                </td>

                                                {/* Days Columns */}
                                                {DAYS.map(day => {
                                                    const lesson = getCell(cls, day, slot);
                                                    return (
                                                        <td key={`${day}-${slot}`} className="p-1 h-[50px] border-r border-gray-100 text-xs align-middle">
                                                            <div className="flex flex-col justify-center items-center h-full w-full">
                                                                {lesson ? (
                                                                    <>
                                                                        <span className="font-semibold text-slate-800 text-center">{lesson.subjectName}</span>
                                                                        <span className="text-[10px] text-slate-500 truncate w-full px-1 text-center" title={lesson.teacherName || "Chưa phân công"}>
                                                                            {getTeacherLastName(lesson.teacherName)}
                                                                        </span>
                                                                    </>
                                                                ) : <span className="text-slate-200">-</span>}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
