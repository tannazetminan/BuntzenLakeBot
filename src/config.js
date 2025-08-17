const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Debug: Log what's being read from environment
console.log("🔍 Environment variables:");
console.log("PHONE_NUMBER:", process.env.PHONE_NUMBER);
console.log("VERIFICATION_CODE:", process.env.VERIFICATION_CODE);
console.log("LICENSE_PLATE:", process.env.LICENSE_PLATE);
console.log("PREFERRED_DATE:", process.env.PREFERRED_DATE);
console.log("DELAY_BETWEEN_ACTIONS:", process.env.DELAY_BETWEEN_ACTIONS);
console.log("LONG_WAIT_TIME:", process.env.LONG_WAIT_TIME);
console.log("Current working directory:", process.cwd());
console.log("Env file path:", path.resolve(__dirname, "../.env"));

const config = {
  // User credentials
  phoneNumber: "6043679066", // Hardcoded for testing
  verificationCode: "", // Will be entered manually when OTP arrives

  // Vehicle information
  licensePlate: process.env.LICENSE_PLATE || "",
  province: process.env.PROVINCE || "BC",
  vehicleColor: process.env.VEHICLE_COLOR || "BLACK",
  vehicleMake: process.env.VEHICLE_MAKE || "Tesla",
  vehicleModel: process.env.VEHICLE_MODEL || "Y",

  // Booking preferences
  passType: process.env.PASS_TYPE || "all_day", // 'all_day' or 'half_day'
  preferredDate: process.env.PREFERRED_DATE || "17",

  // Bot settings
  headless: process.env.HEADLESS === "true",
  delayBetweenActions: parseInt(process.env.DELAY_BETWEEN_ACTIONS) || 100,
  longWaitTime: parseInt(process.env.LONG_WAIT_TIME) || 500,

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Retry settings
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,

  // URLs
  baseUrl: "https://yodelportal.com/buntzen-lake",

  // Selectors for automation
  selectors: {
    // Information popup
    infoPopup: "#informationPopup",
    goToPassesBtn:
      ".themeBtn.button.popup-close, .themeBtn.button, a[href='#']",

    // Pass selection
    allDayPass: '.gridCard:has(.parkName:contains("All Day Pass"))',
    halfDayPass: '.gridCard:has(.parkName:contains("Half Day Pass"))',

    // Date selection
    dateSelector: "button.date",
    activeDate: "button.date.active",
    dateMain: ".dateMain",
    dateSlide: ".dateBody",
    dateList: ".datelist",

    // Add to cart
    addToCartBtn: ".themeBtn.btn-disbled.button.button-round, #cardBtn_12196",

    // Login form
    phoneInput: "#txtPhonenumber",
    countrySelect: "#loginPhonenumber select",
    nextBtn: ".themeBtn.button",

    // OTP verification
    otpInputs: ".otpFocusInput",
    otpSubmitBtn: ".themeBtn.btn-disbled.button",

    // Vehicle selection
    vehicleSelect: '.page.smart-select-page[data-name="smart-select-page"]',
    vehicleSearchInput: 'input[type="search"][placeholder="Search vehicle"]',
    addVehicleBtn: 'input[value="new_vehicle"]',

    // Add vehicle form
    licensePlateInput: "#licencePlateTxt",
    provinceSelect: "#stateSelect select",
    colorSelect: "#colourSelect select",
    makeSelect: "#makeModelSelect select",
    modelInput: "#vehicleModelTxt",
    saveVehicleBtn: ".themeBtn.button.button-round",

    // Checkout
    checkoutBtn: "#checkOutButton",
    cartCloseBtn: ".viewCart_closeCart .theme-outline-yellow.button",

    // Status indicators
    soldOut: ".soldout",
    available: ".available",
  },
};

module.exports = config;
