import { useState } from "react";
import { createPortal } from "react-dom";
import {
    schoolAdminService,
    type ClassRoomDto,
    type BulkAssignResult,
} from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: string[];
    classes: ClassRoomDto[];
    onSuccess: () => void;
}

type Mode = "AUTO" | "MANUAL";
type Step = "config" | "result";

export default function BulkAssignModal({ isOpen, onClose, selectedIds, classes, onSuccess }: Props) {
    const [mode, setMode] = useState<Mode>("AUTO");
    const [classId, setClassId] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>("config");
    const [result, setResult] = useState<BulkAssignResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const activeClasses = classes
        .filter(c => c.status === "ACTIVE")
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    const handleSubmit = async () => {
        if (mode === "MANUAL" && !classId) {
            setError("Vui lòng chọn lớp đích");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await schoolAdminService.bulkAssignToClass(
                selectedIds,
                mode,
                mode === "MANUAL" ? classId : undefined
            );
            setResult(res);
            setStep("result");
            if (res.assigned > 0) onSuccess();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep("config");
        setResult(null);
        setError(null);
        setMode("AUTO");
        setClassId("");
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 z-[101] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-none">
                    <h2 className="text-lg font-semibold text-white">
                        Phân lớp {selectedIds.length} học sinh
                    </h2>
                    <button onClick={handleClose} className="text-white/80 hover:text-white">
                        <XIcon />
                    </button>
                </div>

                {step === "config" ? (
                    <div className="p-6 space-y-5 overflow-y-auto">
                        {/* Mode tabs */}
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                            {(["AUTO", "MANUAL"] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        mode === m
                                            ? "bg-blue-600 text-white"
                                            : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {m === "AUTO" ? "Tự động" : "Thủ công"}
                                </button>
                            ))}
                        </div>

                        {mode === "AUTO" ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm text-blue-800">
                                <p className="font-semibold">Hệ thống sẽ tự động phân lớp dựa trên:</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-700">
                                    <li>Năm sinh → xác định khối (10/11/12)</li>
                                    <li>Ban tự nhiên / xã hội từ lịch sử học</li>
                                    <li>Ưu tiên lớp còn nhiều chỗ trống nhất</li>
                                </ul>
                                <p className="text-xs text-blue-600 pt-1">
                                    Học sinh đã có lớp hoặc không phù hợp sẽ bị bỏ qua.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                    Tất cả học sinh được chọn sẽ được chuyển vào cùng một lớp.
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Chọn lớp đích *</label>
                                    <select
                                        value={classId}
                                        onChange={e => setClassId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-sm"
                                    >
                                        <option value="">-- Chọn lớp --</option>
                                        {activeClasses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                                {c.maxCapacity ? ` (tối đa ${c.maxCapacity})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                            >
                                {loading ? "Đang xử lý..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Result step */
                    result && (
                        <div className="flex flex-col overflow-hidden">
                            {/* Summary */}
                            <div className="px-6 pt-5 pb-4 flex-none">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-emerald-50 rounded-xl p-3">
                                        <p className="text-2xl font-bold text-emerald-600">{result.assigned}</p>
                                        <p className="text-xs text-emerald-700 mt-0.5">Đã phân lớp</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-3">
                                        <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                                        <p className="text-xs text-amber-700 mt-0.5">Bỏ qua</p>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-3">
                                        <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                                        <p className="text-xs text-red-700 mt-0.5">Thất bại</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detail list */}
                            {(result.skipped > 0 || result.failed > 0) && (
                                <div className="px-6 pb-2 flex-none">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Chi tiết</p>
                                </div>
                            )}
                            <div className="overflow-y-auto px-6 flex-1 max-h-64">
                                <div className="space-y-1.5 pb-4">
                                    {result.details
                                        .filter(d => d.result !== "ASSIGNED")
                                        .map((d, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-start justify-between rounded-lg px-3 py-2 text-sm ${
                                                    d.result === "SKIPPED"
                                                        ? "bg-amber-50 text-amber-800"
                                                        : "bg-red-50 text-red-800"
                                                }`}
                                            >
                                                <span className="font-medium">{d.studentName}</span>
                                                <span className="text-xs ml-2 text-right shrink-0">{d.reason}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="px-6 pb-5 pt-3 flex-none">
                                <button
                                    onClick={handleClose}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>,
        document.body
    );
}
