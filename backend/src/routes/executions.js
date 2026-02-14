const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Generate unique execution ID
const generateExecutionId = async () => {
  const { data, error } = await supabase
    .from('executions')
    .select('execution_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 'EX-001';
  }

  const lastId = data[0].execution_id;
  const num = parseInt(lastId.replace('EX-', '')) + 1;
  return `EX-${num.toString().padStart(3, '0')}`;
};

// Get all executions
router.get('/', async (req, res) => {
  try {
    const { project_id, status, test_case_id, search } = req.query;

    let query = supabase
      .from('executions')
      .select(`
        *,
        executor:profiles!executions_executor_id_fkey(name, email),
        test_case:test_cases(test_case_id, title, module),
        project:projects(name),
        execution_steps(count)
      `)
      .order('executed_at', { ascending: false });

    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (test_case_id) {
      query = query.eq('test_case_id', test_case_id);
    }
    if (search) {
      query = query.or(`execution_id.ilike.%${search}%,comments.ilike.%${search}%`);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Error fetching executions:', error);
      return res.status(500).json({ error: 'Failed to fetch executions' });
    }

    const transformed = executions.map(exec => ({
      ...exec,
      executorName: exec.executor?.name || 'Unknown',
      testCaseId: exec.test_case?.test_case_id || 'Unknown',
      testCaseTitle: exec.test_case?.title || 'Unknown',
      testCaseModule: exec.test_case?.module || null,
      projectName: exec.project?.name || 'Unknown',
      stepsCount: exec.execution_steps[0]?.count || 0
    }));

    res.json({ executions: transformed });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single execution with steps
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: execution, error } = await supabase
      .from('executions')
      .select(`
        *,
        executor:profiles!executions_executor_id_fkey(name, email),
        test_case:test_cases(
          test_case_id, 
          title, 
          module,
          test_case_steps(*)
        ),
        project:projects(name),
        execution_steps(
          *,
          test_case_step:test_case_steps(step_number, action, expected_result)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ execution });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new execution
router.post('/', async (req, res) => {
  try {
    const { 
      test_case_id, 
      project_id,
      status,
      environment,
      browser,
      comments,
      execution_time,
      steps
    } = req.body;

    if (!test_case_id || !project_id) {
      return res.status(400).json({ error: 'Test case and project are required' });
    }

    // Generate execution ID
    const execution_id = await generateExecutionId();

    // Create the execution
    const { data: execution, error } = await supabase
      .from('executions')
      .insert([
        {
          execution_id,
          test_case_id,
          project_id,
          status: status || 'pending',
          executor_id: req.user.id,
          environment: environment || null,
          browser: browser || null,
          comments: comments || null,
          execution_time: execution_time || null,
          executed_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating execution:', error);
      return res.status(500).json({ error: 'Failed to create execution' });
    }

    // Create execution steps if provided
    if (steps && steps.length > 0) {
      const stepsData = steps.map(step => ({
        execution_id: execution.id,
        test_case_step_id: step.test_case_step_id,
        status: step.status || 'pending',
        actual_result: step.actual_result || null,
        notes: step.notes || null,
        executed_at: new Date().toISOString(),
      }));

      const { error: stepsError } = await supabase
        .from('execution_steps')
        .insert(stepsData);

      if (stepsError) {
        console.error('Error creating execution steps:', stepsError);
      }
    }

    res.status(201).json({ 
      message: 'Execution created successfully',
      execution 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an execution
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status,
      environment,
      browser,
      comments,
      execution_time,
      steps
    } = req.body;

    const { data: execution, error } = await supabase
      .from('executions')
      .update({
        status,
        environment,
        browser,
        comments,
        execution_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Update steps if provided
    if (steps && steps.length > 0) {
      for (const step of steps) {
        if (step.id) {
          // Update existing step
          await supabase
            .from('execution_steps')
            .update({
              status: step.status,
              actual_result: step.actual_result,
              notes: step.notes,
              executed_at: new Date().toISOString()
            })
            .eq('id', step.id);
        }
      }
    }

    res.json({ 
      message: 'Execution updated successfully',
      execution 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an execution
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('executions')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete execution' });
    }

    res.json({ message: 'Execution deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test case steps for execution
router.get('/testcase/:testCaseId/steps', async (req, res) => {
  try {
    const { testCaseId } = req.params;

    const { data: steps, error } = await supabase
      .from('test_case_steps')
      .select('*')
      .eq('test_case_id', testCaseId)
      .order('step_number', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch steps' });
    }

    res.json({ steps: steps || [] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update execution step status
router.put('/:executionId/steps/:stepId', async (req, res) => {
  try {
    const { stepId } = req.params;
    const { status, actual_result, notes } = req.body;

    const { data: step, error } = await supabase
      .from('execution_steps')
      .update({
        status,
        actual_result,
        notes,
        executed_at: new Date().toISOString()
      })
      .eq('id', stepId)
      .select()
      .single();

    if (error || !step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    res.json({ 
      message: 'Step updated successfully',
      step 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
