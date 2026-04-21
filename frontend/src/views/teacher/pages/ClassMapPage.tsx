import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { TeacherProfile, HomeroomStudent, ClassSeatMapConfig, SeatPosition, ClassObject } from "../../../services/teacherService";
import { teacherService } from "../../../services/teacherService";

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

// ==================== ICONS ====================
const GridIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
);
const ShuffleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
    </svg>
);
const ResetIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);
const SaveIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
);
const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const RotateIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);
const DragIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="5" r="1.5" fill="currentColor" /><circle cx="15" cy="5" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" />
        <circle cx="9" cy="19" r="1.5" fill="currentColor" /><circle cx="15" cy="19" r="1.5" fill="currentColor" />
    </svg>
);
const UsersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

// ==================== OBJECT ICONS ====================
const DoorObjIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="16" height="20" rx="1" /><circle cx="15" cy="12" r="1.5" fill="currentColor" />
    </svg>
);
const TeacherDeskIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="8" width="20" height="4" rx="1" /><line x1="5" y1="12" x2="5" y2="20" /><line x1="19" y1="12" x2="19" y2="20" />
        <rect x="8" y="4" width="8" height="4" rx="1" />
    </svg>
);
const ProjectorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" />
    </svg>
);
const TvIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" />
    </svg>
);
const WhiteboardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="1" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="6" y1="8" x2="14" y2="8" /><line x1="6" y1="12" x2="10" y2="12" />
    </svg>
);

const OBJECT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    DOOR: { icon: <DoorObjIcon />, label: 'Cửa ra vào', color: '#f59e0b' },
    TEACHER_DESK: { icon: <TeacherDeskIcon />, label: 'Bàn giáo viên', color: '#ef4444' },
    PROJECTOR: { icon: <ProjectorIcon />, label: 'Máy chiếu', color: '#f59e0b' },
    TV: { icon: <TvIcon />, label: 'Tivi', color: '#f59e0b' },
    WHITEBOARD: { icon: <WhiteboardIcon />, label: 'Bảng', color: '#6366f1' },
};

function getStudentColor(gender?: string): string {
    if (gender === 'MALE') return '#3B82F6';
    if (gender === 'FEMALE') return '#EC4899';
    return '#6B7280';
}

function getInitial(name: string): string {
    const parts = name.trim().split(' ');
    return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || '?';
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ==================== CONFIGURATION MODAL ====================
function ConfigModal({
    onClose,
    onApply,
    initialConfig,
    studentCount
}: {
    onClose: () => void;
    onApply: (rows: number, desksPerRow: number, seatsPerDesk: number) => void;
    initialConfig?: { rows: number; desksPerRow: number; seatsPerDesk: number };
    studentCount: number;
}) {
    const [rows, setRows] = useState(initialConfig?.rows ?? 4);
    const [desksPerRow, setDesksPerRow] = useState(initialConfig?.desksPerRow ?? 5);
    const [seatsPerDesk, setSeatsPerDesk] = useState(initialConfig?.seatsPerDesk ?? 2);

    const totalDesks = rows * desksPerRow;
    const totalSeats = totalDesks * seatsPerDesk;

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div
                style={{
                    backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
                    width: '460px', maxWidth: '90vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    position: 'relative', animation: 'modalSlideUp 0.3s ease-out'
                }}
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes modalSlideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GridIcon />
                        <span style={{ fontWeight: 600, fontSize: '16px', color: '#374151' }}>Sơ đồ lớp học</span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px'
                    }}><CloseIcon /></button>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Cấu hình sơ đồ lớp</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>
                    Thiết lập số dãy, số bàn mỗi dãy, và số chỗ ngồi mỗi bàn cho lớp học của bạn.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Số dãy (Tổ)</label>
                        <select value={rows} onChange={e => setRows(Number(e.target.value))} style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                            fontSize: '14px', backgroundColor: '#f9fafb', cursor: 'pointer', outline: 'none'
                        }}>
                            {[3, 4, 5].map(n => <option key={n} value={n}>{n} dãy</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Số bàn mỗi dãy</label>
                        <select value={desksPerRow} onChange={e => setDesksPerRow(Number(e.target.value))} style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                            fontSize: '14px', backgroundColor: '#f9fafb', cursor: 'pointer', outline: 'none'
                        }}>
                            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} bàn</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Số chỗ ngồi mỗi bàn</label>
                        <select value={seatsPerDesk} onChange={e => setSeatsPerDesk(Number(e.target.value))} style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                            fontSize: '14px', backgroundColor: '#f9fafb', cursor: 'pointer', outline: 'none'
                        }}>
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} chỗ ngồi</option>)}
                        </select>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#f0f5ff', borderRadius: '10px', padding: '14px 16px',
                    marginTop: '20px', fontSize: '14px', color: '#374151'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Tổng số bàn:</span>
                        <span style={{ fontWeight: 700, color: '#4f7cff' }}>{totalDesks} bàn</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Tổng chỗ ngồi:</span>
                        <span style={{ fontWeight: 700, color: '#4f7cff' }}>{totalSeats} chỗ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Số học sinh hiện tại:</span>
                        <span style={{ fontWeight: 700, color: '#4f7cff' }}>{studentCount} học sinh</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px',
                        backgroundColor: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', color: '#374151'
                    }}>Hủy</button>
                    <button onClick={() => onApply(rows, desksPerRow, seatsPerDesk)} style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        backgroundColor: '#4f7cff', color: '#fff', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}><GridIcon /> Tạo sơ đồ</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ==================== MAIN COMPONENT ====================
