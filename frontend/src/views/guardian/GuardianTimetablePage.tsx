import { useOutletContext } from "react-router-dom";
import type { TimetableDto } from "../../services/guardianService.ts";
import type { StudentDataProp } from "../../components/layout/GuardianLayout.tsx";

export default function GuardianTimetablePage() {
  const { student, timetable } = useOutletContext<StudentDataProp>();
  
  const today = new Date();
  const currentDayNum = today.getDay(); // 0 is Sunday, 1 is Monday, ...
  
  const days = [
    { label: "Thứ 2", value: "MONDAY", dayNum: 1 },
    { label: "Thứ 3", value: "TUESDAY", dayNum: 2 },
    { label: "Thứ 4", value: "WEDNESDAY", dayNum: 3 },
    { label: "Thứ 5", value: "THURSDAY", dayNum: 4 },
    { label: "Thứ 6", value: "FRIDAY", dayNum: 5 },
    { label: "Thứ 7", value: "SATURDAY", dayNum: 6 },
  ];

  const morningPeriods = [1, 2, 3, 4, 5];
  const afternoonPeriods = [6, 7, 8, 9, 10];

  const getSlot = (dayValue: string, period: number): TimetableDto | null => {
    return timetable.find(s => s.dayOfWeek === dayValue && s.slot === period) || null;
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lớp {student?.currentClassName} • Ngày {today.toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="p-4 text-sm font-medium text-slate-700 border-b border-r border-gray-100 w-16 sticky left-0 bg-white z-20 text-center">Tiết</th>
                {days.map((day) => {
                  const isToday = day.dayNum === currentDayNum;
                  return (
                    <th
                      key={day.value}
                      className={`p-4 text-sm border-b border-r border-gray-100 text-center min-w-[150px] transition-colors ${
                        isToday ? "text-blue-700 font-bold bg-blue-50/50" : "text-blue-600 font-medium bg-white"
                      }`}
                    >
                      {day.label}
                      {isToday && <span className="block text-[10px] text-blue-400 mt-0.5">Hôm nay</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Morning Session Header */}
              <tr>
                <td colSpan={7} className="p-3 text-center border-b border-gray-100 bg-slate-50/30">
                   <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">BUỔI SÁNG</span>
                </td>
              </tr>
              {morningPeriods.map((period) => (
                <tr key={period} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-center text-xs font-medium text-slate-500 border-r border-gray-100 bg-white sticky left-0 z-10">
                    T{period}
                  </td>
                  {days.map((day) => {
                    const slot = getSlot(day.value, period);
                    const isToday = day.dayNum === currentDayNum;
                    return (
                      <td key={day.value} className={`p-2 border-r border-gray-100 align-middle text-center h-[70px] transition-colors ${isToday ? "bg-blue-50/20" : ""}`}>
                        {slot ? (
                          <div className="flex flex-col justify-center items-center h-full w-full">
                            <span className={`text-[13px] leading-tight mb-1 transition-colors ${isToday ? "font-bold text-blue-700" : "font-medium text-slate-800"}`}>
                              {slot.subjectName}
                            </span>
                            {slot.teacherName && (
                              <span className="text-[10px] text-slate-400 italic mb-1">
                                {slot.teacherName}
                              </span>
                            )}
                            <div className={`w-1 h-0.5 rounded-full ${isToday ? "bg-blue-600" : "bg-blue-400"}`}></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-slate-200">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Afternoon Session Header */}
              <tr>
                <td colSpan={7} className="p-3 text-center border-b border-gray-100 bg-slate-50/30">
                   <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">BUỔI CHIỀU</span>
                </td>
              </tr>
              {afternoonPeriods.map((period) => (
                <tr key={period} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-center text-xs font-medium text-slate-500 border-r border-gray-100 bg-white sticky left-0 z-10">
                    T{period}
                  </td>
                  {days.map((day) => {
                    const slot = getSlot(day.value, period);
                    const isToday = day.dayNum === currentDayNum;
                    return (
                      <td key={day.value} className={`p-2 border-r border-gray-100 align-middle text-center h-[70px] transition-colors ${isToday ? "bg-blue-50/20" : ""}`}>
                        {slot ? (
                          <div className="flex flex-col justify-center items-center h-full w-full">
                            <span className={`text-[13px] leading-tight mb-1 transition-colors ${isToday ? "font-bold text-blue-700" : "font-medium text-slate-800"}`}>
                              {slot.subjectName}
                            </span>
                            {slot.teacherName && (
                              <span className="text-[10px] text-slate-400 italic mb-1">
                                {slot.teacherName}
                              </span>
                            )}
                            <div className={`w-1 h-0.5 rounded-full ${isToday ? "bg-blue-600" : "bg-blue-400"}`}></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-slate-200">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
