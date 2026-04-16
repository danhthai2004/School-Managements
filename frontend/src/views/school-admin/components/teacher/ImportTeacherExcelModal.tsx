import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, Download, X, FileSpreadsheet, AlertCircle, Info } from "lucide-react";
import { schoolAdminService, type ImportTeacherResult } from "../../../../services/schoolAdminService";
import { useToast } from "../../../../context/ToastContext";

interface ImportTeacherExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onImportComplete: (result: ImportTeacherResult) => void;
}

const ImportTeacherExcelModal: React.FC<ImportTeacherExcelModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onImportComplete
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showError } = useToast();

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
            const importResult = await schoolAdminService.importTeachersFromExcel(file);

            if (importResult.successCount > 0) {
                onSuccess();
            }
            handleClose();
            onImportComplete(importResult);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Không thể import file giáo viên.");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await schoolAdminService.downloadTeacherTemplate();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Mau_Import_GiaoVien.xlsx');
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
                                <h1 className="text-xl font-bold uppercase tracking-tight">Import giáo viên từ Excel</h1>
                                <p className="text-emerald-50 text-xs font-medium opacity-90 mt-0.5">Thêm mới giáo viên vào hệ thống</p>
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

                    {/* File Drop Zone */}
                    <div
                        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group
                            ${dragOver ? "border-emerald-400 bg-emerald-50/50 scale-[1.01]" : file ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
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

                    {/* Instructions List */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Quy định file dữ liệu</p>
                        </div>
                        <ul className="text-[11px] text-amber-800/80 space-y-2 ml-4 list-disc font-medium leading-relaxed">
                            <li>Cột <span className="font-bold">Họ tên</span> giáo viên là thông tin bắt buộc.</li>
                            <li>Cột <span className="font-bold">Chuyên môn</span> dùng để xác định Môn học (Văn, Toán, Lý...).</li>
                            <li>Các cột tùy chọn: <span className="font-bold">Ngày sinh, Giới tính, Địa chỉ, Email, SĐT</span>.</li>
                            <li>Dữ liệu phải đúng theo cấu trúc file mẫu để hệ thống nhận diện chính xác.</li>
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

export default ImportTeacherExcelModal;
