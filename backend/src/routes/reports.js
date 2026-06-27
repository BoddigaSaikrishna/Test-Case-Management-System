const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/reports/execution
router.get('/execution', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = supabase
      .from('executions')
      .select('id, status, execution_time, project_id, test_case_id');

    if (project_id) query = query.eq('project_id', project_id);

    const { data: executions, error } = await query;
    if (error) throw error;

    const total = executions ? executions.length : 0;
    const passCount = executions ? executions.filter(e => e.status === 'pass').length : 0;
    const failCount = executions ? executions.filter(e => e.status === 'fail').length : 0;
    const blockedCount = executions ? executions.filter(e => e.status === 'blocked').length : 0;
    const skippedCount = executions ? executions.filter(e => e.status === 'skipped').length : 0;
    const pendingCount = executions ? executions.filter(e => e.status === 'pending').length : 0;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;
    const failRate = total > 0 ? Math.round((failCount / total) * 100) : 0;

    // Get test case types separately
    let byType = [];
    if (total > 0) {
      const tcIds = [...new Set((executions || []).map(e => e.test_case_id).filter(Boolean))];
      if (tcIds.length > 0) {
        const { data: tcs } = await supabase
          .from('test_cases')
          .select('id, type')
          .in('id', tcIds);

        const tcTypeMap = {};
        (tcs || []).forEach(tc => { tcTypeMap[tc.id] = tc.type || 'functional'; });

        const typeMap = {};
        executions.forEach(exec => {
          const type = tcTypeMap[exec.test_case_id] || 'functional';
          if (!typeMap[type]) typeMap[type] = { total: 0, pass: 0, fail: 0 };
          typeMap[type].total++;
          if (exec.status === 'pass') typeMap[type].pass++;
          if (exec.status === 'fail') typeMap[type].fail++;
        });
        byType = Object.entries(typeMap).map(([type, stats]) => ({ type, ...stats }));
      }
    }

    res.json({
      summary: { totalExecutions: total, passCount, failCount, blockedCount, skippedCount, pendingCount, passRate, failRate },
      byType,
    });
  } catch (error) {
    console.error('Execution report error:', error);
    res.status(500).json({ error: 'Failed to generate execution report: ' + error.message });
  }
});

// GET /api/reports/defects
router.get('/defects', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = supabase
      .from('defects')
      .select('id, severity, status, priority, project_id');

    if (project_id) query = query.eq('project_id', project_id);

    const { data: defects, error } = await query;
    if (error) throw error;

    const total = defects ? defects.length : 0;
    const openStatuses = ['new', 'open', 'in_progress', 'reopened'];
    const closedStatuses = ['fixed', 'verified', 'closed'];
    const openCount = defects ? defects.filter(d => openStatuses.includes(d.status)).length : 0;
    const closedCount = defects ? defects.filter(d => closedStatuses.includes(d.status)).length : 0;

    const severityMap = {};
    const statusMap = {};
    (defects || []).forEach(d => {
      const sev = d.severity || 'medium';
      const st = d.status || 'new';
      severityMap[sev] = (severityMap[sev] || 0) + 1;
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    res.json({
      summary: {
        totalDefects: total,
        openCount,
        closedCount,
        criticalCount: severityMap['critical'] || 0,
      },
      bySeverity: Object.entries(severityMap).map(([severity, count]) => ({ severity, count })),
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    });
  } catch (error) {
    console.error('Defect report error:', error);
    res.status(500).json({ error: 'Failed to generate defect report: ' + error.message });
  }
});

// GET /api/reports/testers
router.get('/testers', async (req, res) => {
  try {
    const { data: executions, error: execError } = await supabase
      .from('executions')
      .select('id, status, execution_time, executor_id');
    if (execError) throw execError;

    const { data: defects, error: defError } = await supabase
      .from('defects')
      .select('id, reported_by');
    if (defError) throw defError;

    // Lookup profile names
    const executorIds = [...new Set((executions || []).map(e => e.executor_id).filter(Boolean))];
    const profileMap = {};
    if (executorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', executorIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    const testerMap = {};
    (executions || []).forEach(exec => {
      const id = exec.executor_id;
      if (!id) return;
      if (!testerMap[id]) {
        const p = profileMap[id];
        testerMap[id] = {
          id,
          name: (p && p.name) ? p.name : 'Unknown',
          email: (p && p.email) ? p.email : '',
          totalExecutions: 0,
          passCount: 0,
          failCount: 0,
          defectsReported: 0,
          totalTime: 0,
        };
      }
      testerMap[id].totalExecutions++;
      if (exec.status === 'pass') testerMap[id].passCount++;
      if (exec.status === 'fail') testerMap[id].failCount++;
      if (exec.execution_time) testerMap[id].totalTime += exec.execution_time;
    });

    (defects || []).forEach(d => {
      if (d.reported_by && testerMap[d.reported_by]) {
        testerMap[d.reported_by].defectsReported++;
      }
    });

    const testers = Object.values(testerMap).map(function (t) {
      return {
        id: t.id,
        name: t.name,
        email: t.email,
        totalExecutions: t.totalExecutions,
        passCount: t.passCount,
        failCount: t.failCount,
        defectsReported: t.defectsReported,
        passRate: t.totalExecutions > 0 ? Math.round((t.passCount / t.totalExecutions) * 100) : 0,
        avgExecutionTime: t.totalExecutions > 0 ? Math.round(t.totalTime / t.totalExecutions) : 0,
      };
    }).sort(function (a, b) { return b.totalExecutions - a.totalExecutions; });

    res.json({
      summary: {
        totalTesters: testers.length,
        totalExecutions: (executions || []).length,
        totalDefectsReported: (defects || []).length,
        avgExecutionsPerTester: testers.length > 0
          ? Math.round((executions || []).length / testers.length)
          : 0,
      },
      testers,
    });
  } catch (error) {
    console.error('Testers report error:', error);
    res.status(500).json({ error: 'Failed to generate tester report: ' + error.message });
  }
});

// GET /api/reports/projects
router.get('/projects', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');
    if (error) throw error;
    res.json({ projects: projects || [] });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

module.exports = router;
