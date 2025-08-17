const logger = require("./logger");

/**
 * Utility functions for the Buntzen Lake parking bot
 */

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for an element to be present on the page
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Promise that resolves with the element
 */
const waitForElement = async (page, selector, timeout = 10000) => {
  try {
    await page.waitForSelector(selector, { timeout });
    return await page.$(selector);
  } catch (error) {
    throw new Error(`Element not found: ${selector}`);
  }
};

/**
 * Wait for an element to be visible on the page
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Promise that resolves with the element
 */
const waitForElementVisible = async (page, selector, timeout = 10000) => {
  try {
    await page.waitForSelector(selector, {
      timeout,
      visible: true,
    });
    return await page.$(selector);
  } catch (error) {
    throw new Error(`Element not visible: ${selector}`);
  }
};

/**
 * Click an element with retry logic
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector to click
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
const clickElement = async (page, selector, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await waitForElementVisible(page, selector);
      await page.click(selector);
      logger.logSuccess(`Clicked element: ${selector}`);
      return true;
    } catch (error) {
      logger.logWarning(
        `Click attempt ${attempt} failed for ${selector}: ${error.message}`
      );
      if (attempt === maxRetries) {
        throw error;
      }
      await delay(1000);
    }
  }
  return false;
};

/**
 * Fill an input field with text
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector for the input
 * @param {string} text - Text to enter
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
const fillInput = async (page, selector, text) => {
  try {
    await waitForElementVisible(page, selector);
    await page.focus(selector);
    await page.clear(selector);
    await page.type(selector, text);
    logger.logSuccess(`Filled input ${selector} with: ${text}`);
    return true;
  } catch (error) {
    logger.logError(`Failed to fill input ${selector}: ${error.message}`);
    return false;
  }
};

/**
 * Select an option from a dropdown
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector for the select element
 * @param {string} value - Value to select
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
const selectOption = async (page, selector, value) => {
  try {
    await waitForElementVisible(page, selector);
    await page.select(selector, value);
    logger.logSuccess(`Selected option ${value} from ${selector}`);
    return true;
  } catch (error) {
    logger.logError(
      `Failed to select option from ${selector}: ${error.message}`
    );
    return false;
  }
};

/**
 * Check if an element exists on the page
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector to check
 * @returns {Promise<boolean>} Promise that resolves with existence status
 */
const elementExists = async (page, selector) => {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Get text content of an element
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 * @returns {Promise<string>} Promise that resolves with the text content
 */
const getElementText = async (page, selector) => {
  try {
    await waitForElementVisible(page, selector);
    return await page.$eval(selector, (el) => el.textContent.trim());
  } catch (error) {
    logger.logError(`Failed to get text from ${selector}: ${error.message}`);
    return "";
  }
};

/**
 * Wait for page to load completely
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>} Promise that resolves when page is loaded
 */
const waitForPageLoad = async (page) => {
  try {
    await page.waitForLoadState("networkidle");
    await delay(1000); // Additional delay for dynamic content
  } catch (error) {
    logger.logWarning("Page load wait failed, continuing anyway");
  }
};

/**
 * Take a screenshot for debugging
 * @param {Object} page - Puppeteer page object
 * @param {string} filename - Name of the screenshot file
 * @returns {Promise<string>} Promise that resolves with the file path
 */
const takeScreenshot = async (page, filename) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = `screenshots/${filename}_${timestamp}.png`;
    await page.screenshot({ path: filepath, fullPage: true });
    logger.logSuccess(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.logError(`Failed to take screenshot: ${error.message}`);
    return null;
  }
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay between retries
 * @returns {Promise<any>} Promise that resolves with the function result
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.logWarning(
        `Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  delay,
  waitForElement,
  waitForElementVisible,
  clickElement,
  fillInput,
  selectOption,
  elementExists,
  getElementText,
  waitForPageLoad,
  takeScreenshot,
  retryWithBackoff,
};
