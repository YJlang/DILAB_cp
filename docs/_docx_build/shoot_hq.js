const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const HTML = "/Users/junha/Desktop/DILAB 복사본/docs/oracle-transition-report.html";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: "light", viewport: { width: 980, height: 1400 }, deviceScaleFactor: 3 });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const canvases = await page.$$(".canvas");
  await canvases[1].screenshot({ path: "/Users/junha/Desktop/DILAB 복사본/docs/figures/dilab-arch-oracle-after.png" });
  await canvases[2].screenshot({ path: "/Users/junha/Desktop/DILAB 복사본/docs/figures/dilab-rag-flow.png" });
  console.log("saved 2 HQ diagrams");
  await browser.close();
})();
