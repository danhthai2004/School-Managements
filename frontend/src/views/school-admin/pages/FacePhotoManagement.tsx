import { useState, useEffect, useCallback, useRef } from "react";
import {
    facePhotoService,
    type FaceOverviewResponse,
    type ClassFaceStatusDto,
    type ClassFaceDetailResponse,
    type StudentFaceStatusDto,
    type StudentPhotosDto,
    type PhotoDto,
} from "../../../services/schoolAdminService";
import { Camera, Upload, Trash2, ChevronLeft, ChevronRight, X, Search, Users, CheckCircle, AlertCircle, Image, Eye, RefreshCw } from "lucide-react";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";

// ─── Helper Functions ────────────────────────────────

// Compress image before upload to speed up transfer & backend processing
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Keep original filename but ensure extension reflects format if we convert
                                const newFile = new File([blob], file.name, {
                                    type: "image/jpeg",
                                    lastModified: Date.now(),
                                });
                                resolve(newFile);
                            } else {
                                resolve(file); // fallback
                            }
                        },
                        "image/jpeg",
                        0.8 // 80% quality
                    );
                } else {
                    resolve(file); // fallback
                }
            };
            img.onerror = () => resolve(file); // fallback
        };
        reader.onerror = () => resolve(file); // fallback
    });
}

// ─── Helper Components ────────────────────────────────

function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 ${className}`}>
            <div
                className={`h-2.5 rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : pct > 0 ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────

type ViewMode = "overview" | "class-detail" | "student-photos";

