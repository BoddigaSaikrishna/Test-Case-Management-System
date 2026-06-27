const express = require('express');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { executeUiTest } = require('../services/uiTestRunner');

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// Execute a single test step (API or UI)
const executeTestStep = async (testCode, stepNumber) => {
  const startTime = Date.now();

  try {
    let testConfig;
    try {
      // Try parsing as JSON first
      testConfig = JSON.parse(testCode);
    } catch {
      // If not JSON, try evaluating as JavaScript object
      testConfig = eval(`(${testCode})`);
    }

    if (testConfig.type === 'ui') {
      const uiResult = await executeUiTest(testConfig);
      return {
        step_number: stepNumber,
        status: uiResult.status,
        actual_result: uiResult.actual_result,
        screenshot: uiResult.screenshot,
        execution_time: uiResult.execution_time
      };
    }

    if (!testConfig.url) {
      return {
        step_number: stepNumber,
        status: 'fail',
        actual_result: 'Error: Test configuration must include a URL',
        execution_time: Date.now() - startTime,
      };
    }

    // Execute the API request
    const fetchOptions = {
      method: testConfig.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...testConfig.headers,
      },
    };

    if (testConfig.body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
      fetchOptions.body = JSON.stringify(testConfig.body);
    }

    const response = await fetch(testConfig.url, fetchOptions);
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Build actual result
    const actualResult = {
      status: response.status,
      statusText: response.statusText,
      body: responseData,
    };

    // Check expectations
    let passed = true;
    const failures = [];

    if (testConfig.expect) {
      // Check status code
      if (testConfig.expect.status !== undefined) {
        if (response.status !== testConfig.expect.status) {
          passed = false;
          failures.push(`Expected status ${testConfig.expect.status}, got ${response.status}`);
        }
      }

      // Check if body contains text
      if (testConfig.expect.bodyContains) {
        const bodyStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        if (!bodyStr.includes(testConfig.expect.bodyContains)) {
          passed = false;
          failures.push(`Body does not contain "${testConfig.expect.bodyContains}"`);
        }
      }

      // Check specific body fields
      if (testConfig.expect.body && typeof testConfig.expect.body === 'object') {
        for (const [key, expectedValue] of Object.entries(testConfig.expect.body)) {
          const actualValue = responseData?.[key];
          if (actualValue !== expectedValue) {
            passed = false;
            failures.push(`Expected ${key}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
          }
        }
      }

      // Check response is not empty
      if (testConfig.expect.notEmpty) {
        if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
          passed = false;
          failures.push('Expected non-empty response');
        }
      }
    }

    return {
      step_number: stepNumber,
      status: passed ? 'pass' : 'fail',
      actual_result: passed
        ? `✓ Status: ${response.status} ${response.statusText}\n${JSON.stringify(responseData, null, 2).substring(0, 500)}`
        : `✗ ${failures.join('; ')}\nResponse: ${JSON.stringify(actualResult, null, 2).substring(0, 300)}`,
      execution_time: Date.now() - startTime,
    };

  } catch (error) {
    return {
      step_number: stepNumber,
      status: 'fail',
      actual_result: `Error executing test: ${error.message}`,
      execution_time: Date.now() - startTime,
    };
  }
};

// Run all tests for a test case
router.post('/run/:testCaseId', async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { project_id, environment, browser } = req.body;

    // Fetch the test case with steps
    const { data: testCase, error: tcError } = await supabase
      .from('test_cases')
      .select(`
        *,
        test_case_steps(*)
      `)
      .eq('id', testCaseId)
      .order('step_number', { foreignTable: 'test_case_steps', ascending: true })
      .single();

    if (tcError || !testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    // Check if we have steps or feature_url to test
    const steps = testCase.test_case_steps || [];
    const stepsWithCode = steps.filter(step => step.test_code);
    const featureUrl = testCase.feature_url;

    if (stepsWithCode.length === 0 && !featureUrl) {
      return res.status(400).json({
        error: 'No automated tests found',
        message: 'Add test_code to your test case steps or a Feature URL to run automated tests'
      });
    }

    // Execute all steps
    const stepResults = [];
    let overallStatus = 'pass';
    const startTime = Date.now();
    let featureUrlResult = null;

    // 1. Test Feature URL if present
    if (featureUrl) {
      try {
        const urlStartTime = Date.now();
        const response = await fetch(featureUrl);
        const passed = response.ok; // 200-299 ranges

        let output = '';
        try {
          const text = await response.text();
          // Limit output length to avoid huge payloads
          output = text.substring(0, 2000) + (text.length > 2000 ? '\n... (truncated)' : '');
        } catch (e) {
          output = '(Could not read response body)';
        }

        featureUrlResult = {
          url: featureUrl,
          status: passed ? 'pass' : 'fail',
          statusCode: response.status,
          execution_time: Date.now() - urlStartTime,
          output: output,
          message: passed
            ? `✓ Feature URL accessible (${response.status} ${response.statusText})`
            : `✗ Feature URL check failed (${response.status} ${response.statusText})`
        };

        if (!passed) overallStatus = 'fail';
      } catch (error) {
        featureUrlResult = {
          url: featureUrl,
          status: 'fail',
          statusCode: 0,
          execution_time: 0,
          output: error.message,
          message: `✗ Error accessing Feature URL: ${error.message}`
        };
        overallStatus = 'fail';
      }
    }

    // 2. Execute Steps
    for (const step of steps) {
      if (step.test_code) {
        const result = await executeTestStep(step.test_code, step.step_number);
        // Add result
        stepResults.push({
          test_case_step_id: step.id,
          ...result,
        });

        if (result.status === 'fail') {
          overallStatus = 'fail';
        }
      } else if (stepsWithCode.length > 0) {
        // Only mark skipped if there are other steps running
        stepResults.push({
          test_case_step_id: step.id,
          step_number: step.step_number,
          status: 'blocked',
          actual_result: 'No test_code defined - skipped automation',
          execution_time: 0,
        });
      }
    }

    const totalExecutionTime = Date.now() - startTime;

    // Construct simplified comments
    let comments = `Automated run. Status: ${overallStatus}.`;
    if (featureUrlResult) {
      comments += ` Feature URL: ${featureUrlResult.status.toUpperCase()}.`;
    }
    if (stepsWithCode.length > 0) {
      comments += ` Steps: ${stepResults.filter(s => s.status === 'pass').length}/${stepResults.length} passed.`;
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('executions')
      .insert([{
        test_case_id: testCaseId,
        project_id: project_id || testCase.project_id,
        executor_id: req.user.id,
        status: overallStatus,
        environment: environment || 'staging',
        browser: browser || 'automated',
        execution_time: totalExecutionTime,
        comments: comments,
      }])
      .select()
      .single();

    if (execError) {
      console.error('Error creating execution:', execError);
      return res.status(500).json({ error: 'Failed to create execution record' });
    }

    // Save execution steps only if there are results
    if (stepResults.length > 0) {
      const executionStepsData = stepResults.map(result => ({
        execution_id: execution.id,
        test_case_step_id: result.test_case_step_id,
        status: result.status,
        actual_result: result.actual_result,
      }));

      const { error: stepsError } = await supabase
        .from('execution_steps')
        .insert(executionStepsData);

      if (stepsError) {
        console.error('Error saving execution steps:', stepsError);
      }
    }

    res.json({
      success: true,
      execution: {
        id: execution.id,
        status: overallStatus,
        execution_time: totalExecutionTime,
      },
      featureUrlResult,
      results: stepResults,
      summary: {
        total: stepResults.length,
        passed: stepResults.filter(s => s.status === 'pass').length,
        failed: stepResults.filter(s => s.status === 'fail').length,
        skipped: stepResults.filter(s => s.status === 'blocked').length,
      },
    });

  } catch (error) {
    console.error('Error running tests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Run a single step test (for testing/debugging)
router.post('/run-step', async (req, res) => {
  try {
    const { test_code } = req.body;

    if (!test_code) {
      return res.status(400).json({ error: 'test_code is required' });
    }

    const result = await executeTestStep(test_code, 1);
    res.json(result);

  } catch (error) {
    console.error('Error running step test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
