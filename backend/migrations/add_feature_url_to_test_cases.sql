-- Add feature_url column to test_cases table
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS feature_url TEXT;
-- Optionally, add a comment
COMMENT ON COLUMN test_cases.feature_url IS 'URL of the feature/page under test (e.g., login page)';
