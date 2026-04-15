import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, CheckCircle, XCircle, Settings, Calendar, BookOpen } from 'lucide-react';
import { PlusIcon, XIcon } from '../SchoolAdminIcons';
import type { AcademicYearDto, SemesterDto, CreateAcademicYearRequest, UpdateSemesterRequest } from '../../../services/semesterService';
import { semesterService } from '../../../services/semesterService';
import { useSemester } from '../../../context/SemesterContext';
import { useToast } from '../../../context/ToastContext';
import { formatDate } from '../../../utils/dateHelpers';
import CloseSemesterConfirmModal from '../components/semester/CloseSemesterConfirmModal';
import DeleteYearConfirmModal from '../components/semester/DeleteYearConfirmModal';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDateInput, parseDateDDMMYYYY } from '../../../utils/dateHelpers';
import CustomDateInput from '../../../components/common/CustomDateInput';

const SemesterConfigPage: React.FC = () => {
    const { refreshSemesters } = useSemester();
    const { toast } = useToast();
    const [academicYears, setAcademicYears] = useState<AcademicYearDto[]>([]);
    const [semesters, setSemesters] = useState<SemesterDto[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showYearModal, setShowYearModal] = useState(false);
    const [showSemesterModal, setShowSemesterModal] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYearDto | null>(null);
    const [editingSemester, setEditingSemester] = useState<SemesterDto | null>(null);
    const [semesterToClose, setSemesterToClose] = useState<SemesterDto | null>(null);
    const [yearToDelete, setYearToDelete] = useState<AcademicYearDto | null>(null);
    const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
    const [showDeleteYearModal, setShowDeleteYearModal] = useState(false);

    // Form states
    const [yearForm, setYearForm] = useState<CreateAcademicYearRequest>({ name: '', startDate: '', endDate: '' });
    const [semesterForm, setSemesterForm] = useState<UpdateSemesterRequest>({
        name: '', startDate: '', endDate: '', gradeDeadline: ''
    });

    // Date input raw values
    const [yearStartInput, setYearStartInput] = useState('');
    const [yearEndInput, setYearEndInput] = useState('');
    const [semStartInput, setSemStartInput] = useState('');
    const [semEndInput, setSemEndInput] = useState('');
    const [semDeadlineInput, setSemDeadlineInput] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const years = await semesterService.listAcademicYears();
            setAcademicYears(years);
            if (selectedYearId) {
                const sems = await semesterService.listSemesters(selectedYearId);
                setSemesters(sems);
            } else if (years.length > 0) {
                const activeYear = years.find(y => y.status === 'ACTIVE') || years[0];
                setSelectedYearId(activeYear.id);
                const sems = await semesterService.listSemesters(activeYear.id);
                setSemesters(sems);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (selectedYearId) {
            semesterService.listSemesters(selectedYearId).then(setSemesters).catch(console.error);
        }
    }, [selectedYearId]);

    // ===== Academic Year Handlers =====
    const handleCreateYear = async () => {
        if (!yearForm.name || !yearForm.startDate || !yearForm.endDate) {
            toast.error("Vui lòng điền đủ thông tin năm học");
            return;
        }
        try {
            await semesterService.createAcademicYear(yearForm);
            toast.success('Tạo năm học thành công! Học kỳ 1 và Học kỳ 2 đã được tự động tạo.');
            setShowYearModal(false);
            setEditingYear(null);
            loadData();
            refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi tạo năm học');
        }
    };

    const handleUpdateYear = async () => {
        if (!editingYear) return;
        if (!yearForm.name || !yearForm.startDate || !yearForm.endDate) {
            toast.error("Vui lòng điền đủ thông tin năm học");
            return;
        }
        try {
            await semesterService.updateAcademicYear(editingYear.id, yearForm);
            toast.success('Cập nhật năm học thành công!');
            setShowYearModal(false);
            setEditingYear(null);
            loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi cập nhật năm học');
        }
    };

    const handleDeleteYear = (year: AcademicYearDto, e: React.MouseEvent) => {
        e.stopPropagation();
        setYearToDelete(year);
        setShowDeleteYearModal(true);
    };

    const handleConfirmDeleteYear = async () => {
        if (!yearToDelete) return;
        try {
            await semesterService.deleteAcademicYear(yearToDelete.id);
            toast.success('Xóa năm học thành công!');
            setShowDeleteYearModal(false);
            
            let nextSelectedId = selectedYearId;
            if (selectedYearId === yearToDelete.id) {
                setSelectedYearId(null);
                setSemesters([]);
                nextSelectedId = null;
            }

            setYearToDelete(null);

            // Immediately load new years
            const years = await semesterService.listAcademicYears();
            setAcademicYears(years);

            if (!nextSelectedId && years.length > 0) {
                const activeYear = years.find(y => y.status === 'ACTIVE') || years[0];
                setSelectedYearId(activeYear.id);
            }

            // Refresh global context
            await refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi xóa năm học');
        }
    };

    const handleActivateYear = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await semesterService.activateAcademicYear(id);
            toast.success('Kích hoạt năm học thành công!');
            loadData();
            refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi kích hoạt năm học');
        }
    };

    // ===== Semester Handlers (only update, activate, close) =====
    const handleUpdateSemester = async () => {
        if (!editingSemester) return;
        try {
            await semesterService.updateSemester(editingSemester.id, semesterForm);
            toast.success('Cập nhật học kỳ thành công!');
            setShowSemesterModal(false);
            setEditingSemester(null);
            loadData();
            refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi cập nhật học kỳ');
        }
    };

    const handleActivateSemester = async (id: string) => {
        try {
            await semesterService.activateSemester(id);
            toast.success('Kích hoạt học kỳ thành công! Các học kỳ cũ đã tự động đóng.');
            loadData();
            refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi kích hoạt học kỳ');
        }
    };

    const handleCloseSemester = (sem: SemesterDto) => {
        setSemesterToClose(sem);
        setShowCloseConfirmModal(true);
    };

    const handleConfirmCloseSemester = async () => {
        if (!semesterToClose) return;
        try {
            await semesterService.closeSemester(semesterToClose.id);
            toast.success('Đóng học kỳ thành công!');
            setShowCloseConfirmModal(false);
            setSemesterToClose(null);
            loadData();
            refreshSemesters();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi đóng học kỳ');
        }
    };

    const openEditYear = (year: AcademicYearDto, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingYear(year);
        setYearForm({ name: year.name, startDate: year.startDate, endDate: year.endDate });
        setYearStartInput(formatDate(year.startDate));
        setYearEndInput(formatDate(year.endDate));
        setShowYearModal(true);
    };

    const openNewYear = () => {
        setEditingYear(null);
        setYearForm({ name: '', startDate: '', endDate: '' });
        setYearStartInput('');
        setYearEndInput('');
        setShowYearModal(true);
    };

    const openEditSemester = (sem: SemesterDto) => {
        setEditingSemester(sem);
        setSemesterForm({
            name: sem.name,
            startDate: sem.startDate, endDate: sem.endDate,
            gradeDeadline: sem.gradeDeadline || ''
        });
        setSemStartInput(formatDate(sem.startDate));
        setSemEndInput(formatDate(sem.endDate));
        setSemDeadlineInput(sem.gradeDeadline ? formatDate(sem.gradeDeadline) : '');
        setShowSemesterModal(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Đang hoạt động</span>;
            case 'CLOSED':
                return <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Đã đóng</span>;
            case 'UPCOMING':
                return <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Sắp tới</span>;
            default:
                return <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải cấu hình...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-gray-700" />
                        Cấu hình Năm học & Học kỳ
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý vòng đời năm học, thiết lập mốc thời gian và chốt sổ học kỳ.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openNewYear}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                        <PlusIcon />
                        <span>Thêm năm học</span>
                    </button>
                </div>
            </div>

            {/* Academic Years Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-none">Danh sách Năm học</h2>
                            <p className="text-sm text-gray-500 mt-1.5">Quản lý và thiết lập trạng thái hoạt động cho các năm học.</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {academicYears.map(year => (
                        <div
                            key={year.id}
                            className={`group border rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                                selectedYearId === year.id
                                    ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500 bg-blue-50/10'
                                    : 'border-gray-100 hover:border-blue-200 hover:shadow-md bg-white'
                            }`}
                            onClick={() => setSelectedYearId(year.id)}
                        >
                            <div className="flex justify-between items-start mb-5">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{year.name}</h3>
                                    <div>{getStatusBadge(year.status)}</div>
                                </div>
                                <div className="flex gap-1 translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                        onClick={(e) => openEditYear(year, e)}
                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-colors"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteYear(year, e)}
                                        className="text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                                        title="Xóa năm học"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-3 py-4 border-y border-gray-50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Ngày bắt đầu</span> 
                                    <span className="text-gray-900 font-semibold">{formatDate(year.startDate)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Ngày kết thúc</span> 
                                    <span className="text-gray-900 font-semibold">{formatDate(year.endDate)}</span>
                                </div>
                            </div>
                            
                            <div className="mt-5">
                                {year.status === 'ACTIVE' ? (
                                    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20">
                                        <CheckCircle className="w-4 h-4" />
                                        Năm học hiện tại
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => handleActivateYear(year.id, e)}
                                        className="w-full py-2.5 bg-gray-50 text-gray-600 hover:bg-green-600 hover:text-white rounded-xl text-sm font-bold transition-all border border-gray-100 flex items-center justify-center gap-2 group/btn"
                                    >
                                        <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        Kích hoạt năm học
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {academicYears.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border-2 border-dashed border-gray-200 shadow-inner group transition-all hover:border-blue-200">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-100">
                                <Calendar className="w-10 h-10 text-blue-500/80" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có năm học nào được tạo</h3>
                            <p className="text-gray-500 text-sm max-w-sm text-center mb-8 leading-relaxed">
                                Hệ thống cần ít nhất một năm học để bắt đầu vận hành. <br/>
                                <span className="font-medium text-blue-600">Học kỳ 1 và Học kỳ 2 sẽ được tự động khởi tạo</span> sau khi bạn tạo năm học mới.
                            </p>
                            <button
                                onClick={openNewYear}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                            >
                                <PlusIcon />
                                <span>Tạo năm học đầu tiên</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Semesters Section */}
            {selectedYearId && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-gray-600" />
                            <span>Học kỳ thuộc <span className="text-blue-600">{academicYears.find(y => y.id === selectedYearId)?.name}</span></span>
                        </h2>
                    </div>
                    
                    {semesters.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Chưa có học kỳ nào. Hãy tạo năm học mới để tự động sinh Học kỳ 1 và Học kỳ 2.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên Học Kỳ</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">HK</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bắt đầu</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kết thúc</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hạn nhập điểm</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {semesters.map(sem => (
                                        <tr key={sem.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sem.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{sem.semesterNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(sem.startDate)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(sem.endDate)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(sem.gradeDeadline) || '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(sem.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap flex justify-center gap-2">
                                                <button
                                                    onClick={() => openEditSemester(sem)}
                                                    className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                
                                                {sem.status === 'UPCOMING' && (
                                                    <button
                                                        onClick={() => handleActivateSemester(sem.id)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                                                        title="Kích hoạt"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                
                                                {sem.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handleCloseSemester(sem)}
                                                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                                                        title="Chốt sổ"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Academic Year Modal */}
            {showYearModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setShowYearModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-[100] animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-5 flex-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{editingYear ? 'Sửa năm học' : 'Thêm năm học mới'}</h2>
                                        {!editingYear && (
                                            <p className="text-blue-100 text-sm">Học kỳ 1 và Học kỳ 2 sẽ được tự động tạo.</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setShowYearModal(false)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <XIcon />
                                </button>
                            </div>
                        </div>
                        
                        {/* Form Content */}
                        <div className="p-6 space-y-5">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên năm học <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={yearForm.name}
                                            onChange={e => setYearForm({ ...yearForm, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="VD: 2025-2026"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
                                            <DatePicker
                                                selected={yearForm.startDate ? new Date(yearForm.startDate) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        const iso = `${y}-${m}-${d}`;
                                                        setYearForm({ ...yearForm, startDate: iso });
                                                        setYearStartInput(`${d}/${m}/${y}`);
                                                    } else {
                                                        setYearForm({ ...yearForm, startDate: '' });
                                                        setYearStartInput('');
                                                    }
                                                }}
                                                onChangeRaw={(e) => {
                                                    if (!e) return;
                                                    const target = e.target as HTMLInputElement;
                                                    const formatted = formatDateInput(target.value);
                                                    setYearStartInput(formatted);
                                                    const parsed = parseDateDDMMYYYY(formatted);
                                                    if (parsed && formatted.length >= 10) {
                                                        setYearForm({ ...yearForm, startDate: parsed });
                                                    }
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="dd/mm/yyyy"
                                                customInput={<CustomDateInput rawValue={yearStartInput} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
                                            <DatePicker
                                                selected={yearForm.endDate ? new Date(yearForm.endDate) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        const iso = `${y}-${m}-${d}`;
                                                        setYearForm({ ...yearForm, endDate: iso });
                                                        setYearEndInput(`${d}/${m}/${y}`);
                                                    } else {
                                                        setYearForm({ ...yearForm, endDate: '' });
                                                        setYearEndInput('');
                                                    }
                                                }}
                                                onChangeRaw={(e) => {
                                                    if (!e) return;
                                                    const target = e.target as HTMLInputElement;
                                                    const formatted = formatDateInput(target.value);
                                                    setYearEndInput(formatted);
                                                    const parsed = parseDateDDMMYYYY(formatted);
                                                    if (parsed && formatted.length >= 10) {
                                                        setYearForm({ ...yearForm, endDate: parsed });
                                                    }
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="dd/mm/yyyy"
                                                customInput={<CustomDateInput rawValue={yearEndInput} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowYearModal(false)}
                                    className="flex-1 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={editingYear ? handleUpdateYear : handleCreateYear}
                                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    {editingYear ? 'Lưu thay đổi' : 'Tạo mới'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Semester Edit Modal */}
            {showSemesterModal && editingSemester && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm" onClick={() => setShowSemesterModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-[100] animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-8 py-5 flex-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Sửa học kỳ</h2>
                                        <p className="text-blue-100 text-sm">{editingSemester.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSemesterModal(false)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                    <XIcon />
                                </button>
                            </div>
                        </div>
                        
                        {/* Form Content */}
                        <div className="p-6 space-y-5">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-5 border border-slate-200/60">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên học kỳ</label>
                                        <input
                                            type="text"
                                            value={semesterForm.name}
                                            onChange={e => setSemesterForm({ ...semesterForm, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="VD: Học kỳ 1"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày bắt đầu</label>
                                            <DatePicker
                                                selected={semesterForm.startDate ? new Date(semesterForm.startDate) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        const iso = `${y}-${m}-${d}`;
                                                        setSemesterForm({ ...semesterForm, startDate: iso });
                                                        setSemStartInput(`${d}/${m}/${y}`);
                                                    } else {
                                                        setSemesterForm({ ...semesterForm, startDate: '' });
                                                        setSemStartInput('');
                                                    }
                                                }}
                                                onChangeRaw={(e) => {
                                                    if (!e) return;
                                                    const target = e.target as HTMLInputElement;
                                                    const formatted = formatDateInput(target.value);
                                                    setSemStartInput(formatted);
                                                    const parsed = parseDateDDMMYYYY(formatted);
                                                    if (parsed && formatted.length >= 10) {
                                                        setSemesterForm({ ...semesterForm, startDate: parsed });
                                                    }
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="dd/mm/yyyy"
                                                customInput={<CustomDateInput rawValue={semStartInput} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày kết thúc</label>
                                            <DatePicker
                                                selected={semesterForm.endDate ? new Date(semesterForm.endDate) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        const iso = `${y}-${m}-${d}`;
                                                        setSemesterForm({ ...semesterForm, endDate: iso });
                                                        setSemEndInput(`${d}/${m}/${y}`);
                                                    } else {
                                                        setSemesterForm({ ...semesterForm, endDate: '' });
                                                        setSemEndInput('');
                                                    }
                                                }}
                                                onChangeRaw={(e) => {
                                                    if (!e) return;
                                                    const target = e.target as HTMLInputElement;
                                                    const formatted = formatDateInput(target.value);
                                                    setSemEndInput(formatted);
                                                    const parsed = parseDateDDMMYYYY(formatted);
                                                    if (parsed && formatted.length >= 10) {
                                                        setSemesterForm({ ...semesterForm, endDate: parsed });
                                                    }
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="dd/mm/yyyy"
                                                customInput={<CustomDateInput rawValue={semEndInput} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Hạn cuối nhập điểm</label>
                                        <DatePicker
                                            selected={semesterForm.gradeDeadline ? new Date(semesterForm.gradeDeadline) : null}
                                            onChange={(date: Date | null) => {
                                                if (date) {
                                                    const y = date.getFullYear();
                                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                                    const d = String(date.getDate()).padStart(2, '0');
                                                    const iso = `${y}-${m}-${d}`;
                                                    setSemesterForm({ ...semesterForm, gradeDeadline: iso });
                                                    setSemDeadlineInput(`${d}/${m}/${y}`);
                                                } else {
                                                    setSemesterForm({ ...semesterForm, gradeDeadline: '' });
                                                    setSemDeadlineInput('');
                                                }
                                            }}
                                            onChangeRaw={(e) => {
                                                if (!e) return;
                                                const target = e.target as HTMLInputElement;
                                                const formatted = formatDateInput(target.value);
                                                setSemDeadlineInput(formatted);
                                                const parsed = parseDateDDMMYYYY(formatted);
                                                if (parsed && formatted.length >= 10) {
                                                    setSemesterForm({ ...semesterForm, gradeDeadline: parsed });
                                                }
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="dd/mm/yyyy"
                                            customInput={<CustomDateInput rawValue={semDeadlineInput} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex-none">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSemesterModal(false)}
                                    className="flex-1 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleUpdateSemester}
                                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Semester Close Confirmation Modal */}
            <CloseSemesterConfirmModal
                isOpen={showCloseConfirmModal}
                semester={semesterToClose}
                onClose={() => {
                    setShowCloseConfirmModal(false);
                    setSemesterToClose(null);
                }}
                onConfirm={handleConfirmCloseSemester}
            />

            {/* Academic Year Delete Confirmation Modal */}
            <DeleteYearConfirmModal
                isOpen={showDeleteYearModal}
                year={yearToDelete}
                onClose={() => {
                    setShowDeleteYearModal(false);
                    setYearToDelete(null);
                }}
                onConfirm={handleConfirmDeleteYear}
            />
        </div>
    );
};

export default SemesterConfigPage;
