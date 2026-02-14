const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all projects for the current user
router.get('/', async (req, res) => {
  try {
    // For now, get all projects (you can add filtering by project_members later)
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_profile:profiles!projects_created_by_fkey(name, email),
        project_members(count),
        test_cases(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    // Transform data to include member count and test case count
    const transformedProjects = projects.map(project => ({
      ...project,
      members: project.project_members[0]?.count || 0,
      totalCases: project.test_cases[0]?.count || 0,
      createdByName: project.created_by_profile?.name || 'Unknown'
    }));

    res.json({ projects: transformedProjects });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_profile:profiles!projects_created_by_fkey(name, email),
        project_members(
          user_id,
          role,
          profiles(name, email, avatar_url)
        ),
        test_cases(count)
      `)
      .eq('id', id)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          description: description || null,
          status: status || 'active',
          start_date: start_date || null,
          end_date: end_date || null,
          created_by: req.user.id,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }

    // Add the creator as a project owner
    await supabase
      .from('project_members')
      .insert([
        {
          project_id: project.id,
          user_id: req.user.id,
          role: 'owner'
        }
      ]);

    res.status(201).json({ 
      message: 'Project created successfully',
      project 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, start_date, end_date } = req.body;

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        status,
        start_date,
        end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ 
      message: 'Project updated successfully',
      project 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
