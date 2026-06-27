const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/dashboard/admin-stats - Get admin statistics (any authenticated user)
router.get('/admin-stats', async (req, res) => {
  try {
    // 1. User Count
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Project Count
    const { count: projectCount, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // 3. Total Test Cases (Global)
    const { count: tcCount, error: tcError } = await supabase
      .from('test_cases')
      .select('*', { count: 'exact', head: true });

    // 4. Monthly Active Users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: activeUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', thirtyDaysAgo.toISOString());

    if (userError || projectError || tcError) {
      throw new Error('Failed to fetch counts');
    }

    res.json({
      stats: {
        totalUsers: userCount || 0,
        activeUsers: activeUserCount || 0,
        totalProjects: projectCount || 0,
        totalTestCases: tcCount || 0,
        systemStatus: 'healthy',
        uptime: process.uptime()
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total test cases count
    const { count: totalTestCases, error: tcError } = await supabase
      .from('test_cases')
      .select('*', { count: 'exact', head: true });

    if (tcError) throw tcError;

    // Get execution statistics
    const { data: executions, error: execError } = await supabase
      .from('executions')
      .select('status');

    if (execError) throw execError;

    const totalExecutions = executions?.length || 0;
    const passCount = executions?.filter(e => e.status === 'pass').length || 0;
    const failCount = executions?.filter(e => e.status === 'fail').length || 0;
    const blockedCount = executions?.filter(e => e.status === 'blocked').length || 0;
    const pendingCount = executions?.filter(e => e.status === 'pending').length || 0;
    const skippedCount = executions?.filter(e => e.status === 'skipped').length || 0;

    const passRate = totalExecutions > 0
      ? Math.round((passCount / totalExecutions) * 100)
      : 0;

    // Get open defects count (not closed or verified)
    const { count: openDefects, error: defectError } = await supabase
      .from('defects')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("closed","verified")');

    if (defectError) throw defectError;

    // Get critical defects count
    const { count: criticalDefects, error: criticalError } = await supabase
      .from('defects')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .not('status', 'in', '("closed","verified")');

    if (criticalError) throw criticalError;

    // Get test cases created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: newTestCases, error: newTcError } = await supabase
      .from('test_cases')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    if (newTcError) throw newTcError;

    // Execution data for pie chart
    const executionData = [
      { name: "Pass", value: passCount, color: "hsl(152, 60%, 40%)" },
      { name: "Fail", value: failCount, color: "hsl(0, 72%, 51%)" },
      { name: "Blocked", value: blockedCount, color: "hsl(38, 92%, 50%)" },
      { name: "Pending", value: pendingCount + skippedCount, color: "hsl(215, 12%, 50%)" },
    ];

    // Get weekly execution trend (last 7 days)
    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayExecutions = executions?.filter(e => {
        // We don't have executed_at in the simple select, so just use mock for now
        return true;
      }) || [];

      weeklyData.push({
        day: days[date.getDay()],
        executed: 0,
        passed: 0,
      });
    }

    // Get weekly data with proper dates
    const { data: weeklyExecData, error: weeklyError } = await supabase
      .from('executions')
      .select('status, executed_at')
      .gte('executed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!weeklyError && weeklyExecData) {
      // Reset weekly data
      const weeklyMap = new Map();

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = days[date.getDay()];
        weeklyMap.set(dayKey, { executed: 0, passed: 0 });
      }

      weeklyExecData.forEach(exec => {
        const execDate = new Date(exec.executed_at);
        const dayKey = days[execDate.getDay()];
        if (weeklyMap.has(dayKey)) {
          const current = weeklyMap.get(dayKey);
          current.executed++;
          if (exec.status === 'pass') {
            current.passed++;
          }
          weeklyMap.set(dayKey, current);
        }
      });

      // Convert map to array in correct order
      weeklyData.length = 0;
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = days[date.getDay()];
        const data = weeklyMap.get(dayKey) || { executed: 0, passed: 0 };
        weeklyData.push({
          day: dayKey,
          ...data
        });
      }
    }

    // Get recent executions
    const { data: recentExecs, error: recentError } = await supabase
      .from('executions')
      .select(`
        id,
        execution_id,
        status,
        executed_at,
        executor_id,
        test_case_id,
        test_case:test_cases (
          test_case_id,
          title
        ),
        executor:profiles!executions_executor_id_fkey (
          name
        )
      `)
      .order('executed_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    const recentExecutions = recentExecs?.map(exec => ({
      id: exec.test_case?.test_case_id || exec.execution_id,
      title: exec.test_case?.title || 'Unknown',
      status: exec.status.charAt(0).toUpperCase() + exec.status.slice(1),
      executor: exec.executor?.name || 'Unknown',
      date: new Date(exec.executed_at).toISOString().split('T')[0],
    })) || [];

    res.json({
      metrics: {
        totalTestCases: totalTestCases || 0,
        totalExecutions,
        passRate,
        openDefects: openDefects || 0,
        criticalDefects: criticalDefects || 0,
        newTestCases: newTestCases || 0,
      },
      executionData,
      weeklyData,
      recentExecutions,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;
