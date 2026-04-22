import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";
import { useConfirmation } from "../../../hooks/useConfirmation";
import {
  ArrowLeft,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
  GripVertical,
  Sun,
  Moon,
  Rocket,
  Plus,
  XCircle,
} from "lucide-react";
import { schoolAdminService, type ClassRoomDto } from "../../../services/schoolAdminService";

// ─── Types ────────────────────────────────────────────────────────
interface TimetableDetail {
  id: string;
  classRoomId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  dayOfWeek: string;
  slotIndex: number;
  isFixed: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────
const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const ENGLISH_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const MORNING_SLOTS = [1, 2, 3, 4, 5];
const AFTERNOON_SLOTS = [6, 7, 8, 9, 10];
const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

// Professional monochromatic theme for lessons
const LESSON_THEME = {
  bg: "bg-white",
  border: "border-slate-200",
  text: "text-slate-700",
  hover: "hover:border-blue-300 hover:bg-blue-50/30"
};

function getSubjectColor(_code: string) {
  return LESSON_THEME;
}

// ─── Droppable Cell ────────────────────────────────────────────────
import { useDroppable } from "@dnd-kit/core";

function DroppableCell({
  id,
  children,
  isValidTarget,
  isInvalidTarget,
  isDragActive,
}: {
  id: string;
  children: React.ReactNode;
  isValidTarget?: boolean;
  isInvalidTarget?: boolean;
  isDragActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <td
      ref={setNodeRef}
      className={`p-0.5 h-[56px] border-r border-gray-100 text-xs align-middle transition-all duration-200
        ${isOver && isValidTarget ? "bg-emerald-100/70 ring-2 ring-emerald-400 ring-inset scale-[1.01]" : ""}
        ${isOver && isInvalidTarget ? "bg-red-100/70 ring-2 ring-red-400 ring-inset" : ""}
        ${isOver && !isValidTarget && !isInvalidTarget ? "bg-blue-100/60 ring-2 ring-blue-400 ring-inset" : ""}
        ${isDragActive && isValidTarget && !isOver ? "bg-emerald-50/40" : ""}
        ${isDragActive && isInvalidTarget && !isOver ? "bg-red-50/30 opacity-60" : ""}
      `}
    >
      {children}
    </td>
  );
}

// ─── Draggable Lesson Card ────────────────────────────────────────
import { useDraggable } from "@dnd-kit/core";

function DraggableLessonCard({
  detail,
  onToggleLock,
}: {
  detail: TimetableDetail;
  onToggleLock: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: detail.id,
    disabled: detail.isFixed,
  });

