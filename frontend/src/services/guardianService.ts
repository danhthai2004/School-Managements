import api from "./api";
import type { StudentDto } from "./schoolAdminService";
import type {ExamScheduleDto} from "./studentService.ts";

// ========== TIMETABLE TYPE ========
export type TimetableDto = {
  className: string,
  slot: number,
  dayOfWeek: string,
  subjectName: string
}

// ========== SERVICE ==============
export const guardianService = {
  getStudentInfo: async (): Promise<StudentDto> => {
    const res = await api.get("/guardian/student");
    return res.data;
  },

  getTimetableInfo: async(studentId: string): Promise<TimetableDto[]> => {
    const res = await api.get("/guardian/timetable/" + studentId);
    return res.data;
  },

  getExamSchedule: async (studentId: string, academicYear?: string, semester?: number): Promise<ExamScheduleDto[]> => {
    try {
      const res = await api.get("/guardian/exams", {
        params: {studentId, academicYear, semester}
      });
      return res.data;
    } catch (err) {
      throw new Error("An erorr occured" + err);
    }
  }
}