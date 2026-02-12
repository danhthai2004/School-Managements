package com.schoolmanagement.backend.domain;

/**
 * Represents the main session of a class.
 * - SANG (Morning): Main subjects in morning, PE/Activities in afternoon
 * - CHIEU (Afternoon): Main subjects in afternoon, PE/Activities in morning
 */
public enum SessionType {
    SANG,   // Buổi sáng - Morning session
    CHIEU   // Buổi chiều - Afternoon session
}
