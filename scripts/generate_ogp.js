const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  const templatePath = path.join(__dirname, 'ogp-template.html');
  await page.goto('file://' + templatePath);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const outPath = path.join(__dirname, '..', 'ogp.jpg');
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 85 });

  await browser.close();

  const size = fs.statSync(outPath).size;
  console.log('saved:', outPath);
  console.log('size:', (size / 1024).toFixed(1) + ' KB');
})();
