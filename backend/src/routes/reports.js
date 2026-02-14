const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/reports/execution - Test Execution Report
router.get('/execution', async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    let query = supabase
      .from('test_executions')
      .select(`
        id,
        execution_id,
        status,
        executed_at,
        execution_time,
        test_case_id,
        test_cases (
          test_case_id,
          title,
          priority,
          type,
          project_id,
          projects (
            id,
            name
          )
        ),
        profiles:executed_by (
          id,
          full_name
        )
      `)
      .order('executed_at', { ascending: false });

    // Filter by project if specified
    if (project_id) {
      query = query.eq('test_cases.project_id', project_id);
    }

    // Filter by date range
    if (start_date) {
      query = query.gte('executed_at', start_date);
    }
    if (end_date) {
      query = query.lte('executed_at', end_date);
    }

    const { data: executions, error } = await query;

    if (error) throw error;

    // Calculate summary statistics
    const totalExecutions = executions?.length || 0;
    const passCount = executions?.filter(e => e.status === 'pass').length || 0;
    const failCount = executions?.filter(e => e.status === 'fail').length || 0;
    const blockedCount = executions?.filter(e => e.status === 'blocked').length || 0;
    const skippedCount = executions?.filter(e => e.status === 'skipped').length || 0;
    const pendingCount = executions?.filter(e => e.status === 'pending').length || 0;

    const passRate = totalExecutions > 0 ? Math.round((passCount / totalExecutions) * 100) : 0;
    const failRate = totalExecutions > 0 ? Math.round((failCount / totalExecutions) * 100) : 0;

    // Group by project
    const byProject = {};
    executions?.forEach(exec => {
      const projectName = exec.test_cases?.projects?.name || 'Unknown';
      if (!byProject[projectName]) {
        byProject[projectName] = { total: 0, pass: 0, fail: 0, blocked: 0, skipped: 0, pending: 0 };
      }
      byProject[projectName].total++;
      byProject[projectName][exec.status]++;
    });

    // Group by priority
    const byPriority = { critical: { total: 0, pass: 0, fail: 0 }, high: { total: 0, pass: 0, fail: 0 }, medium: { total: 0, pass: 0, fail: 0 }, low: { total: 0, pass: 0, fail: 0 } };
    executions?.forEach(exec => {
      const priority = exec.test_cases?.priority || 'medium';
      if (byPriority[priority]) {
        byPriority[priority].total++;
        if (exec.status === 'pass') byPriority[priority].pass++;
        if (exec.status === 'fail') byPriority[priority].fail++;
      }
    });

    // Group by type
    const byType = {};
    executions?.forEach(exec => {
      const type = exec.test_cases?.type || 'functional';
      if (!byType[type]) {
        byType[type] = { total: 0, pass: 0, fail: 0 };
      }
      byType[type].total++;
      if (exec.status === 'pass') byType[type].pass++;
      if (exec.status === 'fail') byType[type].fail++;
    });

    // Recent executions list
    const recentExecutions = executions?.slice(0, 20).map(exec => ({
      id: exec.execution_id,
      testCaseId: exec.test_cases?.test_case_id || 'N/A',
      title: exec.test_cases?.title || 'Unknown',
      status: exec.status,
      executor: exec.profiles?.full_name || 'Unknown',
      projectName: exec.test_cases?.projects?.name || 'Unknown',
      executedAt: exec.executed_at,
      executionTime: exec.execution_time,
    })) || [];

    res.json({
      summary: {
        totalExecutions,
        passCount,
        failCount,
        blockedCount,
        skippedCount,
        pendingCount,
        passRate,
        failRate,
      },
      byProject: Object.entries(byProject).map(([name, stats]) => ({ name, ...stats })),
      byPriority: Object.entries(byPriority).map(([priority, stats]) => ({ priority, ...stats })),
      byType: Object.entries(byType).map(([type, stats]) => ({ type, ...stats })),
      recentExecutions,
    });
  } catch (error) {
    console.error('Error generating execution report:', error);
    res.status(500).json({ error: 'Failed to generate execution report' });
  }
});

