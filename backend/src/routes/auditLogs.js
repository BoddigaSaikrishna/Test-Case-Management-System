const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// Get all audit logs
router.get('/', async (req, res) => {
  try {
    // Optional: Check if user is admin here if you want to restrict it
    // if (req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden' }); }
    
    // Extract query params for filtering/pagination
    const { entity_type, action, limit = 50, offset = 0 } = req.query;

    const client = supabaseAdmin || supabase;
    let query = client
      .from('audit_logs')
      .select(`
        *,
        profiles!audit_logs_user_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    
    if (action) {
      query = query.eq('action', action);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    res.json({ logs });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
