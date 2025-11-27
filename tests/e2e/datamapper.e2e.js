// Example skeleton using Puppeteer-style API (you can adapt it)
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const extensionPath = path.resolve(__dirname, '../..');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://example.org');

  // Open the extension popup (in Chromium this is non-trivial, so we just show approach)
  // You may need to locate extension ID first and open chrome-extension://<id>/popup.html in a new tab.

  // Example pseudo-steps:
  // 1) Go to chrome://extensions/, find ID of DataMapper.
  // 2) Open new tab with popup.html.
  // 3) Simulate "Start selecting", click an element on example.org using DevTools protocol.
  // 4) Trigger "Extract" and verify results.

  console.log('E2E stub executed - customize for your CI.');
  await browser.close();
})();
