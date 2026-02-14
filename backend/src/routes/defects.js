const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Generate unique defect ID
const generateDefectId = async () => {
  const { data, error } = await supabase
    .from('defects')
    .select('defect_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 'DEF-001';
  }

  const lastId = data[0].defect_id;
  const num = parseInt(lastId.replace('DEF-', '')) + 1;
  return `DEF-${num.toString().padStart(3, '0')}`;
};

// Get all defects
router.get('/', async (req, res) => {
  try {
    const { project_id, severity, priority, status, search } = req.query;

    let query = supabase
      .from('defects')
      .select(`
        *,
        reported_by_profile:profiles!defects_reported_by_fkey(name, email),
        assigned_to_profile:profiles!defects_assigned_to_fkey(name, email),
        test_case:test_cases(test_case_id, title),
        execution:executions(execution_id),
        project:projects(name)
      `)
      .order('created_at', { ascending: false });

    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`defect_id.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: defects, error } = await query;

    if (error) {
      console.error('Error fetching defects:', error);
      return res.status(500).json({ error: 'Failed to fetch defects' });
    }

    const transformed = defects.map(defect => ({
      ...defect,
      reportedByName: defect.reported_by_profile?.name || 'Unknown',
      assignedToName: defect.assigned_to_profile?.name || 'Unassigned',
      testCaseId: defect.test_case?.test_case_id || null,
      testCaseTitle: defect.test_case?.title || null,
      executionId: defect.execution?.execution_id || null,
      projectName: defect.project?.name || 'Unknown'
    }));

    res.json({ defects: transformed });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single defect
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: defect, error } = await supabase
      .from('defects')
      .select(`
        *,
        reported_by_profile:profiles!defects_reported_by_fkey(name, email),
        assigned_to_profile:profiles!defects_assigned_to_fkey(name, email),
        test_case:test_cases(test_case_id, title, module),
        execution:executions(execution_id, status),
        project:projects(name)
      `)
      .eq('id', id)
      .single();

    if (error || !defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }

    res.json({ defect });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new defect
router.post('/', async (req, res) => {
  try {
    const { 
      project_id,
      test_case_id,
      execution_id,
      title,
      description,
      steps_to_reproduce,
      severity,
      priority,
      environment,
      browser,
      assigned_to
    } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'Project and title are required' });
    }

    // Generate defect ID
    const defect_id = await generateDefectId();

    // Create the defect
    const { data: defect, error } = await supabase
      .from('defects')
      .insert([
        {
          defect_id,
          project_id,
          test_case_id: test_case_id || null,
          execution_id: execution_id || null,
          title,
          description: description || null,
          steps_to_reproduce: steps_to_reproduce || null,
          severity: severity || 'medium',
          priority: priority || 'medium',
          status: 'open',
          environment: environment || null,
          browser: browser || null,
          reported_by: req.user.id,
          assigned_to: assigned_to || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating defect:', error);
      return res.status(500).json({ error: 'Failed to create defect' });
    }

    res.status(201).json({ 
      message: 'Defect reported successfully',
      defect 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a defect
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title,
      description,
      steps_to_reproduce,
      severity,
      priority,
      status,
      environment,
      browser,
      assigned_to
    } = req.body;

    const updateData = {
      title,
      description,
      steps_to_reproduce,
      severity,
      priority,
      status,
      environment,
      browser,
      assigned_to,
      updated_at: new Date().toISOString()
    };

    // Set resolved_at if status is resolved
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    // Set closed_at if status is closed
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { data: defect, error } = await supabase
      .from('defects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }

    res.json({ 
      message: 'Defect updated successfully',
      defect 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a defect
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('defects')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete defect' });
    }

    res.json({ message: 'Defect deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users for assignment dropdown
router.get('/users/list', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({ users: users || [] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
