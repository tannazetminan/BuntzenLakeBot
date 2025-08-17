#!/usr/bin/env node

const { Command } = require("commander");
const { BuntzenLakeBot } = require("./bot");
const BotScheduler = require("./scheduler");
const logger = require("./logger");
const config = require("./config");

const program = new Command();

// Set up the CLI program
program
  .name("buntzen-lake-bot")
  .description("Automated bot for booking parking passes at Buntzen Lake")
  .version("1.0.0");

// Command to run the bot once
program
  .command("run")
  .description("Run the bot once to book a parking pass")
  .option("-d, --date <date>", "Preferred date (MM/DD format)")
  .option("-t, --type <type>", "Pass type (all_day or half_day)")
  .option("-h, --headless", "Run in headless mode")
  .action(async (options) => {
    try {
      logger.logStep("Starting bot in single-run mode");

      // Override config with CLI options
      if (options.date) config.preferredDate = options.date;
      if (options.type) config.passType = options.type;
      if (options.headless) config.headless = true;

      const bot = new BuntzenLakeBot();
      await bot.bookParkingPass();

      logger.logSuccess("Bot run completed successfully");
      process.exit(0);
    } catch (error) {
      logger.logError("Bot run failed", error);
      process.exit(1);
    }
  });

// Command to start the scheduler
program
  .command("schedule")
  .description("Start the bot scheduler")
  .option("-d, --daily <time>", "Run daily at specific time (HH:MM format)")
  .option("-i, --interval <minutes>", "Run every X minutes")
  .option(
    "-w, --weekly <days>",
    "Run weekly on specific days (0-6, comma-separated)"
  )
  .option(
    "-t, --time <time>",
    "Time for weekly runs (HH:MM format, required with --weekly)"
  )
  .option("--default", "Start with default schedule (8:00 AM daily)")
  .action(async (options) => {
    try {
      logger.logStep("Starting bot scheduler");

      const scheduler = new BotScheduler();

      if (options.default) {
        scheduler.startDefaultScheduler();
      } else if (options.daily) {
        scheduler.scheduleDaily(options.daily, "daily_booking");
      } else if (options.interval) {
        scheduler.scheduleInterval(
          parseInt(options.interval),
          "interval_booking"
        );
      } else if (options.weekly && options.time) {
        const days = options.weekly.split(",").map((d) => parseInt(d.trim()));
        scheduler.scheduleWeekly(days, options.time, "weekly_booking");
      } else {
        // Start default scheduler if no options provided
        scheduler.startDefaultScheduler();
      }

      logger.logSuccess("Scheduler started successfully");
      logger.logInfo("Press Ctrl+C to stop the scheduler");

      // Keep the process running
      process.on("SIGINT", () => {
        logger.logStep("Stopping scheduler...");
        scheduler.stopAllJobs();
        logger.logSuccess("Scheduler stopped");
        process.exit(0);
      });
    } catch (error) {
      logger.logError("Failed to start scheduler", error);
      process.exit(1);
    }
  });

// Command to check status
program
  .command("status")
  .description("Check the status of scheduled jobs")
  .action(async () => {
    try {
      const scheduler = new BotScheduler();
      const jobs = scheduler.getScheduledJobs();

      if (jobs.length === 0) {
        logger.logInfo("No scheduled jobs found");
      } else {
        logger.logInfo(`Found ${jobs.length} scheduled job(s):`);
        jobs.forEach((jobName) => {
          const status = scheduler.getJobStatus(jobName);
          logger.logInfo(
            `  - ${jobName}: ${status.running ? "Running" : "Stopped"}`
          );
        });
      }
    } catch (error) {
      logger.logError("Failed to check status", error);
      process.exit(1);
    }
  });

// Command to stop scheduler
program
  .command("stop")
  .description("Stop all scheduled jobs")
  .action(async () => {
    try {
      const scheduler = new BotScheduler();
      scheduler.stopAllJobs();
      logger.logSuccess("All scheduled jobs stopped");
    } catch (error) {
      logger.logError("Failed to stop scheduler", error);
      process.exit(1);
    }
  });

// Command to test configuration
program
  .command("test-config")
  .description("Test the bot configuration")
  .action(async () => {
    try {
      logger.logStep("Testing bot configuration");

      // Check required environment variables
      const requiredVars = [
        "PHONE_NUMBER",
        "VERIFICATION_CODE",
        "LICENSE_PLATE",
      ];
      const missingVars = requiredVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length > 0) {
        logger.logWarning(
          `Missing required environment variables: ${missingVars.join(", ")}`
        );
        logger.logInfo("Please check your .env file");
      } else {
        logger.logSuccess("All required environment variables are set");
      }

      // Display current configuration
      logger.logInfo("Current configuration:");
      logger.logInfo(
        `  Phone Number: ${config.phoneNumber ? "✓ Set" : "✗ Missing"}`
      );
      logger.logInfo(
        `  Verification Code: ${
          config.verificationCode ? "✓ Set" : "✗ Missing"
        }`
      );
      logger.logInfo(
        `  License Plate: ${config.licensePlate ? "✓ Set" : "✗ Missing"}`
      );
      logger.logInfo(`  Province: ${config.province}`);
      logger.logInfo(`  Vehicle Color: ${config.vehicleColor}`);
      logger.logInfo(`  Vehicle Make: ${config.vehicleMake}`);
      logger.logInfo(`  Vehicle Model: ${config.vehicleModel}`);
      logger.logInfo(`  Pass Type: ${config.passType}`);
      logger.logInfo(`  Preferred Date: ${config.preferredDate || "Not set"}`);
      logger.logInfo(`  Headless Mode: ${config.headless ? "Yes" : "No"}`);
    } catch (error) {
      logger.logError("Configuration test failed", error);
      process.exit(1);
    }
  });

// Command to create sample environment file
program
  .command("init")
  .description("Initialize the bot by creating sample configuration files")
  .action(async () => {
    try {
      logger.logStep("Initializing bot configuration");

      // Create logs directory
      const fs = require("fs");
      const path = require("path");

      if (!fs.existsSync("logs")) {
        fs.mkdirSync("logs");
        logger.logSuccess("Created logs directory");
      }

      if (!fs.existsSync("screenshots")) {
        fs.mkdirSync("screenshots");
        logger.logSuccess("Created screenshots directory");
      }

      // Check if .env file exists
      if (!fs.existsSync(".env")) {
        logger.logWarning(
          ".env file not found. Please copy env.example to .env and fill in your details"
        );
      } else {
        logger.logSuccess(".env file found");
      }

      logger.logSuccess("Bot initialization completed");
      logger.logInfo("Next steps:");
      logger.logInfo("1. Copy env.example to .env");
      logger.logInfo(
        "2. Fill in your phone number, verification code, and vehicle details"
      );
      logger.logInfo("3. Run: npm start to test the bot");
      logger.logInfo("4. Run: npm run schedule to start the scheduler");
    } catch (error) {
      logger.logError("Initialization failed", error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
