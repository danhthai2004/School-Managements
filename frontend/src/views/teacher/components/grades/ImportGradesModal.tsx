import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, Download, X, FileSpreadsheet, AlertCircle, Info } from "lucide-react";
import { teacherService } from "../../../../services/teacherService";
import type { GradeImportResult } from "../../../../services/teacherService";
import ImportGradesResultModal from "./ImportGradesResultModal";

type ImportGradesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classId: string;
    subjectId: string;
    semesterId: string;
    className?: string;
    subjectName?: string;
};

const ImportGradesModal: React.FC<ImportGradesModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    classId,
    subjectId,
    semesterId,
    className,
    subjectName
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [result, setResult] = useState<GradeImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
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
        setResult(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const importResult = await teacherService.importGrades(file, classId, subjectId, semesterId, true);
            setResult(importResult);
        } catch (err: any) {
            setError(err.response?.data?.message || "Có lỗi xảy ra khi import điểm.");
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmSave = async () => {
        if (!result?.previewData) return;
        setUploading(true); // reusing uploading state as saving state
        try {
            await teacherService.saveGrades({
                classId,
                subjectId,
                semesterId,
                students: result.previewData
            });
            onSuccess(); // Refresh grade table
            handleClose(); // Close all
        } catch (err: any) {
            alert(err.response?.data?.message || "Có lỗi khi lưu điểm.");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        setDownloading(true);
        try {
            await teacherService.downloadGradeTemplate(classId, subjectId, semesterId);
        } catch (err: any) {
            setError(err.response?.data?.message || "Không thể tải file mẫu.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col z-[100] animate-in zoom-in-95 duration-300 max-h-[85vh]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-5 flex-none text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-50" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold tracking-tight">Nhập điểm từ Excel</h1>
                                        {className && subjectName && (
                                            <p className="text-emerald-50/80 text-xs font-medium mt-0.5">{className} • {subjectName}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleClose} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Download Template Section */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Download className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">Tải file mẫu</p>
                                        <p className="text-[11px] text-blue-600/70 mt-0.5 font-medium">Gồm danh sách học sinh & điểm đã có</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={downloading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 shrink-0 disabled:opacity-50"
                                >
                                    {downloading ? "Đang tải..." : "Tải ngay"}
                                </button>
                            </div>

                            {/* File Drop Zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group relative overflow-hidden
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
                                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-100/50">
                                            <FileSpreadsheet className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 tracking-tight">{file.name}</p>
                                            <p className="text-xs font-bold text-emerald-600/60 mt-1 uppercase tracking-wider">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="px-4 py-2 mt-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
                                        >
                                            Chọn file khác
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto group-hover:scale-110 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all duration-300 shadow-inner">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600 font-bold">Kéo thả file Excel vào đây</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">hoặc click để chọn file từ máy tính</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Card - Softened colors */}
                            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-amber-600" />
                                    <p className="text-sm font-bold text-amber-800">Lưu ý nhập điểm</p>
                                </div>
                                <ul className="text-[11px] text-amber-800/70 space-y-2 ml-4 list-disc font-medium leading-relaxed">
                                    <li>Chỉ nhập điểm cho học sinh trong danh sách mặc định.</li>
                                    <li>Điểm số hợp lệ trong khoảng từ <span className="font-bold text-amber-900">0 đến 10</span>.</li>
                                    <li>Sử dụng dấu chấm <span className="font-bold text-amber-900">(.)</span> cho phần thập phân.</li>
                                    <li><span className="font-bold text-rose-600">Tuyệt đối không</span> thay đổi cấu trúc các cột/dòng mẫu.</li>
                                </ul>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-in slide-in-from-top-2 shadow-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex-none">
                            <div className="flex gap-4">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-white hover:border-slate-300 transition-all text-sm"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    className="flex-[1.5] px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-sm"
                                >
                                    {uploading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-5 h-5" strokeWidth={2.5} />
                                    )}
                                    {uploading ? "Đang xử lý..." : "Bắt đầu Import"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ImportGradesResultModal
                result={result}
                onClose={handleClose}
                onRetry={handleReset}
                onConfirmSave={handleConfirmSave}
                isSaving={uploading}
            />
        </>
    );
};

export default ImportGradesModal;

