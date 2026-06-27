-- Add test_code column to test_case_steps for API automation testing
-- Run this in your Supabase SQL Editor

ALTER TABLE test_case_steps 
ADD COLUMN IF NOT EXISTS test_code TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN test_case_steps.test_code IS 'JavaScript code for API automation testing';