// GET /api/reports/defects - Defect Summary Report
router.get('/defects', async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    let query = supabase
      .from('defects')
      .select(`
        id,
        defect_id,
        title,
        severity,
        priority,
        status,
        created_at,
        project_id,
        projects (
          id,
          name
        ),
        reported_by_profile:profiles!defects_reported_by_fkey (
          id,
          full_name
        ),
        assigned_to_profile:profiles!defects_assigned_to_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: defects, error } = await query;

    if (error) throw error;

    const totalDefects = defects?.length || 0;

    // By severity
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    defects?.forEach(d => {
      if (bySeverity.hasOwnProperty(d.severity)) {
        bySeverity[d.severity]++;
      }
    });

    // By priority
    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    defects?.forEach(d => {
      if (byPriority.hasOwnProperty(d.priority)) {
        byPriority[d.priority]++;
      }
    });

    // By status
    const byStatus = { new: 0, open: 0, in_progress: 0, fixed: 0, verified: 0, closed: 0, reopened: 0 };
    defects?.forEach(d => {
      if (byStatus.hasOwnProperty(d.status)) {
        byStatus[d.status]++;
      }
    });

    // Open vs Closed
    const openStatuses = ['new', 'open', 'in_progress', 'reopened'];
    const closedStatuses = ['fixed', 'verified', 'closed'];
    const openCount = defects?.filter(d => openStatuses.includes(d.status)).length || 0;
    const closedCount = defects?.filter(d => closedStatuses.includes(d.status)).length || 0;

    // By project
    const byProject = {};
    defects?.forEach(d => {
      const projectName = d.projects?.name || 'Unknown';
      if (!byProject[projectName]) {
        byProject[projectName] = { total: 0, open: 0, closed: 0, critical: 0 };
      }
      byProject[projectName].total++;
      if (openStatuses.includes(d.status)) byProject[projectName].open++;
      if (closedStatuses.includes(d.status)) byProject[projectName].closed++;
      if (d.severity === 'critical') byProject[projectName].critical++;
    });

    // Recent defects list
    const recentDefects = defects?.slice(0, 20).map(d => ({
      id: d.defect_id,
      title: d.title,
      severity: d.severity,
      priority: d.priority,
      status: d.status,
      projectName: d.projects?.name || 'Unknown',
      reportedBy: d.reported_by_profile?.full_name || 'Unknown',
      assignedTo: d.assigned_to_profile?.full_name || 'Unassigned',
      createdAt: d.created_at,
    })) || [];

    res.json({
      summary: {
        totalDefects,
        openCount,
        closedCount,
        criticalCount: bySeverity.critical,
        highCount: bySeverity.high,
      },
      bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({ severity, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byProject: Object.entries(byProject).map(([name, stats]) => ({ name, ...stats })),
      recentDefects,
    });
  } catch (error) {
    console.error('Error generating defect report:', error);
    res.status(500).json({ error: 'Failed to generate defect report' });
  }
});

// GET /api/reports/testers - Tester Performance Report
router.get('/testers', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get all executions with tester info
    let execQuery = supabase
      .from('test_executions')
      .select(`
        id,
        status,
        executed_at,
        execution_time,
        executed_by,
        profiles:executed_by (
          id,
          full_name,
          email
        )
      `);

    if (start_date) {
      execQuery = execQuery.gte('executed_at', start_date);
    }
    if (end_date) {
      execQuery = execQuery.lte('executed_at', end_date);
    }

    const { data: executions, error: execError } = await execQuery;
    if (execError) throw execError;

    // Get all defects reported by testers
    let defectQuery = supabase
      .from('defects')
      .select(`
        id,
        severity,
        reported_by,
        created_at,
        profiles:reported_by (
          id,
          full_name
        )
      `);

    if (start_date) {
      defectQuery = defectQuery.gte('created_at', start_date);
    }
    if (end_date) {
      defectQuery = defectQuery.lte('created_at', end_date);
    }

    const { data: defects, error: defectError } = await defectQuery;
    if (defectError) throw defectError;

    // Aggregate by tester
    const testerStats = {};

    executions?.forEach(exec => {
      const testerId = exec.executed_by;
      const testerName = exec.profiles?.full_name || 'Unknown';
      const testerEmail = exec.profiles?.email || '';

      if (!testerStats[testerId]) {
        testerStats[testerId] = {
          id: testerId,
          name: testerName,
          email: testerEmail,
          totalExecutions: 0,
          passCount: 0,
          failCount: 0,
          defectsReported: 0,
          criticalDefects: 0,
          avgExecutionTime: 0,
          totalExecutionTime: 0,
        };
      }

      testerStats[testerId].totalExecutions++;
      if (exec.status === 'pass') testerStats[testerId].passCount++;
      if (exec.status === 'fail') testerStats[testerId].failCount++;
      if (exec.execution_time) {
        testerStats[testerId].totalExecutionTime += exec.execution_time;
      }
    });

    // Add defect stats
    defects?.forEach(defect => {
      const reporterId = defect.reported_by;
      if (testerStats[reporterId]) {
        testerStats[reporterId].defectsReported++;
        if (defect.severity === 'critical') {
          testerStats[reporterId].criticalDefects++;
        }
      }
    });

    // Calculate averages and rates
    const testers = Object.values(testerStats).map(tester => ({
      ...tester,
      passRate: tester.totalExecutions > 0 ? Math.round((tester.passCount / tester.totalExecutions) * 100) : 0,
      avgExecutionTime: tester.totalExecutions > 0 ? Math.round(tester.totalExecutionTime / tester.totalExecutions) : 0,
    }));

    // Sort by total executions
    testers.sort((a, b) => b.totalExecutions - a.totalExecutions);

    // Summary stats
    const totalTesters = testers.length;
    const totalExecutions = executions?.length || 0;
    const totalDefectsReported = defects?.length || 0;
    const avgExecutionsPerTester = totalTesters > 0 ? Math.round(totalExecutions / totalTesters) : 0;

    res.json({
      summary: {
        totalTesters,
        totalExecutions,
        totalDefectsReported,
        avgExecutionsPerTester,
      },
      testers,
    });
  } catch (error) {
    console.error('Error generating tester performance report:', error);
    res.status(500).json({ error: 'Failed to generate tester performance report' });
  }
});

// GET /api/reports/projects - Get all projects for report filters
router.get('/projects', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (error) throw error;

    res.json({ projects: projects || [] });
  } catch (error) {
    console.error('Error fetching projects for reports:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

module.exports = router;
