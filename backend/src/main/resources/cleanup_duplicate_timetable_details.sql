-- =====================================================
-- Cleanup duplicate TimetableDetail records
-- Run this BEFORE restarting the backend
-- (so Hibernate can create the unique constraints)
-- =====================================================

-- 1. Find and delete duplicate CLASS entries (keep the first-created one)
DELETE FROM timetable_details
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY timetable_id, classroom_id, day_of_week, slot_index
                   ORDER BY id  -- keep the first one by UUID
               ) as rn
        FROM timetable_details
    ) sub
    WHERE rn > 1
);

-- 2. Find and delete duplicate TEACHER entries (keep the first-created one)
-- Only for rows where teacher_id is NOT NULL
DELETE FROM timetable_details
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY timetable_id, teacher_id, day_of_week, slot_index
                   ORDER BY id
               ) as rn
        FROM timetable_details
        WHERE teacher_id IS NOT NULL
    ) sub
    WHERE rn > 1
);

-- 3. Verify: Check for any remaining duplicates
SELECT timetable_id, teacher_id, day_of_week, slot_index, COUNT(*) as cnt
FROM timetable_details
WHERE teacher_id IS NOT NULL
GROUP BY timetable_id, teacher_id, day_of_week, slot_index
HAVING COUNT(*) > 1;

SELECT timetable_id, classroom_id, day_of_week, slot_index, COUNT(*) as cnt
FROM timetable_details
GROUP BY timetable_id, classroom_id, day_of_week, slot_index
HAVING COUNT(*) > 1;
