import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SemesterDto, AcademicYearDto } from '../services/semesterService';
import { semesterService } from '../services/semesterService';
import { useAuth } from './AuthContext';

interface SemesterContextType {
    activeSemester: SemesterDto | null;
    allSemesters: SemesterDto[];
    allAcademicYears: AcademicYearDto[];
    loading: boolean;
    refreshSemesters: () => Promise<void>;
}

const SemesterContext = createContext<SemesterContextType>({
    activeSemester: null,
    allSemesters: [],
    allAcademicYears: [],
    loading: true,
    refreshSemesters: async () => {},
});

export const useSemester = () => useContext(SemesterContext);

export const SemesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [activeSemester, setActiveSemester] = useState<SemesterDto | null>(null);
    const [allSemesters, setAllSemesters] = useState<SemesterDto[]>([]);
    const [allAcademicYears, setAllAcademicYears] = useState<AcademicYearDto[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSemesters = useCallback(async () => {
        if (!user || user.role === 'SYSTEM_ADMIN') {
            setAllSemesters([]);
            setAllAcademicYears([]);
            setActiveSemester(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [semesters, current, academicYears] = await Promise.all([
                semesterService.listSemesters(),
                semesterService.getCurrentSemester(),
                semesterService.listAcademicYears(),
            ]);
            setAllSemesters(semesters);
            setAllAcademicYears(academicYears);
            
            // Prioritize the semester explicitly marked as 'ACTIVE' in the list
            const activeFromList = semesters.find(s => s.status === 'ACTIVE');
            setActiveSemester(activeFromList || current || (semesters.length > 0 ? semesters[0] : null));
        } catch (err) {
            console.error('Failed to load semesters:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadSemesters();
    }, [loadSemesters]);

    return (
        <SemesterContext.Provider value={{
            activeSemester,
            allSemesters,
            allAcademicYears,
            loading,
            refreshSemesters: loadSemesters,
        }}>
            {children}
        </SemesterContext.Provider>
    );
};

export default SemesterContext;
