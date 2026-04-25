import React from "react";

/**
 * Custom text input for date fields, used with react-datepicker.
 */
const CustomDateInput = React.forwardRef<HTMLInputElement, any>((props, ref) => {
    const { value, onClick, onChange, placeholder, className, ...rest } = props;

    return (
        <input
            {...rest}
            ref={ref}
            value={value || ""}
            onClick={onClick}
            onChange={onChange}
            placeholder={placeholder}
            className={className || "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-700"}
            maxLength={10}
        />
    );
});

CustomDateInput.displayName = "CustomDateInput";

export default CustomDateInput;
