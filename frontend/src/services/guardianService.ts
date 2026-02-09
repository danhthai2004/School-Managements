import api from "./api";
import type { StudentDto } from "./schoolAdminService";

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

  getTimetableInfo: async(className: string): Promise<TimetableDto[]> => {
    const res = await api.get("/guardian/timetable/" + className);
    return res.data;
  }
}