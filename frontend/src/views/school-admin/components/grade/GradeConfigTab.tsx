import React from "react";
import type { GradingConfigDto } from "../../../../services/adminGradeService";

interface GradeConfigTabProps {
    config: GradingConfigDto;
    onSubmit: (e: React.FormEvent) => void;
    onConfigChange: (field: string, value: string) => void;
}

const GradeConfigTab: React.FC<GradeConfigTabProps> = ({ config, onSubmit, onConfigChange }) => {
    return (
        <div className="p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Cấu hình trọng số điểm trung bình môn</h3>
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Hệ số Thường xuyên (TX)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={config.regularWeight}
                            onChange={(e) => onConfigChange('regularWeight', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Hệ số Giữa kỳ (GK)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={config.midtermWeight}
                            onChange={(e) => onConfigChange('midtermWeight', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Hệ số Cuối kỳ (CK)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={config.finalWeight}
                            onChange={(e) => onConfigChange('finalWeight', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {config.updatedAt && (
                    <div className="text-xs text-gray-500 pt-4">
                        Cập nhật lần cuối bởi {config.updatedBy} lúc {new Date(config.updatedAt).toLocaleString()}
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GradeConfigTab;
