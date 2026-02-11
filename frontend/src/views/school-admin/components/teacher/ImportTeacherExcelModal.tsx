import React, { useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type ImportTeacherResult } from "../../../../services/schoolAdminService";
import { XIcon } from "../../SchoolAdminIcons";

interface ImportTeacherExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onImportComplete: (result: ImportTeacherResult) => void;
}

function ImportTeacherExcelModal({ isOpen, onClose, onSuccess, onImportComplete }: ImportTeacherExcelModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
                setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Vui lòng chọn file Excel');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const importResult = await schoolAdminService.importTeachersFromExcel(file);

            if (importResult.successCount > 0) {
                onSuccess();
            }
            handleClose();
            onImportComplete(importResult);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không thể import file.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[100]">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Import giáo viên từ Excel</h2>
                        <button onClick={handleClose} className="text-white/80 hover:text-white">
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                        <p className="font-medium text-blue-800 mb-2">Hướng dẫn:</p>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li>File Excel phải có cột <strong>Họ tên</strong> (bắt buộc)</li>
                            <li>Các cột tùy chọn: Ngày sinh, Giới tính, Địa chỉ, Email, SĐT</li>
                            <li>Thông tin chuyên môn: Chuyên môn, Bằng cấp</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Upload Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto">
                        {/* File Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Chọn file Excel *
                            </label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="teacher-excel-file-input"
                                />
                                <label htmlFor="teacher-excel-file-input" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                        <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-slate-600">
                                            {file ? file.name : 'Click để chọn file hoặc kéo thả vào đây'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang import...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Import
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ImportTeacherExcelModal;
