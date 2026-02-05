import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { schoolAdminService, type CombinationDto, type SubjectDto, type CreateCombinationRequest } from "../../../services/schoolAdminService";
import { Plus, X, Check, AlertCircle, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function CombinationManagement() {
    const [combinations, setCombinations] = useState<CombinationDto[]>([]);
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<CreateCombinationRequest>({
        name: "",
        code: "",
        stream: 'TU_NHIEN', // Default
        electiveSubjectIds: [],
        specializedSubjectIds: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [combinationsData, subjectsData] = await Promise.all([
                schoolAdminService.listCombinations(),
                schoolAdminService.listSubjects()
            ]);
            setCombinations(combinationsData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Client-side validation
        if (!formData.name.trim()) {
            toast.error("Vui lòng nhập tên tổ hợp");
            return;
        }
        if (!formData.stream) {
            toast.error("Vui lòng chọn Ban");
            return;
        }
        if (formData.electiveSubjectIds.length !== 4) {
            toast.error("Vui lòng chọn đúng 4 môn lựa chọn");
            return;
        }
        if (formData.specializedSubjectIds.length !== 3) {
            toast.error("Vui lòng chọn đúng 3 chuyên đề");
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                await schoolAdminService.updateCombination(editingId, formData);
                toast.success("Cập nhật tổ hợp thành công!");
            } else {
                await schoolAdminService.createCombination(formData);
                toast.success("Tạo tổ hợp thành công!");
            }
            setIsModalOpen(false);
            resetForm();
            fetchData(); // Refresh list
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Có lỗi xảy ra";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa tổ hợp này?")) return;
        try {
            await schoolAdminService.deleteCombination(id);
            toast.success("Xóa tổ hợp thành công");
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Không thể xóa tổ hợp");
        }
    };

    const handleEdit = (combo: CombinationDto) => {
        setEditingId(combo.id);
        const electiveIds = combo.subjects.filter(s => s.type === 'ELECTIVE').map(s => s.id);
        const specializedIds = combo.subjects.filter(s => s.type === 'SPECIALIZED').map(s => s.id);

        setFormData({
            name: combo.name,
            code: combo.code || "",
            stream: combo.stream,
            electiveSubjectIds: electiveIds,
            specializedSubjectIds: specializedIds
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: "", code: "", stream: 'TU_NHIEN', electiveSubjectIds: [], specializedSubjectIds: [] });
        setEditingId(null);
    };

    const toggleSubject = (id: string, type: 'ELECTIVE' | 'SPECIALIZED') => {
        setFormData(prev => {
            const list = type === 'ELECTIVE' ? [...prev.electiveSubjectIds] : [...prev.specializedSubjectIds];
            const index = list.indexOf(id);

            if (index > -1) {
                list.splice(index, 1);
            } else {
                // Check limits (4 for elective, 3 for specialized)
                const limit = type === 'ELECTIVE' ? 4 : 3;
                if (list.length >= limit) {
                    toast.error(`Chỉ được chọn tối đa ${limit} môn`);
                    return prev;
                }
                list.push(id);
            }

            return type === 'ELECTIVE'
                ? { ...prev, electiveSubjectIds: list }
                : { ...prev, specializedSubjectIds: list };
        });
    };

    const electives = subjects.filter(s => s.type === 'ELECTIVE' && s.active && s.stream === formData.stream);
    // Relaxed filtering for Specialized Subjects: Show ALL active specialized subjects
    const specialized = subjects.filter(s => s.type === 'SPECIALIZED' && s.active);
    const compulsory = subjects.filter(s => s.type === 'COMPULSORY' && s.active);

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-end items-center">
                {/* Header title removed to avoid duplication when embedded */}
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Tạo Tổ hợp mới
                </button>
            </div>

            {/* List Combinations (Grid View) */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : combinations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Chưa có tổ hợp nào được tạo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {combinations.map(combo => (
                        <div key={combo.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-lg">{combo.name}</h3>
                                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${combo.stream === 'TU_NHIEN'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-pink-50 text-pink-700 border-pink-100'
                                            }`}>
                                            {combo.stream === 'TU_NHIEN' ? 'Tự Nhiên' : 'Xã Hội'}
                                        </span>
                                    </div>
                                    {combo.code && <span className="text-xs text-gray-500">{combo.code}</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(combo)}
                                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(combo.id)}
                                        className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-sm font-medium text-gray-700 mb-2">Môn lựa chọn:</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {combo.subjects.filter(s => s.type === 'ELECTIVE').map(s => (
                                        <span key={s.id} className="bg-green-50 text-green-700 border border-green-100 text-xs px-2.5 py-0.5 rounded-full">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-sm font-medium text-gray-700 mb-2">Chuyên đề:</p>
                                <div className="flex flex-wrap gap-2">
                                    {combo.subjects.filter(s => s.type === 'SPECIALIZED').map(s => (
                                        <span key={s.id} className="bg-purple-50 text-purple-700 border border-purple-100 text-xs px-2.5 py-0.5 rounded-full">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        + {compulsory.length} môn bắt buộc (Toán, Văn, Anh...)
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col z-[100]">
                        <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-none z-[110]">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Cập nhật Tổ hợp' : 'Tạo Tổ hợp mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên Tổ hợp <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="VD: Ban Tự Nhiên 1"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã Tổ hợp</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="VD: KHTN01"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Chọn Ban (Stream)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, stream: 'TU_NHIEN', electiveSubjectIds: [], specializedSubjectIds: [] }));
                                        }}
                                        className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all ${formData.stream === 'TU_NHIEN'
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div>
                                            <p className={`font-semibold ${formData.stream === 'TU_NHIEN' ? 'text-blue-800' : 'text-gray-900'}`}>Khoa học Tự nhiên</p>
                                            <p className="text-xs text-gray-500 mt-1">Lý, Hóa, Sinh, Tin...</p>
                                        </div>
                                        {formData.stream === 'TU_NHIEN' && <Check className="w-5 h-5 text-blue-600" />}
                                    </div>

                                    <div
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, stream: 'XA_HOI', electiveSubjectIds: [], specializedSubjectIds: [] }));
                                        }}
                                        className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all ${formData.stream === 'XA_HOI'
                                            ? 'bg-pink-50 border-pink-500 ring-1 ring-pink-500'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div>
                                            <p className={`font-semibold ${formData.stream === 'XA_HOI' ? 'text-pink-800' : 'text-gray-900'}`}>Khoa học Xã hội</p>
                                            <p className="text-xs text-gray-500 mt-1">Sử, Địa, GDKT&PL...</p>
                                        </div>
                                        {formData.stream === 'XA_HOI' && <Check className="w-5 h-5 text-pink-600" />}
                                    </div>
                                </div>
                            </div>

                            {/* Elective Selection */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-base font-medium text-gray-800">
                                        Chọn 4 Môn tự chọn
                                    </label>
                                    <span className={`text-sm font-medium ${formData.electiveSubjectIds.length === 4 ? 'text-green-600' : 'text-orange-500'}`}>
                                        Đã chọn: {formData.electiveSubjectIds.length}/4
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {electives.map(subject => {
                                        const isSelected = formData.electiveSubjectIds.includes(subject.id);
                                        return (
                                            <div
                                                key={subject.id}
                                                onClick={() => toggleSubject(subject.id, 'ELECTIVE')}
                                                className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${isSelected
                                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                                    : 'bg-white border-gray-200 hover:border-gray-300 scroll-smooth'
                                                    }`}
                                            >
                                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                                    {subject.name}
                                                </span>
                                                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Specialized Selection */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-base font-medium text-gray-800">
                                        Chọn 3 Chuyên đề học tập
                                    </label>
                                    <span className={`text-sm font-medium ${formData.specializedSubjectIds.length === 3 ? 'text-green-600' : 'text-orange-500'}`}>
                                        Đã chọn: {formData.specializedSubjectIds.length}/3
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                                    {specialized.map(subject => {
                                        const isSelected = formData.specializedSubjectIds.includes(subject.id);
                                        return (
                                            <div
                                                key={subject.id}
                                                onClick={() => toggleSubject(subject.id, 'SPECIALIZED')}
                                                className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${isSelected
                                                    ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                                    {subject.name}
                                                </span>
                                                {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>
                                    Hệ thống sẽ tự động thêm <strong>{compulsory.length} môn bắt buộc</strong> (Toán, Văn, Anh...) vào tổ hợp này khi tạo.
                                    Tổng số môn học của tổ hợp sẽ là <strong>{compulsory.length + 4 + 3}</strong> môn.
                                </p>
                            </div>

                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-none">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || formData.electiveSubjectIds.length !== 4 || formData.specializedSubjectIds.length !== 3}
                                className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 ${submitting || formData.electiveSubjectIds.length !== 4 || formData.specializedSubjectIds.length !== 3
                                    ? 'bg-blue-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                                    }`}
                            >
                                {submitting ? 'Đang xử lý...' : (editingId ? 'Cập nhật' : 'Tạo Tổ hợp')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
