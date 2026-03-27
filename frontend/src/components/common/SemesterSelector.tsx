import React from 'react';
import { useSemester } from '../../context/SemesterContext';
import { CalendarDays } from 'lucide-react';

interface SemesterSelectorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    className?: string;
}

/**
 * A reusable, independent semester selector for filtering data on specific pages.
 * Unlike SemesterSwitcher, this does NOT affect the global app state.
 */
const SemesterSelector: React.FC<SemesterSelectorProps> = ({ 
    value, 
    onChange, 
    label = "Học kỳ",
    className = "" 
}) => {
    const { allSemesters, loading } = useSemester();

    if (loading) {
        return (
            <div className={`flex items-center justify-center h-[42px] min-w-[160px] bg-slate-50 border border-slate-200 rounded-lg ${className}`}>
                <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (allSemesters.length === 0) return null;

    // Sort semesters: Academic Year Desc, then Semester Number Asc
    const sortedSemesters = [...allSemesters].sort((a, b) => {
        if (a.academicYearName !== b.academicYearName) {
            return b.academicYearName.localeCompare(a.academicYearName);
        }
        return a.semesterNumber - b.semesterNumber;
    });

    // Group by Year
    const groupedByYear: { year: string, semesters: typeof allSemesters }[] = [];
    sortedSemesters.forEach(s => {
        let group = groupedByYear.find(g => g.year === s.academicYearName);
        if (!group) {
            group = { year: s.academicYearName, semesters: [] };
            groupedByYear.push(group);
        }
        group.semesters.push(s);
    });

    const cleanText = (text: string) => text.replace(/\s+/g, ' ').trim();

    const selectElement = (
        <select
            className={`${label ? 'w-full' : ''} px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer hover:border-slate-300 min-w-[160px] ${!label ? className : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="" disabled>Chọn học kỳ...</option>
            {groupedByYear.map((group) => (
                group.semesters.map(s => (
                    <option key={s.id} value={s.id}>
                        {cleanText(s.name)} (NH {group.year})
                    </option>
                ))
            ))}
        </select>
    );

    if (!label) {
        return selectElement;
    }

    return (
        <div className={className}>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <CalendarDays className="w-3.5 h-3.5" />
                {label}
            </label>
            {selectElement}
        </div>
    );
};

export default SemesterSelector;