  const color = getSubjectColor(detail.subjectCode || "");

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const teacherLastName = detail.teacherName
    ? detail.teacherName.split(" ").pop()
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative group flex flex-col items-center justify-center h-full w-full rounded-lg
        border ${color.border} ${color.bg} ${color.text} ${color.hover}
        transition-all duration-200 shadow-sm
        ${detail.isFixed
          ? "ring-2 ring-slate-400 cursor-not-allowed opacity-90 shadow-none border-slate-300"
          : "cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5"
        }
        ${isDragging ? "opacity-30 scale-95 rotate-1 shadow-2xl z-50" : ""}
      `}
    >
      {/* Drag grip hint */}
      {!detail.isFixed && (
        <GripVertical
          size={10}
          className="absolute top-0.5 left-0.5 text-gray-300 opacity-0 group-hover:opacity-60 transition-opacity"
        />
      )}

      <span className="font-semibold text-[11px] leading-tight text-center px-1 truncate w-full">
        {detail.subjectName}
      </span>
      {teacherLastName && (
        <span className="text-[9px] opacity-70 truncate w-full text-center px-1">
          {teacherLastName}
        </span>
      )}

      {/* Lock Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(detail.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`
          absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
          transition-opacity z-10
          ${detail.isFixed
            ? "bg-amber-400 text-white opacity-100"
            : "bg-white border border-gray-300 text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"
          }
        `}
        title={detail.isFixed ? "Bỏ ghim" : "Ghim cố định"}
      >
        {detail.isFixed ? <Lock size={8} /> : <Unlock size={8} />}
      </button>
    </div>
  );
}

// ─── Dragging Overlay Card ────────────────────────────────────────
function DragOverlayCard({ detail }: { detail: TimetableDetail }) {
  const color = getSubjectColor(detail.subjectCode || "");
  const teacherLastName = detail.teacherName?.split(" ").pop();

  return (
    <div
      className={`
        flex flex-col items-center justify-center h-[52px] w-[120px] rounded-xl shadow-2xl
        border-2 ${color.border} ${color.bg} ${color.text}
        ring-2 ring-blue-500 ring-offset-2
        animate-scale-in
      `}
    >
      <span className="font-bold text-[11px]">{detail.subjectName}</span>
      {teacherLastName && (
        <span className="text-[9px] opacity-70">{teacherLastName}</span>
      )}
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function TimetableAdjustPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, toast } = useToast();
  const { ConfirmationDialog } = useConfirmation();

  // Data
  const [details, setDetails] = useState<TimetableDetail[]>([]);
  const [timetableName, setTimetableName] = useState("");
  const [timetableStatus, setTimetableStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classesList, setClassesList] = useState<ClassRoomDto[]>([]);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // ─── Data Fetch ──────────────────────────────────────────────
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await schoolAdminService.listClasses();
        setClassesList(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0].name);
        }
      } catch {
        toast.error("Không thể tải danh sách lớp học");
      }
    };
    fetchClasses();
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (gradeFilter !== "ALL") params.grade = gradeFilter;
      if (selectedClass) params.className = selectedClass;

      const [detailsRes, infoRes] = await Promise.all([
        api.get(`/school-admin/timetables/${id}/details`, { params }),
        api.get(`/school-admin/timetables/${id}`),
      ]);
      setDetails(detailsRes.data);
      setTimetableName(infoRes.data.name);
      setTimetableStatus(infoRes.data.status);
    } catch {
      toast.error("Không thể tải dữ liệu thời khóa biểu");
    } finally {
      setLoading(false);
    }
  }, [id, gradeFilter, selectedClass]);

  useEffect(() => {
    if (id && selectedClass) fetchDetails();
  }, [id, selectedClass, gradeFilter, fetchDetails]);

  // ─── Helpers ──────────────────────────────────────────────────
  const getCell = (className: string, englishDay: string, slot: number) =>
    details.find(
      (d) => d.className === className && d.dayOfWeek === englishDay && d.slotIndex === slot
    );

  const filteredClasses = classesList
    .filter((c) => gradeFilter === "ALL" || c.grade.toString() === gradeFilter)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  // ─── Real-time drag validation ────────────────────────────────
  // Compute which cells are valid/invalid when an item is being dragged
  const dragValidation = useMemo(() => {
    if (!activeId) return {};

    const sourceDetail = details.find((d) => d.id === activeId);
    if (!sourceDetail) return {};

    const result: Record<string, "valid" | "invalid"> = {};

    // For each empty cell, check if source teacher already occupies that slot in another class
    ENGLISH_DAYS.forEach((day) => {
      ALL_SLOTS.forEach((slot) => {
        const cellId = `cell-${day}-${slot}`;
        const existing = getCell(selectedClass, day, slot);

        if (existing) {
          // Cell has a lesson — this will be a SWAP
          if (existing.id === activeId) return; // same cell
          if (existing.isFixed) {
            result[existing.id] = "invalid"; // can't swap with pinned
          } else {
            result[existing.id] = "valid"; // swappable
          }
        } else {
          // Empty cell — check teacher conflict locally (simple heuristic)
          // If the teacher being dragged already teaches at this day+slot in another class of this timetable,
          // we mark it invalid. For now, we use local data — the full check happens server-side on drop.
          if (sourceDetail.teacherId) {
            const teacherBusy = details.some(
              (d) =>
                d.id !== activeId &&
                d.teacherId === sourceDetail.teacherId &&
                d.dayOfWeek === day &&
                d.slotIndex === slot
            );
            result[cellId] = teacherBusy ? "invalid" : "valid";
          } else {
            result[cellId] = "valid";
          }
        }
      });
    });

    return result;
  }, [activeId, details, selectedClass]);

  // ─── DnD Handlers ────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Keeping this for potential future UI high-level overrides
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceDetail = details.find((d) => d.id === active.id);
    if (!sourceDetail) return;

    const droppedId = over.id as string;

    // Case 1: Dropped on another lesson card → SWAP
    const targetDetail = details.find((d) => d.id === droppedId);
    if (targetDetail) {
      if (targetDetail.isFixed) {
        toast.error(`Không thể hoán đổi: ${targetDetail.subjectName} đã bị ghim cố định.`);
        return;
      }
      await handleSwap(sourceDetail, targetDetail);
      return;
    }

    // Case 2: Dropped on empty cell → MOVE
    if (droppedId.startsWith("cell-")) {
      const parts = droppedId.split("-");
      const targetDay = parts[1];
      const targetSlot = parseInt(parts[2]);
      await handleMove(sourceDetail, targetDay, targetSlot);
    }
  }

  async function handleMove(source: TimetableDetail, targetDay: string, targetSlot: number) {
    const oldDay = source.dayOfWeek;
    const oldSlot = source.slotIndex;

    // Optimistic update
    setDetails((prev) =>
      prev.map((d) =>
        d.id === source.id ? { ...d, dayOfWeek: targetDay, slotIndex: targetSlot } : d
      )
    );

    try {
      setSaving(true);
      await api.put("/school-admin/timetables/adjust/move", {
        detailId: source.id,
        targetDay,
        targetSlot,
      });
      showSuccess(`Di chuyển ${source.subjectName} sang ${translateDay(targetDay)} tiết ${targetSlot}`);
    } catch (err: any) {
      // Revert
      setDetails((prev) =>
        prev.map((d) =>
          d.id === source.id ? { ...d, dayOfWeek: oldDay, slotIndex: oldSlot } : d
        )
      );
      const msg = err?.response?.data?.message || "Không thể di chuyển tiết học";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSwap(source: TimetableDetail, target: TimetableDetail) {
    const srcDay = source.dayOfWeek, srcSlot = source.slotIndex;
    const tgtDay = target.dayOfWeek, tgtSlot = target.slotIndex;

    // Optimistic update
    setDetails((prev) =>
      prev.map((d) => {
        if (d.id === source.id) return { ...d, dayOfWeek: tgtDay, slotIndex: tgtSlot };
        if (d.id === target.id) return { ...d, dayOfWeek: srcDay, slotIndex: srcSlot };
        return d;
      })
    );

    try {
      setSaving(true);
      await api.put("/school-admin/timetables/adjust/swap", {
        sourceDetailId: source.id,
        targetDetailId: target.id,
      });
      showSuccess(`Hoán đổi ${source.subjectName} với ${target.subjectName}`);
    } catch (err: any) {
      // Revert
      setDetails((prev) =>
        prev.map((d) => {
          if (d.id === source.id) return { ...d, dayOfWeek: srcDay, slotIndex: srcSlot };
          if (d.id === target.id) return { ...d, dayOfWeek: tgtDay, slotIndex: tgtSlot };
          return d;
        })
      );
      const msg = err?.response?.data?.message || "Không thể hoán đổi tiết học";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLock(detailId: string) {
    // Optimistic toggle
    setDetails((prev) =>
      prev.map((d) => (d.id === detailId ? { ...d, isFixed: !d.isFixed } : d))
    );
    try {
      await api.patch(`/school-admin/timetables/adjust/${detailId}/toggle-lock`);
    } catch {
      // Revert
      setDetails((prev) =>
        prev.map((d) => (d.id === detailId ? { ...d, isFixed: !d.isFixed } : d))
      );
      toast.error("Không thể thay đổi trạng thái ghim");
    }
  }



  function translateDay(eng: string) {
    const idx = ENGLISH_DAYS.indexOf(eng);
    return idx >= 0 ? DAYS[idx] : eng;
  }

  // Active dragging lesson
  const activeDragDetail = activeId ? details.find((d) => d.id === activeId) : null;

  // ─── Render Slot Rows ─────────────────────────────────────────
  function renderSlotRows(slots: number[]) {
    return slots.map((slot) => (
      <tr
        key={`slot-${slot}`}
        className={`border-b border-gray-100 transition-colors
          ${slot === 5 ? "border-b-2 border-gray-200" : ""}
          ${!activeId ? "hover:bg-slate-50/30" : ""}
        `}
      >
        <td className="p-2 text-center text-xs font-bold text-slate-500 border-r border-gray-200 bg-slate-50/50 sticky left-0 z-10">
          T{slot}
        </td>
        {ENGLISH_DAYS.map((engDay) => {
          const lesson = getCell(selectedClass, engDay, slot);
          const cellId = `cell-${engDay}-${slot}`;
          const targetId = lesson ? lesson.id : cellId;
          const validation = dragValidation[targetId];

          return (
            <DroppableCell
              key={cellId}
              id={targetId}
              isValidTarget={!!activeId && validation === "valid"}
              isInvalidTarget={!!activeId && validation === "invalid"}
              isDragActive={!!activeId}
            >
              {lesson ? (
                <DraggableLessonCard
                  detail={lesson}
                  onToggleLock={handleToggleLock}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  {activeId && validation === "valid" ? (
                    <Plus size={16} className="text-emerald-400/60" />
                  ) : activeId && validation === "invalid" ? (
                    <XCircle size={14} className="text-rose-400/60" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                  )}
                </div>
              )}
            </DroppableCell>
          );
        })}
      </tr>
    ));
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/school-admin/schedule/${id}`)}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Tinh Chỉnh Thời Khóa Biểu</h1>
                {timetableStatus === "OFFICIAL" && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    Official
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Bản:</span>
                  <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
                    {timetableName}
                  </span>
                </div>
                {saving && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold animate-pulse">
                    <Loader2 size={10} className="animate-spin" />
                    ĐANG LƯU...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl">
              <select
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setSelectedClass("");
                }}
              >
                <option value="ALL">Tất cả Khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer min-w-[160px]"
              >
                <option value="">-- Chọn lớp học --</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Legend area */}
        <div className="px-5 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 italic">
            <Rocket size={14} className="opacity-50" />
            Mẹo: Kéo thả các tiết học để thay đổi vị trí. Ô có màu nhạt là ô trống.
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              <div className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
              Ghim
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              Hợp lệ
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
              <div className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
              Xung đột
            </span>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">
          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
          Đang tải dữ liệu...
        </div>
      ) : !selectedClass ? (
        <div className="text-center py-16 text-slate-400">
          <AlertTriangle className="mx-auto mb-2" size={28} />
          Vui lòng chọn một lớp để bắt đầu tinh chỉnh
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="p-4 border-r border-gray-100 text-center text-sm font-semibold text-slate-700 w-[60px] sticky left-0 bg-white z-20">
                      Tiết
                    </th>
                    {DAYS.map((day, i) => (
                      <th
                        key={day}
                        className={`p-4 border-b border-r border-gray-100 text-center text-sm font-semibold transition-colors
                          ${i === 6 ? "text-red-600 bg-red-50/20" : "text-blue-600 bg-white"}
                        `}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Morning header */}
                  <tr className="bg-slate-50/30">
                    <td
                      colSpan={DAYS.length + 1}
                      className="py-2.5 text-center border-b border-gray-100"
                    >
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 tracking-widest uppercase">
                        <Sun size={12} />
                        <span>Buổi Sáng</span>
                      </div>
                    </td>
                  </tr>

                  {renderSlotRows(MORNING_SLOTS)}

                  {/* Afternoon header */}
                  <tr className="bg-slate-50/30">
                    <td
                      colSpan={DAYS.length + 1}
                      className="py-2.5 text-center border-b border-gray-100"
                    >
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 tracking-widest uppercase">
                        <Moon size={12} />
                        <span>Buổi Chiều</span>
                      </div>
                    </td>
                  </tr>

                  {renderSlotRows(AFTERNOON_SLOTS)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragDetail ? <DragOverlayCard detail={activeDragDetail} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}
