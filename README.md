# Buntzen Lake Parking Pass Bot 🚗🏞️

An automated Node.js bot for booking parking passes at Buntzen Lake through the Yodel Portal. This bot can automatically navigate the booking process, handle login, select passes, and complete the checkout process.

## Features ✨

- **Automated Booking**: Fully automated parking pass booking process
- **Smart Scheduling**: Run the bot at specific times or intervals
- **Multiple Pass Types**: Support for All Day and Half Day passes
- **Vehicle Management**: Automatically add new vehicles or select existing ones
- **Error Handling**: Robust error handling with retry mechanisms
- **Logging**: Comprehensive logging with Winston
- **Screenshots**: Automatic screenshots for debugging
- **CLI Interface**: Easy-to-use command-line interface
- **Configurable**: Environment-based configuration

## Prerequisites 📋

- Node.js 16.0.0 or higher
- npm or yarn package manager
- Chrome/Chromium browser (for Puppeteer)
- Valid phone number registered with Yodel Portal
- Vehicle information (license plate, make, model, color)

## Installation 🚀

1. **Clone or download the project**

   ```bash
   git clone <repository-url>
   cd bunzen-lake-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your details
   nano .env
   ```

4. **Initialize the bot**
   ```bash
   npm run init
   ```

## Configuration ⚙️

Create a `.env` file in the project root with the following variables:

```env
# User credentials
PHONE_NUMBER=your_phone_number_here
VERIFICATION_CODE=your_verification_code_here

# Vehicle information
LICENSE_PLATE=your_license_plate_here
PROVINCE=BC
VEHICLE_COLOR=BLACK
VEHICLE_MAKE=Tesla
VEHICLE_MODEL=Y

# Booking preferences
PASS_TYPE=all_day
PREFERRED_DATE=16

# Bot settings
HEADLESS=false
DELAY_BETWEEN_ACTIONS=2000
LOG_LEVEL=info
```

### Required Variables

- `PHONE_NUMBER`: Your phone number (without country code)
- `VERIFICATION_CODE`: Leave empty - OTP will be entered manually when received
- `LICENSE_PLATE`: Your vehicle's license plate number

### Optional Variables

- `PASS_TYPE`: `all_day` or `half_day` (default: `all_day`)
- `PREFERRED_DATE`: Preferred date in MM/DD format
- `HEADLESS`: Set to `true` for production (no browser UI)
- `DELAY_BETWEEN_ACTIONS`: Delay between actions in milliseconds

## Usage 📖

### Quick Start

1. **Test the bot once**

   ```bash
   npm start
   ```

2. **Start the scheduler (recommended)**
   ```bash
   npm run schedule
   ```

### Command Line Interface

The bot includes a comprehensive CLI for various operations:

```bash
# Run the bot once
npm run cli run

# Run with specific options
npm run cli run --date 08/16 --type all_day

# Start scheduler with default settings
npm run cli schedule --default

# Start daily scheduler at 8:00 AM
npm run cli schedule --daily 08:00

# Run every 30 minutes
npm run cli schedule --interval 30

# Check scheduler status
npm run cli status

# Stop all scheduled jobs
npm run cli stop

# Test configuration
npm run cli test-config

# Initialize bot setup
npm run cli init
```

### Scheduling Options

#### Daily Schedule

```bash
# Run daily at 8:00 AM
npm run cli schedule --daily 08:00
```

#### Interval Schedule

```bash
# Run every 15 minutes
npm run cli schedule --interval 15
```

#### Weekly Schedule

```bash
# Run on weekends at 8:00 AM
npm run cli schedule --weekly 0,6 --time 08:00
```

## How It Works 🔄

The bot follows this automated process:

1. **Initialization**: Launches browser and navigates to Buntzen Lake portal
2. **Info Popup**: Handles the information popup and clicks "Go To Pass(es)"
3. **Pass Selection**: Selects All Day or Half Day pass based on configuration
4. **Date Selection**: Chooses available date (preferred date if specified)
5. **Add to Cart**: Adds the selected pass to cart
6. **Login**: Handles phone number input and OTP verification
7. **Vehicle Selection**: Selects existing vehicle or adds new one
8. **Checkout**: Completes the booking process

## File Structure 📁

```
bunzen-lake-bot/
├── src/
│   ├── bot.js          # Main bot class
│   ├── config.js       # Configuration management
│   ├── logger.js       # Logging utilities
│   ├── utils.js        # Helper functions
│   ├── scheduler.js    # Job scheduling
│   └── cli.js         # Command-line interface
├── logs/               # Log files (created automatically)
├── screenshots/        # Debug screenshots (created automatically)
├── package.json        # Dependencies and scripts
├── env.example         # Environment variables template
└── README.md          # This file
```

## Scripts 📜

- `npm start`: Run the bot once
- `npm run dev`: Run with nodemon for development
- `npm run schedule`: Start the scheduler
- `npm run cli`: Access the command-line interface
- `npm test`: Run tests (when implemented)

## Troubleshooting 🔧

### Common Issues

1. **Element not found errors**

   - The website structure may have changed
   - Check the selectors in `src/config.js`
   - Take screenshots for debugging

2. **Login failures**

   - Verify your phone number and verification code
   - Check if the verification code is still valid
   - Ensure the phone number is registered with Yodel

3. **Browser issues**

   - Update Chrome/Chromium to the latest version
   - Check if Puppeteer can launch the browser
   - Try running in non-headless mode for debugging

4. **Scheduling issues**
   - Check if the cron expressions are valid
   - Verify timezone settings
   - Check system clock accuracy

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your `.env` file:

```env
LOG_LEVEL=debug
```

### Screenshots

The bot automatically takes screenshots at key points and on errors. Check the `screenshots/` directory for debugging.

## Safety and Ethics ⚠️

- **Use responsibly**: Don't overload the booking system
- **Respect limits**: Follow the portal's terms of service
- **Fair use**: Don't use multiple bots or accounts
- **Human oversight**: Monitor the bot's operation
- **Legal compliance**: Ensure compliance with local laws

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer ⚖️

This bot is provided for educational and personal use only. Users are responsible for ensuring compliance with the Yodel Portal's terms of service and applicable laws. The authors are not responsible for any misuse or consequences of using this bot.

## Support 💬

If you encounter issues or have questions:

1. Check the troubleshooting section
2. Review the logs in the `logs/` directory
3. Check the screenshots for visual debugging
4. Open an issue on the repository

---

**Happy hiking at Buntzen Lake! 🏔️**
