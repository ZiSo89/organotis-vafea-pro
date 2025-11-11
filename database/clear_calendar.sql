-- Καθαρισμός όλων των calendar events
DELETE FROM calendar_events;

-- Reset auto increment
ALTER TABLE calendar_events AUTO_INCREMENT = 1;
