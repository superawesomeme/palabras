const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

(async () => {
  fs.mkdirSync("test-artifacts", {recursive: true});
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  const errors = [];
  // Capture spoken sentences without needing a Spanish voice installed on CI.
  await page.addInitScript(() => {
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; this.lang = ""; }
    };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel: () => {},
        speak: utterance => window.__spoken.push({text: utterance.text, lang: utterance.lang})
      }
    });
  });
  page.on("pageerror", error => errors.push(error.message));
  let answer = "";
  let translationCount = 0;
  await page.route("https://api.mymemory.translated.net/get?**", async route => {
    translationCount++;
    const term = new URL(route.request().url()).searchParams.get("q");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {"Access-Control-Allow-Origin": "*"},
      body: JSON.stringify({responseStatus: 200, responseData: {translatedText: "English: " + term}})
    });
  });
  await page.route("https://api.datamuse.com/**", async route => {
    await route.fulfill({status: 200, contentType:"application/json", body: JSON.stringify(answer ? [{word: answer}] : [])});
  });
  await page.goto("file://" + path.resolve("index.html"));
  assert.equal(await page.locator('link[rel="icon"][type="image/svg+xml"]').count(), 1);
  const iconSvg = fs.readFileSync("favicon.svg", "utf8");
  assert.ok(iconSvg.includes('viewBox="0 0 128 128"'));
  assert.ok(iconSvg.includes('fill="url(#gold-face)"'));
  assert.ok(!iconSvg.includes("#071e49"));
  assert.equal(await page.locator("#letter-board .tile").count(), 0);
  assert.equal(await page.locator("#auto-btn").isVisible(), true);
  assert.equal(await page.locator("#robot-detail").count(), 0);
  const buttonDepths = await page.locator("#consonant-btn, #vowel-btn, #auto-btn").evaluateAll(buttons =>
    buttons.map(button => ({
      border: getComputedStyle(button).borderTopWidth,
      radius: getComputedStyle(button).borderTopLeftRadius,
      shadow: getComputedStyle(button).boxShadow
    }))
  );
  assert.ok(buttonDepths.every(button => button.border === "3px"));
  assert.ok(buttonDepths.every(button => button.shadow.includes("8px 0px")));
  assert.equal(new Set(buttonDepths.map(button => button.radius)).size, 1);
  await page.screenshot({path:"test-artifacts/choosing-1920.png"});
  await page.locator("#auto-btn").click();
  await page.waitForFunction(() => document.querySelectorAll("#letter-board .tile").length === 9, null, {timeout: 10000});
  await page.waitForFunction(() => !document.querySelector("#solve-btn").disabled);
  assert.equal(await page.locator("#auto-btn").isVisible(), false);
  assert.equal(await page.locator("#solve-btn").isEnabled(), true);
  const tiles = await page.locator("#letter-board .tile").allTextContents();
  const chosen = await page.evaluate(letters => window.PalabrasVocabulary.findSolutions(letters), tiles);
  assert.equal(chosen.length, 5);
  await page.screenshot({path:"test-artifacts/auto-ready.png"});
  await page.locator("#solve-btn").click();
  assert.equal(await page.locator("#solution-list li").count(), 5);
  await page.locator("#solution-list li button").first().click();
  await page.waitForFunction(() => document.querySelector("#translation-result")?.dataset.state === "ready");
  assert.equal(await page.locator("#translation-word").textContent(), chosen[0].word.toLocaleUpperCase("es"));
  assert.equal(await page.locator("#translation-result").textContent(), "English: " + chosen[0].word.toLocaleLowerCase("es"));
  assert.ok((await page.locator("#translation-source-link").getAttribute("href")).endsWith(encodeURIComponent(chosen[0].word)));
  assert.equal(await page.locator("#translation-dialog").isVisible(), true);
  const translationBounds = await page.locator("#translation-dialog").evaluate(el => {
    const rect = el.getBoundingClientRect();
    return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
  });
  assert.ok(translationBounds.left >= 0 && translationBounds.right <= 1920);
  assert.ok(translationBounds.top >= 0 && translationBounds.bottom <= 1080);
  await page.screenshot({path:"test-artifacts/translation-modal-1920.png"});
  await page.locator("#close-translation").click();
  assert.equal(await page.locator("#translation-dialog").isVisible(), false);
  assert.equal(await page.locator("#solution-list li").count(), 5);
  // Robot solutions belong to the former letter-choice row, never to pupil guesses.
  assert.equal(await page.locator("#solution-panel").evaluate(el => el.parentElement.classList.contains("letter-controls")), true);
  assert.equal(await page.locator("#guess-list").isVisible(), true);
  const robotAnswerColours = await page.locator("#solution-list li").first().evaluate(el => ({
    tileText: getComputedStyle(el).color,
    tileFill: getComputedStyle(el).backgroundImage,
    scoreText: getComputedStyle(el.querySelector("b")).color
  }));
  assert.equal(robotAnswerColours.tileText, "rgb(16, 56, 96)");
  assert.ok(robotAnswerColours.tileFill.includes("rgb(233, 247, 255)"));
  assert.equal(robotAnswerColours.scoreText, "rgb(255, 225, 93)");
  assert.equal(await page.locator("#robot-message").textContent(), "¡A resolver!");
  await page.screenshot({path:"test-artifacts/resolver.png"});
  await page.locator("#solve-btn").click();
  assert.equal(await page.locator("#solution-panel").isVisible(), false);
  answer = chosen[0].word;
  await page.locator("#word-input").fill(answer);
  await page.locator("#submit-btn").click();
  await page.waitForFunction(() => document.querySelector("#robot-message")?.textContent === "¡Correcto!");
  assert.equal(await page.locator("#word-input").inputValue(), "");
  assert.equal(await page.locator("#guess-list li").count(), 1);
  await page.locator("#guess-list li button.guess-lookup").first().click();
  await page.waitForFunction(() => document.querySelector("#translation-result")?.dataset.state === "ready");
  assert.equal(await page.locator("#translation-word").textContent(), answer.toLocaleUpperCase("es"));
  assert.equal(await page.locator("#translation-result").textContent(), "English: " + answer.toLocaleLowerCase("es"));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#translation-dialog").isVisible(), false);
  assert.ok(translationCount >= 1);
  assert.equal(await page.locator("#robot-figure").getAttribute("data-mood"), "happy");
  const spokenCorrect = await page.evaluate(() => window.__spoken.at(-1));
  assert.equal(spokenCorrect.text, `La palabra «${answer}» es correcta.`);
  assert.equal(spokenCorrect.lang, "es-ES");
  await page.locator("#solve-btn").click();
  assert.equal(await page.locator("#solution-list li").count(), 5);
  assert.equal(await page.locator("#guess-list li").count(), 1);
  assert.equal(await page.locator("#guess-list").isVisible(), true);
  await page.locator("#solve-btn").click();
  await page.screenshot({path:"test-artifacts/happy.png"});
  await page.locator("#word-input").fill("ZZZZ");
  await page.locator("#submit-btn").click();
  assert.equal(await page.locator("#robot-message").textContent(), "¡Incorrecto!");
  assert.equal(await page.locator("#robot-figure").getAttribute("data-mood"), "sad");
  const spokenBadLetters = await page.evaluate(() => window.__spoken.at(-1));
  assert.ok(spokenBadLetters.text.includes("zzzz"));
  assert.ok(spokenBadLetters.text.includes("es incorrecta"));
  assert.equal(spokenBadLetters.lang, "es-ES");
  // This tile permutation passes the letter check but is not in our mocked dictionary.
  const wrongGuess = tiles.join("").toLocaleLowerCase("es");
  if (wrongGuess !== answer.toLocaleLowerCase("es")) {
    await page.locator("#word-input").fill(wrongGuess);
    await page.locator("#submit-btn").click();
    await page.waitForFunction(() => document.querySelector("#robot-message")?.textContent === "¡Incorrecto!");
    assert.equal((await page.evaluate(() => window.__spoken.at(-1))).text, `La palabra «${wrongGuess}» es incorrecta.`);
  }
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
