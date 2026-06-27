const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/settings/profile - Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, name, email, role, created_at')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        res.json({ profile });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/settings/profile - Update user name
router.put('/profile', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const { error } = await supabase
            .from('profiles')
            .update({ name: name.trim() })
            .eq('id', req.user.id);

        if (error) throw error;

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/settings/password - Change password
router.put('/password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        let error;
        if (supabaseAdmin) {
            const result = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
                password: newPassword,
            });
            error = result.error;
        } else {
            const result = await supabase.auth.updateUser({ password: newPassword });
            error = result.error;
        }

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
