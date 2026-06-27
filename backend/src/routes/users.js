const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// GET /api/users - List all users
router.get('/', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users - Create a new user (Invite)
router.post('/', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Use admin client to create user
        const client = supabaseAdmin || supabase;
        let authData, authError;

        if (supabaseAdmin) {
            const result = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name }
            });
            authData = result.data;
            authError = result.error;
        } else {
            // Fallback (might require email confirmation if not disabled in Supabase)
            const result = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });
            authData = result.data;
            authError = result.error;
        }

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        if (!authData.user) {
            return res.status(400).json({ error: 'Failed to create user' });
        }

        // Update profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                name,
                role: role || 'user'
            })
            .eq('id', authData.user.id);

        if (profileError) {
            console.error('Error updating profile:', profileError);
        }

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: authData.user.id,
                email: authData.user.email,
                name: name,
                role: role || 'user'
            }
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
