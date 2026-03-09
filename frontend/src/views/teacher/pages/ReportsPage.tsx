import { useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { TeacherProfile } from "../../../services/teacherService";

type OutletContextType = {
    teacherProfile: TeacherProfile | null;
};

export default function ReportsPage() {
    const { teacherProfile } = useOutletContext<OutletContextType>();
    const [activeTab, setActiveTab] = useState<'subject' | 'homeroom'>('subject');

    const tabs = teacherProfile?.isHomeroomTeacher
        ? [
            { id: 'homeroom' as const, label: 'Báo cáo chủ nhiệm' },
            { id: 'subject' as const, label: 'Báo cáo bộ môn' },
        ]
        : [
            { id: 'subject' as const, label: 'Báo cáo bộ môn' },
        ];

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Báo cáo</h1>
                <p className="text-gray-500 mt-1">
                    {teacherProfile?.isHomeroomTeacher 
                        ? "Xem báo cáo lớp chủ nhiệm và các lớp bạn dạy"
                        : "Xem báo cáo các lớp bạn dạy"
                    }
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'homeroom' && teacherProfile?.isHomeroomTeacher && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">
                                Báo cáo lớp {teacherProfile.homeroomClassName}
                            </h3>
                            <p className="text-gray-500 text-center py-8">
                                Tính năng đang được phát triển...
                            </p>
                        </div>
                    )}

                    {activeTab === 'subject' && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">
                                Báo cáo các lớp giảng dạy
                            </h3>
                            <p className="text-gray-500 text-center py-8">
                                Tính năng đang được phát triển...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
