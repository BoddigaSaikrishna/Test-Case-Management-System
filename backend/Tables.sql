-- =====================================================
-- TestCase Pro - Database Schema
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. DROP TABLES IF EXIST (in reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS execution_steps CASCADE;
DROP TABLE IF EXISTS executions CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS test_case_steps CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Profiles Table (linked to auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'tester', 'user')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Members Table (Many-to-Many relationship)
CREATE TABLE project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Test Cases Table
CREATE TABLE test_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_case_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., TC-0001
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    preconditions TEXT,
    module VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    type VARCHAR(50) DEFAULT 'functional' CHECK (type IN ('functional', 'regression', 'smoke', 'integration', 'performance', 'security', 'usability')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'approved', 'deprecated')),
    expected_result TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Case Steps Table
CREATE TABLE test_case_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE NOT NULL,
    step_number INTEGER NOT NULL,
    action TEXT NOT NULL,
    expected_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_case_id, step_number)
);

-- Executions Table
CREATE TABLE executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., EX-001
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'blocked', 'skipped')),
    executor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    environment VARCHAR(255),
    browser VARCHAR(100),
    comments TEXT,
    execution_time INTEGER, -- in seconds
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution Steps Table (for tracking individual step results)
CREATE TABLE execution_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE NOT NULL,
    test_case_step_id UUID REFERENCES test_case_steps(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'blocked', 'skipped')),
    actual_result TEXT,
    screenshot_url TEXT,
    notes TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Defects Table
CREATE TABLE defects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    defect_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., DEF-001
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'reopened', 'deferred')),
    environment VARCHAR(255),
    browser VARCHAR(100),
    screenshot_url TEXT,
    reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

CREATE INDEX idx_test_cases_project ON test_cases(project_id);
CREATE INDEX idx_test_cases_status ON test_cases(status);
CREATE INDEX idx_test_cases_priority ON test_cases(priority);
CREATE INDEX idx_test_cases_module ON test_cases(module);
CREATE INDEX idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX idx_test_cases_assigned_to ON test_cases(assigned_to);

CREATE INDEX idx_test_case_steps_test_case ON test_case_steps(test_case_id);

CREATE INDEX idx_executions_test_case ON executions(test_case_id);
CREATE INDEX idx_executions_project ON executions(project_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_executor ON executions(executor_id);
CREATE INDEX idx_executions_executed_at ON executions(executed_at);

CREATE INDEX idx_execution_steps_execution ON execution_steps(execution_id);

CREATE INDEX idx_defects_project ON defects(project_id);
CREATE INDEX idx_defects_test_case ON defects(test_case_id);
CREATE INDEX idx_defects_execution ON defects(execution_id);
CREATE INDEX idx_defects_status ON defects(status);
CREATE INDEX idx_defects_severity ON defects(severity);
CREATE INDEX idx_defects_reported_by ON defects(reported_by);
CREATE INDEX idx_defects_assigned_to ON defects(assigned_to);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Full access to projects" ON projects
    FOR ALL USING (true) WITH CHECK (true);

-- Project Members Policies
CREATE POLICY "Full access to project_members" ON project_members
    FOR ALL USING (true) WITH CHECK (true);

-- Test Cases Policies
CREATE POLICY "Full access to test_cases" ON test_cases
    FOR ALL USING (true) WITH CHECK (true);

-- Test Case Steps Policies
CREATE POLICY "Full access to test_case_steps" ON test_case_steps
    FOR ALL USING (true) WITH CHECK (true);

-- Executions Policies
CREATE POLICY "Full access to executions" ON executions
    FOR ALL USING (true) WITH CHECK (true);

-- Execution Steps Policies
CREATE POLICY "Full access to execution_steps" ON execution_steps
    FOR ALL USING (true) WITH CHECK (true);

-- Defects Policies
CREATE POLICY "Full access to defects" ON defects
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 6. CREATE FUNCTION TO HANDLE NEW USER SIGNUP
-- =====================================================

-- This function automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. CREATE FUNCTIONS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at
    BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executions_updated_at
    BEFORE UPDATE ON executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defects_updated_at
    BEFORE UPDATE ON defects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. CREATE FUNCTION FOR AUTO-GENERATING IDs
-- =====================================================

CREATE OR REPLACE FUNCTION generate_test_case_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(test_case_id FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM test_cases
    WHERE project_id = NEW.project_id;
    
    NEW.test_case_id = 'TC-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_generate_test_case_id
    BEFORE INSERT ON test_cases
    FOR EACH ROW
    WHEN (NEW.test_case_id IS NULL)
    EXECUTE FUNCTION generate_test_case_id();

CREATE OR REPLACE FUNCTION generate_execution_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(execution_id FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM executions
    WHERE project_id = NEW.project_id;
    
    NEW.execution_id = 'EX-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_generate_execution_id
    BEFORE INSERT ON executions
    FOR EACH ROW
    WHEN (NEW.execution_id IS NULL)
    EXECUTE FUNCTION generate_execution_id();

CREATE OR REPLACE FUNCTION generate_defect_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(defect_id FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM defects
    WHERE project_id = NEW.project_id;
    
    NEW.defect_id = 'DEF-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_generate_defect_id
    BEFORE INSERT ON defects
    FOR EACH ROW
    WHEN (NEW.defect_id IS NULL)
    EXECUTE FUNCTION generate_defect_id();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
