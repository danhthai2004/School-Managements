import React from "react";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: "default" | "search" | "error" | "no-data";
}

// Default icons for different variants
const defaultIcons = {
    default: (
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
    ),
    search: (
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    error: (
        <svg className="w-16 h-16 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    "no-data": (
        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    variant = "default",
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
            {/* Icon */}
            <div className="mb-4">
                {icon || defaultIcons[variant]}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1 text-center">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

// Preset Empty States
export const NoDataState: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
    <EmptyState
        variant="no-data"
        title="Chưa có dữ liệu"
        description="Hiện tại chưa có dữ liệu để hiển thị. Hãy thêm mới để bắt đầu."
        action={onAction ? { label: "Thêm mới", onClick: onAction } : undefined}
    />
);

export const NoSearchResultState: React.FC<{ query?: string; onClear?: () => void }> = ({
    query,
    onClear
}) => (
    <EmptyState
        variant="search"
        title="Không tìm thấy kết quả"
        description={query ? `Không tìm thấy kết quả cho "${query}". Hãy thử từ khóa khác.` : "Hãy thử tìm kiếm với từ khóa khác."}
        action={onClear ? { label: "Xóa bộ lọc", onClick: onClear } : undefined}
    />
);

export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <EmptyState
        variant="error"
        title="Đã có lỗi xảy ra"
        description="Không thể tải dữ liệu. Vui lòng thử lại sau."
        action={onRetry ? { label: "Thử lại", onClick: onRetry } : undefined}
    />
);

export const NoStudentsState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
    <EmptyState
        icon={
            <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        }
        title="Chưa có học sinh"
        description="Bắt đầu thêm học sinh vào hệ thống để quản lý."
        action={onAdd ? { label: "Thêm học sinh", onClick: onAdd } : undefined}
    />
);

export const NoTeachersState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
    <EmptyState
        icon={
            <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        }
        title="Chưa có giáo viên"
        description="Thêm giáo viên để bắt đầu phân công giảng dạy."
        action={onAdd ? { label: "Thêm giáo viên", onClick: onAdd } : undefined}
    />
);

export const NoClassesState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
    <EmptyState
        icon={
            <svg className="w-16 h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        }
        title="Chưa có lớp học"
        description="Tạo lớp học để bắt đầu quản lý học sinh và giáo viên."
        action={onAdd ? { label: "Tạo lớp học", onClick: onAdd } : undefined}
    />
);

export default EmptyState;
