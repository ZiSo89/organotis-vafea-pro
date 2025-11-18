-- Add original_title column to calendar_events table
-- This column stores the clean title without client name

-- Add the column if it doesn't exist
ALTER TABLE `calendar_events` 
ADD COLUMN `original_title` VARCHAR(255) NULL AFTER `title`;

-- Migrate existing data: copy title to original_title
-- The title field currently contains combined "title - clientName"
-- We need to extract just the title part
UPDATE `calendar_events` ce
LEFT JOIN `clients` c ON ce.client_id = c.id
SET ce.original_title = CASE
    -- If client_name is in the title, extract the part before " - clientName"
    WHEN c.name IS NOT NULL AND ce.title LIKE CONCAT('% - ', c.name) THEN
        SUBSTRING(ce.title, 1, LENGTH(ce.title) - LENGTH(c.name) - 3)
    -- Otherwise, use the full title
    ELSE ce.title
END
WHERE ce.original_title IS NULL;

-- For safety, set original_title = title where it's still NULL
UPDATE `calendar_events`
SET original_title = title
WHERE original_title IS NULL;
