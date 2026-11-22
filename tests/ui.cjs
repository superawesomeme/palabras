const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

(async () => {
  fs.mkdirSync("test-artifacts", {recursive: true});
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let answer = "";
  await page.route("https://api.datamuse.com/**", async route => {
    await route.fulfill({status: 200, contentType:"application/json", body: JSON.stringify(answer ? [{word: answer}] : [])});
  });
  await page.goto("file://" + path.resolve("index.html"));
  assert.equal(await page.locator("#letter-board .tile").count(), 0);
  assert.equal(await page.locator("#auto-btn").isVisible(), true);
  await page.locator("#auto-btn").click();
  await page.waitForFunction(() => document.querySelectorAll("#letter-board .tile").length === 9, null, {timeout: 10000});
  assert.equal(await page.locator("#auto-btn").isVisible(), false);
  assert.equal(await page.locator("#solve-btn").isEnabled(), true);
  const tiles = await page.locator("#letter-board .tile").allTextContents();
  const chosen = await page.evaluate(letters => window.PalabrasVocabulary.findSolutions(letters), tiles);
  assert.equal(chosen.length, 5);
  await page.locator("#solve-btn").click();
  assert.equal(await page.locator("#solution-list li").count(), 5);
  assert.equal(await page.locator("#robot-message").textContent(), "¡A resolver!");
  await page.locator("#solve-btn").click();
  assert.equal(await page.locator("#solution-panel").isVisible(), false);
  answer = chosen[0].word;
  await page.locator("#word-input").fill(answer);
  await page.locator("#submit-btn").click();
  await page.waitForFunction(() => document.querySelector("#robot-message")?.textContent === "¡Correcto!");
  assert.equal(await page.locator("#word-input").inputValue(), "");
  assert.equal(await page.locator("#guess-list li").count(), 1);
  assert.equal(await page.locator("#robot-figure").getAttribute("data-mood"), "happy");
  await page.locator("#word-input").fill("ZZZZ");
  await page.locator("#submit-btn").click();
  assert.equal(await page.locator("#robot-message").textContent(), "¡Incorrecto!");
  assert.equal(await page.locator("#robot-figure").getAttribute("data-mood"), "sad");
  assert.equal(await page.locator("#word-input").inputValue(), "");
  await page.locator("#start-btn").click();
  assert.equal(await page.locator("#start-label").textContent(), "Pausar");
  await page.locator("#start-btn").click();
  assert.equal(await page.locator("#start-label").textContent(), "Continuar");

  for (const [width, height] of [[1920,1080],[1600,900],[1280,720]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path: "test-artifacts/landscape-"+width+".png"});
    const bounds = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      robot: document.querySelector(".robot-figure").getBoundingClientRect().toJSON(),
      footer: document.querySelector(".creator-credit").getBoundingClientRect().toJSON()
    }));
    assert.ok(bounds.width <= width + 1, "Horizontal overflow at "+width+": "+bounds.width);
    assert.ok(bounds.height <= height + 1, "Vertical overflow at "+width+": "+bounds.height);
    assert.ok(bounds.robot.width > 75, "Robot is too small at "+width);
    assert.ok(bounds.footer.bottom <= height + 1, "Footer clipped at "+width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:"test-artifacts/portrait-390.png",fullPage:true});
  assert.ok(await page.locator("#robot-figure").isVisible());
  await page.locator("#reset-btn").click();
  assert.equal(await page.locator("#letter-board .tile").count(),0);
  await page.locator("#auto-btn").click();
  await page.waitForTimeout(250);
  await page.locator("#reset-btn").click();
  await page.waitForTimeout(2400);
  assert.equal(await page.locator("#letter-board .tile").count(),0,"Reset must interrupt Auto");
  assert.deepEqual(errors, []);
  console.log("Classroom UI, Auto, Resolver, mascot, reset and responsive browser checks passed.");
  await browser.close();
})().catch(error => {console.error(error);process.exitCode=1;});
