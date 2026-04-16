import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, Download, X, FileSpreadsheet, AlertCircle, Info, Check, Users } from "lucide-react";
import { schoolAdminService, type ImportStudentResult } from "../../../../services/schoolAdminService";
import { semesterService, type AcademicYearDto } from "../../../../services/semesterService";
import { useToast } from "../../../../context/ToastContext";

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onImportComplete: (result: ImportStudentResult) => void;
}

const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose, onSuccess, onImportComplete }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [academicYearId, setAcademicYearId] = useState("");
    const [grade, setGrade] = useState(10);
    const [autoAssign, setAutoAssign] = useState(true);
    const [academicYears, setAcademicYears] = useState<AcademicYearDto[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showError } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchAcademicYears();
        }
    }, [isOpen]);

    const fetchAcademicYears = async () => {
        setLoadingYears(true);
        try {
            const years = await semesterService.listAcademicYears();
            const filtered = years.filter(y => y.status === 'ACTIVE' || y.status === 'UPCOMING');
            setAcademicYears(filtered);

            if (filtered.length > 0) {
                const activeYear = filtered.find(y => y.status === 'ACTIVE');
                setAcademicYearId(activeYear ? activeYear.id : filtered[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch academic years", err);
        } finally {
            setLoadingYears(false);
        }
    };

    const handleFileSelect = (selectedFile: File) => {
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/i)) {
            setError("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
            return;
        }
        setFile(selectedFile);
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setError("Vui lòng chọn file Excel");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const importResult = await schoolAdminService.importStudentsFromExcel(
                file,
                academicYearId,
                grade,
                autoAssign
            );

            if (importResult.successCount > 0) {
                onSuccess();
            }
            handleClose();
            onImportComplete(importResult);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể import file học sinh.");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await schoolAdminService.downloadStudentTemplate();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Mau_Import_HocSinh.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showError("Không thể tải file mẫu. Vui lòng thử lại sau.");
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        setDragOver(false);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col z-[100] animate-in zoom-in-95 duration-300 max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-8 py-5 flex-none text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-tight">Import học sinh từ Excel</h1>
                                <p className="text-emerald-50 text-xs font-medium opacity-90 mt-0.5">Thêm mới học sinh vào hệ thống</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Download Template Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Tải file mẫu</p>
                            <p className="text-[11px] text-blue-600 mt-1 font-medium">Sử dụng file mẫu để đảm bảo định dạng dữ liệu chính xác</p>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 shrink-0 uppercase tracking-widest"
                        >
                            <Download className="w-4 h-4" />
                            Tải mẫu
                        </button>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Năm học</label>
                            <select
                                value={academicYearId}
                                onChange={(e) => setAcademicYearId(e.target.value)}
                                disabled={loadingYears}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none bg-slate-50 font-bold text-slate-700 text-sm transition-all disabled:opacity-50"
                            >
                                {academicYears.length === 0 && <option value="">Đang tải...</option>}
                                {academicYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Khối lớp</label>
                            <select
                                value={grade}
                                onChange={(e) => setGrade(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none bg-slate-50 font-bold text-slate-700 text-sm transition-all"
                            >
                                <option value={10}>Khối 10</option>
                                <option value={11}>Khối 11</option>
                                <option value={12}>Khối 12</option>
                            </select>
                        </div>
                    </div>

                    {/* File Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group
                            ${dragOver ? "border-emerald-400 bg-emerald-50/50 scale-[1.01]" : file ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-100">
                                    <FileSpreadsheet className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight">{file.name}</p>
                                    <p className="text-[10px] font-black uppercase text-emerald-600 opacity-60 tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="px-4 py-2 mt-2 rounded-xl text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest"
                                >
                                    Thay đổi file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto group-hover:scale-110 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-all duration-300">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-700 font-bold uppercase tracking-[0.1em]">Kéo thả file Excel vào đây</p>
                                    <p className="text-[11px] text-slate-400 font-medium">hoặc bấm để chọn file từ máy tính (.xlsx, .xls)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Auto assign checkbox - MOVED DOWN */}
                    <div
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group/toggle ${autoAssign ? "bg-emerald-50/50 border-emerald-200 shadow-sm" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}
                        onClick={() => setAutoAssign(!autoAssign)}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${autoAssign ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-white text-slate-400 border border-slate-200"}`}>
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tùy chọn</p>
                            <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Tự động phân lớp</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${autoAssign ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 group-hover/toggle:border-slate-400"}`}>
                            {autoAssign && <Check size={14} strokeWidth={4} />}
                        </div>
                    </div>

                    {/* Instructions List */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Quy định file dữ liệu</p>
                        </div>
                        <ul className="text-[11px] text-amber-800/80 space-y-2 ml-4 list-disc font-medium leading-relaxed">
                            <li>Cột <span className="font-bold">Họ tên</span> học sinh là thông tin bắt buộc.</li>
                            <li>Ngày sinh phải nhập theo định dạng <span className="font-bold">DD/MM/YYYY</span>.</li>
                            <li>Giới tính chỉ nhận các giá trị: <span className="font-bold">Nam, Nữ</span>.</li>
                            <li>Thông tin Phụ huynh bao gồm: <span className="font-bold">Họ tên, SĐT, Quan hệ</span>.</li>
                        </ul>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold bg-red-50 text-red-700 border border-red-200 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex-none">
                    <div className="flex gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-white hover:shadow-md transition-all active:scale-95 uppercase text-xs tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || uploading}
                            className="flex-[1.5] px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black hover:shadow-xl hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95 uppercase text-xs tracking-widest"
                        >
                            {uploading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-5 h-5" strokeWidth={3} />
                            )}
                            {uploading ? "Đang xử lý..." : "Bắt đầu Import"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportExcelModal;
