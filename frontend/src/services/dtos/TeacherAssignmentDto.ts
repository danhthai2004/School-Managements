export type TeacherAssignmentDto = {
    id: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    teacherId: string | null;
    teacherName: string | null;
    lessonsPerWeek: number;
};
