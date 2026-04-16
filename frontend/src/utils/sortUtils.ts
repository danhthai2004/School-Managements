/**
 * Vietnamese-aware name sorting utility.
 * Sorts by the last word (Tên chính) first, then by the full string.
 */
export const vietnameseNameSort = (a: string, b: string) => {
    if (!a) return -1;
    if (!b) return 1;

    const getSortName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        return parts.length > 0 ? parts[parts.length - 1] : fullName;
    };

    const nameA = getSortName(a);
    const nameB = getSortName(b);

    const cmp = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;

    return a.localeCompare(b, 'vi', { sensitivity: 'base' });
};

/**
 * Higher-order function to create a sort comparator for objects.
 */
export const createSortByVietnameseName = <T>(accessor: (item: T) => string) => {
    return (a: T, b: T) => vietnameseNameSort(accessor(a), accessor(b));
};
