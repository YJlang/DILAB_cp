// 아키텍처 리포트 HTML 의 다이어그램(.canvas)들을 PNG 로 캡처 → docx 삽입용.
// 실행: NODE_PATH=<prototype/node_modules> node shoot.js
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const HTML = "/Users/junha/Desktop/DILAB 복사본/docs/oracle-transition-report.html";
const OUT = "/Users/junha/Desktop/DILAB 복사본/docs/_docx_build";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    colorScheme: "light",
    viewport: { width: 980, height: 1400 },
    deviceScaleFactor: 2,
  });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const canvases = await page.$$(".canvas");
  console.log("diagrams:", canvases.length);
  for (let i = 0; i < canvases.length; i++) {
    await canvases[i].screenshot({ path: path.join(OUT, `diag${i}.png`) });
    console.log("  saved diag" + i + ".png");
  }
  await browser.close();
})();
