-- Migration: Add coordinates column to clients table
-- Date: 2025-11-16
-- Description: Adds JSON coordinates field for geocoding support

ALTER TABLE `clients` 
ADD COLUMN `coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
AFTER `notes`;

-- Verify the change
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_SET_NAME, 
    COLLATION_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'clients' 
  AND COLUMN_NAME = 'coordinates';
