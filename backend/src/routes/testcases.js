const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { logAction } = require('../services/auditLogger');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Generate unique test case ID
const generateTestCaseId = async () => {
  const { data, error } = await supabase
    .from('test_cases')
    .select('test_case_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 'TC-0001';
  }

  const lastId = data[0].test_case_id;
  const num = parseInt(lastId.replace('TC-', '')) + 1;
  return `TC-${num.toString().padStart(4, '0')}`;
};

// Get all test cases
router.get('/', async (req, res) => {
  try {
    const { project_id, priority, status, type, search } = req.query;

    let query = supabase
      .from('test_cases')
      .select(`
        *,
        created_by_profile:profiles!test_cases_created_by_fkey(name, email),
        assigned_to_profile:profiles!test_cases_assigned_to_fkey(name, email),
        project:projects(name),
        test_case_steps(count)
      `)
      .order('created_at', { ascending: false });

    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,test_case_id.ilike.%${search}%,module.ilike.%${search}%`);
    }

    const { data: testCases, error } = await query;

    if (error) {
      console.error('Error fetching test cases:', error);
      return res.status(500).json({ error: 'Failed to fetch test cases' });
    }

    const transformed = testCases.map(tc => ({
      ...tc,
      createdByName: tc.created_by_profile?.name || 'Unknown',
      assignedToName: tc.assigned_to_profile?.name || null,
      projectName: tc.project?.name || 'Unknown',
      stepsCount: tc.test_case_steps[0]?.count || 0
    }));

    res.json({ testCases: transformed });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single test case with steps
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: testCase, error } = await supabase
      .from('test_cases')
      .select(`
        *,
        created_by_profile:profiles!test_cases_created_by_fkey(name, email),
        assigned_to_profile:profiles!test_cases_assigned_to_fkey(name, email),
        project:projects(name),
        test_case_steps(*)
      `)
      .eq('id', id)
      .order('step_number', { foreignTable: 'test_case_steps', ascending: true })
      .single();

    if (error || !testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    res.json({ testCase });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new test case with steps
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      title,
      description,
      preconditions,
      module,
      priority,
      type,
      expected_result,
      assigned_to,
      feature_url,
      steps
    } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'Project and title are required' });
    }

    // Generate test case ID
    const test_case_id = await generateTestCaseId();

    // Create the test case
    const { data: testCase, error } = await supabase
      .from('test_cases')
      .insert([
        {
          test_case_id,
          project_id,
          title,
          description: description || null,
          preconditions: preconditions || null,
          module: module || null,
          priority: priority || 'medium',
          type: type || 'functional',
          status: 'draft',
          expected_result: expected_result || null,
          created_by: req.user.id,
          assigned_to: assigned_to || null,
          feature_url: feature_url || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating test case:', error);
      require('fs').writeFileSync('last_error.log', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to create test case', details: error });
    }

    // Create steps if provided
    if (steps && steps.length > 0) {
      const stepsData = steps.map((step, index) => ({
        test_case_id: testCase.id,
        step_number: index + 1,
        action: step.action,
        expected_result: step.expected_result || null,
        test_code: step.test_code || null,
      }));

      const { error: stepsError } = await supabase
        .from('test_case_steps')
        .insert(stepsData);

      if (stepsError) {
        console.error('Error creating steps:', stepsError);
      }
    }

    await logAction({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'TEST_CASE',
      entityId: testCase.id,
      details: { test_case_id: testCase.test_case_id, title: testCase.title }
    });

    res.status(201).json({
      message: 'Test case created successfully',
      testCase
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a test case
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      preconditions,
      module,
      priority,
      type,
      status,
      expected_result,
      assigned_to,
      feature_url,
      steps
    } = req.body;

    const { data: testCase, error } = await supabase
      .from('test_cases')
      .update({
        title,
        description,
        preconditions,
        module,
        priority,
        type,
        status,
        expected_result,
        assigned_to,
        feature_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    // Update steps if provided
    if (steps) {
      // Delete existing steps
      await supabase
        .from('test_case_steps')
        .delete()
        .eq('test_case_id', id);

      // Insert new steps
      if (steps.length > 0) {
        const stepsData = steps.map((step, index) => ({
          test_case_id: id,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expected_result || null,
          test_code: step.test_code || null,
        }));

        await supabase
          .from('test_case_steps')
          .insert(stepsData);
      }
    }

    await logAction({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'TEST_CASE',
      entityId: id,
      details: { title: testCase.title }
    });

    res.json({
      message: 'Test case updated successfully',
      testCase
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a test case
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('test_cases')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete test case' });
    }

    await logAction({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'TEST_CASE',
      entityId: id
    });

    res.json({ message: 'Test case deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a step to a test case
router.post('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, expected_result } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Get the max step number
    const { data: maxStep } = await supabase
      .from('test_case_steps')
      .select('step_number')
      .eq('test_case_id', id)
      .order('step_number', { ascending: false })
      .limit(1);

    const stepNumber = maxStep && maxStep.length > 0 ? maxStep[0].step_number + 1 : 1;

    const { data: step, error } = await supabase
      .from('test_case_steps')
      .insert([
        {
          test_case_id: id,
          step_number: stepNumber,
          action,
          expected_result: expected_result || null,
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add step' });
    }

    res.status(201).json({
      message: 'Step added successfully',
      step
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export all test cases with full data
router.get('/export/all', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = supabase
      .from('test_cases')
      .select(`
        *,
        test_case_steps(*)
      `)
      .order('created_at', { ascending: false });

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: testCases, error } = await query;

    if (error) {
      console.error('Error fetching test cases for export:', error);
      return res.status(500).json({ error: 'Failed to export test cases' });
    }

    res.json({ testCases });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import bulk test cases
router.post('/import', async (req, res) => {
  try {
    const { testCases } = req.body;

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'Valid testCases array is required' });
    }

    const imported = [];
    
    for (const tc of testCases) {
      // Validate minimal fields
      if (!tc.project_id || !tc.title) continue;

      // Generate a new test case ID
      const test_case_id = await generateTestCaseId();

      const { data: testCase, error } = await supabase
        .from('test_cases')
        .insert([{
          test_case_id,
          project_id: tc.project_id,
          title: tc.title,
          description: tc.description || null,
          preconditions: tc.preconditions || null,
          module: tc.module || null,
          priority: tc.priority || 'medium',
          type: tc.type || 'functional',
          status: tc.status || 'draft',
          expected_result: tc.expected_result || null,
          created_by: req.user.id,
          assigned_to: tc.assigned_to || null,
          feature_url: tc.feature_url || null,
        }])
        .select()
        .single();

      if (error || !testCase) {
        console.error('Error importing test case:', error);
        continue;
      }

      imported.push(testCase);

      // Import steps if they exist
      if (tc.test_case_steps && Array.isArray(tc.test_case_steps) && tc.test_case_steps.length > 0) {
        const stepsData = tc.test_case_steps.map((step, index) => ({
          test_case_id: testCase.id,
          step_number: step.step_number || index + 1,
          action: step.action,
          expected_result: step.expected_result || null,
          test_code: step.test_code || null,
        })).filter(s => s.action); // Must have an action

        if (stepsData.length > 0) {
          const { error: stepsError } = await supabase
            .from('test_case_steps')
            .insert(stepsData);

          if (stepsError) {
            console.error('Error creating imported steps:', stepsError);
          }
        }
      }
    }

    res.status(201).json({
      message: `${imported.length} test cases imported successfully`,
      count: imported.length
    });
  } catch (error) {
    console.error('Error importing:', error);
    res.status(500).json({ error: 'Internal server error during import' });
  }
});

module.exports = router;
