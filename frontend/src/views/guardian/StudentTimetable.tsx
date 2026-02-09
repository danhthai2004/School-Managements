import {useOutletContext} from "react-router-dom";
import type {TimetableDto} from "../../services/guardianService.ts";
import type {StudentDataProp} from "../../components/layout/GuardianLayout.tsx";
// import {useState} from "react";

type TimetableProps = {
  periods: number[];
  timetableGrid: (TimetableDto | null)[][];
  currentDay: number;
};

export default function StudentTimetable() {
  const {student, timetable} = useOutletContext<StudentDataProp>();
  const currentDay = new Date();

  const periods: number[] = [1, 2, 3, 4, 5];

  const days = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ] as const;

  const subjectColors: Record<string, { bg: string; text: string }> = {
    "Toán": {bg: "bg-blue-100", text: "text-blue-700"},
    "Ngữ văn": {bg: "bg-pink-100", text: "text-pink-700"},
    "Anh": {bg: "bg-purple-100", text: "text-purple-700"},
    "Lý": {bg: "bg-orange-100", text: "text-orange-700"},
    "Hóa": {bg: "bg-green-100", text: "text-green-700"},
    "Sinh": {bg: "bg-teal-100", text: "text-teal-700"},
    "Lịch sử": {bg: "bg-amber-100", text: "text-amber-700"},
    "Địa": {bg: "bg-cyan-100", text: "text-cyan-700"},
    "GDCD": {bg: "bg-rose-100", text: "text-rose-700"},
    "Tin": {bg: "bg-indigo-100", text: "text-indigo-700"},
    "Tin học": {bg: "bg-yellow-100", text: "text-yellow-700"},
    "Thể dục": {bg: "bg-lime-100", text: "text-lime-700"},
    "Công nghệ": {bg: "bg-slate-100", text: "text-slate-700"},
    "Giáo dục quốc phòng và an ninh": {bg: "bg-red-50", text: "text-red-600"},
    "SHL": {bg: "bg-pink-50", text: "text-pink-600"},
    "Giáo dục thể chất": {bg: "bg-fuchsia-50", text: "text-fuchsia-600"},
    "Âm nhạc": {bg: "bg-lime-50", text: "text-lime-600"},
    "Hoạt động trải nghiệm, hướng nghiệp": {bg: "bg-emerald-100", text: "text-emerald-700"},
    "Mỹ thuật": {bg: "bg-lime-50", text: "text-lime-600"},
    "Giáo dục kinh tế và pháp luật": {bg: "bg-sky-50", text: "text-sky-600"},
    "Nội dung giáo dục địa phương": {bg: "bg-sky-50", text: "text-sky-600"},
    "Chào cờ": {bg: "bg-red-100", text: "text-red-500"}
  };

  function getSubjectColor(subjectName: string) {
    // Try to find exact match or partial match
    for (const [key, value] of Object.entries(subjectColors)) {
      if (subjectName.includes(key) || key.includes(subjectName)) {
        return value;
      }
    }

    return {bg: "bg-gray-100", text: "text-gray-700"};
  }

  // Grid building
  function buildTimetableGrid(slots: TimetableDto[]): (TimetableDto | null)[][] {
    const timetableGrid: (TimetableDto | null)[][] = Array.from({length: periods.length}, () => Array(days.length).fill(null));
    for (const slot of slots) {
      const dayIndex = days.indexOf(slot.dayOfWeek);
      const slotIndex = slot.slot - 1;

      if (dayIndex !== -1 && slotIndex >= 0) {
        timetableGrid[slotIndex][dayIndex] = slot;
      }
    }

    return timetableGrid;
  }

  const timetableGrid = buildTimetableGrid(timetable);
  const curDay = <span className="text-red-500">(*)</span>;

  return (
    <div>
      <div>
        <h1 className="text-2xl text-gray-700 font-semibold">
          Thời khóa biểu lớp {student?.currentClassName}
        </h1>
        <p className="text-gray-700 mt-4 text-md">
          Ngày {currentDay.getDate()}/{currentDay.getMonth() + 1}/{currentDay.getFullYear()}
        </p>
      </div>

      <div className="mt-8 bg-white rounded-2xl border-gray-200 border">
        {/*<Timetable periods={periods} timetableGrid={timetableGrid} currentDay={currentDay.getDay()}/>*/}
        <table className="table-fixed rounded-2xl border-collapse bord w-full">
          <thead className="font-medium">
          <tr className="border-b border-gray-100 font-medium bg-gray-50">
            <th className="p-4 font-medium border-r border-gray-100 w-16">Tiết</th>
            <th className="p-4 font-medium border-r border-gray-100 bg-">Thứ 2 {currentDay.getDay() === 1 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Thứ 3 {currentDay.getDay() === 2 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Thứ 4 {currentDay.getDay() === 3 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Thứ 5 {currentDay.getDay() === 4 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Thứ 6 {currentDay.getDay() === 5 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Thứ 7 {currentDay.getDay() === 6 ? curDay : null}</th>
            <th className="p-4 font-medium border-r border-gray-100">Chủ Nhật {currentDay.getDay() === 7 ? curDay : null}</th>
          </tr>
          </thead>
          <tbody>
          {periods.map((period: number, rowIndex: number) => (
            <tr key={rowIndex} className="border-b border-gray-100">
              <td className="text-xl p-4 w-16">{period}</td>
              {timetableGrid[rowIndex]?.map((cell, colIndex) => {
                const colors = cell ? getSubjectColor(cell.subjectName) : null;
                  return (
                    <td key={colIndex} className="p-2 rounded-md h-24">
                      <div
                        className={`${colors?.bg} ${colors?.text} border rounded-lg h-full w-full flex items-center justify-center text-center p-2`}>
                        {cell ? cell.subjectName : ""}
                      </div>
                    </td>
                  )
                }
              )
              }
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="text-[1.1rem]"><span className="text-red-500">* </span> : Hôm nay</p>
      </div>
    </div>
  )
}

function Timetable({periods, timetableGrid, currentDay}: TimetableProps) {
  const curDay = <span className="text-red-500">(*)</span>;
  return (
    <table className="table-fixed rounded-2xl border-collapse bord w-full">
      <thead className="font-medium">
      <tr className="border-b border-gray-100 font-medium bg-gray-50">
        <th className="p-4 font-medium border-r border-gray-100 w-16">Tiết</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 2 {currentDay === 1 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 3 {currentDay === 2 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 4 {currentDay === 3 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 5 {currentDay === 4 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 6 {currentDay === 5 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Thứ 7 {currentDay === 6 ? curDay : null}</th>
        <th className="p-4 font-medium border-r border-gray-100">Chủ Nhật {currentDay === 7 ? curDay : null}</th>
      </tr>
      </thead>
      <tbody>
      {periods.map((period: number, rowIndex: number) => (
        <tr key={rowIndex} className="border-b border-gray-100">
          <td className="text-xl p-4 w-16">{period}</td>
          {timetableGrid[rowIndex]?.map((cell, colIndex) => {
              return (
                <td key={colIndex} className="p-2 rounded-md h-24">
                  <div
                    className={`bg-blue-50 border border-blue-200 rounded-lg h-full w-full flex items-center justify-center text-center p-2`}>
                    {cell ? cell.subjectName : ""}
                  </div>
                </td>
              )
            }
          )
          }
        </tr>
      ))}
      </tbody>
    </table>
  );
}