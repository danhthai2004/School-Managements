import { useState, useEffect } from "react";
import { schoolAdminService, type RoomDto, type CreateRoomRequest } from "../../../services/schoolAdminService";
import { Plus, Edit2, Trash2, Building2, Users, X, Copy, Minus } from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { useConfirmation } from "../../../hooks/useConfirmation";

type ModalState = { open: boolean; room: RoomDto | null };

type BulkRoomRow = {
    name: string;
    capacity: number;
    building: string;
};

const emptyRow = (): BulkRoomRow => ({ name: "", capacity: 40, building: "" });

export default function RoomManagement() {
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ open: false, room: null });
    const [form, setForm] = useState<CreateRoomRequest>({ name: "", capacity: 40, building: "", status: "ACTIVE" });
    const [saving, setSaving] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof RoomDto; direction: 'asc' | 'desc' } | null>(null);
    const { toast } = useToast();
    const { confirm, ConfirmationDialog } = useConfirmation();

    const sortedRooms = (rooms || []).slice().sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let aValue = a[key];
        let bValue = b[key];

        if (aValue === null || aValue === undefined) aValue = "";
        if (bValue === null || bValue === undefined) bValue = "";

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const cmp = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
            return direction === 'asc' ? cmp : -cmp;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof RoomDto) => {
        setSortConfig(current => {
            if (current?.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const SortHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: keyof RoomDto, className?: string }) => (
        <th
            className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors select-none ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${className.includes("text-center") ? "justify-center" : ""}`}>
                {label}
                <span className="text-gray-400">
                    {sortConfig?.key === sortKey ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                    ) : (
                        <span className="opacity-0 group-hover:opacity-50">⇅</span>
                    )}
                </span>
            </div>
        </th>
    );

    // Bulk add state
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkRows, setBulkRows] = useState<BulkRoomRow[]>([emptyRow(), emptyRow(), emptyRow()]);
    const [bulkSaving, setBulkSaving] = useState(false);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const data = await schoolAdminService.listRooms();
            setRooms(data.content);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi tải danh sách phòng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRooms(); }, []);

    const openCreate = () => {
        setForm({ name: "", capacity: 40, building: "", status: "ACTIVE" });
        setModal({ open: true, room: null });
    };

    const openEdit = (room: RoomDto) => {
        setForm({ name: room.name, capacity: room.capacity, building: room.building || "", status: room.status });
        setModal({ open: true, room });
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error("Tên phòng không được để trống"); return; }
        if (form.capacity < 1) { toast.error("Sức chứa phải lớn hơn 0"); return; }
        try {
            setSaving(true);
            if (modal.room) {
                await schoolAdminService.updateRoom(modal.room.id, form);
            } else {
                await schoolAdminService.createRoom(form);
            }
            setModal({ open: false, room: null });
            toast.success(modal.room ? "Cập nhật phòng thành công!" : "Thêm phòng mới thành công!");
            fetchRooms();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi lưu phòng");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (room: RoomDto) => {
        confirm({
            title: "Xóa phòng học?",
            message: (
                <span>
                    Bạn có chắc chắn muốn xóa phòng <strong>{room.name}</strong>? Hành động này không thể hoàn tác.
                </span>
            ),
            variant: "danger",
            confirmText: "Xóa",
            onConfirm: async () => {
                try {
                    await schoolAdminService.deleteRoom(room.id);
                    toast.success("Đã xóa phòng");
                    fetchRooms();
                } catch (e: any) {
                    toast.error(e?.response?.data?.message || "Lỗi xóa phòng");
                }
            }
        });
    };

    const handleStatusToggle = async (room: RoomDto) => {
        const newStatus = room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await schoolAdminService.updateRoomStatus(room.id, newStatus);
            toast.success("Đã cập nhật trạng thái");
            fetchRooms();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi đổi trạng thái");
        }
    };

    // ── Bulk add handlers ──
    const openBulk = () => {
        setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
        setBulkOpen(true);
    };

    const updateBulkRow = (index: number, field: keyof BulkRoomRow, value: string | number) => {
        setBulkRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    };

    const addBulkRow = () => {
        setBulkRows(prev => [...prev, emptyRow()]);
    };

    const removeBulkRow = (index: number) => {
        if (bulkRows.length <= 1) return;
        setBulkRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkSave = async () => {
        const validRows = bulkRows.filter(r => r.name.trim() !== "");
        if (validRows.length === 0) {
            toast.error("Vui lòng nhập ít nhất 1 phòng");
            return;
        }
        // Validate
        for (let i = 0; i < validRows.length; i++) {
            if (validRows[i].capacity < 1) {
                toast.error(`Phòng "${validRows[i].name}": Sức chứa phải lớn hơn 0`);
                return;
            }
        }
        // Check for duplicate names within the form
        const names = validRows.map(r => r.name.trim().toLowerCase());
        const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
        if (duplicates.length > 0) {
            toast.error(`Trùng tên phòng trong danh sách: ${[...new Set(duplicates)].join(", ")}`);
            return;
        }

        try {
            setBulkSaving(true);
            const requests: CreateRoomRequest[] = validRows.map(r => ({
                name: r.name.trim(),
                capacity: r.capacity,
                building: r.building.trim() || undefined,
                status: "ACTIVE" as const,
            }));
            await schoolAdminService.createBulkRooms(requests);
            setBulkOpen(false);
            toast.success(`Đã thêm ${validRows.length} phòng thành công!`);
            fetchRooms();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi thêm nhiều phòng");
        } finally {
            setBulkSaving(false);
        }
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            ACTIVE: "bg-emerald-100 text-emerald-700",
            INACTIVE: "bg-gray-100 text-gray-500",
            MAINTENANCE: "bg-amber-100 text-amber-700",
        };
        const labels: Record<string, string> = { ACTIVE: "Hoạt động", INACTIVE: "Ngưng", MAINTENANCE: "Bảo trì" };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-500"}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng học</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý danh sách phòng học, phòng thi của trường</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={openBulk}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                        <Copy className="w-4 h-4" /> Thêm nhiều phòng
                    </button>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                        <Plus className="w-4 h-4" /> Thêm phòng
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Đang tải...</div>
                ) : rooms.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Chưa có phòng học nào</p>
                        <button onClick={openCreate} className="mt-3 text-blue-600 text-sm hover:underline">+ Thêm phòng mới</button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 group">
                                <SortHeader label="Tên phòng" sortKey="name" />
                                <SortHeader label="Tòa nhà" sortKey="building" />
                                <SortHeader label="Sức chứa" sortKey="capacity" className="text-center" />
                                <SortHeader label="Trạng thái" sortKey="status" className="text-center" />
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedRooms.map(room => (
                                <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-900">{room.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{room.building || "—"}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-gray-700">
                                            <Users className="w-3.5 h-3.5" /> {room.capacity}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleStatusToggle(room)} title="Nhấn để đổi trạng thái">
                                            {statusBadge(room.status)}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(room)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(room)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Single Room Modal (Create / Edit) */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setModal({ open: false, room: null })} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-[100]">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{modal.room ? "Sửa phòng" : "Thêm phòng mới"}</h2>
                                        <p className="text-blue-100 text-sm">{modal.room ? "Cập nhật thông tin phòng học" : "Thêm phòng học vào hệ thống"}</p>
                                    </div>
                                </div>
                                <button onClick={() => setModal({ open: false, room: null })}
                                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng *</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    placeholder="VD: Phòng 101, Lab A" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa *</label>
                                <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    min={1} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tòa nhà / Dãy</label>
                                <input value={form.building} onChange={e => setForm({ ...form, building: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    placeholder="VD: Tòa A, Dãy B" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm">
                                    <option value="ACTIVE">Hoạt động</option>
                                    <option value="INACTIVE">Ngưng</option>
                                    <option value="MAINTENANCE">Bảo trì</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                            <button onClick={() => setModal({ open: false, room: null })}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                            <button onClick={handleSave} disabled={saving}
                                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50">
                                {saving ? "Đang lưu..." : modal.room ? "Cập nhật" : "Tạo mới"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Dialog */}
            <ConfirmationDialog />

            {/* Bulk Add Modal */}
            {bulkOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setBulkOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden z-[100] flex flex-col max-h-[90vh]">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-6 py-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Copy className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Thêm nhiều phòng</h2>
                                        <p className="text-purple-100 text-sm">Thêm nhiều phòng học cùng lúc vào hệ thống</p>
                                    </div>
                                </div>
                                <button onClick={() => setBulkOpen(false)}
                                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_100px_1fr_40px] gap-3 mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Tên phòng *</span>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Sức chứa</span>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Tòa nhà</span>
                                <span></span>
                            </div>

                            {/* Rows */}
                            <div className="space-y-2">
                                {bulkRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_100px_1fr_40px] gap-3 items-center group">
                                        <input
                                            value={row.name}
                                            onChange={e => updateBulkRow(idx, "name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                            placeholder={`Phòng ${idx + 1}`}
                                        />
                                        <input
                                            type="number"
                                            value={row.capacity}
                                            onChange={e => updateBulkRow(idx, "capacity", +e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                            min={1}
                                        />
                                        <input
                                            value={row.building}
                                            onChange={e => updateBulkRow(idx, "building", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                            placeholder="Tòa A"
                                        />
                                        <button
                                            onClick={() => removeBulkRow(idx)}
                                            disabled={bulkRows.length <= 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Xóa dòng"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add row button */}
                            <button
                                onClick={addBulkRow}
                                className="mt-3 flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Thêm dòng
                            </button>

                            {/* Info */}
                            <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <p className="text-xs text-purple-700">
                                    <strong>Lưu ý:</strong> Các dòng có tên phòng trống sẽ được bỏ qua. Tất cả phòng sẽ được tạo với trạng thái "Hoạt động".
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
                            <span className="text-sm text-gray-500">
                                {bulkRows.filter(r => r.name.trim()).length} / {bulkRows.length} phòng hợp lệ
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setBulkOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                <button onClick={handleBulkSave} disabled={bulkSaving}
                                    className="px-5 py-2 text-sm bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50">
                                    {bulkSaving ? "Đang tạo..." : `Tạo ${bulkRows.filter(r => r.name.trim()).length} phòng`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
