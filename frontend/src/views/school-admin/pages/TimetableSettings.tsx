import { useEffect, useState, useCallback } from "react";
import { Clock, Save, Settings, Calendar, Info, AlertTriangle, RefreshCw } from "lucide-react";
import { timetableSettingsService } from "../../../services/schoolAdminService";
import type { TimetableSettingsDto, TimetableScheduleSummaryDto, SlotTimeDto } from "../../../services/schoolAdminService";

type SettingsFormData = TimetableSettingsDto;

const DEFAULT_SETTINGS: SettingsFormData = {
    periodsPerMorning: 5,
    periodsPerAfternoon: 4,
    periodDurationMinutes: 45,
    morningStartTime: "07:00",
    afternoonStartTime: "13:00",
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfterPeriod: 2,
};

export default function TimetableSettings() {
    const [settings, setSettings] = useState<SettingsFormData>(DEFAULT_SETTINGS);
    const [originalSettings, setOriginalSettings] = useState<SettingsFormData>(DEFAULT_SETTINGS);
    const [summary, setSummary] = useState<TimetableScheduleSummaryDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    // Check for unsaved changes
    useEffect(() => {
        const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
        setHasChanges(changed);
    }, [settings, originalSettings]);

    const previewSummary = useCallback(async () => {
        try {
            setPreviewLoading(true);
            const summaryData = await timetableSettingsService.previewScheduleSummary(settings);
            setSummary(summaryData);
        } catch (err) {
            console.error("Failed to preview summary:", err);
        } finally {
            setPreviewLoading(false);
        }
    }, [settings]);

    // Auto-preview when settings change
    useEffect(() => {
        if (!loading && hasChanges) {
            const timeout = setTimeout(() => {
                previewSummary();
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [settings, hasChanges, loading, previewSummary]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const [settingsData, summaryData] = await Promise.all([
                timetableSettingsService.getSettings(),
                timetableSettingsService.getScheduleSummary(),
            ]);
            setSettings(settingsData);
            setOriginalSettings(settingsData);
            setSummary(summaryData);
            setError(null);
        } catch (err) {
            console.error("Failed to load settings:", err);
            setError("Không thể tải cài đặt. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            const updatedSettings = await timetableSettingsService.updateSettings(settings);
            setSettings(updatedSettings);
            setOriginalSettings(updatedSettings);
            setSuccessMessage("Đã lưu cài đặt thành công!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: unknown) {
            console.error("Failed to save settings:", err);
            const apiError = err as { response?: { data?: { message?: string } } };
            setError(apiError.response?.data?.message || "Không thể lưu cài đặt. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings(originalSettings);
    };

    const handleChange = (field: keyof SettingsFormData, value: number | string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const formatTime = (time: string) => time;

    const formatMinutes = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;
    };

    // Validation
    const totalPeriods = settings.periodsPerMorning + settings.periodsPerAfternoon;
    const isValidPeriods = totalPeriods >= 1 && totalPeriods <= 10;
    const isValidMorningPeriods = settings.periodsPerMorning >= 0 && settings.periodsPerMorning <= 7;
    const isValidAfternoonPeriods = settings.periodsPerAfternoon >= 0 && settings.periodsPerAfternoon <= 7;
    const isValidDuration = settings.periodDurationMinutes >= 35 && settings.periodDurationMinutes <= 60;
    const isValidLongBreakPeriod = settings.longBreakAfterPeriod >= 1 && settings.longBreakAfterPeriod < settings.periodsPerMorning;
    const isValid = isValidPeriods && isValidMorningPeriods && isValidAfternoonPeriods && isValidDuration && isValidLongBreakPeriod;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cài đặt thời khóa biểu</h1>
                        <p className="text-gray-600 text-sm">Thiết lập thời gian học theo quy định Bộ GD&ĐT</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Hoàn lại
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges || !isValid}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Lưu cài đặt
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    ✓ {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings Form */}
                <div className="space-y-6">
                    {/* Period Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Cấu hình tiết học
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số tiết buổi sáng
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        value={settings.periodsPerMorning}
                                        onChange={(e) => handleChange("periodsPerMorning", parseInt(e.target.value) || 0)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            !isValidMorningPeriods ? "border-red-300" : "border-gray-200"
                                        }`}
                                    />
                                    {!isValidMorningPeriods && (
                                        <p className="text-xs text-red-500 mt-1">Tối đa 7 tiết/buổi</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số tiết buổi chiều
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        value={settings.periodsPerAfternoon}
                                        onChange={(e) => handleChange("periodsPerAfternoon", parseInt(e.target.value) || 0)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            !isValidAfternoonPeriods ? "border-red-300" : "border-gray-200"
                                        }`}
                                    />
                                    {!isValidAfternoonPeriods && (
                                        <p className="text-xs text-red-500 mt-1">Tối đa 7 tiết/buổi</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Thời lượng mỗi tiết (phút)
                                </label>
                                <input
                                    type="number"
                                    min="35"
                                    max="60"
                                    value={settings.periodDurationMinutes}
                                    onChange={(e) => handleChange("periodDurationMinutes", parseInt(e.target.value) || 45)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        !isValidDuration ? "border-red-300" : "border-gray-200"
                                    }`}
                                />
                                {!isValidDuration && (
                                    <p className="text-xs text-red-500 mt-1">Phải từ 35 đến 60 phút (quy định Bộ GD&ĐT: 45 phút)</p>
                                )}
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700">
                                    Theo Thông tư 32/2018/TT-BGDĐT, mỗi tiết học THPT kéo dài 45 phút, 
                                    tối đa 7 tiết/buổi và 11 buổi/tuần.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Time Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Thời gian bắt đầu
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Buổi sáng bắt đầu
                                </label>
                                <input
                                    type="time"
                                    value={settings.morningStartTime}
                                    onChange={(e) => handleChange("morningStartTime", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Buổi chiều bắt đầu
                                </label>
                                <input
                                    type="time"
                                    value={settings.afternoonStartTime}
                                    onChange={(e) => handleChange("afternoonStartTime", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Break Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cấu hình giờ nghỉ</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nghỉ ngắn giữa tiết (phút)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="15"
                                        value={settings.shortBreakMinutes}
                                        onChange={(e) => handleChange("shortBreakMinutes", parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nghỉ dài (giải lao) (phút)
                                    </label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="30"
                                        value={settings.longBreakMinutes}
                                        onChange={(e) => handleChange("longBreakMinutes", parseInt(e.target.value) || 15)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nghỉ dài sau tiết số
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={settings.periodsPerMorning - 1}
                                    value={settings.longBreakAfterPeriod}
                                    onChange={(e) => handleChange("longBreakAfterPeriod", parseInt(e.target.value) || 2)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        !isValidLongBreakPeriod ? "border-red-300" : "border-gray-200"
                                    }`}
                                />
                                {!isValidLongBreakPeriod && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Phải từ 1 đến {settings.periodsPerMorning - 1}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Xem trước lịch học</h2>
                            {previewLoading && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            )}
                        </div>

                        {summary && (
                            <div className="space-y-4">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1">Giờ đến trường</p>
                                        <p className="text-lg font-bold text-green-600">{formatTime(summary.arrivalTime)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1">Tan học buổi sáng</p>
                                        <p className="text-lg font-bold text-orange-600">{formatTime(summary.morningEndTime)}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1">Nghỉ trưa</p>
                                        <p className="text-lg font-bold text-blue-600">{formatTime(summary.lunchBreakStart)} - {formatTime(summary.lunchBreakEnd)}</p>
                                        <p className="text-xs text-gray-500">{summary.lunchBreakDurationMinutes} phút</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1">Tan học buổi chiều</p>
                                        <p className="text-lg font-bold text-red-600">{formatTime(summary.afternoonEndTime)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-sm text-gray-500 mb-1">Tổng thời gian học/ngày</p>
                                    <p className="text-xl font-bold text-indigo-600">{formatMinutes(summary.totalLearningMinutesPerDay)}</p>
                                </div>

                                {/* Morning Slots */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Buổi sáng ({summary.morningSlots.length} tiết)</h3>
                                    <div className="space-y-1">
                                        {summary.morningSlots.map((slot: SlotTimeDto) => (
                                            <div
                                                key={slot.slotIndex}
                                                className={`flex items-center justify-between p-2 rounded ${
                                                    slot.isAfterLongBreak ? "bg-yellow-100" : "bg-white"
                                                }`}
                                            >
                                                <span className="text-sm font-medium">Tiết {slot.slotIndex}</span>
                                                <span className="text-sm text-gray-600">
                                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Afternoon Slots */}
                                {summary.afternoonSlots.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Buổi chiều ({summary.afternoonSlots.length} tiết)</h3>
                                        <div className="space-y-1">
                                            {summary.afternoonSlots.map((slot: SlotTimeDto) => (
                                                <div
                                                    key={slot.slotIndex}
                                                    className="flex items-center justify-between p-2 rounded bg-white"
                                                >
                                                    <span className="text-sm font-medium">Tiết {slot.slotIndex}</span>
                                                    <span className="text-sm text-gray-600">
                                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
