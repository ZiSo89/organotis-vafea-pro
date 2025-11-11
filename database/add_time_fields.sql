-- Add start_time and end_time fields to calendar_events table
-- These fields store the specific time for visits when all_day is 0

ALTER TABLE calendar_events 
ADD COLUMN start_time TIME NULL AFTER end_date,
ADD COLUMN end_time TIME NULL AFTER start_time;

-- Update existing events to have default times (9:00 AM - 5:00 PM) when all_day = 0
UPDATE calendar_events 
SET start_time = '09:00:00', 
    end_time = '17:00:00' 
WHERE all_day = 0 AND start_time IS NULL;
