-- ========================================
-- Διαγραφή μόνο των συγχρονισμένων events από το ημερολόγιο
-- ========================================
-- Αυτό το script διαγράφει μόνο τα calendar events που προέρχονται από εργασίες (job_id IS NOT NULL)
-- και ΔΕΝ διαγράφει τις χειροκίνητες επισκέψεις

-- Διαγραφή μόνο των events που έχουν job_id (δηλαδή συγχρονίστηκαν από εργασίες)
DELETE FROM calendar_events WHERE job_id IS NOT NULL;

-- Επιβεβαίωση
SELECT 
    'Διαγράφηκαν μόνο τα συγχρονισμένα events' as message,
    COUNT(*) as remaining_manual_events
FROM calendar_events
WHERE job_id IS NULL;
