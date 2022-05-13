#!/usr/bin/env node

const puppeteer = require("puppeteer");
const fs = require("fs");
const chalk = require("chalk");
require("dotenv").config();
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
if (!process.env.FB_EMAIL || !process.env.FB_PASS) {
    throw new Error(
        "No credential provided, you should put on .env or environment variable in the system."
    );
}

const email = process.env.FB_EMAIL;
const password = process.env.FB_PASS;

(async () => {
    const browser = await puppeteer.launch({
        headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito', '--no-zygote']
    });

    try {
        const page = await browser.newPage();

        await page.goto("https://mbasic.facebook.com/login");
        console.info(`${chalk.green("Info:")} Parsing Facebook Login...`);
        await page.waitForSelector("#m_login_email");
        await page.type('input[name="email"]', email);
        await page.type('input[name="pass"]', password);
        await page.click('input[name="login"]');

        console.info(`${chalk.green("Info:")} Authenticating...`);
        try {
            await page.waitForSelector("div[role=feed]", { timeout: 8000 });
        }
        catch (err) {
            const curUrl = await page.url();
            if (curUrl == "https://mbasic.facebook.com/?sk=welcome") {
                console.log(`${chalk.green("Info:")} Redirecting to main facebook page...`);
                await page.goto("https://mbasic.facebook.com/");
                await page.waitForSelector("div[role=feed]", { timeout: 8000 });
            }
        }
        if (await page.url().includes("checkpoint")) {
            console.log(`${chalk.green("Info:")} Handling checkpoint...`);
            await page.waitForSelector('input[name="submit[Continue]"', { timeout: 8000 });
            await page.click('input[name="submit[Continue]"');
            console.log(`${chalk.green("Info:")} Continue button clicked!...`);
            await page.waitForSelector('#checkpointSubmitButton-actual-button', { timeout: 8000 });
            await page.click('input[name="submit[Continue]"');
            await page.waitForSelector('#checkpointSubmitButton-actual-button', { timeout: 8000 });
            console.log(`${chalk.green("Info:")} Waiting for approval...`);
            await sleep(8000);
            await page.click('input[name="submit[Continue]"');

        }
        let url = await page.url();
        if (url.includes("checkpoint")) {
            throw new Error(
                "Login Approval Failed!"
            );
        } else if (url.includes("save-device")) {
            console.log(`${chalk.green("Info:")} Allowing Save Device Option!.`);
            await page.click('input[value="OK"]')
            // let tUrl = await page.url();
            // if (tUrl.includes("upgrade")) {
            //     console.log(`${chalk.green("Info:")} Ignoring Use Data Option!.`);
            //     await page.click('span[class="x"]')
            //     if (url.includes("save-device")) {
            //         console.log(`${chalk.green("Info:")} Ignoring Save Device Option!.`);
                    
            //         await page.screenshot({ path: __dirname + "/../../utils/debug.png" })
            //         await page.click('span[class="v"]')
            //         tUrl = await page.url();
            //         if (tUrl.includes("upgrade")) {
            //             console.log(`${chalk.green("Info:")} Ignoring Use Data Option!.`);
            //             await page.click('span[class="x"]')
            //         }

            //     }
            // }
        }
        await page.screenshot({ path: __dirname + "/../../utils/loginres.png" })
        fs.writeFileSync("login_source.html", await page.content())
        console.log(await page.url())
        console.info(`${chalk.green("Info:")} Took a snapshot...`);
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
