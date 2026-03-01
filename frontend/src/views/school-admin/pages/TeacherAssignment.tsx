import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Star, Search, Users, BookOpen, Link2, UserCheck } from "lucide-react";
import { schoolAdminService } from "../../../services/schoolAdminService";
import type { TeacherDto, SubjectDto } from "../../../services/schoolAdminService";
import type { TeacherAssignmentDto } from "../../../services/dtos/TeacherAssignmentDto";
import LoadingSpinner from "../../../components/LoadingSpinner";

type ViewMode = "bySubject" | "byTeacher";

const TeacherAssignment: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignmentDto[]>([]);
  const [teachers, setTeachers] = useState<TeacherDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("bySubject");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsData, teachersData, subjectsData] = await Promise.all([
        schoolAdminService.listAssignments(),
        schoolAdminService.listTeacherProfiles(),
        schoolAdminService.listSubjects(),
      ]);
      setAssignments(assignmentsData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
    } catch (error) {
      toast.error("Không thể tải dữ liệu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAssignments = async () => {
    try {
      const data = await schoolAdminService.listAssignments();
      setAssignments(data);
    } catch (_) {
      // silent refresh
    }
  };

  const handleError = (error: unknown, fallbackMessage: string) => {
    const message = (error as any)?.response?.data?.message || fallbackMessage;
    toast.error(message);
    console.error(error);
  };

  const handleAddAssignment = async () => {
    if (!selectedTeacherId || !selectedSubjectId) {
      toast.error("Vui lòng chọn cả giáo viên và môn học");
      return;
    }
    const exists = assignments.some(
      (a) => a.teacherId === selectedTeacherId && a.subjectId === selectedSubjectId
    );
    if (exists) {
      toast.error("Giáo viên đã được phân công dạy môn này");
      return;
    }

    setSubmitting(true);
    try {
      const newAssignment = await schoolAdminService.addAssignment(
        selectedTeacherId,
        selectedSubjectId
      );
      setAssignments([...assignments, newAssignment]);
      toast.success("Thêm phân công thành công");
      setSelectedTeacherId("");
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 409) {
        toast.error("Giáo viên đã được phân công dạy môn này");
        // Refresh to sync client state with server
        await refreshAssignments();
      } else {
        handleError(error, "Không thể thêm phân công");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (id: string, teacherName: string) => {
    if (!window.confirm(`Xóa phân công của ${teacherName}?`)) return;
    try {
      await schoolAdminService.removeAssignment(id);
      setAssignments(assignments.filter((a) => a.id !== id));
      toast.success("Đã xóa phân công");
    } catch (error) {
      handleError(error, "Không thể xóa phân công");
    }
  };

  const handleToggleHead = async (assignment: TeacherAssignmentDto) => {
    try {
      const updatedList = await schoolAdminService.setHeadOfDepartment(
        assignment.id,
        !assignment.isHeadOfDepartment
      );
      // Merge: replace all returned assignments in our state
      setAssignments((prev) => {
        const updatedIds = new Set(updatedList.map((u) => u.id));
        return prev.map((a) => {
          if (updatedIds.has(a.id)) {
            return updatedList.find((u) => u.id === a.id)!;
          }
          return a;
        });
      });
      const toggled = updatedList.find((u) => u.id === assignment.id);
      toast.success(
        toggled?.isHeadOfDepartment
          ? "Đã đặt làm Tổ trưởng chuyên môn"
          : "Đã gỡ chức Tổ trưởng chuyên môn"
      );
    } catch (error) {
      handleError(error, "Không thể cập nhật trạng thái Tổ trưởng");
    }
  };

  // ==================== COMPUTED DATA ====================

  const stats = useMemo(() => {
    const uniqueTeachers = new Set(assignments.map((a) => a.teacherId));
    const uniqueSubjects = new Set(assignments.map((a) => a.subjectId));
    return {
      totalAssignments: assignments.length,
      assignedTeachers: uniqueTeachers.size,
      assignedSubjects: uniqueSubjects.size,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments;
    const q = searchQuery.toLowerCase();
    return assignments.filter(
      (a) =>
        (a.teacherName || "").toLowerCase().includes(q) ||
        (a.subjectName || "").toLowerCase().includes(q)
    );
  }, [assignments, searchQuery]);

  // Group by subject
  const assignmentsBySubject = useMemo(() => {
    return subjects
      .map((subject) => ({
        subject,
        assignments: filteredAssignments.filter((a) => a.subjectId === subject.id),
      }))
      .filter((group) => !searchQuery.trim() || group.assignments.length > 0);
  }, [subjects, filteredAssignments, searchQuery]);

  // Group by teacher
  const assignmentsByTeacher = useMemo(() => {
    const map = new Map<string, { teacher: TeacherDto; assignments: TeacherAssignmentDto[] }>();
    for (const t of teachers) {
      const teacherAssigns = filteredAssignments.filter((a) => a.teacherId === t.id);
      if (!searchQuery.trim() || teacherAssigns.length > 0) {
        map.set(t.id, { teacher: t, assignments: teacherAssigns });
      }
    }
    return Array.from(map.values());
  }, [teachers, filteredAssignments, searchQuery]);

  // Unassigned teachers (no assignment at all)
  const unassignedTeachers = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.teacherId));
    return teachers.filter((t) => !assignedIds.has(t.id));
  }, [teachers, assignments]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Phân công chuyên môn</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.assignedTeachers}<span className="text-sm font-normal text-gray-400">/{teachers.length}</span></p>
            <p className="text-sm text-gray-500">Giáo viên đã phân công</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.assignedSubjects}<span className="text-sm font-normal text-gray-400">/{subjects.length}</span></p>
            <p className="text-sm text-gray-500">Môn học có giáo viên</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Link2 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
            <p className="text-sm text-gray-500">Tổng phân công</p>
          </div>
        </div>
      </div>

      {/* Add Assignment Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-base font-semibold mb-3 text-gray-700">Thêm phân công mới</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label htmlFor="select-teacher" className="block text-sm font-medium text-gray-600 mb-1">Giáo viên</label>
            <select
              id="select-teacher"
              title="Chọn giáo viên"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border text-sm"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">— Chọn giáo viên —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5">
            <label htmlFor="select-subject" className="block text-sm font-medium text-gray-600 mb-1">Môn học</label>
            <select
              id="select-subject"
              title="Chọn môn học"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border text-sm"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="">— Chọn môn học —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              onClick={handleAddAssignment}
              disabled={!selectedTeacherId || !selectedSubjectId || submitting}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Phân công
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Search + View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="search-assignment" className="sr-only">Tìm kiếm</label>
          <input
            id="search-assignment"
            name="search-assignment"
            type="text"
            placeholder="Tìm giáo viên hoặc môn học..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("bySubject")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "bySubject"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BookOpen className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            Theo Môn học
          </button>
          <button
            onClick={() => setViewMode("byTeacher")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "byTeacher"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            Theo Giáo viên
          </button>
        </div>
      </div>

      {/* View: By Subject */}
      {viewMode === "bySubject" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignmentsBySubject.map(({ subject, assignments: subjectAssignments }) => (
            <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-indigo-700 text-sm">{subject.name}</h3>
                    {subject.code && <p className="text-xs text-gray-400 mt-0.5">Mã: {subject.code}</p>}
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    {subjectAssignments.length} GV
                  </span>
                </div>
              </div>
              
              <div className="p-3 flex-1">
                {subjectAssignments.length === 0 ? (
                  <p className="text-sm italic text-gray-400 text-center py-4">Chưa có giáo viên</p>
                ) : (
                  <div className="space-y-2">
                    {subjectAssignments.map((assignment) => (
                      <AssignmentRow
                        key={assignment.id}
                        assignment={assignment}
                        displayName={assignment.teacherName || ""}
                        onToggleHead={() => handleToggleHead(assignment)}
                        onRemove={() => handleRemoveAssignment(assignment.id, assignment.teacherName || "Giáo viên")}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View: By Teacher */}
      {viewMode === "byTeacher" && (
        <div className="space-y-4">
          {assignmentsByTeacher.map(({ teacher, assignments: teacherAssigns }) => (
            <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                    {(teacher.fullName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{teacher.fullName}</h3>
                    <p className="text-xs text-gray-400">{teacher.teacherCode} · Tối đa {teacher.maxPeriodsPerWeek} tiết/tuần</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {teacherAssigns.length} môn
                </span>
              </div>
              <div className="p-4">
                {teacherAssigns.length === 0 ? (
                  <p className="text-sm italic text-gray-400 text-center py-2">Chưa được phân công môn nào</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teacherAssigns.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg pl-3 pr-1 py-1.5"
                      >
                        <span className="text-sm text-gray-700 font-medium">{assignment.subjectName}</span>
                        {assignment.isHeadOfDepartment && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Tổ trưởng
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleHead(assignment)}
                          className={`p-1 rounded-full transition-colors ${
                            assignment.isHeadOfDepartment
                              ? "text-yellow-500 hover:bg-yellow-50"
                              : "text-gray-300 hover:text-yellow-500 hover:bg-gray-100"
                          }`}
                          title={assignment.isHeadOfDepartment ? "Gỡ chức Tổ trưởng" : "Đặt làm Tổ trưởng"}
                        >
                          {assignment.isHeadOfDepartment ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
                        </button>
                        <button
                          onClick={() => handleRemoveAssignment(assignment.id, assignment.teacherName || "Giáo viên")}
                          className="p-1 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Xóa phân công"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Unassigned teachers section */}
          {unassignedTeachers.length > 0 && !searchQuery.trim() && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-orange-700 text-sm">
                    Giáo viên chưa phân công ({unassignedTeachers.length})
                  </h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {unassignedTeachers.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 text-sm text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg"
                    >
                      <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-xs flex-shrink-0">
                        {(t.fullName || "?").charAt(0).toUpperCase()}
                      </span>
                      {t.fullName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Sub-component ====================

const AssignmentRow: React.FC<{
  assignment: TeacherAssignmentDto;
  displayName: string;
  onToggleHead: () => void;
  onRemove: () => void;
}> = ({ assignment, displayName, onToggleHead, onRemove }) => (
  <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
    <div className="flex-1 min-w-0 mr-2">
      <p className="text-sm font-medium text-gray-800 truncate" title={displayName}>
        {displayName}
      </p>
      {assignment.isHeadOfDepartment && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-0.5">
          Tổ trưởng
        </span>
      )}
    </div>
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={onToggleHead}
        className={`p-1.5 rounded-full transition-colors ${
          assignment.isHeadOfDepartment
            ? "text-yellow-500 hover:bg-yellow-50"
            : "text-gray-300 hover:text-yellow-500 hover:bg-gray-100"
        }`}
        title={assignment.isHeadOfDepartment ? "Gỡ chức Tổ trưởng" : "Đặt làm Tổ trưởng"}
      >
        {assignment.isHeadOfDepartment ? <Star size={15} fill="currentColor" /> : <Star size={15} />}
      </button>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Xóa phân công"
      >
        <Trash2 size={15} />
      </button>
    </div>
  </div>
);

export default TeacherAssignment;
