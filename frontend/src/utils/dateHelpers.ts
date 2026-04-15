/**
 * Shared date input formatting & parsing utilities.
 * Used by StudentManagement, TeacherManagement, and any form with DD/MM/YYYY date fields.
 */

/** Format raw numeric input into DD/MM/YYYY as the user types. */
export const formatDateInput = (value: string, isDeleting: boolean = false): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);

    if (limited.length >= 5) {
        return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }

    if (limited.length >= 3) {
        if (limited.length === 4 && !isDeleting) {
            return `${limited.slice(0, 2)}/${limited.slice(2)}/`;
        }
        return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }

    if (limited.length === 2 && !isDeleting) {
        return `${limited}/`;
    }

    return limited;
};

/** Parse a DD/MM/YYYY string into ISO YYYY-MM-DD, returns undefined if invalid. */
export const parseDateDDMMYYYY = (dateStr: string): string | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;

    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
        return undefined;
    }

    return `${year}-${month}-${day}`;
};

export const formatDate = (input: any): string => {
    if (!input) return '—';
    try {
        // Support Spring Boot LocalDate default serialization [YYYY, MM, DD]
        if (Array.isArray(input) && input.length >= 3) {
            const year = input[0];
            const month = String(input[1]).padStart(2, '0');
            const day = String(input[2]).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }

        let date: Date;
        if (input instanceof Date) {
            date = input;
        } else {
            // Check for yyyy-mm-dd format manually to prevent timezone shifts
            if (typeof input === 'string' && input.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = input.split('-');
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }
            
            // Allow bypassing custom parsing if it is already dd/mm/yyyy or d/mm/yyyy
            if (typeof input === 'string' && input.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                return input;
            }

            date = new Date(input);
        }
        if (isNaN(date.getTime())) return '—';
        const day = String(date.getDate()).padStart(2, '0'); // 'dd' format
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 'mm' format
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '—';
    }
};
