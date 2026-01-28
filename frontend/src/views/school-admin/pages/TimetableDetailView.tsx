import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { Download, Search, AlertCircle } from "lucide-react";

interface TimetableDetail {
    id: string;
    classRoomId: string;
    className: string;
    subjectName: string;
    teacherName: string;
    dayOfWeek: string;
    slotIndex: number;
}

const SLOTS = [1, 2, 3, 4, 5];

export default function TimetableDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState<TimetableDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timetableName, setTimetableName] = useState<string>("");

    useEffect(() => {
        if (id) fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            // Also fetch timetable info to get the name
            const [detailsRes, infoRes] = await Promise.all([
                api.get(`/school-admin/timetables/${id}/details`),
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

    const getTeacherLastName = (fullName: string | null) => {
        if (!fullName) return "-";
        const parts = fullName.split(" ");
        return parts[parts.length - 1];
    };

    // Group by Class
    const classes = Array.from(new Set(details.map(d => d.className))).sort();

    // Days Mapping
    const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const ENGLISH_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    const getCell = (className: string, day: string, slot: number) => {
        // Robust mapping using index
        const dayIndex = DAYS.indexOf(day);
        if (dayIndex === -1) return undefined;

        const originalDayName = ENGLISH_DAYS[dayIndex];

        return details.find(d => d.className === className && d.dayOfWeek === originalDayName && d.slotIndex === slot);
    };



    // ... inside getCell removed from here

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
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
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Quay lại
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all">
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex gap-4">
                    <div className="w-64">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lọc theo Khối</label>
                        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-slate-700 font-medium">
                            <option value="ALL">Tất cả các khối</option>
                            <option value="10">Khối 10</option>
                            <option value="11">Khối 11</option>
                            <option value="12">Khối 12</option>
                        </select>
                    </div>
                    <div className="w-64">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tìm kiếm lớp</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Nhập tên lớp..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-slate-700 placeholder-slate-400"
                            />
                        </div>
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
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 border-r border-slate-200 text-center font-semibold text-slate-700 min-w-[100px] border-b border-slate-200 sticky left-0 bg-slate-50 z-20">
                                        Lớp
                                    </th>
                                    <th className="p-2 border-r border-slate-200 text-center font-semibold text-slate-700 w-[60px] sticky left-[100px] bg-slate-50 z-20">
                                        Tiết
                                    </th>
                                    {DAYS.map(day => (
                                        <th key={day} className="p-2 border-r border-slate-200 text-center font-semibold text-blue-700 bg-blue-50/50 min-w-[140px]">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {classes.map((cls) => (
                                    SLOTS.map((slot, slotIdx) => (
                                        <tr key={`${cls}-${slot}`} className={`border-b border-slate-100 hover:bg-slate-50 ${slot === 5 ? 'border-b-2 border-slate-200' : ''}`}>
                                            {/* Render Class Name only for the first slot */}
                                            {slotIdx === 0 && (
                                                <td
                                                    rowSpan={SLOTS.length}
                                                    className="p-3 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] align-middle text-center z-10"
                                                >
                                                    {cls}
                                                </td>
                                            )}

                                            {/* Slot Number */}
                                            <td className="p-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-[100px] z-10">
                                                T{slot}
                                            </td>

                                            {/* Days Columns */}
                                            {DAYS.map(day => {
                                                const lesson = getCell(cls, day, slot);
                                                return (
                                                    <td key={`${day}-${slot}`} className="p-1 h-[60px] border-r border-slate-100 text-xs align-middle">
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
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

