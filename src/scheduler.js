const cron = require("node-cron");
const { BuntzenLakeBot } = require("./bot");
const logger = require("./logger");
const config = require("./config");

/**
 * Scheduler for the Buntzen Lake Parking Bot
 * Allows running the bot at specific times or intervals
 */
class BotScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.isRunning = false;
  }

  /**
   * Schedule the bot to run at a specific time
   * @param {string} cronExpression - Cron expression for scheduling
   * @param {string} jobName - Name for the scheduled job
   * @returns {boolean} Success status
   */
  scheduleJob(cronExpression, jobName = "default") {
    try {
      logger.logStep(`Scheduling job: ${jobName} with cron: ${cronExpression}`);

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Stop existing job if it exists
      if (this.scheduledJobs.has(jobName)) {
        this.stopJob(jobName);
      }

      // Schedule new job
      const job = cron.schedule(
        cronExpression,
        async () => {
          await this.runScheduledJob(jobName);
        },
        {
          scheduled: false,
          timezone: "America/Vancouver", // Buntzen Lake is in BC, Canada
        }
      );

      // Store the job
      this.scheduledJobs.set(jobName, job);

      // Start the job
      job.start();

      logger.logSuccess(`Job scheduled successfully: ${jobName}`);
      return true;
    } catch (error) {
      logger.logError(`Failed to schedule job: ${jobName}`, error);
      return false;
    }
  }

  /**
   * Schedule the bot to run daily at a specific time
   * @param {string} time - Time in HH:MM format (24-hour)
   * @param {string} jobName - Name for the scheduled job
   * @returns {boolean} Success status
   */
  scheduleDaily(time, jobName = "daily") {
    const [hour, minute] = time.split(":");
    const cronExpression = `${minute} ${hour} * * *`;
    return this.scheduleJob(cronExpression, jobName);
  }

  /**
   * Schedule the bot to run every X minutes
   * @param {number} minutes - Interval in minutes
   * @param {string} jobName - Name for the scheduled job
   * @returns {boolean} Success status
   */
  scheduleInterval(minutes, jobName = "interval") {
    const cronExpression = `*/${minutes} * * * *`;
    return this.scheduleJob(cronExpression, jobName);
  }

  /**
   * Schedule the bot to run on specific days of the week
   * @param {Array<number>} days - Array of days (0-6, where 0 is Sunday)
   * @param {string} time - Time in HH:MM format
   * @param {string} jobName - Name for the scheduled job
   * @returns {boolean} Success status
   */
  scheduleWeekly(days, time, jobName = "weekly") {
    const [hour, minute] = time.split(":");
    const daysString = days.join(",");
    const cronExpression = `${minute} ${hour} * * ${daysString}`;
    return this.scheduleJob(cronExpression, jobName);
  }

  /**
   * Run a scheduled job
   * @param {string} jobName - Name of the job to run
   */
  async runScheduledJob(jobName) {
    if (this.isRunning) {
      logger.logWarning(
        `Bot is already running, skipping scheduled job: ${jobName}`
      );
      return;
    }

    try {
      this.isRunning = true;
      logger.logStep(`Running scheduled job: ${jobName}`);

      const bot = new BuntzenLakeBot();
      await bot.bookParkingPass();

      logger.logSuccess(`Scheduled job completed: ${jobName}`);
    } catch (error) {
      logger.logError(`Scheduled job failed: ${jobName}`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop a specific scheduled job
   * @param {string} jobName - Name of the job to stop
   * @returns {boolean} Success status
   */
  stopJob(jobName) {
    try {
      const job = this.scheduledJobs.get(jobName);
      if (job) {
        job.stop();
        this.scheduledJobs.delete(jobName);
        logger.logSuccess(`Job stopped: ${jobName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.logError(`Failed to stop job: ${jobName}`, error);
      return false;
    }
  }

  /**
   * Stop all scheduled jobs
   * @returns {boolean} Success status
   */
  stopAllJobs() {
    try {
      for (const [jobName, job] of this.scheduledJobs) {
        job.stop();
        logger.logSuccess(`Job stopped: ${jobName}`);
      }
      this.scheduledJobs.clear();
      return true;
    } catch (error) {
      logger.logError("Failed to stop all jobs", error);
      return false;
    }
  }

  /**
   * Get list of all scheduled jobs
   * @returns {Array<string>} Array of job names
   */
  getScheduledJobs() {
    return Array.from(this.scheduledJobs.keys());
  }

  /**
   * Get status of a specific job
   * @param {string} jobName - Name of the job
   * @returns {Object} Job status information
   */
  getJobStatus(jobName) {
    const job = this.scheduledJobs.get(jobName);
    if (!job) {
      return { exists: false, running: false };
    }

    return {
      exists: true,
      running: job.running,
      nextDate: job.nextDate(),
    };
  }

  /**
   * Start the scheduler with default configurations
   */
  startDefaultScheduler() {
    logger.logStep("Starting default scheduler");

    // Schedule daily run at 8:00 AM (when passes typically become available)
    this.scheduleDaily("08:00", "morning_booking");

    // Schedule backup run at 8:30 AM
    this.scheduleDaily("08:30", "backup_booking");

    // Schedule evening check at 6:00 PM
    this.scheduleDaily("18:00", "evening_check");

    logger.logSuccess("Default scheduler started");
  }
}

module.exports = BotScheduler;