export default function ClassMapPage() {
    const { teacherProfile } = useOutletContext<OutletContextType>();
    const isHomeroom = teacherProfile?.isHomeroomTeacher ?? false;
    const homeroomClassId = teacherProfile?.homeroomClassId;
    const assignedClasses = teacherProfile?.assignedClasses ?? [];

    // For subject teachers: select which class to view
    const uniqueClasses = assignedClasses.filter((c, i, arr) => arr.findIndex(x => x.classId === c.classId) === i);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // The active class ID: homeroom class for GVCN, or selected class for subject teacher
    const classId = isHomeroom ? homeroomClassId : selectedClassId;

    const [students, setStudents] = useState<HomeroomStudent[]>([]);
    const [config, setConfig] = useState<ClassSeatMapConfig | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [dragItem, setDragItem] = useState<{ type: 'student' | 'object'; data: unknown } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load data
    useEffect(() => {
        if (!classId) { setLoading(false); return; }
        setLoading(true);
        const load = async () => {
            try {
                if (isHomeroom) {
                    // Homeroom: load students + seat map
                    const [studentsData, seatMapData] = await Promise.all([
                        teacherService.getHomeroomStudents().catch(() => []),
                        teacherService.getClassSeatMap(classId)
                    ]);
                    setStudents(studentsData);
                    if (seatMapData.config) {
                        try {
                            const parsed = JSON.parse(seatMapData.config) as ClassSeatMapConfig;
                            setConfig(parsed);
                        } catch { setConfig(null); }
                    } else {
                        setConfig(null);
                    }
                } else {
                    // Subject teacher: load seat map only (read-only)
                    setStudents([]);
                    const seatMapData = await teacherService.getClassSeatMap(classId);
                    if (seatMapData.config) {
                        try {
                            const parsed = JSON.parse(seatMapData.config) as ClassSeatMapConfig;
                            setConfig(parsed);
                        } catch { setConfig(null); }
                    } else {
                        setConfig(null);
                    }
                }
            } catch (err) {
                console.error('Failed to load class map data', err);
                setConfig(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [classId, isHomeroom]);

    // Get unassigned students
    const assignedStudentIds = new Set(config?.studentPositions?.map(p => p.studentId) || []);
    const unassignedStudents = students.filter(s => !assignedStudentIds.has(s.id));

    // Create grid from config
    const applyConfig = useCallback((rows: number, desksPerRow: number, seatsPerDesk: number) => {
        setConfig({
            rows,
            desksPerRow,
            seatsPerDesk,
            studentPositions: config?.studentPositions || [],
            objects: config?.objects || [
                { id: 'door-1', type: 'DOOR', position: 'BOTTOM', label: 'Cửa ra vào' },
                { id: 'teacher-desk-1', type: 'TEACHER_DESK', position: 'TOP', label: 'Bàn giáo viên' },
                { id: 'whiteboard-1', type: 'WHITEBOARD', position: 'TOP', label: 'Bảng' },
            ],
        });
        setShowConfigModal(false);
    }, [config]);

    // Place student in seat
    const placeStudent = useCallback((student: HomeroomStudent, row: number, col: number, seatIndex: number) => {
        if (!config) return;
        // Remove student from any existing position
        const positions = config.studentPositions.filter(p => p.studentId !== student.id);
        // Remove any existing student from this seat
        const existingInSeat = positions.findIndex(p => p.row === row && p.col === col && p.seatIndex === seatIndex);
        if (existingInSeat >= 0) positions.splice(existingInSeat, 1);
        positions.push({
            studentId: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            gender: student.gender,
            row, col, seatIndex
        });
        setConfig({ ...config, studentPositions: positions });
    }, [config]);

    // Remove student from seat
    const removeStudent = useCallback((studentId: string) => {
        if (!config) return;
        setConfig({
            ...config,
            studentPositions: config.studentPositions.filter(p => p.studentId !== studentId)
        });
    }, [config]);

    // Random assignment - distribute evenly horizontally
    const randomAssign = useCallback(() => {
        if (!config) return;
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const positions: SeatPosition[] = [];
        let idx = 0;
        // Fill order: seat index → desk row (col) → column (row)
        // This spreads students across all columns first
        for (let seat = 0; seat < config.seatsPerDesk && idx < shuffled.length; seat++) {
            for (let col = 0; col < config.desksPerRow && idx < shuffled.length; col++) {
                for (let row = 0; row < config.rows && idx < shuffled.length; row++) {
                    const s = shuffled[idx++];
                    positions.push({
                        studentId: s.id,
                        studentCode: s.studentCode,
                        fullName: s.fullName,
                        gender: s.gender,
                        row, col, seatIndex: seat
                    });
                }
            }
        }
        setConfig({ ...config, studentPositions: positions });
    }, [config, students]);

    // Reset all students
    const resetStudents = useCallback(() => {
        if (!config) return;
        setConfig({ ...config, studentPositions: [] });
    }, [config]);

    // Reset everything
    const resetAll = useCallback(() => {
        setConfig(null);
    }, []);

    // Save
    const handleSave = useCallback(async () => {
        if (!classId || !config) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            await teacherService.saveClassSeatMap(classId, JSON.stringify(config));
            setSaveMsg('Đã lưu sơ đồ lớp thành công!');
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lỗi khi lưu sơ đồ';
            setSaveMsg(message);
        } finally {
            setSaving(false);
        }
    }, [classId, config]);

    // Export as image
    const handleExport = useCallback(() => {
        if (!containerRef.current) return;
        // Simple: copy to clipboard as text
        const data = JSON.stringify(config, null, 2);
        navigator.clipboard.writeText(data);
        setSaveMsg('Đã copy cấu hình sơ đồ!');
        setTimeout(() => setSaveMsg(null), 2000);
    }, [config]);

    // Add object
    const addObject = useCallback((type: string) => {
        if (!config) return;
        const objConfig = OBJECT_CONFIG[type];
        if (!objConfig) return;
        const id = `${type.toLowerCase()}-${Date.now()}`;
        const obj: ClassObject = {
            id,
            type: type as ClassObject['type'],
            position: type === 'DOOR' ? 'BOTTOM' : 'TOP',
            label: objConfig.label,
        };
        setConfig({ ...config, objects: [...config.objects, obj] });
    }, [config]);

    // Remove object
    const removeObject = useCallback((id: string) => {
        if (!config) return;
        setConfig({ ...config, objects: config.objects.filter(o => o.id !== id) });
    }, [config]);

    // Toggle object position
    const rotateObjectPosition = useCallback((id: string) => {
        if (!config) return;
        const positions: ClassObject['position'][] = ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
        setConfig({
            ...config,
            objects: config.objects.map(o => {
                if (o.id !== id) return o;
                const curIdx = positions.indexOf(o.position);
                return { ...o, position: positions[(curIdx + 1) % 4] };
            })
        });
    }, [config]);

    // Update object offset (drag position along bar)
    const updateObjectOffset = useCallback((id: string, offset: number) => {
        if (!config) return;
        setConfig({
            ...config,
            objects: config.objects.map(o => {
                if (o.id !== id) return o;
                return { ...o, offset: Math.max(0, Math.min(100, offset)) };
            })
        });
    }, [config]);

    // Drag handlers
    const handleDragStart = useCallback((type: 'student' | 'object', data: unknown) => {
        setDragItem({ type, data });
    }, []);

    const handleSeatDrop = useCallback((row: number, col: number, seatIndex: number) => {
        if (!dragItem || dragItem.type !== 'student' || !isHomeroom) return;
        const student = dragItem.data as HomeroomStudent;
        placeStudent(student, row, col, seatIndex);
        setDragItem(null);
    }, [dragItem, isHomeroom, placeStudent]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTop: '3px solid #4f7cff',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Subject teacher: show class selector when no class is selected yet
    if (!isHomeroom && !selectedClassId) {
        return (
            <div className="animate-fade-in-up">
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Sơ đồ lớp học</h1>
                    <p style={{ color: '#6b7280' }}>Xem sơ đồ chỗ ngồi các lớp bạn dạy</p>
                </div>
                {uniqueClasses.length === 0 ? (
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid #f3f4f6', textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#f0f5ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                            color: '#4f7cff'
                        }}><GridIcon /></div>
                        <p style={{ color: '#6b7280', fontSize: '15px' }}>Chưa có lớp nào được phân công.</p>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid #f3f4f6'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UsersIcon /> Chọn lớp để xem sơ đồ
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {uniqueClasses.map(cls => (
                                <button
                                    key={cls.classId}
                                    onClick={() => setSelectedClassId(cls.classId)}
                                    style={{
                                        padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb',
                                        backgroundColor: '#f9fafb', cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}
                                    onMouseEnter={e => { (e.currentTarget).style.backgroundColor = '#eff6ff'; (e.currentTarget).style.borderColor = '#bfdbfe'; }}
                                    onMouseLeave={e => { (e.currentTarget).style.backgroundColor = '#f9fafb'; (e.currentTarget).style.borderColor = '#e5e7eb'; }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>{cls.className}</span>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{cls.subjectName}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Homeroom teacher without a class assignment
    if (isHomeroom && !homeroomClassId) {
        return (
            <div className="animate-fade-in-up">
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Sơ đồ lớp học</h1>
                    <p style={{ color: '#6b7280' }}>Quản lý sơ đồ chỗ ngồi lớp chủ nhiệm</p>
                </div>
                <div style={{
                    backgroundColor: '#fff', borderRadius: '12px', padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #f3f4f6', textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#f0f5ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                        color: '#4f7cff'
                    }}><GridIcon /></div>
                    <p style={{ color: '#6b7280', fontSize: '15px' }}>Chưa có lớp chủ nhiệm nào được gán.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up" ref={containerRef}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Sơ đồ lớp học</h1>
                        {!isHomeroom && selectedClassId && (
                            <button
                                onClick={() => { setSelectedClassId(null); setConfig(null); setStudents([]); }}
                                style={{
                                    padding: '4px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
                                    backgroundColor: '#f9fafb', fontSize: '13px', color: '#6b7280',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                ← Đổi lớp
                            </button>
                        )}
                    </div>
                    <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '14px' }}>
                        {isHomeroom
                            ? 'Sắp xếp chỗ ngồi học sinh và đối tượng trong lớp (Kéo thả & Xoay)'
                            : `Xem sơ đồ lớp ${uniqueClasses.find(c => c.classId === selectedClassId)?.className ?? ''} (Chỉ xem)`
                        }
                    </p>
                </div>
                {isHomeroom && config && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowConfigModal(true)} style={btnStyle('#f3f4f6', '#374151')}>
                            <GridIcon /> Cấu hình
                        </button>
                        <button onClick={randomAssign} style={btnStyle('#f3f4f6', '#374151')}>
                            <ShuffleIcon /> Ngẫu nhiên
                        </button>
                        <button onClick={resetStudents} style={btnStyle('#f3f4f6', '#374151')}>
                            <ResetIcon /> Reset HS
                        </button>
                        <button onClick={resetAll} style={btnStyle('#fef2f2', '#ef4444')}>
                            <TrashIcon /> Reset tất cả
                        </button>
                        <button onClick={handleExport} style={btnStyle('#f3f4f6', '#374151')}>
                            <DownloadIcon /> Export
                        </button>
                        <button onClick={handleSave} disabled={saving} style={{
                            ...btnStyle('#4f7cff', '#fff'),
                            opacity: saving ? 0.6 : 1,
                        }}>
                            <SaveIcon /> {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                )}
            </div>

            {/* Save message */}
            {saveMsg && (
                <div style={{
                    padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500,
                    backgroundColor: saveMsg.includes('thành công') || saveMsg.includes('copy') ? '#ecfdf5' : '#fef2f2',
                    color: saveMsg.includes('thành công') || saveMsg.includes('copy') ? '#065f46' : '#991b1b',
                    border: `1px solid ${saveMsg.includes('thành công') || saveMsg.includes('copy') ? '#a7f3d0' : '#fecaca'}`
                }}>
                    {saveMsg}
                </div>
            )}

            {/* Read-only banner for non-GVCN */}
            {!isHomeroom && (
                <div style={{
                    backgroundColor: '#eff6ff', color: '#1e40af', padding: '10px 16px', borderRadius: '8px',
                    marginBottom: '16px', fontSize: '14px', border: '1px solid #bfdbfe'
                }}>
                    🔒 Bạn đang ở chế độ xem. Chỉ giáo viên chủ nhiệm mới có thể chỉnh sửa sơ đồ lớp.
                </div>
            )}

            {/* Main content */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Left sidebar - students (homeroom only) */}
                {isHomeroom && (
                    <div style={{ width: '280px', flexShrink: 0 }}>
                        <div style={{
                            backgroundColor: '#fff', borderRadius: '12px', padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6'
                        }}>
                            <h3 style={{
                                fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 12px',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <UsersIcon /> Học sinh chưa xếp ({unassignedStudents.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                                {unassignedStudents.map((s, idx) => (
                                    <div
                                        key={s.id}
                                        draggable={isHomeroom}
                                        onDragStart={() => handleDragStart('student', s)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                                            borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
                                            cursor: isHomeroom ? 'grab' : 'default', transition: 'all 0.15s',
                                            fontSize: '13px'
                                        }}
                                        onMouseEnter={e => { if (isHomeroom) { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#eff6ff'; (e.currentTarget as HTMLDivElement).style.borderColor = '#bfdbfe'; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9fafb'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; }}
                                    >
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            backgroundColor: getStudentColor(s.gender), color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 700, flexShrink: 0
                                        }}>
                                            {ALPHABET[idx] || getInitial(s.fullName)}
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.fullName}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.studentCode}</div>
                                        </div>
                                        {isHomeroom && (
                                            <div style={{ marginLeft: 'auto', color: '#d1d5db', flexShrink: 0 }}><DragIcon /></div>
                                        )}
                                    </div>
                                ))}
                                {unassignedStudents.length === 0 && config && (
                                    <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                                        Tất cả học sinh đã được xếp chỗ!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Objects sidebar */}
                        {config && (
                            <div style={{
                                backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginTop: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6'
                            }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>
                                    Đối tượng trong lớp
                                </h3>
                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>Kéo để di chuyển vị trí, xoay 90° để đổi cạnh</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Object.entries(OBJECT_CONFIG).map(([type, cfg]) => (
                                        <button
                                            key={type}
                                            onClick={() => addObject(type)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                                borderRadius: '8px', backgroundColor: cfg.color + '15', border: `1px solid ${cfg.color}30`,
                                                cursor: 'pointer', color: cfg.color, fontSize: '13px', fontWeight: 600,
                                                transition: 'all 0.15s', width: '100%', textAlign: 'left'
                                            }}
                                        >
                                            {cfg.icon}
                                            <span style={{ flex: 1 }}>{cfg.label}</span>
                                            <PlusIcon />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main area - seating chart */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6', minHeight: '500px',
                        overflow: 'hidden'
                    }}>
                        <h3 style={{
                            fontSize: '15px', fontWeight: 600, color: '#374151', margin: '0 0 20px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <GridIcon /> Sơ đồ lớp học
                            {config && (
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
                                    ({config.rows} dãy × {config.desksPerRow} bàn × {config.seatsPerDesk} chỗ)
                                </span>
                            )}
                        </h3>

                        {!config ? (
                            // Empty state
                            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '16px', backgroundColor: '#f0f5ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px', color: '#4f7cff', fontSize: '32px'
                                }}>
                                    <GridIcon />
                                </div>
                                <p style={{ color: '#6b7280', fontSize: '15px', margin: '0 0 4px' }}>Chưa có sơ đồ lớp</p>
                                {isHomeroom && (
                                    <button onClick={() => setShowConfigModal(true)} style={{
                                        marginTop: '16px', padding: '10px 24px', borderRadius: '8px',
                                        backgroundColor: '#4f7cff', color: '#fff', border: 'none',
                                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                                    }}>
                                        <PlusIcon /> Tạo sơ đồ
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Seating chart grid
                            <div style={{ overflow: 'visible' }}>
                                {/* Top objects */}
                                <ObjectBar objects={config.objects.filter(o => o.position === 'TOP')} position="TOP"
                                    onRemove={isHomeroom ? removeObject : undefined}
                                    onRotate={isHomeroom ? rotateObjectPosition : undefined}
                                    onOffsetChange={isHomeroom ? updateObjectOffset : undefined} />

                                {/* Main area with left/right objects outside the border */}
                                <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', position: 'relative' }}>
                                    {/* Left objects */}
                                    <ObjectBar objects={config.objects.filter(o => o.position === 'LEFT')} position="LEFT"
                                        onRemove={isHomeroom ? removeObject : undefined}
                                        onRotate={isHomeroom ? rotateObjectPosition : undefined}
                                        onOffsetChange={isHomeroom ? updateObjectOffset : undefined} />

                                    {/* The grid */}
                                    <div style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
                                        padding: '16px', minHeight: '300px', minWidth: 0,
                                        border: '2px dashed #e5e7eb', borderRadius: '8px',
                                        backgroundColor: '#fafbfc'
                                    }}>
                                        {Array.from({ length: config.desksPerRow }, (_, deskIdx) => (
                                            <div key={deskIdx} style={{
                                                display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'
                                            }}>
                                                {Array.from({ length: config.rows }, (_, rowIdx) => {
                                                    const seatsInDesk = config.studentPositions.filter(
                                                        p => p.row === rowIdx && p.col === deskIdx
                                                    );
                                                    return (
                                                        <div key={rowIdx} style={{
                                                            display: 'flex', gap: '2px', padding: '5px',
                                                            backgroundColor: '#fff', borderRadius: '8px',
                                                            border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            flex: '1 1 0', minWidth: '80px', maxWidth: '180px'
                                                        }}>
                                                            {Array.from({ length: config.seatsPerDesk }, (_, seatIdx) => {
                                                                const occupant = seatsInDesk.find(p => p.seatIndex === seatIdx);
                                                                const occupantGender = occupant?.gender;
                                                                return (
                                                                    <div
                                                                        key={seatIdx}
                                                                        onDragOver={e => { if (isHomeroom) { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.backgroundColor = '#eff6ff'; } }}
                                                                        onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = occupant ? getStudentColor(occupantGender) + '15' : '#f9fafb'; }}
                                                                        onDrop={e => {
                                                                            e.preventDefault();
                                                                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9fafb';
                                                                            handleSeatDrop(rowIdx, deskIdx, seatIdx);
                                                                        }}
                                                                        draggable={isHomeroom && !!occupant}
                                                                        onDragStart={() => {
                                                                            if (occupant) {
                                                                                const student = students.find(s => s.id === occupant.studentId);
                                                                                if (student) handleDragStart('student', student);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            flex: '1 1 0', minWidth: '36px', height: '50px', borderRadius: '6px',
                                                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                                            justifyContent: 'center', fontSize: '10px', position: 'relative',
                                                                            transition: 'all 0.15s',
                                                                            backgroundColor: occupant ? getStudentColor(occupantGender) + '15' : '#f9fafb',
                                                                            border: occupant ? `1px solid ${getStudentColor(occupantGender)}40` : '1px dashed #d1d5db',
                                                                            cursor: isHomeroom ? (occupant ? 'grab' : 'default') : 'default'
                                                                        }}
                                                                    >
                                                                        {occupant ? (
                                                                            <>
                                                                                <div style={{
                                                                                    width: '20px', height: '20px', borderRadius: '50%',
                                                                                    backgroundColor: getStudentColor(occupantGender), color: '#fff',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    fontSize: '9px', fontWeight: 700, marginBottom: '2px'
                                                                                }}>
                                                                                    {getInitial(occupant.fullName)}
                                                                                </div>
                                                                                <span style={{
                                                                                    fontWeight: 600, color: '#374151', maxWidth: '100%',
                                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                    fontSize: '9px'
                                                                                }}>
                                                                                    {occupant.fullName.split(' ').pop()}
                                                                                </span>
                                                                                {isHomeroom && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); removeStudent(occupant.studentId); }}
                                                                                        style={{
                                                                                            position: 'absolute', top: '-6px', right: '-6px',
                                                                                            width: '16px', height: '16px', borderRadius: '50%',
                                                                                            backgroundColor: '#ef4444', color: '#fff', border: 'none',
                                                                                            cursor: 'pointer', fontSize: '10px', lineHeight: '16px',
                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                            padding: 0
                                                                                        }}
                                                                                    >×</button>
                                                                                )}
                                                                            </>
                                                                        ) : null}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Right objects */}
                                    <ObjectBar objects={config.objects.filter(o => o.position === 'RIGHT')} position="RIGHT"
                                        onRemove={isHomeroom ? removeObject : undefined}
                                        onRotate={isHomeroom ? rotateObjectPosition : undefined}
                                        onOffsetChange={isHomeroom ? updateObjectOffset : undefined} />
                                </div>

                                {/* Bottom objects */}
                                <ObjectBar objects={config.objects.filter(o => o.position === 'BOTTOM')} position="BOTTOM"
                                    onRemove={isHomeroom ? removeObject : undefined}
                                    onRotate={isHomeroom ? rotateObjectPosition : undefined}
                                    onOffsetChange={isHomeroom ? updateObjectOffset : undefined} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {showConfigModal && (
                <ConfigModal
                    onClose={() => setShowConfigModal(false)}
                    onApply={applyConfig}
                    initialConfig={config ? { rows: config.rows, desksPerRow: config.desksPerRow, seatsPerDesk: config.seatsPerDesk } : undefined}
                    studentCount={students.length}
                />
            )}
        </div>
    );
}

// ==================== OBJECT BAR ====================
function ObjectBar({
    objects,
    position,
    onRemove,
    onRotate,
    onOffsetChange
}: {
    objects: ClassObject[];
    position: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
    onRemove?: (id: string) => void;
    onRotate?: (id: string) => void;
    onOffsetChange?: (id: string, offset: number) => void;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragStartRef = useRef<{ startMouse: number; startOffset: number } | null>(null);

    if (objects.length === 0) return null;

    const isHorizontal = position === 'TOP' || position === 'BOTTOM';

    const handleMouseDown = (e: React.MouseEvent, obj: ClassObject) => {
        if (!onOffsetChange) return;
        // Don't start drag if clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        setDraggingId(obj.id);
        const mousePos = isHorizontal ? e.clientX : e.clientY;
        dragStartRef.current = {
            startMouse: mousePos,
            startOffset: obj.offset ?? 50
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!barRef.current || !dragStartRef.current) return;
            const barRect = barRef.current.getBoundingClientRect();
            const barSize = isHorizontal ? barRect.width : barRect.height;
            if (barSize === 0) return;
            const currentMouse = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
            const deltaPx = currentMouse - dragStartRef.current.startMouse;
            const deltaPct = (deltaPx / barSize) * 100;
            const newOffset = Math.max(0, Math.min(100, dragStartRef.current.startOffset + deltaPct));
            onOffsetChange(obj.id, Math.round(newOffset));
        };

        const handleMouseUp = () => {
            setDraggingId(null);
            dragStartRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={barRef}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: isHorizontal ? 'row' : 'column',
                padding: '8px',
                minWidth: isHorizontal ? undefined : '44px',
                minHeight: isHorizontal ? '48px' : undefined,
                overflow: 'visible',
                ...(isHorizontal
                    ? { width: '100%' }
                    : { alignSelf: 'stretch' }
                ),
            }}
        >
            {objects.map(obj => {
                const cfg = OBJECT_CONFIG[obj.type];
                const offset = obj.offset ?? 50;
                const canDrag = !!onOffsetChange;
                const isDragging = draggingId === obj.id;

                return (
                    <div
                        key={obj.id}
                        onMouseDown={(e) => handleMouseDown(e, obj)}
                        style={{
                            position: 'absolute',
                            ...(isHorizontal
                                ? {
                                    left: `${offset}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }
                                : {
                                    top: `${offset}%`,
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }),
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px',
                            borderRadius: '8px', backgroundColor: cfg?.color + '15',
                            border: `1px solid ${isDragging ? cfg?.color : cfg?.color + '30'}`,
                            boxShadow: isDragging ? `0 2px 8px ${cfg?.color}40` : 'none',
                            fontSize: '11px',
                            fontWeight: 600, color: cfg?.color, whiteSpace: 'nowrap',
                            cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            userSelect: 'none',
                            transition: isDragging ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                            zIndex: isDragging ? 10 : 1,
                            ...(isHorizontal ? {} : {
                                writingMode: 'vertical-rl' as const,
                                transform: `translate(-50%, -50%) rotate(180deg)`,
                            })
                        }}
                    >
                        {canDrag && (
                            <span style={{
                                display: 'inline-flex', opacity: 0.5, marginRight: '2px',
                                ...(isHorizontal ? {} : { transform: 'rotate(90deg)' })
                            }}>
                                <DragIcon />
                            </span>
                        )}
                        <span style={isHorizontal ? {} : { transform: 'rotate(90deg)', display: 'inline-flex' }}>{cfg?.icon}</span>
                        <span>{obj.label}</span>
                        {onRotate && (
                            <button onClick={(e) => { e.stopPropagation(); onRotate(obj.id); }} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: cfg?.color, padding: '2px', display: 'flex',
                                ...(isHorizontal ? {} : { transform: 'rotate(90deg)' })
                            }} title="Xoay vị trí"><RotateIcon /></button>
                        )}
                        {onRemove && (
                            <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#ef4444', padding: '2px', display: 'flex', fontSize: '14px',
                                ...(isHorizontal ? {} : { transform: 'rotate(90deg)' })
                            }} title="Xóa">×</button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ==================== STYLES ====================
function btnStyle(bg: string, color: string): React.CSSProperties {
    return {
        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
        borderRadius: '8px', backgroundColor: bg, color, border: 'none',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        whiteSpace: 'nowrap'
    };
}
