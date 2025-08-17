const puppeteer = require("puppeteer");
const config = require("./config");
const logger = require("./logger");
const utils = require("./utils");

/**
 * Buntzen Lake Parking Pass Booking Bot
 * Automates the process of booking parking passes at Buntzen Lake
 */
class BuntzenLakeBot {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.vehicleAdded = false;
  }

  /**
   * Initialize the bot and launch browser
   */
  async initialize() {
    try {
      logger.logStep("Initializing bot");

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: config.headless,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      // Create new page
      this.page = await this.browser.newPage();

      // Set user agent
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });

      logger.logSuccess("Bot initialized successfully");
      return true;
    } catch (error) {
      logger.logError("Failed to initialize bot", error);
      throw error;
    }
  }

  /**
   * Navigate to Buntzen Lake portal
   */
  async navigateToPortal() {
    try {
      logger.logStep("Navigating to Buntzen Lake portal");

      await this.page.goto(config.baseUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await utils.waitForPageLoad(this.page);
      logger.logSuccess("Successfully navigated to portal");

      // Take screenshot for debugging
      await utils.takeScreenshot(this.page, "portal_loaded");

      return true;
    } catch (error) {
      logger.logError("Failed to navigate to portal", error);
      throw error;
    }
  }

  /**
   * Handle the information popup and go to passes
   */
  async handleInfoPopup() {
    try {
      logger.logStep("Handling information popup");

      // Wait for info popup to appear
      const popupExists = await utils.elementExists(
        this.page,
        config.selectors.infoPopup
      );

      if (popupExists) {
        logger.logStep('Info popup found, looking for "Go To Pass(es)" button');

        // Take a screenshot of the popup for debugging
        await utils.takeScreenshot(this.page, "info_popup");

        // Get all text content in the popup for debugging
        const popupText = await this.page.$eval(
          config.selectors.infoPopup,
          (el) => el.textContent
        );
        logger.logInfo(`Popup content: ${popupText.substring(0, 200)}...`);

        // Try XPath first since it successfully finds the "Go To Pass(es)" button
        let buttonClicked = false;
        try {
          const xpathButton = await this.page.$x(
            "//a[contains(text(), 'Go To Pass')]"
          );
          if (xpathButton.length > 0) {
            await xpathButton[0].click();
            buttonClicked = true;
            logger.logSuccess("Clicked 'Go To Pass(es)' button using XPath");
          }
        } catch (error) {
          logger.logWarning(`XPath search failed: ${error.message}`);
        }

        // Fallback to CSS selectors if XPath didn't work
        if (!buttonClicked) {
          const buttonSelectors = [
            "a.themeBtn.button.popup-close",
            ".themeBtn.button.popup-close",
            "a[href='#']",
            "a.themeBtn.button",
            ".themeBtn.button",
            ".popup-close",
            "a.popup-close",
          ];

          for (const selector of buttonSelectors) {
            try {
              if (await utils.elementExists(this.page, selector)) {
                // Check if this element has the right text before clicking
                const element = await this.page.$(selector);
                const text = await element.evaluate(
                  (el) => el.textContent || ""
                );

                if (text.includes("Go To Pass")) {
                  await utils.clickElement(this.page, selector);
                  buttonClicked = true;
                  logger.logSuccess(
                    `Clicked button using selector: ${selector}`
                  );
                  break;
                } else {
                  logger.logInfo(
                    `Selector ${selector} found element with text: "${text}"`
                  );
                }
              }
            } catch (error) {
              logger.logWarning(
                `Selector ${selector} failed: ${error.message}`
              );
              continue;
            }
          }
        }

        if (!buttonClicked) {
          // Try to find any clickable element with "Go To Pass" text
          const elements = await this.page.$$("a, button, .themeBtn");
          logger.logInfo(
            `Found ${elements.length} potential clickable elements`
          );

          for (const element of elements) {
            try {
              const text = await element.evaluate((el) => el.textContent || "");
              const tagName = await element.evaluate((el) => el.tagName);
              const className = await element.evaluate((el) => el.className);

              logger.logInfo(`Element: ${tagName}.${className} - "${text}"`);

              // Look for the exact text "Go To Pass(es)" or similar
              if (
                text.includes("Go To Pass") ||
                text.includes("Go To Pass(es)") ||
                (text.includes("Pass") && text.includes("Go"))
              ) {
                await element.click();
                buttonClicked = true;
                logger.logSuccess(`Clicked button by text content: "${text}"`);
                break;
              }
            } catch (error) {
              continue;
            }
          }
        }

        if (buttonClicked) {
          await utils.delay(config.delayBetweenActions);
        } else {
          logger.logWarning(
            'Could not find "Go To Pass(es)" button, continuing anyway'
          );
        }
      } else {
        logger.logStep("No info popup found, continuing");
      }

      logger.logCompletion("Info popup handled");
      return true;
    } catch (error) {
      logger.logError("Failed to handle info popup", error);
      // Don't throw error, just log and continue
      logger.logWarning("Continuing despite info popup error");
      return true;
    }
  }

  /**
   * Select the type of pass (All Day or Half Day)
   */
  async selectPassType() {
    try {
      logger.logStep(`Selecting pass type: ${config.passType}`);

      // Wait for pass options to load
      await utils.delay(2000); // Give time for page to load

      // Try to find pass cards by text content
      const passCards = await this.page.$$(".gridCard, .cardRow .gridCard");
      let passSelected = false;

      for (const card of passCards) {
        try {
          const cardText = await card.evaluate((el) => el.textContent || "");
          const isAllDay =
            cardText.includes("All Day Pass") ||
            cardText.includes("All-day Pass");
          const isHalfDay =
            cardText.includes("Half Day Pass") ||
            cardText.includes("Half-day Pass");

          if (
            (config.passType === "all_day" && isAllDay) ||
            (config.passType === "half_day" && isHalfDay)
          ) {
            await card.click();
            passSelected = true;
            logger.logSuccess(`Selected ${config.passType} pass`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!passSelected) {
        // Fallback: try to click any pass card
        if (passCards.length > 0) {
          await passCards[0].click();
          logger.logWarning(
            "Could not find specific pass type, selected first available"
          );
        } else {
          throw new Error("No pass cards found");
        }
      }

      await utils.delay(config.delayBetweenActions);
      logger.logCompletion("Pass type selected");
      return true;
    } catch (error) {
      logger.logError("Failed to select pass type", error);
      throw error;
    }
  }

  /**
   * Select a date from the new date picker that appears after vehicle selection
   */
  async selectDateFromNewPicker() {
    try {
      logger.logStep(
        "Selecting date from new date picker after vehicle selection"
      );

      // Wait for the new date picker to appear (it's in the scheduler section)
      await utils.waitForElementVisible(
        this.page,
        "#scheduler_12196 .dateMain"
      );

      // Also wait a bit more for the date content to fully load
      await utils.delay(1000);

      // Debug: Log the page structure around the new date picker
      try {
        const schedulerHTML = await this.page.evaluate(() => {
          const element = document.querySelector("#scheduler_12196");
          return element ? element.outerHTML : "Element not found";
        });
        logger.logInfo(`Scheduler HTML: ${schedulerHTML.substring(0, 300)}...`);
      } catch (error) {
        logger.logWarning(`Could not log scheduler HTML: ${error.message}`);
      }

      let dateSelected = false;

      if (config.preferredDate) {
        // Validate date format and handle different formats
        let preferredDay;
        if (/^\d{2}\/\d{2}$/.test(config.preferredDate)) {
          // MM/DD format (e.g., "08/17")
          preferredDay = config.preferredDate.split("/")[1];
          logger.logInfo(
            `Looking for preferred date: ${config.preferredDate} (day: ${preferredDay})`
          );
        } else if (/^\d{1,2}$/.test(config.preferredDate)) {
          // Just day format (e.g., "17")
          preferredDay = config.preferredDate;
          logger.logInfo(`Looking for preferred date: day ${preferredDay}`);
        } else {
          logger.logWarning(
            `Invalid date format: ${config.preferredDate}. Expected MM/DD or just day number.`
          );
        }

        // Try to find and select the preferred date
        // Look for date buttons within the scheduler date picker
        const dateButtons = await this.page.$$(
          "#scheduler_12196 .dateMain button.date"
        );

        // If no dates found in scheduler, try alternative selectors
        if (dateButtons.length === 0) {
          logger.logWarning(
            "No dates found in scheduler, trying alternative selectors"
          );
          const altDateButtons = await this.page.$$(
            "#scheduler_12196 button.date"
          );
          if (altDateButtons.length > 0) {
            dateButtons.push(...altDateButtons);
            logger.logInfo(
              `Found ${altDateButtons.length} dates using alternative selector`
            );
          }
        }

        // If still no dates found, log error and try to continue
        if (dateButtons.length === 0) {
          logger.logError(
            "No date buttons found in scheduler. This might indicate a page structure change."
          );
          // Try to take a screenshot for debugging
          try {
            await this.page.screenshot({
              path: `logs/scheduler_date_selection_error_${Date.now()}.png`,
            });
            logger.logInfo("Screenshot saved for debugging");
          } catch (screenshotError) {
            logger.logWarning(
              `Could not save screenshot: ${screenshotError.message}`
            );
          }
        }

        // Log available dates for debugging
        const availableDates = [];
        for (const button of dateButtons) {
          const buttonText = await button.evaluate((el) =>
            el.textContent.trim()
          );
          availableDates.push(buttonText);
        }
        logger.logInfo(
          `Available dates in scheduler: ${availableDates.join(", ")}`
        );

        // Try to find and select the preferred date
        if (preferredDay) {
          logger.logInfo(
            `Searching for date button with text: "${preferredDay}"`
          );

          // First, check if the preferred date is already active
          const activeDateButton = await this.page.$(
            "#scheduler_12196 .dateMain button.date.active"
          );

          if (activeDateButton) {
            const activeDateText = await activeDateButton.evaluate((el) =>
              el.textContent.trim()
            );
            logger.logInfo(`Found active date button: "${activeDateText}"`);

            if (activeDateText === preferredDay) {
              logger.logSuccess(
                `Preferred date ${preferredDay} is already active/selected`
              );
              dateSelected = true;
            } else {
              logger.logInfo(
                `Active date ${activeDateText} doesn't match preferred date ${preferredDay}, will click preferred date`
              );
              // Don't set dateSelected to true here - we need to actually click the preferred date
            }
          }

          // If not already selected, find and click the preferred date
          if (!dateSelected) {
            logger.logInfo(
              `Searching for date button with text: "${preferredDay}"`
            );
            for (const button of dateButtons) {
              const buttonText = await button.evaluate((el) =>
                el.textContent.trim()
              );

              logger.logInfo(
                `Checking button: "${buttonText}" vs preferred: "${preferredDay}"`
              );

              if (buttonText === preferredDay) {
                logger.logInfo(`Found matching date button: "${buttonText}"`);
                await button.click();
                dateSelected = true;
                logger.logSuccess(
                  `Selected preferred date: ${config.preferredDate} (day: ${preferredDay})`
                );
                break;
              }
            }
          }
        }

        if (!dateSelected) {
          logger.logWarning(
            `Preferred date ${config.preferredDate} not available in scheduler, selecting first available`
          );
        }
      }

      // If no preferred date or preferred date not found, select first available
      if (!config.preferredDate || !dateSelected) {
        logger.logInfo(
          "No preferred date set or preferred date not found, selecting first available date from scheduler"
        );
        // Look for the first available date button in the scheduler
        let firstAvailableDate = await this.page.$(
          "#scheduler_12196 .dateMain button.date"
        );

        // If no date found in scheduler, try alternative selector
        if (!firstAvailableDate) {
          firstAvailableDate = await this.page.$(
            "#scheduler_12196 button.date"
          );
        }

        if (firstAvailableDate) {
          await firstAvailableDate.click();
          const dateText = await firstAvailableDate.evaluate((el) =>
            el.textContent.trim()
          );
          logger.logSuccess(
            `Selected available date from scheduler: ${dateText}`
          );
          dateSelected = true;
        }
      }

      await utils.delay(config.delayBetweenActions);

      if (!dateSelected) {
        logger.logWarning(
          "No date was selected from scheduler, this might cause issues later"
        );
        // Take a screenshot for debugging
        try {
          await this.page.screenshot({
            path: `logs/no_scheduler_date_selected_${Date.now()}.png`,
          });
          logger.logInfo("Screenshot saved for debugging");
        } catch (screenshotError) {
          logger.logWarning(
            `Could not save screenshot: ${screenshotError.message}`
          );
        }
      }

      logger.logCompletion("Date selected from new picker");
      return true;
    } catch (error) {
      logger.logError("Failed to select date from new picker", error);
      throw error;
    }
  }

  /**
   * Select a date for the booking (original method - now only used for initial date selection)
   */
  async selectDate() {
    try {
      logger.logStep("Selecting booking date");

      // Wait for date main container to load
      await utils.waitForElementVisible(this.page, config.selectors.dateMain);

      // Also wait a bit more for the date content to fully load
      await utils.delay(1000);

      // Debug: Log the page structure around date selection
      try {
        const dateMainHTML = await this.page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element ? element.outerHTML : "Element not found";
        }, config.selectors.dateMain);
        logger.logInfo(
          `Date main container HTML: ${dateMainHTML.substring(0, 200)}...`
        );

        // Also log all date-related elements for debugging
        const allDateElements = await this.page.evaluate(() => {
          const elements = document.querySelectorAll(
            ".date, button.date, .dateMain, .dateBody, .datelist"
          );
          return Array.from(elements).map((el) => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent.trim(),
            id: el.id || "no-id",
          }));
        });
        logger.logInfo(
          `All date-related elements found: ${JSON.stringify(
            allDateElements,
            null,
            2
          )}`
        );
      } catch (error) {
        logger.logWarning(`Could not log date main HTML: ${error.message}`);
      }

      let dateSelected = false;

      if (config.preferredDate) {
        // Validate date format and handle different formats
        let preferredDay;
        if (/^\d{2}\/\d{2}$/.test(config.preferredDate)) {
          // MM/DD format (e.g., "08/17")
          preferredDay = config.preferredDate.split("/")[1];
          logger.logInfo(
            `Looking for preferred date: ${config.preferredDate} (day: ${preferredDay})`
          );
        } else if (/^\d{1,2}$/.test(config.preferredDate)) {
          // Just day format (e.g., "17")
          preferredDay = config.preferredDate;
          logger.logInfo(`Looking for preferred date: day ${preferredDay}`);
        } else {
          logger.logWarning(
            `Invalid date format: ${config.preferredDate}. Expected MM/DD or just day number.`
          );
        }

        // Try to find and select the preferred date
        // Look for date buttons within the dateMain container
        const dateButtons = await this.page.$$(
          `${config.selectors.dateMain} ${config.selectors.dateSelector}`
        );

        // If no dates found in dateMain, try alternative selectors
        if (dateButtons.length === 0) {
          logger.logWarning(
            "No dates found in dateMain, trying alternative selectors"
          );
          const altDateButtons = await this.page.$$(
            config.selectors.dateSelector
          );
          if (altDateButtons.length > 0) {
            dateButtons.push(...altDateButtons);
            logger.logInfo(
              `Found ${altDateButtons.length} dates using alternative selector`
            );
          }
        }

        // If still no dates found, log error and try to continue
        if (dateButtons.length === 0) {
          logger.logError(
            "No date buttons found on the page. This might indicate a page structure change."
          );
          // Try to take a screenshot for debugging
          try {
            await this.page.screenshot({
              path: `logs/date_selection_error_${Date.now()}.png`,
            });
            logger.logInfo("Screenshot saved for debugging");
          } catch (screenshotError) {
            logger.logWarning(
              `Could not save screenshot: ${screenshotError.message}`
            );
          }
        }

        // Log available dates for debugging
        const availableDates = [];
        for (const button of dateButtons) {
          const buttonText = await button.evaluate((el) =>
            el.textContent.trim()
          );
          availableDates.push(buttonText);
        }
        logger.logInfo(`Available dates: ${availableDates.join(", ")}`);

        // Try to find and select the preferred date
        if (preferredDay) {
          logger.logInfo(
            `Searching for date button with text: "${preferredDay}"`
          );
          for (const button of dateButtons) {
            const buttonText = await button.evaluate((el) =>
              el.textContent.trim()
            );

            logger.logInfo(
              `Checking button: "${buttonText}" vs preferred: "${preferredDay}"`
            );

            if (buttonText === preferredDay) {
              logger.logInfo(`Found matching date button: "${buttonText}"`);
              await button.click();
              dateSelected = true;
              logger.logSuccess(
                `Selected preferred date: ${config.preferredDate} (day: ${preferredDay})`
              );
              break;
            }
          }
        }

        if (!dateSelected) {
          logger.logWarning(
            `Preferred date ${config.preferredDate} not available, selecting first available`
          );
        }
      }

      // If no preferred date or preferred date not found, select first available
      if (!config.preferredDate || !dateSelected) {
        logger.logInfo(
          "No preferred date set or preferred date not found, selecting first available date"
        );
        // Look for the first available date button
        let firstAvailableDate = await this.page.$(
          `${config.selectors.dateMain} ${config.selectors.dateSelector}`
        );

        // If no date found in dateMain, try alternative selector
        if (!firstAvailableDate) {
          firstAvailableDate = await this.page.$(config.selectors.dateSelector);
        }

        if (firstAvailableDate) {
          await firstAvailableDate.click();
          const dateText = await firstAvailableDate.evaluate((el) =>
            el.textContent.trim()
          );
          logger.logSuccess(`Selected available date: ${dateText}`);
          dateSelected = true;
        }
      }

      await utils.delay(config.delayBetweenActions);

      if (!dateSelected) {
        logger.logWarning(
          "No date was selected, this might cause issues later"
        );
        // Take a screenshot for debugging
        try {
          await this.page.screenshot({
            path: `logs/no_date_selected_${Date.now()}.png`,
          });
          logger.logInfo("Screenshot saved for debugging");
        } catch (screenshotError) {
          logger.logWarning(
            `Could not save screenshot: ${screenshotError.message}`
          );
        }
      }

      logger.logCompletion("Date selected");
      return true;
    } catch (error) {
      logger.logError("Failed to select date", error);
      throw error;
    }
  }

  /**
   * Add the selected pass to cart
   */
  async addToCart() {
    try {
      logger.logStep("Adding pass to cart");

      // Wait for add to cart button
      await utils.waitForElementVisible(
        this.page,
        config.selectors.addToCartBtn
      );

      // Check if pass is available (not sold out)
      const soldOutExists = await utils.elementExists(
        this.page,
        config.selectors.soldOut
      );
      if (soldOutExists) {
        throw new Error("Pass is sold out for the selected date");
      }

      // Click add to cart
      await utils.clickElement(this.page, config.selectors.addToCartBtn);
      await utils.delay(config.delayBetweenActions);

      logger.logCompletion("Pass added to cart");
      return true;
    } catch (error) {
      logger.logError("Failed to add to cart", error);
      throw error;
    }
  }

  /**
   * Handle the booking page when user is already signed in
   */
  async handleSignedInBooking() {
    try {
      logger.logStep("Handling booking page for signed-in user");

      // Wait for the page to load completely
      await utils.delay(3000);

      // Check if we need to select a vehicle
      const vehicleSelectExists = await utils.elementExists(
        this.page,
        "#selectVehicleSmartSelect"
      );

      if (vehicleSelectExists) {
        logger.logStep("Vehicle selection required");
        await this.handleVehicleSelectionForSignedInUser();
      }

      // After vehicle selection, select the date from the new date picker
      logger.logStep(
        "Vehicle selected, now selecting date from new date picker"
      );
      await this.selectDateFromNewPicker();

      // Now try to add to cart
      await this.addToCart();

      logger.logCompletion("Signed-in booking handled");
      return true;
    } catch (error) {
      logger.logError("Failed to handle signed-in booking", error);
      throw error;
    }
  }

  /**
   * Handle vehicle selection for signed-in users
   */
  async handleVehicleSelectionForSignedInUser() {
    try {
      logger.logStep("Handling vehicle selection for signed-in user");

      // Wait for vehicle selector to be visible
      await utils.waitForElementVisible(this.page, "#selectVehicleSmartSelect");

      // Click on the vehicle selector to open it
      await utils.clickElement(this.page, "#selectVehicleSmartSelect");
      await utils.delay(1000);

      // Check if we need to add a new vehicle
      if (!this.vehicleAdded) {
        logger.logStep("Adding new vehicle for signed-in user");

        // Look for "Add a Vehicle" option
        const addVehicleOption = await this.page.$(
          'option[value="new_vehicle"]'
        );
        if (addVehicleOption) {
          await addVehicleOption.click();
          await utils.delay(1000);

          // Fill vehicle information
          await this.fillVehicleForm();
        } else {
          // Try to select existing vehicle
          const existingVehicle = await this.page.$('option[value*="__BC"]');
          if (existingVehicle) {
            await existingVehicle.click();
            logger.logSuccess("Selected existing vehicle");
          }
        }
      } else {
        // Select existing vehicle
        const existingVehicle = await this.page.$('option[value*="__BC"]');
        if (existingVehicle) {
          await existingVehicle.click();
          logger.logSuccess("Selected existing vehicle");
        }
      }

      await utils.delay(1000);
      logger.logCompletion("Vehicle selection completed for signed-in user");
      return true;
    } catch (error) {
      logger.logError(
        "Failed to handle vehicle selection for signed-in user",
        error
      );
      throw error;
    }
  }

  /**
   * Fill the vehicle form
   */
  async fillVehicleForm() {
    try {
      logger.logStep("Filling vehicle form");

      // Wait for the form to appear
      await utils.waitForElementVisible(
        this.page,
        config.selectors.licensePlateInput
      );

      // Fill vehicle information
      await utils.fillInput(
        this.page,
        config.selectors.licensePlateInput,
        config.licensePlate
      );
      await utils.selectOption(
        this.page,
        config.selectors.provinceSelect,
        config.province
      );
      await utils.selectOption(
        this.page,
        config.selectors.colorSelect,
        config.vehicleColor
      );
      await utils.selectOption(
        this.page,
        config.selectors.makeSelect,
        config.vehicleMake
      );
      await utils.fillInput(
        this.page,
        config.selectors.modelInput,
        config.vehicleModel
      );

      // Save vehicle
      await utils.clickElement(this.page, config.selectors.saveVehicleBtn);
      await utils.delay(2000);

      this.vehicleAdded = true;
      logger.logCompletion("Vehicle form filled and saved");
      return true;
    } catch (error) {
      logger.logError("Failed to fill vehicle form", error);
      throw error;
    }
  }

  /**
   * Handle login process
   */
  async handleLogin() {
    try {
      logger.logStep("Handling login process");

      // Wait for the login form to be visible
      await utils.delay(2000);

      // Take a screenshot of the login form for debugging
      await utils.takeScreenshot(this.page, "login_form");

      // Try multiple selectors for the phone input
      const phoneInputSelectors = [
        "#txtPhonenumber",
        'input[name="number"]',
        'input[type="number"]',
        'input[placeholder*="Enter number"]',
      ];

      let phoneInputFound = false;
      let phoneInput = null;

      for (const selector of phoneInputSelectors) {
        try {
          if (await utils.elementExists(this.page, selector)) {
            phoneInput = await this.page.$(selector);
            phoneInputFound = true;
            logger.logSuccess(`Found phone input with selector: ${selector}`);
            break;
          }
        } catch (error) {
          logger.logWarning(`Selector ${selector} failed: ${error.message}`);
          continue;
        }
      }

      if (!phoneInputFound) {
        // Try to find any input field that might be for phone number
        const allInputs = await this.page.$$("input");
        logger.logInfo(`Found ${allInputs.length} input fields on the page`);

        for (const input of allInputs) {
          try {
            const inputType = await input.evaluate((el) => el.type);
            const inputId = await input.evaluate((el) => el.id);
            const inputName = await input.evaluate((el) => el.name);
            const inputPlaceholder = await input.evaluate(
              (el) => el.placeholder
            );

            logger.logInfo(
              `Input: type=${inputType}, id=${inputId}, name=${inputName}, placeholder=${inputPlaceholder}`
            );

            if (
              inputType === "number" ||
              inputId.includes("phone") ||
              inputName.includes("number") ||
              inputPlaceholder.includes("number") ||
              inputPlaceholder.includes("phone")
            ) {
              phoneInput = input;
              phoneInputFound = true;
              logger.logSuccess(
                `Found phone input by attributes: type=${inputType}, id=${inputId}`
              );
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (!phoneInputFound || !phoneInput) {
        throw new Error("Could not find phone number input field");
      }

      // Fill phone number
      logger.logStep(`Filling phone number: ${config.phoneNumber}`);
      await phoneInput.focus();
      await phoneInput.type(config.phoneNumber);
      logger.logSuccess("Phone number filled successfully");

      // Wait longer for the page to fully load and stabilize
      await utils.delay(3000);

      // Click next button - try multiple selectors
      logger.logStep("Clicking Next button");

      // First, let's debug what buttons are actually on the page
      const allButtons = await this.page.$$("a, button");
      logger.logInfo(`Found ${allButtons.length} buttons/links on the page`);

      let nextButtonClicked = false;
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const button = allButtons[i];
          const buttonText = await button.evaluate(
            (el) => el.textContent || ""
          );
          const buttonClass = await button.evaluate((el) => el.className || "");
          const buttonTag = await button.evaluate((el) => el.tagName || "");

          logger.logInfo(
            `Button ${i + 1}: ${buttonTag}.${buttonClass} - "${buttonText}"`
          );

          if (buttonText.toLowerCase().includes("next")) {
            logger.logSuccess(
              `Found Next button: ${buttonTag}.${buttonClass} - "${buttonText}"`
            );
            await button.click();
            nextButtonClicked = true;
            logger.logSuccess(`Clicked Next button directly`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!nextButtonClicked) {
        // Try the specific selector from your HTML
        try {
          const nextButton = await this.page.$(".cardfooter .themeBtn.button");
          if (nextButton) {
            const buttonText = await nextButton.evaluate(
              (el) => el.textContent || ""
            );
            if (buttonText.toLowerCase().includes("next")) {
              await nextButton.click();
              nextButtonClicked = true;
              logger.logSuccess(
                `Clicked Next button using .cardfooter .themeBtn.button`
              );
            }
          }
        } catch (error) {
          logger.logWarning(`Specific selector failed: ${error.message}`);
        }
      }

      if (!nextButtonClicked) {
        throw new Error("Could not find or click Next button");
      }

      await utils.delay(config.delayBetweenActions);

      // Handle OTP verification
      await this.handleOTPVerification();

      this.isLoggedIn = true;
      logger.logCompletion("Login completed");
      return true;
    } catch (error) {
      logger.logError("Failed to handle login", error);
      throw error;
    }
  }

  /**
   * Handle OTP verification
   */
  async handleOTPVerification() {
    try {
      logger.logStep("Handling OTP verification");

      // Wait for OTP input fields to appear
      await utils.delay(3000);

      // Take a screenshot for debugging
      await utils.takeScreenshot(this.page, "otp_form");

      // Try multiple selectors for OTP inputs
      const otpSelectors = [
        ".otpFocusInput",
        'input[type="tel"]',
        'input[maxlength="1"]',
        'input[aria-label*="verification"]',
        'input[aria-label*="Digit"]',
      ];

      let otpInputs = [];
      for (const selector of otpSelectors) {
        try {
          const inputs = await this.page.$$(selector);
          if (inputs.length >= 4) {
            otpInputs = inputs;
            logger.logSuccess(
              `Found ${otpInputs.length} OTP inputs with selector: ${selector}`
            );
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (otpInputs.length === 0) {
        // Try to find any inputs that might be OTP fields
        const allInputs = await this.page.$$("input");
        logger.logInfo(`Found ${allInputs.length} input fields on the page`);

        for (const input of allInputs) {
          try {
            const inputType = await input.evaluate((el) => el.type);
            const inputMaxLength = await input.evaluate((el) => el.maxLength);
            const inputAriaLabel = await input.evaluate(
              (el) => el.getAttribute("aria-label") || ""
            );

            if (
              inputMaxLength === 1 ||
              inputType === "tel" ||
              inputAriaLabel.includes("Digit") ||
              inputAriaLabel.includes("verification")
            ) {
              otpInputs.push(input);
            }
          } catch (error) {
            continue;
          }
        }

        logger.logInfo(
          `Identified ${otpInputs.length} potential OTP input fields`
        );
      }

      if (otpInputs.length === 0) {
        throw new Error("Could not find OTP input fields");
      }

      // IMPORTANT: Wait for user to manually enter the real OTP code
      logger.logWarning("⚠️  OTP verification code required!");
      logger.logInfo("📱 Please check your phone for the verification code");
      logger.logInfo("⌨️  Enter the 4-digit code manually in the browser");
      logger.logInfo("⏳ Bot will wait for you to complete this step...");

      // Wait for user to manually enter OTP and submit
      // We'll wait for the page to change (indicating successful verification)
      const maxWaitTime = 300000; // 5 minutes
      const checkInterval = 2000; // Check every 2 seconds
      let waitedTime = 0;

      while (waitedTime < maxWaitTime) {
        // Check if we're still on the OTP page
        const otpStillVisible = await this.page.evaluate(() => {
          return (
            document.querySelector(".otpFocusInput") !== null ||
            document.querySelector('input[maxlength="1"]') !== null
          );
        });

        if (!otpStillVisible) {
          logger.logSuccess("✅ OTP verification appears to be completed");
          break;
        }

        await utils.delay(checkInterval);
        waitedTime += checkInterval;

        if (waitedTime % 10000 === 0) {
          // Log every 10 seconds
          logger.logInfo(
            `⏳ Still waiting for OTP verification... (${Math.floor(
              waitedTime / 1000
            )}s)`
          );
        }
      }

      if (waitedTime >= maxWaitTime) {
        logger.logWarning("⚠️  Timeout waiting for OTP verification");
        logger.logInfo(
          "Please complete the verification manually and the bot will continue"
        );
      }

      // Submit OTP - try multiple selectors
      const submitSelectors = [
        config.selectors.otpSubmitBtn,
        ".themeBtn.button",
        'button[type="submit"]',
        "a.themeBtn.button",
      ];

      let otpSubmitted = false;
      for (const selector of submitSelectors) {
        try {
          if (await utils.elementExists(this.page, selector)) {
            await utils.clickElement(this.page, selector);
            otpSubmitted = true;
            logger.logSuccess(`OTP submitted using selector: ${selector}`);
            break;
          }
        } catch (error) {
          logger.logWarning(
            `Submit selector ${selector} failed: ${error.message}`
          );
          continue;
        }
      }

      if (!otpSubmitted) {
        throw new Error("Could not submit OTP");
      }

      await utils.delay(config.delayBetweenActions);
      logger.logCompletion("OTP verification completed");
      return true;
    } catch (error) {
      logger.logError("Failed to handle OTP verification", error);
      throw error;
    }
  }

  /**
   * Handle vehicle selection or add new vehicle
   */
  async handleVehicleSelection() {
    try {
      logger.logStep("Handling vehicle selection");

      // Wait for vehicle selection popup - look for any smart-select-list
      const vehiclePopupSelector =
        '.page.smart-select-page[data-name="smart-select-page"]';
      await utils.waitForElementVisible(this.page, vehiclePopupSelector);

      // Wait for the search input to be visible
      const searchInputSelector =
        'input[type="search"][placeholder="Search vehicle"]';
      await utils.waitForElementVisible(this.page, searchInputSelector);

      // Fill the search input with the vehicle model from config
      const searchInput = await this.page.$(searchInputSelector);
      if (searchInput) {
        // Clear the input first
        await searchInput.click({ clickCount: 3 }); // Select all text
        await searchInput.type(config.vehicleModel);
        logger.logSuccess(
          `Filled search input with vehicle model: ${config.vehicleModel}`
        );

        // Wait a moment for search results to filter
        await utils.delay(1000);
      }

      // Look for the vehicle that matches our model
      const vehicleSelector = `//div[contains(@class, 'item-title') and contains(text(), '${config.vehicleModel}')]`;

      // First, let's log all available vehicles for debugging
      const allVehicles = await this.page.$$(".item-title");
      if (allVehicles.length > 0) {
        logger.logStep(`Found ${allVehicles.length} vehicles on the page`);
        for (let i = 0; i < allVehicles.length; i++) {
          const vehicleText = await allVehicles[i].evaluate(
            (el) => el.textContent
          );
          logger.logInfo(`Vehicle ${i + 1}: ${vehicleText}`);
        }
      }

      const vehicleElement = await this.page.$x(vehicleSelector);

      if (vehicleElement.length > 0) {
        // Click on the matching vehicle
        await vehicleElement[0].click();
        logger.logSuccess(
          `Selected vehicle with model: ${config.vehicleModel}`
        );
      } else {
        // Try to find any vehicle that contains our model name (case insensitive)
        logger.logStep("Exact match not found, trying flexible search");
        const flexibleSelector = `//div[contains(@class, 'item-title') and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${config.vehicleModel.toLowerCase()}')]`;
        const flexibleVehicleElement = await this.page.$x(flexibleSelector);

        if (flexibleVehicleElement.length > 0) {
          await flexibleVehicleElement[0].click();
          logger.logSuccess(
            `Selected vehicle using flexible search for model: ${config.vehicleModel}`
          );
        } else {
          // If still no match, try to select the first available vehicle (not "Select..." or "Add a Vehicle")
          logger.logStep(
            "No model match found, trying to select first available vehicle"
          );
          const availableVehicles = await this.page.$$(".item-title");
          let selectedVehicle = false;

          for (const vehicle of availableVehicles) {
            const vehicleText = await vehicle.evaluate((el) => el.textContent);
            if (
              vehicleText &&
              vehicleText !== "Select..." &&
              vehicleText !== "Add a Vehicle"
            ) {
              await vehicle.click();
              logger.logSuccess(`Selected available vehicle: ${vehicleText}`);
              selectedVehicle = true;
              break;
            }
          }

          if (!selectedVehicle) {
            throw new Error("No suitable vehicle found for selection");
          }
        }
      }

      // Wait for the popup to close and page to update
      await utils.delay(config.delayBetweenActions);

      // Wait for the vehicle selection popup to disappear
      try {
        await this.page.waitForSelector(
          '.page.smart-select-page[data-name="smart-select-page"]',
          {
            hidden: true,
            timeout: 10000,
          }
        );
        logger.logSuccess("Vehicle selection popup closed");
      } catch (error) {
        logger.logWarning(
          "Vehicle selection popup may not have closed properly"
        );
      }

      // Wait a bit more for the page to fully update
      await utils.delay(2000);

      logger.logCompletion("Vehicle selection completed");
      return true;
    } catch (error) {
      logger.logError("Failed to handle vehicle selection", error);
      throw error;
    }
  }

  /**
   * Handle the post-login flow where user is redirected back to booking page
   */
  async handlePostLoginFlow() {
    try {
      logger.logStep("Handling post-login flow");

      // Wait for the page to load and redirect back to booking page
      await utils.delay(5000);

      // Take a screenshot to see what page we're on
      await utils.takeScreenshot(this.page, "post_login_page");

      // Check if we're back on the booking page with vehicle selector
      const vehicleSelectorExists = await utils.elementExists(
        this.page,
        "#selectVehicleSmartSelect"
      );

      // Also check for alternative selectors
      const alternativeSelectors = [
        ".smartSelectCustom",
        ".item-link.smart-select",
        "[id*='selectVehicle']",
      ];

      let foundSelector = false;
      for (const selector of alternativeSelectors) {
        const exists = await utils.elementExists(this.page, selector);
        if (exists) {
          logger.logInfo(`Found alternative selector: ${selector}`);
          foundSelector = true;
          break;
        }
      }

      if (vehicleSelectorExists || foundSelector) {
        logger.logStep("Back on booking page, handling vehicle selection");

        // Handle vehicle selection from dropdown
        await this.handleDropdownVehicleSelection();

        // After vehicle selection, select the date from the new date picker
        logger.logStep(
          "Vehicle selected, now selecting date from new date picker"
        );
        await this.selectDateFromNewPicker();

        // Now add to cart
        await this.addToCart();

        logger.logCompletion("Post-login flow completed");
        return true;
      } else {
        logger.logWarning("Vehicle selector not found on post-login page");
        logger.logStep("Taking screenshot for debugging");
        await utils.takeScreenshot(this.page, "no_vehicle_selector_found");
        throw new Error("Post-login page not loaded properly");
      }
    } catch (error) {
      logger.logError("Failed to handle post-login flow", error);
      throw error;
    }
  }

  /**
   * Handle vehicle selection from dropdown (post-login)
   */
  async handleDropdownVehicleSelection() {
    try {
      logger.logStep("Handling vehicle selection from dropdown");

      // Click on the smart-select link to open the popup
      const smartSelectLink = await this.page.$(
        ".smartSelectCustom .item-link.smart-select"
      );
      if (smartSelectLink) {
        logger.logStep("Clicking on smart-select link to open popup");
        await smartSelectLink.click();
        await utils.delay(1000);

        // Wait for the vehicle selection popup to appear
        const vehiclePopupSelector =
          '.page.smart-select-page[data-name="smart-select-page"]';
        await utils.waitForElementVisible(this.page, vehiclePopupSelector);

        // Wait for the search input to be visible
        const searchInputSelector =
          'input[type="search"][placeholder="Search vehicle"]';
        await utils.waitForElementVisible(this.page, searchInputSelector);

        // Fill the search input with vehicle information from config
        const searchInput = await this.page.$(searchInputSelector);
        if (searchInput) {
          // Clear the input first
          await searchInput.click({ clickCount: 3 }); // Select all text

          // Search using vehicle model and license plate
          const searchTerm = `${config.vehicleMake} ${config.vehicleModel} ${config.licensePlate}`;
          await searchInput.type(searchTerm);
          logger.logSuccess(`Filled search input with: ${searchTerm}`);

          // Wait a moment for search results to filter
          await utils.delay(1000);
        }

        // Look for the vehicle that matches our model
        const vehicleSelector = `//div[contains(@class, 'item-title') and contains(text(), '${config.vehicleModel}')]`;

        // First, let's log all available vehicles for debugging
        const allVehicles = await this.page.$$(".item-title");
        if (allVehicles.length > 0) {
          logger.logStep(`Found ${allVehicles.length} vehicles on the page`);
          for (let i = 0; i < allVehicles.length; i++) {
            const vehicleText = await allVehicles[i].evaluate(
              (el) => el.textContent
            );
            logger.logInfo(`Vehicle ${i + 1}: ${vehicleText}`);
          }
        }

        const vehicleElement = await this.page.$x(vehicleSelector);

        if (vehicleElement.length > 0) {
          // Click on the matching vehicle
          try {
            // Wait for the element to be clickable
            await utils.delay(500);

            // Try to click the element
            await vehicleElement[0].click();
            logger.logSuccess(
              `Selected vehicle with model: ${config.vehicleModel}`
            );
          } catch (clickError) {
            logger.logWarning(
              `Failed to click vehicle element: ${clickError.message}`
            );
            // Try alternative click method
            try {
              await this.page.evaluate((el) => el.click(), vehicleElement[0]);
              logger.logSuccess(
                `Selected vehicle with model: ${config.vehicleModel} using alternative click method`
              );
            } catch (altClickError) {
              logger.logError(
                `Alternative click method also failed: ${altClickError.message}`
              );
              throw new Error(
                `Could not click on vehicle element: ${clickError.message}`
              );
            }
          }
        } else {
          // Try to find any vehicle that contains our model name (case insensitive)
          logger.logStep("Exact match not found, trying flexible search");
          const flexibleSelector = `//div[contains(@class, 'item-title') and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${config.vehicleModel.toLowerCase()}')]`;
          const flexibleVehicleElement = await this.page.$x(flexibleSelector);

          if (flexibleVehicleElement.length > 0) {
            try {
              // Wait for the element to be clickable
              await utils.delay(500);

              // Try to click the element
              await flexibleVehicleElement[0].click();
              logger.logSuccess(
                `Selected vehicle using flexible search for model: ${config.vehicleModel}`
              );
            } catch (clickError) {
              logger.logWarning(
                `Failed to click flexible vehicle element: ${clickError.message}`
              );
              // Try alternative click method
              try {
                await this.page.evaluate(
                  (el) => el.click(),
                  flexibleVehicleElement[0]
                );
                logger.logSuccess(
                  `Selected vehicle using flexible search for model: ${config.vehicleModel} using alternative click method`
                );
              } catch (altClickError) {
                logger.logError(
                  `Alternative click method also failed: ${altClickError.message}`
                );
                throw new Error(
                  `Could not click on flexible vehicle element: ${clickError.message}`
                );
              }
            }
          } else {
            // If still no match, try to select the first available vehicle (not "Select..." or "Add a Vehicle")
            logger.logStep(
              "No model match found, trying to select first available vehicle"
            );
            const availableVehicles = await this.page.$$(".item-title");
            let selectedVehicle = false;

            for (const vehicle of availableVehicles) {
              const vehicleText = await vehicle.evaluate(
                (el) => el.textContent
              );
              if (
                vehicleText &&
                vehicleText !== "Select..." &&
                vehicleText !== "Add a Vehicle"
              ) {
                try {
                  // Wait for the element to be clickable
                  await utils.delay(500);

                  // Try to click the element
                  await vehicle.click();
                  logger.logSuccess(
                    `Selected available vehicle: ${vehicleText}`
                  );
                  selectedVehicle = true;
                  break;
                } catch (clickError) {
                  logger.logWarning(
                    `Failed to click available vehicle: ${clickError.message}`
                  );
                  // Try alternative click method
                  try {
                    await this.page.evaluate((el) => el.click(), vehicle);
                    logger.logSuccess(
                      `Selected available vehicle: ${vehicleText} using alternative click method`
                    );
                    selectedVehicle = true;
                    break;
                  } catch (altClickError) {
                    logger.logWarning(
                      `Alternative click method also failed for ${vehicleText}: ${altClickError.message}`
                    );
                    // Continue to next vehicle
                    continue;
                  }
                }
              }
            }

            if (!selectedVehicle) {
              throw new Error("No suitable vehicle found for selection");
            }
          }
        }

        // Wait for the popup to close and page to update
        await utils.delay(config.delayBetweenActions);

        // Wait for the vehicle selection popup to disappear
        try {
          await this.page.waitForSelector(
            '.page.smart-select-page[data-name="smart-select-page"]',
            {
              hidden: true,
              timeout: 10000,
            }
          );
          logger.logSuccess("Vehicle selection popup closed");
        } catch (error) {
          logger.logWarning(
            "Vehicle selection popup may not have closed properly"
          );
        }

        // Wait a bit more for the page to fully update
        await utils.delay(2000);

        logger.logCompletion("Vehicle selection from dropdown completed");
        return true;

        for (const option of vehicleOptions) {
          const optionValue = await option.getAttribute("value");
          const optionText = await option.evaluate((el) => el.textContent);

          logger.logInfo(
            `Found vehicle option: ${optionText} (${optionValue})`
          );

          // Skip "Select..." and "Add a Vehicle" options
          if (optionValue && optionValue !== "new_vehicle") {
            // Check if this vehicle matches our model
            if (
              optionText
                .toLowerCase()
                .includes(config.vehicleModel.toLowerCase())
            ) {
              await option.click();
              logger.logSuccess(`Selected vehicle: ${optionText}`);
              selectedVehicle = true;
              break;
            }
          }
        }

        if (!selectedVehicle) {
          // If no exact match, try to select any available vehicle
          logger.logStep(
            "No exact model match, selecting first available vehicle"
          );
          for (const option of vehicleOptions) {
            const optionValue = await option.getAttribute("value");
            const optionText = await option.evaluate((el) => el.textContent);

            if (
              optionValue &&
              optionValue !== "new_vehicle" &&
              optionText !== "Select..."
            ) {
              await option.click();
              logger.logSuccess(`Selected available vehicle: ${optionText}`);
              selectedVehicle = true;
              break;
            }
          }
        }

        if (!selectedVehicle) {
          throw new Error("No suitable vehicle found in dropdown");
        }

        // Wait for the selection to take effect
        await utils.delay(2000);

        logger.logCompletion("Vehicle selection from dropdown completed");
        return true;
      } else {
        throw new Error("Smart-select link not found");
      }
    } catch (error) {
      logger.logError("Failed to handle dropdown vehicle selection", error);
      throw error;
    }
  }

  /**
   * Add a new vehicle to the account
   */
  async addNewVehicle() {
    try {
      logger.logStep("Adding new vehicle");

      // Click on "Add a Vehicle" option
      await utils.clickElement(this.page, config.selectors.addVehicleBtn);
      await utils.delay(config.delayBetweenActions);

      // Fill vehicle information
      await utils.fillInput(
        this.page,
        config.selectors.licensePlateInput,
        config.licensePlate
      );
      await utils.selectOption(
        this.page,
        config.selectors.provinceSelect,
        config.province
      );
      await utils.selectOption(
        this.page,
        config.selectors.colorSelect,
        config.vehicleColor
      );
      await utils.selectOption(
        this.page,
        config.selectors.makeSelect,
        config.vehicleMake
      );
      await utils.fillInput(
        this.page,
        config.selectors.modelInput,
        config.vehicleModel
      );

      // Save vehicle
      await utils.clickElement(this.page, config.selectors.saveVehicleBtn);
      await utils.delay(config.delayBetweenActions);

      this.vehicleAdded = true;
      logger.logCompletion("New vehicle added");
      return true;
    } catch (error) {
      logger.logError("Failed to add new vehicle", error);
      throw error;
    }
  }

  /**
   * Complete the checkout process
   */
  async completeCheckout() {
    try {
      logger.logStep("Completing checkout");

      // Wait for checkout button
      await utils.waitForElementVisible(
        this.page,
        config.selectors.checkoutBtn
      );

      // Click checkout
      await utils.clickElement(this.page, config.selectors.checkoutBtn);
      await utils.delay(config.delayBetweenActions);

      // Take screenshot of final confirmation
      await utils.takeScreenshot(this.page, "checkout_completed");

      logger.logCompletion("Checkout completed");
      return true;
    } catch (error) {
      logger.logError("Failed to complete checkout", error);
      throw error;
    }
  }

  /**
   * Main booking process
   */
  async bookParkingPass() {
    try {
      logger.logStep("Starting parking pass booking process");

      // Initialize bot
      await this.initialize();

      // Navigate to portal
      await this.navigateToPortal();

      // Handle info popup
      await this.handleInfoPopup();

      // Select pass type
      await this.selectPassType();

      // Check if user is already signed in by looking for vehicle selector
      const vehicleSelectExists = await utils.elementExists(
        this.page,
        "#selectVehicleSmartSelect"
      );

      if (vehicleSelectExists) {
        logger.logStep(
          "User appears to be signed in, handling signed-in booking"
        );
        await this.handleSignedInBooking();
      } else {
        logger.logStep("User not signed in, proceeding with login flow");

        // First select the preferred date before adding to cart
        logger.logStep("Selecting preferred date before adding to cart");
        await this.selectDateFromNewPicker();

        // Add to cart (this will trigger login)
        await this.addToCart();

        // Wait for login form to appear
        await utils.delay(3000);

        // Check if login form is visible
        const loginFormVisible = await utils.elementExists(
          this.page,
          ".signinModel, .modelLogin, #slideNo1"
        );
        if (loginFormVisible) {
          logger.logStep("Login form is visible, proceeding with login");

          // Handle login
          try {
            await this.handleLogin();

            // After login, we need to handle the post-login flow
            logger.logStep("Login completed, handling post-login flow");
            await this.handlePostLoginFlow();
          } catch (error) {
            logger.logError("Login or vehicle selection failed", error);
            // Take a screenshot for debugging
            await utils.takeScreenshot(this.page, "login_failed");
            throw error;
          }
        } else {
          logger.logWarning("Login form not visible after adding to cart");
          // Take a screenshot for debugging
          await utils.takeScreenshot(this.page, "no_login_form");
          throw new Error("Login form not found after adding to cart");
        }
      }

      // Complete checkout
      await this.completeCheckout();

      logger.logSuccess("🎉 Parking pass booking completed successfully!");
      return true;
    } catch (error) {
      logger.logError("Booking process failed", error);

      // Take screenshot for debugging
      if (this.page) {
        await utils.takeScreenshot(this.page, "error_state");
      }

      throw error;
    } finally {
      // Clean up
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.logSuccess("Browser closed");
      }
    } catch (error) {
      logger.logError("Failed to cleanup resources", error);
    }
  }

  /**
   * Run the bot with error handling
   */
  static async run() {
    const bot = new BuntzenLakeBot();

    try {
      await bot.bookParkingPass();
    } catch (error) {
      logger.logError("Bot execution failed", error);
      process.exit(1);
    }
  }
}

// Export the bot class and run method
module.exports = { BuntzenLakeBot, run: BuntzenLakeBot.run };

// If this file is run directly, execute the bot
if (require.main === module) {
  BuntzenLakeBot.run();
}
