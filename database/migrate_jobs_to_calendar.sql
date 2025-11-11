-- ========================================
-- Migration Script: Jobs to Calendar Events
-- ========================================
-- Αυτό το script μεταφέρει τις εργασίες με ημερομηνίες στο calendar_events
-- ΠΡΟΣΟΧΗ: Εκτέλεσε αυτό μόνο ΜΙΑ ΦΟΡΑ!

-- Μεταφορά εργασιών με start_date στο ημερολόγιο
INSERT INTO calendar_events (
    title, 
    start_date, 
    end_date, 
    client_id, 
    job_id, 
    address, 
    description, 
    status,
    all_day,
    created_at
)
SELECT 
    j.title,
    CONCAT(j.start_date, ' 09:00:00') as start_date,  -- Προσθέτουμε ώρα 09:00
    CASE 
        WHEN j.end_date IS NOT NULL THEN CONCAT(j.end_date, ' 17:00:00')
        ELSE NULL 
    END as end_date,
    j.client_id,
    j.id as job_id,  -- Συνδέουμε με την εργασία
    j.address,
    j.description,
    CASE 
        WHEN j.status = 'pending' THEN 'pending'
        WHEN j.status = 'in-progress' THEN 'in_progress'
        WHEN j.status = 'Σε εξέλιξη' THEN 'in_progress'
        WHEN j.status = 'completed' THEN 'completed'
        WHEN j.status = 'Ολοκληρώθηκε' THEN 'completed'
        WHEN j.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END as status,
    1 as all_day,  -- Ορίζουμε ως ολοήμερες
    j.created_at
FROM jobs j
WHERE j.start_date IS NOT NULL
AND NOT EXISTS (
    -- Αποφυγή duplicates αν έχει τρέξει ήδη το script
    SELECT 1 FROM calendar_events ce WHERE ce.job_id = j.id
);

-- Εμφάνιση αποτελεσμάτων
SELECT 
    COUNT(*) as total_migrated,
    'επισκέψεις μεταφέρθηκαν από jobs στο calendar_events' as message
FROM calendar_events
WHERE job_id IS NOT NULL;
