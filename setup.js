#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🚗 Buntzen Lake Parking Bot Setup 🚗\n");

// Check if .env file exists
if (fs.existsSync(".env")) {
  console.log("✅ .env file already exists");
} else {
  console.log("📝 Creating .env file from template...");

  // Copy env.example to .env
  if (fs.existsSync("env.example")) {
    fs.copyFileSync("env.example", ".env");
    console.log("✅ .env file created from env.example");
  } else {
    console.log("❌ env.example not found");
    process.exit(1);
  }
}

// Create necessary directories
const dirs = ["logs", "screenshots"];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`✅ Created ${dir} directory`);
  } else {
    console.log(`✅ ${dir} directory already exists`);
  }
});

console.log("\n📋 Next Steps:");
console.log("1. Edit the .env file with your details:");
console.log("   - PHONE_NUMBER: Your phone number (without country code)");
console.log(
  "   - VERIFICATION_CODE: Leave empty - OTP will be entered manually when received"
);
console.log("   - LICENSE_PLATE: Your vehicle license plate");
console.log("   - Other vehicle details (make, model, color)");
console.log("\n2. Test the bot: npm start");
console.log("3. Start scheduler: npm run schedule");
console.log(
  "\n💡 Tip: Set HEADLESS=false for debugging, HEADLESS=true for production"
);

console.log("\n🎯 Ready to book parking passes!");
