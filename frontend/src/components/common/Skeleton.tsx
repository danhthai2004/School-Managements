import React from "react";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
    width?: string | number;
    height?: string | number;
    lines?: number;
}

// Base Skeleton component
export const Skeleton: React.FC<SkeletonProps> = ({
    className = "",
    variant = "rectangular",
    width,
    height,
    lines = 1,
}) => {
    const baseClasses = "animate-shimmer rounded";

    const variantClasses = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg",
    };

    const style: React.CSSProperties = {
        width: width || "100%",
        height: height || (variant === "text" ? "1rem" : "100%"),
    };

    if (lines > 1 && variant === "text") {
        return (
            <div className={`space-y-2 ${className}`}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClasses} ${variantClasses.text}`}
                        style={{ ...style, width: i === lines - 1 ? "75%" : "100%" }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

// Skeleton Card - for stat cards
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-start gap-4">
            <Skeleton variant="rectangular" width={48} height={48} className="rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="40%" height={24} />
            </div>
        </div>
    </div>
);

// Skeleton Table Row
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
    <tr className="border-b border-gray-100">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="py-4 px-4">
                <Skeleton variant="text" width={i === 0 ? "70%" : "50%"} />
            </td>
        ))}
    </tr>
);

// Skeleton Table
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
    rows = 5,
    columns = 5
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="text" width={80} height={12} />
                ))}
            </div>
        </div>
        {/* Body */}
        <table className="w-full">
            <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={columns} />
                ))}
            </tbody>
        </table>
    </div>
);

// Skeleton Chart
export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 250 }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Skeleton variant="text" width="30%" height={20} className="mb-4" />
        <Skeleton variant="rectangular" height={height} className="rounded-lg" />
    </div>
);

// Skeleton Avatar
export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => (
    <Skeleton variant="circular" width={size} height={size} />
);

// Skeleton List Item
export const SkeletonListItem: React.FC = () => (
    <div className="flex items-center gap-3 p-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height={12} />
        </div>
    </div>
);

export default Skeleton;
