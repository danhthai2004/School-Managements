package com.schoolmanagement.backend.util;

import java.util.Comparator;

public class StudentSortUtils {

    /**
     * Comparator for Vietnamese names:
     * 1. Sorts by the "Tên chính" (the last word of the full name).
     * 2. If the last words are identical, it falls back to comparing the full
     * string.
     */
    public static Comparator<String> vietnameseNameComparator() {
        return (name1, name2) -> {
            if (name1 == null && name2 == null)
                return 0;
            if (name1 == null)
                return -1;
            if (name2 == null)
                return 1;

            String n1 = name1.trim();
            String n2 = name2.trim();

            if (n1.isEmpty() && n2.isEmpty())
                return 0;
            if (n1.isEmpty())
                return -1;
            if (n2.isEmpty())
                return 1;

            String[] parts1 = n1.split("\\s+");
            String[] parts2 = n2.split("\\s+");

            String last1 = parts1[parts1.length - 1];
            String last2 = parts2[parts2.length - 1];

            int res = last1.compareToIgnoreCase(last2);
            if (res != 0)
                return res;

            // If last names are the same, compare full strings
            return n1.compareToIgnoreCase(n2);
        };
    }
}
