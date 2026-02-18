import React from "react";

// Student status type
export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED' | string;

// Status config
const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
    ACTIVE: {
        label: "Đang học",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
    },
    GRADUATED: {
        label: "Đã tốt nghiệp",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
    },
    TRANSFERRED: {
        label: "Chuyển trường",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
    },
    SUSPENDED: {
        label: "Tạm nghỉ",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
    },
};

const defaultConfig = {
    label: "Không xác định",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
};

interface StatusBadgeProps {
    status: StudentStatus;
    size?: "sm" | "md";
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    size = "sm",
    className = "",
}) => {
    const config = statusConfig[status] || { ...defaultConfig, label: status };

    const sizeClasses = {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full ${config.bgColor} ${config.textColor} ${sizeClasses[size]} ${className}`}
        >
            {config.label}
        </span>
    );
};

// Helper function to get status label
export const getStatusLabel = (status: StudentStatus): string => {
    return statusConfig[status]?.label || status;
};

// Teacher status type (if needed)
export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;

const teacherStatusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
    ACTIVE: {
        label: "Đang dạy",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
    },
    INACTIVE: {
        label: "Nghỉ việc",
        bgColor: "bg-gray-100",
        textColor: "text-gray-600",
    },
    ON_LEAVE: {
        label: "Nghỉ phép",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
    },
};

interface TeacherStatusBadgeProps {
    status: TeacherStatus;
    size?: "sm" | "md";
    className?: string;
}

export const TeacherStatusBadge: React.FC<TeacherStatusBadgeProps> = ({
    status,
    size = "sm",
    className = "",
}) => {
    const config = teacherStatusConfig[status] || { ...defaultConfig, label: status };

    const sizeClasses = {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full ${config.bgColor} ${config.textColor} ${sizeClasses[size]} ${className}`}
        >
            {config.label}
        </span>
    );
};

export default StatusBadge;
