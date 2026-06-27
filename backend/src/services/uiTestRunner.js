const puppeteer = require('puppeteer');

/**
 * Executes a sequence of UI actions in a headless browser using Puppeteer.
 * @param {Object} testConfig - The parsed JSON configuration for the UI test.
 * @returns {Promise<Object>} The result of the execution.
 */
async function executeUiTest(testConfig) {
  const startTime = Date.now();
  let browser = null;
  let page = null;
  const failures = [];
  let screenshot = null;

  try {
    if (!testConfig.url) {
      throw new Error('Test configuration must include a "url" for UI tests.');
    }

    // Launch Puppeteer (headless)
    browser = await puppeteer.launch({
      headless: true, // Use 'new' headless mode in modern puppeteer
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set a default timeout for all page operations (e.g., 5 seconds)
    page.setDefaultTimeout(5000);

    // 1. Navigate to URL
    await page.goto(testConfig.url, { waitUntil: 'networkidle2' });

    // 2. Execute Actions
    if (testConfig.actions && Array.isArray(testConfig.actions)) {
      for (let i = 0; i < testConfig.actions.length; i++) {
        const actionDef = testConfig.actions[i];
        try {
          switch (actionDef.action) {
            case 'click':
              await page.waitForSelector(actionDef.selector, { visible: true });
              await page.click(actionDef.selector);
              break;
              
            case 'type':
              await page.waitForSelector(actionDef.selector, { visible: true });
              await page.type(actionDef.selector, actionDef.value, { delay: 50 }); // slight delay simulates real typing
              break;
              
            case 'waitForSelector':
              await page.waitForSelector(actionDef.selector, { visible: true });
              break;
              
            case 'assertText':
              await page.waitForSelector(actionDef.selector, { visible: true });
              const elementText = await page.$eval(actionDef.selector, el => el.textContent || el.innerText);
              if (actionDef.contains && !elementText.includes(actionDef.contains)) {
                 throw new Error(`Text assertion failed. Expected element '${actionDef.selector}' to contain '${actionDef.contains}', but got '${elementText}'`);
              }
              if (actionDef.equals && elementText.trim() !== actionDef.equals) {
                 throw new Error(`Text assertion failed. Expected element '${actionDef.selector}' to equal '${actionDef.equals}', but got '${elementText}'`);
              }
              break;

            case 'select':
              await page.waitForSelector(actionDef.selector, { visible: true });
              await page.select(actionDef.selector, actionDef.value);
              break;

            case 'wait':
              // Explicit wait (use sparingly)
              await new Promise(resolve => setTimeout(resolve, actionDef.ms || 1000));
              break;
              
            case 'assertUrl':
              const currentUrl = page.url();
              if (actionDef.contains && !currentUrl.includes(actionDef.contains)) {
                 throw new Error(`URL assertion failed. Expected URL to contain '${actionDef.contains}', but got '${currentUrl}'`);
              }
              if (actionDef.notContains && currentUrl.includes(actionDef.notContains)) {
                 throw new Error(`URL assertion failed. Expected URL to NOT contain '${actionDef.notContains}', but got '${currentUrl}'`);
              }
              if (actionDef.equals && currentUrl !== actionDef.equals) {
                 throw new Error(`URL assertion failed. Expected URL to equal '${actionDef.equals}', but got '${currentUrl}'`);
              }
              break;
              
            default:
              throw new Error(`Unknown action type: ${actionDef.action}`);
          }
        } catch (actionError) {
          throw new Error(`Failed at step ${i + 1} (${actionDef.action} on ${actionDef.selector || 'page'}): ${actionError.message}`);
        }
      }
    }

    // Capture screenshot on success
    const imageBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    screenshot = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    return {
      status: 'pass',
      actual_result: `✓ UI Test Completed Successfully.\nExecuted ${testConfig.actions?.length || 0} actions on ${testConfig.url}`,
      screenshot,
      execution_time: Date.now() - startTime
    };

  } catch (error) {
    // If we have a page object, try to capture a screenshot of the failure state
    if (page) {
      try {
        const imageBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
        screenshot = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      } catch (screenshotError) {
        console.error('Failed to capture failure screenshot:', screenshotError);
      }
    }

    return {
      status: 'fail',
      actual_result: `✗ UI Test Failed:\n${error.message}`,
      screenshot,
      execution_time: Date.now() - startTime
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  executeUiTest
};
