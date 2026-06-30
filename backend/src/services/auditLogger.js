const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Logs an action to the audit_logs table.
 * 
 * @param {Object} params
 * @param {string} params.userId - The ID of the user performing the action
 * @param {string} params.action - The action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - The type of entity (PROJECT, TEST_CASE, DEFECT, etc.)
 * @param {string} params.entityId - The ID of the entity being acted upon
 * @param {Object} [params.details] - Optional JSON object with additional details (e.g. before/after values)
 */
async function logAction({ userId, action, entityType, entityId, details = {} }) {
  try {
    const client = supabaseAdmin || supabase;
    const { error } = await client
      .from('audit_logs')
      .insert([
        {
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details
        }
      ]);

    if (error) {
      console.error('Failed to log action:', error);
    }
  } catch (err) {
    console.error('Exception in auditLogger:', err);
  }
}

module.exports = {
  logAction
};
