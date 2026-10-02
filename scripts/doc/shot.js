/* Screenshot an HTML diagram at 2x device scale for 300dpi print embedding.
 * (PNG diagram screenshot per SKILL.md "Diagram Generation Strategy" —
 *  page.screenshot is the sanctioned path for sub-element figures.) */
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const [htmlPath, outPath, w, h] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: parseInt(w || "1000"), height: parseInt(h || "600") },
    deviceScaleFactor: 2,
  });
  await page.goto("file://" + path.resolve(htmlPath));
  await page.waitForTimeout(400);
  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();
  console.log("PNG written:", outPath);
})();
