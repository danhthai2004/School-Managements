import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { teacherService, type FaceStudentStatus, type FaceRegistrationStatus } from "../../../services/teacherService";
import type { StudentPhotosDto } from "../../../services/schoolAdminService";
import { Camera, Upload, Trash2, CheckCircle, AlertCircle, X, ImagePlus, Loader2, Image, ChevronLeft, Info } from "lucide-react";
import { useConfirmation } from "../../../hooks/useConfirmation";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { compressImage } from "../../../utils/imageUtils";

export default function FaceDataPage() {
    const [data, setData] = useState<FaceRegistrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<FaceStudentStatus | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    
    // Photo Viewer State
    const [viewMode, setViewMode] = useState<"list" | "photos">("list");
    const [viewingPhotos, setViewingPhotos] = useState<StudentPhotosDto | null>(null);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const { confirm, ConfirmationDialog } = useConfirmation();

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const result = await teacherService.getFaceStatus();
            setData(result);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Không thể tải dữ liệu";
            if (msg.includes("403")) {
                setError("Bạn không phải là giáo viên chủ nhiệm. Chức năng này chỉ dành cho GVCN.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh seamlessly on window focus or interval
    useAutoRefresh(() => {
        fetchData();
    }, { interval: 60000, revalidateOnFocus: true });

    const handleDelete = (student: FaceStudentStatus) => {
        confirm({
            title: "Xóa dữ liệu khuôn mặt",
            message: `Bạn có chắc muốn xóa toàn bộ dữ liệu khuôn mặt của ${student.studentName}? Hệ thống sẽ không thể nhận diện học sinh này khi điểm danh.`,
            confirmText: "Xóa",
            variant: "danger",
            onConfirm: async () => {
                await teacherService.deleteFaceData(student.studentId);
                await fetchData();
            },
        });
    };

    const openPhotoViewer = async (studentId: string) => {
        setLoadingPhotos(true);
        try {
            const res = await teacherService.getStudentPhotos(studentId);
            setViewingPhotos(res);
            setViewMode("photos");
        } catch (err: any) {
            setToast({ type: "error", message: "Không thể tải danh sách ảnh" });
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!viewingPhotos) return;
        confirm({
            title: "Xóa ảnh này?",
            message: "Hành động này không thể hoàn tác.",
            confirmText: "Xóa",
            variant: "danger",
            onConfirm: async () => {
                try {
                    await teacherService.deleteStudentPhoto(viewingPhotos.studentId, photoId);
                    setViewingPhotos(prev => prev ? { ...prev, photos: prev.photos.filter(p => Number(p.id) !== photoId), totalPhotos: prev.totalPhotos - 1 } : null);
                    // Update main data list
                    setData(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            students: prev.students.map(s => s.studentId === viewingPhotos.studentId ? { ...s, imageCount: s.imageCount - 1, registered: s.imageCount > 1 } : s)
                        };
                    });
                    setToast({ type: "success", message: "Đã xóa ảnh" });
                } catch (err: any) {
                    setToast({ type: "error", message: "Lỗi khi xóa ảnh" });
                }
            }
        });
    };

    const handleDeleteAllPhotos = async () => {
        if (!viewingPhotos) return;
        confirm({
            title: "Xóa dữ liệu khuôn mặt",
            message: `Bạn có chắc muốn xóa toàn bộ dữ liệu khuôn mặt của ${viewingPhotos.studentName}? Hệ thống sẽ không thể nhận diện học sinh này khi điểm danh.`,
            confirmText: "Xóa",
            variant: "danger",
            onConfirm: async () => {
                await teacherService.deleteFaceData(viewingPhotos.studentId);
                await fetchData();
                setViewMode("list");
                setViewingPhotos(null);
                setToast({ type: "success", message: "Đã xóa toàn bộ dữ liệu" });
            },
        });
    };

    const filteredStudents = data?.students?.filter(s =>
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-3">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-center max-w-md">{error}</p>
            </div>
        );
    }

    if (viewMode === "photos" && viewingPhotos) {
        return (
            <div className="animate-fade-in-up space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    <button onClick={() => { setViewMode("list"); setViewingPhotos(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="hover:text-indigo-600 cursor-pointer" onClick={() => { setViewMode("list"); setViewingPhotos(null); }}>Danh sách lớp</span>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Chi tiết ảnh</span>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {viewingPhotos.avatarUrl ? (
                            <img src={viewingPhotos.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                        ) : (
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xl font-bold uppercase shadow-sm">
                                {viewingPhotos.studentName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {viewingPhotos.studentName}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Mã HS: {viewingPhotos.studentCode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedStudent({ 
                                studentId: viewingPhotos.studentId, 
                                studentName: viewingPhotos.studentName, 
                                studentCode: viewingPhotos.studentCode, 
                                registered: true, 
                                imageCount: viewingPhotos.photos.length 
                            } as FaceStudentStatus)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Upload ảnh
                        </button>
                        {viewingPhotos.photos.length > 0 && (
                            <button
                                onClick={handleDeleteAllPhotos}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Xóa tất cả
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 min-h-[500px]">
                    {viewingPhotos.photos.length === 0 ? (
                        <div className="text-center py-20">
                            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Chưa có ảnh nào được đăng ký</p>
                            <p className="text-sm text-gray-400 mt-1">Bạn có thể quay lại trang danh sách để tải ảnh lên.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {viewingPhotos.photos.map(p => (
                                <div key={p.id} className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer" onClick={() => p.imageUrl && setLightboxUrl(p.imageUrl)}>
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
                                                onClick={() => handleDeletePhoto(Number(p.id))}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Xóa ảnh"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        {p.createdAt && (
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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

                {/* Lightbox */}
                {lightboxUrl && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
                        <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg" title="Đóng ảnh lớn">
                            <X className="w-6 h-6" />
                        </button>
                        <img src={lightboxUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    </div>,
                    document.body
                )}

                <ConfirmationDialog />

                {/* Toast */}
                {toast && createPortal(
                    <div className={`fixed top-4 right-4 z-[99999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all animate-fade-in-down ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                        {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p>{toast.message}</p>
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70" title="Đóng thông báo">
                            <X className="w-4 h-4" />
                        </button>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Camera className="w-7 h-7 text-indigo-600" />
                        Quản lý Dữ liệu Khuôn mặt
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Upload ảnh học sinh để phục vụ điểm danh bằng khuôn mặt</p>
                </div>
            </div>

            {/* Tip Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <strong>Hướng dẫn:</strong> Mỗi học sinh cần từ <strong>3-5 ảnh</strong> chụp rõ mặt ở các góc khác nhau (thẳng, nghiêng trái, nghiêng phải).
                    Ảnh phải đủ sáng, không đeo khẩu trang, không đeo kính râm.
                </div>
            </div>

            {/* Stats Row */}
            {data && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500">Tổng học sinh</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalStudents}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                        <p className="text-sm text-green-600">Đã có dữ liệu</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{data.totalRegistered}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                        <p className="text-sm text-amber-600">Chưa có dữ liệu</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{data.totalUnregistered}</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Danh sách học sinh</h2>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc mã HS..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-5 py-3">STT</th>
                                <th className="px-5 py-3">Mã HS</th>
                                <th className="px-5 py-3">Họ và tên</th>
                                <th className="px-5 py-3 text-center">Trạng thái</th>
                                <th className="px-5 py-3 text-center">Số ảnh</th>
                                <th className="px-5 py-3 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.map((student, index) => (
                                <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3.5 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{student.studentCode}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            {student.avatarUrl ? (
                                                <img src={student.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" />
                                            ) : (
                                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                                                    {student.studentName.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-gray-900">{student.studentName}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        {student.registered ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                                                <CheckCircle className="w-3.5 h-3.5" /> Đã có
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                                                <AlertCircle className="w-3.5 h-3.5" /> Chưa có
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <button
                                            onClick={() => openPhotoViewer(student.studentId)}
                                            disabled={student.imageCount === 0 || loadingPhotos}
                                            className={`text-sm font-medium ${student.imageCount > 0 ? "text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" : "text-gray-400 cursor-default"}`}
                                        >
                                            {loadingPhotos && viewingPhotos?.studentId === student.studentId ? (
                                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500" />
                                            ) : student.imageCount > 0 ? `${student.imageCount} ảnh` : "-"}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setSelectedStudent(student)}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                            >
                                                <Upload className="w-3.5 h-3.5" /> Upload
                                            </button>
                                            {student.registered && (
                                                <button
                                                    onClick={() => handleDelete(student)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                                        Không tìm thấy học sinh nào
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {selectedStudent && (
                <FaceUploadModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onSuccess={() => {
                        setSelectedStudent(null);
                        fetchData();
                    }}
                    onShowToast={(msg) => setToast({ type: "success", message: msg })}
                />
            )}

            {/* Lightbox */}
            {lightboxUrl && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
                    <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg" title="Đóng ảnh lớn">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={lightboxUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>,
                document.body
            )}

            <ConfirmationDialog />

            {/* Toast */}
            {toast && createPortal(
                <div className={`fixed top-4 right-4 z-[99999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all animate-fade-in-down ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p>{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70" title="Đóng thông báo">
                        <X className="w-4 h-4" />
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}



// ==================== UPLOAD MODAL ====================

function FaceUploadModal({ student, onClose, onSuccess, onShowToast }: {
    student: FaceStudentStatus;
    onClose: () => void;
    onSuccess: () => void;
    onShowToast: (msg: string) => void;
}) {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ success: number; fail: number } | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const MAX_FILES = 10; // Match School Admin limit

    const handleFiles = useCallback((newFiles: FileList | File[]) => {
        const fileArray = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
        const combined = [...files, ...fileArray].slice(0, MAX_FILES);
        setFiles(combined);

        // Generate previews
        const newPreviews: string[] = [];
        combined.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews.push(reader.result as string);
                if (newPreviews.length === combined.length) {
                    setPreviews([...newPreviews]);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [files]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setResult(null);
        setErrorDetail(null);
        try {
            // Compress images before upload (like School Admin)
            const compressedFiles = await Promise.all(files.map(compressImage));
            const res = await teacherService.registerFace(student.studentId, compressedFiles);
            setResult({ success: res.successCount, fail: res.failCount });

            // Extract first error message from details if any failed
            if (res.failCount > 0 && res.details) {
                const firstFail = res.details.find((d: Record<string, unknown>) => d.success === false);
                if (firstFail) {
                    setErrorDetail((firstFail.message as string) || (firstFail.error as string) || "Ảnh không hợp lệ");
                }
            }

            if (res.successCount > 0) {
                onShowToast(`Đã upload ${res.successCount} ảnh thành công!`);
            }

            if (res.failCount === 0) {
                setTimeout(() => onSuccess(), 500);
            }
        } catch {
            setResult({ success: 0, fail: files.length });
            setErrorDetail("Không thể kết nối tới dịch vụ nhận diện khuôn mặt.");
        } finally {
            setUploading(false);
        }
    };

    // Drag & Drop handlers
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    };

    const handleClose = () => {
        if (result && result.success > 0) {
            onSuccess();
        } else {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Camera className="w-5 h-5" /> Upload ảnh khuôn mặt
                    </h3>
                    <button onClick={handleClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Student info */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                            {student.studentName[0]}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{student.studentName}</p>
                            <p className="text-xs text-gray-500">Mã HS: {student.studentCode}</p>
                        </div>
                    </div>

                    {/* Dropzone */}
                    <div
                        ref={dropRef}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                    >
                        <ImagePlus className="w-10 h-10 mx-auto text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        <p className="text-sm text-gray-600 mt-3">
                            Kéo thả ảnh vào đây hoặc <span className="text-indigo-600 font-semibold">nhấn để chọn</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Tối đa {MAX_FILES} ảnh (JPG, PNG)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => { if (e.target.files) handleFiles(e.target.files); }}
                        />
                    </div>

                    {/* Previews */}
                    {previews.length > 0 && (
                        <div className="grid grid-cols-5 gap-3">
                            {previews.map((src, i) => (
                                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200">
                                    <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`rounded-xl p-4 text-sm font-medium ${result.fail === 0 ? 'bg-green-50 text-green-700' : result.success === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                            {result.fail === 0
                                ? `Upload thành công ${result.success} ảnh!`
                                : result.success === 0
                                    ? `Upload thất bại toàn bộ ${result.fail} ảnh.`
                                    : `Thành công ${result.success}/${result.success + result.fail} ảnh. ${result.fail} ảnh bị từ chối.`}
                            {errorDetail && (
                                <p className="mt-1 text-xs opacity-80">Chi tiết: {errorDetail}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs text-gray-400">{files.length}/{MAX_FILES} ảnh đã chọn</p>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                            Đóng
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={files.length === 0 || uploading}
                            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-indigo-100"
                        >
                            {uploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên...</>
                            ) : (
                                <><Upload className="w-4 h-4" /> Tải lên hệ thống</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
