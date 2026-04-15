import React from "react";

/**
 * Custom text input for date fields, used with react-datepicker.
 * Accepts rawValue to display the typed DD/MM/YYYY string.
 */
const CustomDateInput = React.forwardRef<HTMLInputElement, {
    value?: string;
    onClick?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    rawValue?: string;
    className?: string; // Add this line
}>(({ value, onClick, onChange, placeholder, rawValue, className, ...props }, ref) => (
    <input
        {...props}
        ref={ref}
        type="text"
        value={rawValue}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        className={className || "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"} // Use default if no className passed
        maxLength={10}
    />
));

CustomDateInput.displayName = "CustomDateInput";

export default CustomDateInput;
