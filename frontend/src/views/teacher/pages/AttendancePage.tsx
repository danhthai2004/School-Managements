import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import DatePicker from "react-datepicker";
import { format, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { teacherService } from "../../../services/teacherService";
import type { TeacherProfile, TimetableDetail } from "../../../services/teacherService";
import AttendanceMarkingView from "../components/attendance/AttendanceMarkingView";
import DailySummaryView from "../components/attendance/DailySummaryView";
import AttendanceReportView from "../components/attendance/AttendanceReportView";
import { CalendarIcon, StudentIcon } from "../TeacherIcons";

type ContextType = {
    teacherProfile: TeacherProfile | null;
};

type HomeroomSubTab = "DAILY" | "WEEKLY" | "MONTHLY";

export default function AttendancePage() {
    const { teacherProfile } = useOutletContext<ContextType>();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'TEACHING' | 'HOMEROOM'>('TEACHING');
    const [homeroomSubTab, setHomeroomSubTab] = useState<HomeroomSubTab>("DAILY");
    const [timetable, setTimetable] = useState<TimetableDetail[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    const [selectedSlot, setSelectedSlot] = useState<{
        slotIndex: number;
        subjectName: string;
        className: string;
        startTime?: string;
    } | null>(null);

    // Initial load of weekly schedule to determine teaching slots
    useState(() => {
        loadSchedule();
    });

    async function loadSchedule() {
        try {
            setLoadingSchedule(true);
            const data = await teacherService.getWeeklySchedule();
            setTimetable(data);
        } catch (error) {
            console.error("Failed to load schedule", error);
        } finally {
            setLoadingSchedule(false);
        }
    }

    // Filter slots for selected date
    const getSlotsForDate = (date: Date) => {
        const dayIndex = getDay(date); // 0 = Sunday, 1 = Monday...
        // API returns DayOfWeek enum names: MONDAY, TUESDAY...
        const dayMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const dayName = dayMap[dayIndex];

        return timetable.filter(t => t.dayOfWeek === dayName).sort((a, b) => a.slotIndex - b.slotIndex);
    };

    const slotsToday = getSlotsForDate(selectedDate);

    const subTabItems: { key: HomeroomSubTab; label: string }[] = [
        { key: "DAILY", label: "Theo ngày" },
        { key: "WEEKLY", label: "Theo tuần" },
        { key: "MONTHLY", label: "Theo tháng" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý điểm danh</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {format(selectedDate, "'Ngày' dd 'tháng' MM 'năm' yyyy", { locale: vi })}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => date && setSelectedDate(date)}
                            dateFormat={
                                activeTab === 'HOMEROOM' && homeroomSubTab === 'MONTHLY'
                                    ? "MM/yyyy"
                                    : "dd/MM/yyyy"
                            }
                            showMonthYearPicker={activeTab === 'HOMEROOM' && homeroomSubTab === 'MONTHLY'}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            locale={vi}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <CalendarIcon />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            {teacherProfile?.isHomeroomTeacher && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('TEACHING')}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${activeTab === 'TEACHING'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <CalendarIcon />
                            Lịch dạy của tôi
                        </button>
                        <button
                            onClick={() => setActiveTab('HOMEROOM')}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${activeTab === 'HOMEROOM'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <StudentIcon />
                            Tổng hợp chủ nhiệm ({teacherProfile.homeroomClassName})
                        </button>
                    </nav>
                </div>
            )}

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'TEACHING' ? (
                    selectedSlot ? (
                        <AttendanceMarkingView
                            date={selectedDate}
                            slotIndex={selectedSlot.slotIndex}
                            subjectName={selectedSlot.subjectName}
                            className={selectedSlot.className}
                            slotStartTime={selectedSlot.startTime}
                            onClose={() => setSelectedSlot(null)}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Các tiết dạy trong ngày</h2>

                            {loadingSchedule ? (
                                <div className="text-center py-8">Đang tải lịch dạy...</div>
                            ) : slotsToday.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {slotsToday.map(slot => (
                                        <button
                                            key={slot.id}
                                            onClick={() => setSelectedSlot({
                                                slotIndex: slot.slotIndex,
                                                subjectName: slot.subjectName,
                                                className: slot.className,
                                                startTime: slot.startTime
                                            })}
                                            className="flex flex-col p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left bg-gray-50 hover:bg-white group"
                                        >
                                            <div className="flex justify-between items-start w-full mb-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                    Tiết {slot.slotIndex}
                                                </span>
                                                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    →
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-lg mb-1">{slot.className}</h3>
                                            <p className="text-gray-600 text-sm">{slot.subjectName}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p>Không có tiết dạy nào vào ngày này.</p>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    // HOMEROOM VIEW
                    <div>
                        {/* Homeroom Sub-Tabs */}
                        <div className="flex gap-2 mb-4">
                            {subTabItems.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setHomeroomSubTab(tab.key)}
                                    className={`
                                        px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${homeroomSubTab === tab.key
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Homeroom Content */}
                        <div className="h-[600px]">
                            {homeroomSubTab === "DAILY" && (
                                <DailySummaryView date={selectedDate} />
                            )}
                            {homeroomSubTab === "WEEKLY" && (
                                <AttendanceReportView date={selectedDate} reportType="WEEKLY" />
                            )}
                            {homeroomSubTab === "MONTHLY" && (
                                <AttendanceReportView date={selectedDate} reportType="MONTHLY" />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
