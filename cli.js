#!/usr/bin/env node

const puppeteer = require("puppeteer");
const fs = require("fs");
const chalk = require("chalk");
require("dotenv").config();

if (!process.env.FB_EMAIL || !process.env.FB_PASS) {
  throw new Error(
    "No credential provided, you should put on .env or environment variable in the system."
  );
}

const email = process.env.FB_EMAIL;
const password = process.env.FB_PASS;

(async () => {
  const browser = await puppeteer.launch({
    headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito', '--no-zygote']
  });

  try {
    const page = await browser.newPage();

    await page.goto("https://web.facebook.com/");
    console.info(`${chalk.green("Info:")} Parsing Facebook Login...`);
    await page.waitForSelector("#email");
    await page.type("#email", email);
    await page.type("#pass", password);
    await page.click('button[name="login"]');

    console.info(`${chalk.green("Info:")} Authenticating...`);
    try {
      await page.waitForSelector("div[role=feed]", { timeout: 8000 });
    }
    catch (err) {
      const curUrl = await page.url();
      if (curUrl == "https://web.facebook.com/?sk=welcome") {
        console.log(`${chalk.green("Info:")} Redirecting to main facebook page...`);
        await page.goto("https://web.facebook.com/");
        await page.waitForSelector("div[role=feed]", { timeout: 8000 });
      }
    }
    cookies = await page.cookies();
    cookies = cookies.map(({ name: key, ...rest }) => ({ key, ...rest }));

    const cookiesString = JSON.stringify(cookies);

    console.info(`${chalk.green("Info:")} Writing session file...`);

    fs.writeFileSync(
      "state.session",
      Buffer.from(cookiesString).toString("base64")
    );

    console.info(`${chalk.green("Info:")} Session has been created...`);
    console.info(`${chalk.green("Success:")} You may run the start command.`);
  } catch (err) {
    if (err.message.includes("div[role=feed]")) {
      console.log(`JESON YAWA: ${err}`);
      console.log(
        chalk.red("Error: ") +
        "Invalid username or password. If you're account enable 2FA please disable it."
      );
    } else {
      console.log(chalk.red("Error: ") + err.message);
    }
  }

  await browser.close();
})();
