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
                        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-8 py-5 flex-none text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold uppercase tracking-tight">Nhập điểm từ Excel</h1>
                                        {className && subjectName && (
                                            <p className="text-emerald-50 text-xs font-medium opacity-90 mt-0.5">{className} — {subjectName}</p>
                                        )}
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
                                    <p className="text-[11px] text-blue-600 mt-1 font-medium">File sẽ có sẵn danh sách học sinh và điểm đã nhập (nếu có)</p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={downloading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 shrink-0 uppercase tracking-widest disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    {downloading ? "Đang tải..." : "Tải mẫu"}
                                </button>
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

                            {/* Info Card */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-amber-600" />
                                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Lưu ý nhập điểm</p>
                                </div>
                                <ul className="text-[11px] text-amber-800/80 space-y-2 ml-4 list-disc font-medium leading-relaxed">
                                    <li>Chỉ nhập điểm cho các học sinh có tên trong danh sách.</li>
                                    <li>Điểm số phải nằm trong khoảng từ <span className="font-bold text-amber-900">0 đến 10</span>.</li>
                                    <li>Sử dụng dấu chấm <span className="font-bold text-amber-900">(.)</span> để ngăn cách phần thập phân.</li>
                                    <li>Đảm bảo không thay đổi cấu trúc các cột định dạng trong file mẫu.</li>
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
                                    onClick={handleUpload}
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

