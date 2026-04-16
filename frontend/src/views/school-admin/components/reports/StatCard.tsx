import React from "react";

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: "blue" | "green" | "orange" | "purple" | "indigo" | "rose";
}) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-500",
        green: "bg-green-50 text-green-500",
        orange: "bg-orange-50 text-orange-500",
        purple: "bg-purple-50 text-purple-500",
        indigo: "bg-indigo-50 text-indigo-500",
        rose: "bg-rose-50 text-rose-500",
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">
                    {typeof value === "number" ? value.toLocaleString() : value}
                </p>
            </div>
        </div>
    );
};

export default StatCard;
