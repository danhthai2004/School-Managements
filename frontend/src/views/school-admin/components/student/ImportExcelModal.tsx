import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type ImportStudentResult } from "../../../../services/schoolAdminService";
import { semesterService, type AcademicYearDto } from "../../../../services/semesterService";
import { XIcon } from "../../SchoolAdminIcons";

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onImportComplete: (result: ImportStudentResult) => void;
    defaultAcademicYear: string;
}

function ImportExcelModal({ isOpen, onClose, onSuccess, onImportComplete, defaultAcademicYear }: ImportExcelModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
    const [grade, setGrade] = useState(10);
    const [autoAssign, setAutoAssign] = useState(true);
    const [academicYears, setAcademicYears] = useState<AcademicYearDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            // If current academicYear is not in the list, try to find the ACTIVE one
            if (filtered.length > 0) {
                const activeYear = filtered.find(y => y.status === 'ACTIVE');
                if (activeYear && !academicYear) {
                    setAcademicYear(activeYear.name);
                } else if (!academicYear) {
                    setAcademicYear(filtered[0].name);
                }
            }
        } catch (err) {
            console.error("Failed to fetch academic years", err);
        } finally {
            setLoadingYears(false);
        }
    };

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
            const importResult = await schoolAdminService.importStudentsFromExcel(
                file,
                academicYear,
                grade,
                autoAssign
            );

            if (importResult.successCount > 0) {
                onSuccess();
            }
            // Close form immediately and show toast
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
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex-none z-[110]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Import học sinh từ Excel</h2>
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
                            <li>Các cột tùy chọn: Ngày sinh, Giới tính, Ban, Nơi sinh, Địa chỉ, Email, SĐT</li>
                            <li>Thông tin phụ huynh: Họ tên, SĐT, Quan hệ</li>
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
                                    id="excel-file-input"
                                />
                                <label htmlFor="excel-file-input" className="cursor-pointer">
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

                        {/* Options Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Năm học</label>
                                <select
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    disabled={loadingYears}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 outline-none bg-white disabled:bg-slate-50"
                                >
                                    {academicYears.length === 0 && <option value="">Đang tải...</option>}
                                    {academicYears.map(y => (
                                        <option key={y.id} value={y.name}>
                                            {y.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Khối lớp</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value={10}>Khối 10</option>
                                    <option value={11}>Khối 11</option>
                                    <option value={12}>Khối 12</option>
                                </select>
                            </div>
                        </div>

                        {/* Auto assign */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoAssign}
                                onChange={(e) => setAutoAssign(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                                <span className="font-medium text-slate-700">Tự động phân lớp</span>
                                <p className="text-xs text-slate-500">Hệ thống sẽ tự động phân bổ học sinh vào các lớp còn chỗ</p>
                            </div>
                        </label>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                            >
                                {loading ? 'Đang import...' : 'Import'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ImportExcelModal;