export default function FacePhotoManagement() {
    // State
    const [viewMode, setViewMode] = useState<ViewMode>("overview");
    const [overview, setOverview] = useState<FaceOverviewResponse | null>(null);
    const [classDetail, setClassDetail] = useState<ClassFaceDetailResponse | null>(null);
    const [studentPhotos, setStudentPhotos] = useState<StudentPhotosDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [gradeFilter, setGradeFilter] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadStudentId, setUploadStudentId] = useState<string | null>(null);
    const [uploadStudentName, setUploadStudentName] = useState<string>("");
    const [previewImages, setPreviewImages] = useState<{ file: File; url: string }[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger?: boolean;
    }>({
        open: false,
        title: "",
        message: "",
        onConfirm: () => { },
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Breadcrumb navigation history
    const [selectedClassName, setSelectedClassName] = useState("");

    // ─── Data Loading ─────────────────────────────────

    const loadOverview = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await facePhotoService.getOverview();
            setOverview(data);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Không thể tải dữ liệu tổng quan");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    const loadClassDetail = useCallback(async (classId: string, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await facePhotoService.getClassDetail(classId);
            setClassDetail(data);
            setViewMode("class-detail");
        } catch (e: any) {
            setError(e?.response?.data?.message || "Không thể tải chi tiết lớp");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    const loadStudentPhotos = useCallback(async (studentId: string, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await facePhotoService.getStudentPhotos(studentId);
            setStudentPhotos(data);
            setViewMode("student-photos");
        } catch (e: any) {
            setError(e?.response?.data?.message || "Không thể tải ảnh học sinh");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { loadOverview(); }, [loadOverview]);

    // Auto-refresh seamlessly on window focus or interval
    useAutoRefresh(() => {
        if (viewMode === "overview") {
            loadOverview(true);
        } else if (viewMode === "class-detail" && classDetail) {
            loadClassDetail(classDetail.classId, true);
        } else if (viewMode === "student-photos" && studentPhotos) {
            loadStudentPhotos(studentPhotos.studentId, true);
        }
    }, { interval: 60000, revalidateOnFocus: true }); // Mức 1 + Mức 2 (Focus + 60s)

    // Toast auto-hide
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // ─── Upload Logic ─────────────────────────────────

    const openUploadModal = (studentId: string, studentName: string) => {
        setUploadStudentId(studentId);
        setUploadStudentName(studentName);
        setPreviewImages([]);
        setUploadModalOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newPreviews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
        setPreviewImages(prev => [...prev, ...newPreviews].slice(0, 10)); // Max 10
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removePreview = (idx: number) => {
        setPreviewImages(prev => {
            URL.revokeObjectURL(prev[idx].url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleUpload = async () => {
        if (!uploadStudentId || previewImages.length === 0) return;
        setUploading(true);
        try {
            let successCount = 0;
            let failCount = 0;
            let errorMessage = "";
            // Compress all images in parallel before sending
            const compressedFiles = await Promise.all(
                previewImages.map(p => compressImage(p.file))
            );

            if (compressedFiles.length === 1) {
                const result = await facePhotoService.uploadPhoto(uploadStudentId, compressedFiles[0]);
                if (result.success) {
                    successCount = 1;
                } else {
                    failCount = 1;
                    errorMessage = result.message;
                }
            } else {
                const result = await facePhotoService.bulkUpload(uploadStudentId, compressedFiles);
                successCount = result.successCount;
                failCount = result.failCount;
                if (failCount > 0 && result.results) {
                    const firstFail = result.results.find(r => !r.success);
                    if (firstFail) errorMessage = firstFail.message;
                }
            }

            if (failCount === 0) {
                setToast({ type: "success", message: `Đã upload ${successCount} ảnh thành công!` });
            } else if (successCount > 0) {
                setToast({ type: "success", message: `Upload ${successCount}/${successCount + failCount} ảnh thành công (${failCount} thất bại). ${errorMessage ? "Chi tiết lỗi: " + errorMessage : ""}` });
            } else {
                setToast({ type: "error", message: errorMessage || "Không thể upload ảnh. Vui lòng thử lại." });
            }

            setUploadModalOpen(false);
            // Refresh current view
            if (viewMode === "student-photos") {
                loadStudentPhotos(uploadStudentId);
            } else if (viewMode === "class-detail" && classDetail) {
                loadClassDetail(classDetail.classId);
            }
            loadOverview();
        } catch (e: any) {
            setToast({ type: "error", message: e?.response?.data?.message || e?.response?.data?.detail || "Upload thất bại" });
        } finally {
            setUploading(false);
        }
    };

    // ─── Delete Logic ─────────────────────────────────

    const handleDeletePhoto = (studentId: string, photo: PhotoDto) => {
        setConfirmModal({
            open: true,
            title: "Xác nhận xóa ảnh",
            message: "Bạn có chắc chắn muốn xóa ảnh khuôn mặt này? Hành động này không thể hoàn tác.",
            isDanger: true,
            onConfirm: async () => {
                const originalPhotos = studentPhotos;
                try {
                    // Optimistic UI update
                    if (studentPhotos) {
                        setStudentPhotos({
                            ...studentPhotos,
                            photos: studentPhotos.photos.filter(p => p.id !== photo.id),
                            totalPhotos: studentPhotos.totalPhotos - 1
                        });
                    }

                    await facePhotoService.deletePhoto(studentId, photo.id);
                    setToast({ type: "success", message: "Đã xóa ảnh thành công" });
                    loadOverview();
                } catch (e: any) {
                    setStudentPhotos(originalPhotos); // Rollback
                    setToast({ type: "error", message: "Không thể xóa ảnh. Vui lòng thử lại." });
                } finally {
                    setConfirmModal(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleDeleteAllPhotos = (studentId: string, studentName: string) => {
        setConfirmModal({
            open: true,
            title: "Xóa toàn bộ ảnh",
            message: `Bạn có chắc chắn muốn xóa TẤT CẢ ảnh khuôn mặt của học sinh ${studentName}? Học sinh sẽ không thể điểm danh bằng khuôn mặt sau khi xóa.`,
            isDanger: true,
            onConfirm: async () => {
                try {
                    await facePhotoService.deleteAllPhotos(studentId);
                    setToast({ type: "success", message: `Đã xóa toàn bộ ảnh của ${studentName}` });
                    if (viewMode === "student-photos") {
                        loadStudentPhotos(studentId);
                    } else if (classDetail) {
                        loadClassDetail(classDetail.classId);
                    }
                    loadOverview();
                } catch (e: any) {
                    setToast({ type: "error", message: "Không thể xóa ảnh. Vui lòng thử lại." });
                } finally {
                    setConfirmModal(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    // ─── Render ───────────────────────────────────────

    const filteredClasses = overview?.classes?.filter(c => {
        const matchSearch = c.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.homeroomTeacherName || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchGrade = gradeFilter === null || c.grade === gradeFilter;
        return matchSearch && matchGrade;
    }) || [];

    const grades = [...new Set(overview?.classes?.map(c => c.grade) || [])].sort();

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70" title="Đóng thông báo"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <button onClick={() => { setViewMode("overview"); setSearchTerm(""); }} className={`hover:text-blue-600 ${viewMode === "overview" ? "text-gray-900 dark:text-white font-semibold" : ""}`}>
                    Ảnh khuôn mặt
                </button>
                {viewMode !== "overview" && (
                    <>
                        <ChevronRight className="w-4 h-4" />
                        <button onClick={() => { if (classDetail) { loadClassDetail(classDetail.classId); } }} className={`hover:text-blue-600 ${viewMode === "class-detail" ? "text-gray-900 dark:text-white font-semibold" : ""}`}>
                            {selectedClassName}
                        </button>
                    </>
                )}
                {viewMode === "student-photos" && studentPhotos && (
                    <>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-gray-900 dark:text-white font-semibold">{studentPhotos.studentName}</span>
                    </>
                )}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {viewMode !== "overview" && (
                        <button
                            onClick={() => {
                                if (viewMode === "student-photos" && classDetail) {
                                    loadClassDetail(classDetail.classId);
                                } else {
                                    setViewMode("overview");
                                }
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Quay lại"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {viewMode === "overview" && "Quản lý ảnh khuôn mặt"}
                            {viewMode === "class-detail" && classDetail && `Lớp ${classDetail.className}`}
                            {viewMode === "student-photos" && studentPhotos && studentPhotos.studentName}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {viewMode === "overview" && "Phục vụ tính năng điểm danh bằng nhận diện khuôn mặt"}
                            {viewMode === "class-detail" && classDetail && `${classDetail.totalRegistered}/${classDetail.totalStudents} học sinh đã đăng ký`}
                            {viewMode === "student-photos" && studentPhotos && `${studentPhotos.totalPhotos} ảnh đã đăng ký`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (viewMode === "overview") loadOverview();
                        else if (viewMode === "class-detail" && classDetail) loadClassDetail(classDetail.classId);
                        else if (viewMode === "student-photos" && studentPhotos) loadStudentPhotos(studentPhotos.studentId);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Views */}
            {viewMode === "overview" && <OverviewView overview={overview} loading={loading} filteredClasses={filteredClasses} searchTerm={searchTerm} setSearchTerm={setSearchTerm} gradeFilter={gradeFilter} setGradeFilter={setGradeFilter} grades={grades} onClassClick={(c) => { setSelectedClassName(c.className); loadClassDetail(c.classId); }} />}
            {viewMode === "class-detail" && <ClassDetailView detail={classDetail} loading={loading} onStudentClick={(s) => loadStudentPhotos(s.studentId)} onUploadClick={(s) => openUploadModal(s.studentId, s.studentName)} onDeleteAll={(s) => handleDeleteAllPhotos(s.studentId, s.studentName)} />}
            {viewMode === "student-photos" && <StudentPhotosView photos={studentPhotos} loading={loading} onUpload={() => { if (studentPhotos) openUploadModal(studentPhotos.studentId, studentPhotos.studentName); }} onDeletePhoto={(p) => { if (studentPhotos) handleDeletePhoto(studentPhotos.studentId, p); }} onDeleteAll={() => { if (studentPhotos) handleDeleteAllPhotos(studentPhotos.studentId, studentPhotos.studentName); }} onImageClick={(url) => setLightboxUrl(url)} />}

            {/* Upload Modal */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload ảnh khuôn mặt</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{uploadStudentName}</p>
                            </div>
                            <button onClick={() => setUploadModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Đóng cửa sổ">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Drop zone */}
                            <div
                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-blue-400"); }}
                                onDragLeave={e => { e.currentTarget.classList.remove("border-blue-400"); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("border-blue-400");
                                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                                    const newPreviews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
                                    setPreviewImages(prev => [...prev, ...newPreviews].slice(0, 10));
                                }}
                            >
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Kéo thả ảnh vào đây hoặc click để chọn</p>
                                <p className="text-xs text-gray-400 mt-1">Tối đa 10 ảnh, mỗi ảnh ≤ 10MB. Nên chụp rõ mặt, đủ ánh sáng.</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} title="Chọn ảnh tải lên" />

                            {/* Previews */}
                            {previewImages.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {previewImages.map((p, i) => (
                                        <div key={i} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200 dark:border-gray-700">
                                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Xóa ảnh này"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {previewImages.length} ảnh đã chọn
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setUploadModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading || previewImages.length === 0}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Upload ({previewImages.length})
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`h-2 ${confirmModal.isDanger ? "bg-red-500" : "bg-blue-500"}`} />
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${confirmModal.isDanger ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                                    <AlertCircle className={`w-6 h-6 ${confirmModal.isDanger ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {confirmModal.title}
                                    </h3>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`flex-1 px-4 py-3 text-sm font-semibold text-white rounded-xl shadow-lg transition-all transform active:scale-95 ${confirmModal.isDanger ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-200 dark:shadow-red-900/20" : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-200 dark:shadow-blue-900/20"}`}
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
                    <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg" title="Đóng ảnh lớn">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={lightboxUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// ─── Overview View ────────────────────────────────────

function OverviewView({
    overview, loading, filteredClasses, searchTerm, setSearchTerm,
    gradeFilter, setGradeFilter, grades, onClassClick
}: {
    overview: FaceOverviewResponse | null;
    loading: boolean;
    filteredClasses: ClassFaceStatusDto[];
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    gradeFilter: number | null;
    setGradeFilter: (v: number | null) => void;
    grades: number[];
    onClassClick: (c: ClassFaceStatusDto) => void;
}) {
    if (loading && !overview) return <LoadingSkeleton />;

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} label="Tổng học sinh" value={overview?.totalStudents || 0} color="bg-blue-100 dark:bg-blue-900/40" />
                <StatCard icon={<CheckCircle className="w-6 h-6 text-green-600" />} label="Đã đăng ký" value={overview?.totalRegistered || 0} sub={`${overview?.registrationPercentage || 0}%`} color="bg-green-100 dark:bg-green-900/40" />
                <StatCard icon={<AlertCircle className="w-6 h-6 text-amber-600" />} label="Chưa đăng ký" value={overview?.totalUnregistered || 0} color="bg-amber-100 dark:bg-amber-900/40" />
                <StatCard
                    icon={<Camera className="w-6 h-6 text-purple-600" />}
                    label="Lớp hoàn thành"
                    value={`${overview?.classes?.filter(c => c.registered === c.totalStudents && c.totalStudents > 0).length || 0}/${overview?.classes?.length || 0}`}
                    color="bg-purple-100 dark:bg-purple-900/40"
                />
            </div>

            {/* Overall Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiến độ đăng ký toàn trường</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{overview?.registrationPercentage || 0}%</span>
                </div>
                <ProgressBar value={overview?.totalRegistered || 0} max={overview?.totalStudents || 0} />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm lớp hoặc GVCN..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setGradeFilter(null)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${gradeFilter === null ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 font-medium" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    >
                        Tất cả
                    </button>
                    {grades.map(g => (
                        <button
                            key={g}
                            onClick={() => setGradeFilter(g)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${gradeFilter === g ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 font-medium" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                            Khối {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Class Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lớp</th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GVCN</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sĩ số</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Đã đăng ký</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chưa đăng ký</th>
                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Tiến độ</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredClasses.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    {loading ? "Đang tải..." : "Không tìm thấy lớp nào"}
                                </td>
                            </tr>
                        )}
                        {filteredClasses.map(cls => {
                            const pct = cls.totalStudents > 0 ? Math.round((cls.registered / cls.totalStudents) * 100) : 0;
                            return (
                                <tr key={cls.classId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => onClassClick(cls)}>
                                    <td className="px-5 py-3.5">
                                        <span className="font-semibold text-gray-900 dark:text-white">{cls.className}</span>
                                        <span className="ml-2 text-xs text-gray-400">Khối {cls.grade}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{cls.homeroomTeacherName || "—"}</td>
                                    <td className="px-5 py-3.5 text-center text-sm font-medium text-gray-900 dark:text-white">{cls.totalStudents}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{cls.registered}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className={`text-sm font-medium ${cls.unregistered > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>{cls.unregistered}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <ProgressBar value={cls.registered} max={cls.totalStudents} className="flex-1" />
                                            <span className="text-xs font-medium text-gray-500 w-10 text-right">{pct}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                                            Chi tiết →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Class Detail View ────────────────────────────────

function ClassDetailView({
    detail, loading, onStudentClick, onUploadClick, onDeleteAll
}: {
    detail: ClassFaceDetailResponse | null;
    loading: boolean;
    onStudentClick: (s: StudentFaceStatusDto) => void;
    onUploadClick: (s: StudentFaceStatusDto) => void;
    onDeleteAll: (s: StudentFaceStatusDto) => void;
}) {
    const [filter, setFilter] = useState<"all" | "registered" | "unregistered">("all");

    if (loading || !detail) return <LoadingSkeleton />;

    const filtered = detail.students.filter(s => {
        if (filter === "registered") return s.isRegistered;
        if (filter === "unregistered") return !s.isRegistered;
        return true;
    });

    return (
        <>
            {/* Class Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} label="Tổng học sinh" value={detail.totalStudents} color="bg-blue-100 dark:bg-blue-900/40" />
                <StatCard icon={<CheckCircle className="w-6 h-6 text-green-600" />} label="Đã đăng ký" value={detail.totalRegistered} sub={`${detail.totalStudents > 0 ? Math.round((detail.totalRegistered / detail.totalStudents) * 100) : 0}%`} color="bg-green-100 dark:bg-green-900/40" />
                <StatCard icon={<AlertCircle className="w-6 h-6 text-amber-600" />} label="Chưa đăng ký" value={detail.totalUnregistered} color="bg-amber-100 dark:bg-amber-900/40" />
            </div>

            {/* Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiến độ lớp</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {detail.totalStudents > 0 ? Math.round((detail.totalRegistered / detail.totalStudents) * 100) : 0}%
                    </span>
                </div>
                <ProgressBar value={detail.totalRegistered} max={detail.totalStudents} />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {([["all", "Tất cả", detail.totalStudents], ["registered", "Đã đăng ký", detail.totalRegistered], ["unregistered", "Chưa đăng ký", detail.totalUnregistered]] as const).map(
                    ([key, label, count]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${filter === key ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 font-medium" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                            {label} ({count})
                        </button>
                    )
                )}
            </div>

            {/* Student List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Học sinh</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mã HS</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Số ảnh</th>
                            <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filtered.map(s => (
                            <tr key={s.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {s.avatarUrl ? (
                                                <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{(s.studentName || "?")[0]}</span>
                                            )}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{s.studentName}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-center text-sm text-gray-500 dark:text-gray-400">{s.studentCode}</td>
                                <td className="px-5 py-3.5 text-center">
                                    {s.isRegistered ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                            <CheckCircle className="w-3 h-3" /> Đã đăng ký
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                                            <AlertCircle className="w-3 h-3" /> Chưa đăng ký
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`text-sm font-medium ${s.imageCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                                        {s.imageCount} ảnh
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onStudentClick(s)}
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Xem ảnh"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUploadClick(s); }}
                                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            title="Upload ảnh"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                        {s.isRegistered && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteAll(s); }}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Xóa tất cả ảnh"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Student Photos View ──────────────────────────────

function StudentPhotosView({
    photos, loading, onUpload, onDeletePhoto, onDeleteAll, onImageClick
}: {
    photos: StudentPhotosDto | null;
    loading: boolean;
    onUpload: () => void;
    onDeletePhoto: (p: PhotoDto) => void;
    onDeleteAll: () => void;
    onImageClick: (url: string) => void;
}) {
    if (loading || !photos) return <LoadingSkeleton />;

    return (
        <>
            {/* Student Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {photos.avatarUrl ? (
                            <img src={photos.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-medium text-gray-500 dark:text-gray-400">{(photos.studentName || "?")[0]}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{photos.studentName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Mã HS: {photos.studentCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onUpload}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Upload ảnh
                    </button>
                    {photos.totalPhotos > 0 && (
                        <button
                            onClick={onDeleteAll}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xóa tất cả
                        </button>
                    )}
                </div>
            </div>

            {/* Photos Grid */}
            {photos.totalPhotos === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Image className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa có ảnh nào được đăng ký</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nên upload 3-5 ảnh để đảm bảo độ chính xác nhận diện</p>
                    <button
                        onClick={onUpload}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Upload ảnh đầu tiên
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {photos.photos.map(p => (
                        <div key={p.id} className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer" onClick={() => p.imageUrl && onImageClick(p.imageUrl)}>
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Image className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {p.qualityScore != null && (
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${p.qualityScore >= 0.7 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : p.qualityScore >= 0.4 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                                                {Math.round(p.qualityScore * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onDeletePhoto(p)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Xóa ảnh"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {p.createdAt && (
                                    <p className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tip */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Mẹo: Để đạt độ chính xác tốt nhất</p>
                    <ul className="mt-1 space-y-0.5 text-blue-600 dark:text-blue-400">
                        <li>• Upload 3-5 ảnh cho mỗi học sinh</li>
                        <li>• Ảnh nên rõ mặt, đủ ánh sáng, chụp thẳng</li>
                        <li>• Nên có ảnh từ nhiều góc độ khác nhau</li>
                    </ul>
                </div>
            </div>
        </>
    );
}

// ─── Skeleton ─────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-24" />
                ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-12" />
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-96" />
        </div>
    );
}
