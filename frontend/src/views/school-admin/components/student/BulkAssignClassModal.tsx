import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
    schoolAdminService,
    type ClassRoomDto,
    type StudentDto,
    type BulkEnrollResponse
} from "../../../../services/schoolAdminService";
import { X } from "lucide-react";

interface BulkAssignClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedStudents: StudentDto[];
    classes: ClassRoomDto[];
}

function BulkAssignClassModal({ isOpen, onClose, onSuccess, selectedStudents, classes }: BulkAssignClassModalProps) {
    const [targetClassId, setTargetClassId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BulkEnrollResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initial validation: Students should ideally have the same grade as the target class
    // But we'll let the user choose and rely on backend validation or UI warnings.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetClassId) {
            setError("Vui lòng chọn lớp học đích.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await schoolAdminService.bulkEnrollStudents({
                classRoomId: targetClassId,
                studentIds: selectedStudents.map(s => s.id)
            });
            setResult(res);
            if (res.enrolled > 0) {
                onSuccess(); // Refresh data immediately
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Có lỗi xảy ra khi xếp lớp hàng loạt.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTargetClassId("");
        setResult(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col z-[110] max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className={`px-6 py-5 flex-none ${result ? (result.skipped > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500') : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white tracking-tight">{result ? "Kết quả xếp lớp" : "Xếp lớp hàng loạt"}</h3>
                        <button onClick={handleClose} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {result ? (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <div className="text-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-2xl font-extrabold text-slate-800">{result.total}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Tổng số</div>
                                </div>
                                <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 shadow-sm">
                                    <div className="text-2xl font-extrabold text-emerald-600">{result.enrolled}</div>
                                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Thành công</div>
                                </div>
                                <div className="text-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/80 shadow-sm">
                                    <div className="text-2xl font-extrabold text-rose-600">{result.skipped}</div>
                                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">Bị bỏ qua</div>
                                </div>
                            </div>

                            {/* Error Details */}
                            {result.errors && result.errors.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                                        Chi tiết các trường hợp lỗi:
                                    </p>
                                    <div className="max-h-60 overflow-y-auto bg-slate-50/50 border border-slate-200/60 rounded-2xl divide-y divide-slate-100 custom-scrollbar shadow-sm">
                                        {result.errors.map((err, idx) => {
                                            const colonIndex = err.indexOf(':');
                                            const namePart = colonIndex !== -1 ? err.substring(0, colonIndex + 1) : '';
                                            const messagePart = colonIndex !== -1 ? err.substring(colonIndex + 1) : err;

                                            return (
                                                <div key={idx} className="p-3.5 text-sm flex gap-3 hover:bg-white transition-colors group">
                                                    <div className="font-bold text-rose-600 shrink-0 bg-rose-50 px-2.5 py-1 rounded-lg h-fit text-xs">Mục {idx + 1}</div>
                                                    <div className="text-slate-600 leading-relaxed py-0.5">
                                                        {namePart && <span className="font-black text-slate-800">{namePart}</span>}
                                                        {messagePart}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!result.errors?.length && (
                                <div className="py-8 px-6 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100/60 mt-2 animate-in fade-in zoom-in duration-300 shadow-sm border-dashed">
                                    <p className="text-emerald-800 font-bold text-base">Hoàn tất xếp lớp</p>
                                    <p className="text-emerald-600 text-sm mt-1 font-medium italic">Tất cả học sinh đã được xếp vào lớp mới thành công!</p>
                                </div>
                            )}

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm shadow-sm"
                                >
                                    Đóng
                                </button>
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        setError(null);
                                        setTargetClassId("");
                                    }}
                                    className="flex-1 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Tiếp tục gán
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm italic">
                                    {error}
                                </div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Chọn lớp học muốn xếp vào:</label>
                                <select
                                    value={targetClassId}
                                    onChange={(e) => setTargetClassId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none bg-white cursor-pointer"
                                >
                                    <option value="">-- Chọn lớp học --</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} (Khối {c.grade}) - Sĩ số: {c.studentCount}/{c.maxCapacity} {c.combinationName ? `- ${c.combinationName}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-slate-500 italic">
                                    * Hệ thống sẽ tự động gỡ học sinh khỏi lớp cũ (nếu có) trong cùng năm học.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-700">Danh sách học sinh đã chọn ({selectedStudents.length}):</p>
                                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                                    {selectedStudents.map(s => (
                                        <div key={s.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {s.fullName.split(' ').pop()?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                                                    <p className="text-[10px] text-slate-500">{s.studentCode} {s.combinationName ? `• ${s.combinationName}` : ''}</p>
                                                </div>
                                            </div>
                                            {s.currentClassName && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                    Lớp cũ: {s.currentClassName}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !targetClassId}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    Xác nhận xếp lớp
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div >,
        document.body
    );
}

export default BulkAssignClassModal;
