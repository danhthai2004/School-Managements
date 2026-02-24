import { BookOpen, Check } from "lucide-react";
import { NotificationIcon, ScoreIcon } from "./GuardianIcons";
import {useOutletContext} from "react-router-dom";
import type {StudentDataProp} from "../../components/layout/GuardianLayout.tsx";
import type {TimetableDto} from "../../services/guardianService.ts";
import {useEffect} from "react";

export default function GuardianDashboardPage() {
  const {student, timetable} = useOutletContext<StudentDataProp>();
  const currentDay = new Date()
    .toLocaleDateString("en-US", {weekday: "long"})
    .toUpperCase();

  const currentDaySchedule: TimetableDto[] = [];

  // Get currenDay schedule
  for (const slot of timetable ) {
    if (slot.dayOfWeek == currentDay && slot.className == student.currentClassName) currentDaySchedule.push(slot);
  }

  useEffect(() => {
    console.log(timetable);
  }, []);

  return (
    <div className="animate-fade-in-up">
      <div>
        <h1 className="text-2xl text-gray-700 font-semibold">
          Tổng quan học tập
        </h1>
        <p className="text-gray-700 mt-4">
          Theo dõi tiến độ học tập của {student?.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div className="p-4 bg-white rounded-xl border-gray-200 border shadow-sm">
          <div className="flex justify-between">
            <p className="font-semibold">Điểm trung bình</p>

            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500 flex-shrink-0">
              <ScoreIcon />
            </div>
          </div>

          <div className="pt-4">
            <p className="text-2xl font-semibold">8.5</p>
            <span className="text-sm text-green-600">Bằng học kì trước</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border-gray-200 border shadow-sm">
          <div className="flex justify-between">
            <p className="font-semibold">Tỷ lệ chuyên cần</p>

            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
              <Check />
            </div>
          </div>

          <div className="pt-4">
            <p className="text-2xl font-semibold">98%</p>
            <span className="text-sm text-green-600">Bằng học kì trước</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border-gray-200 border shadow-sm">
          <div className="flex justify-between">
            <p className="font-semibold">Số tiết học hoàn thành</p>

            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 flex-shrink-0">
              <BookOpen/>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-2xl font-semibold">20/105</p>
            <span className="text-sm text-green-600">Trong năm học này</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border-gray-200 border shadow-sm">
          <div className="flex justify-between">
            <p className="font-semibold">Thông báo mới</p>

            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-500 flex-shrink-0">
              <NotificationIcon />
            </div>
          </div>

          <div className="pt-4">
            <p className="text-2xl font-semibold">5</p>
            <span className="text-sm text-gray-600">Chưa đọc</span>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-8 space-y-8">
        {/* ===== LOWER DASHBOARD SECTION ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lịch học hôm nay */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-semibold mb-4">Lịch học hôm nay</h2>

            <div className="space-y-3">
              {currentDaySchedule.map(slot => {
                console.log(slot);
                return (
                  <ScheduleItem
                    time={`Tiết ${slot.slot}`}
                    subject={slot.subjectName}
                    teacher={"None"}
                  />
                )
              })}
              {/* True data type */}
              {/*<ScheduleItem*/}
              {/*  time="07:00 - 07:45"*/}
              {/*  subject="Toán học"*/}
              {/*  teacher="Cô Nguyễn Thị C"*/}
              {/*/>*/}
            </div>
          </div>

          {/* Điểm gần đây */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-semibold mb-4">Điểm gần đây</h2>

            <div className="space-y-4">
              <ScoreRow subject="Toán học" date="2024-01-10" score="9" />
              <ScoreRow subject="Văn học" date="2024-01-09" score="8.5" />
              <ScoreRow subject="Tiếng Anh" date="2024-01-08" score="8" />
              <ScoreRow subject="Vật lý" date="2024-01-07" score="9.5" />
            </div>
          </div>

          {/* Sự kiện sắp tới */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-semibold mb-4">Sự kiện sắp tới</h2>

            <div className="space-y-3">
              <EventItem
                title="Kiểm tra giữa kỳ Toán"
                date="Thứ Hai, 15/01/2024"
                color="red"
              />
              <EventItem
                title="Họp phụ huynh trực tuyến"
                date="Thứ Năm, 18/01/2024"
                color="blue"
              />
              <EventItem
                title="Nộp bài tiểu luận Văn"
                date="Thứ Bảy, 20/01/2024"
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleItem({
  time,
  subject,
  teacher,
}: {
  time: string;
  subject: string;
  teacher: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-400">
      <p className="text-sm text-orange-500">{time}</p>
      <p className="font-medium">{subject}</p>
      <p className="text-sm text-gray-600">{teacher}</p>
    </div>
  );
}

function ScoreRow({
  subject,
  date,
  score,
  up,
  down,
}: {
  subject: string;
  date: string;
  score: string;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="flex justify-between items-center bg-gray-100 p-4">
      <div>
        <p className="font-medium">{subject}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>

      <div className="flex items-center gap-1">
        <span
          className={`font-semibold ${
            up ? "text-green-600" : down ? "text-red-600" : "text-blue-600"
          }`}
        >
          {score}
        </span>
        {up && <span className="text-green-600">↗</span>}
        {down && <span className="text-red-600">↘</span>}
      </div>
    </div>
  );
}

function EventItem({
  title,
  date,
  color,
}: {
  title: string;
  date: string;
  color: "red" | "blue" | "purple";
}) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className={`p-3 rounded-xl ${colors[color]}`}>
      <p className="font-medium">{title}</p>
      <p className="text-sm">{date}</p>
    </div>
  );
}
