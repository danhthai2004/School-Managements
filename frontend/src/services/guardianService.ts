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

export type GuardianDto = {
  id: string,
  fullName: string,
  phone: string,
  email: string,
  relationship: string,
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

  getExamSchedule: async (studentId: string, semesterId?: string): Promise<ExamScheduleDto[]> => {
    try {
      const res = await api.get("/guardian/exams", {
        params: {studentId, semesterId}
      });
      return res.data;
    } catch (err) {
      throw new Error("An error occured" + err);
    }
  },

  getUserProfileInfo: async(): Promise<GuardianDto> => {
    try {
      const res = await api.get("/guardian/profile");
      return res.data;
    } catch (err) {
      throw new Error("An error occured" + err);
    }
  }
}