// template.html の各 <section class="frame"> を、id 名の PNG に書き出す。
// 使い方: NODE_PATH=$(npm root -g) node tools/insta-post/render.js samples/cafe/posts
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const outDir = process.argv[2] || ".";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
  await page.goto("file://" + path.join(__dirname, "template.html"));
  for (const frame of await page.$$("section.frame")) {
    const id = await frame.getAttribute("id");
    await frame.screenshot({ path: path.join(outDir, `${id}.png`) });
    console.log("wrote", `${id}.png`);
  }
  await browser.close();
})();
