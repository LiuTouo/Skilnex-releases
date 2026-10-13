import { test, expect } from "@playwright/test";

const release = "https://github.com/LiuTouo/Skilnex-releases/releases/latest";
const locales = [
  {
    path: "./",
    lang: "zh-Hant",
    done: "未操作任何真實檔案",
    stale: "預覽後已變更",
    empty: "至少選擇",
  },
  {
    path: "en/",
    lang: "en",
    done: "No real files were changed",
    stale: "Files changed after",
    empty: "at least one",
  },
];
const target = (page, id) =>
  page.locator(`input[name="target"][value="${id}"]`);
const confirmation = (page) =>
  page.locator(".conflict-confirm:not([hidden]) input");

for (const locale of locales) {
  test.describe(locale.lang, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(locale.path);
    });

    test("readable content, metadata, links, and a functioning language route", async ({
      page,
    }) => {
      await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".repo-link")).toBeVisible();
      await expect(page.locator(".repo-link")).toHaveAttribute(
        "href",
        "https://github.com/LiuTouo/Skilnex-releases",
      );
      await expect(page.locator("#demo-app")).toBeVisible();
      await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
        "href",
        /https:\/\/liutouo\.github\.io\/Skilnex-releases\//,
      );
      await expect(page.locator("meta[name=description]")).toHaveAttribute(
        "content",
        /Skilnex/,
      );
      expect(
        await page.locator(`a[href="${release}"]`).count(),
      ).toBeGreaterThanOrEqual(4);
      for (const id of ["features", "demo", "engineering", "download"]) {
        await expect(page.locator(`#${id}`)).toHaveCount(1);
      }
      const brokenAnchors = await page
        .locator('a[href^="#"]')
        .evaluateAll((anchors) =>
          anchors
            .filter((a) => !document.getElementById(a.hash.slice(1)))
            .map((a) => a.hash),
        );
      expect(brokenAnchors).toEqual([]);
      await page.locator(".language-link").click();
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale.lang === "en" ? "zh-Hant" : "en",
      );
      await page.reload();
      await expect(page.locator("#demo-app")).toBeVisible();
    });

    test("normal preview includes both files and completes only the selected target", async ({
      page,
    }) => {
      await page.locator("#preview-button").click();
      await expect(page.locator(".diff-card")).toHaveCount(1);
      await expect(page.locator(".file-label code")).toHaveText([
        "SKILL.md",
        "references/checklist.md",
      ]);
      await expect(page.locator("#preview-title")).toBeFocused();
      await expect(page.locator("#apply-button")).toBeEnabled();
      await page.locator("#apply-button").click();
      await expect(page.locator("#demo-result")).toBeVisible();
      await expect(page.locator("#demo-status")).toContainText(locale.done);
      await expect(page.locator("#result-list li")).toHaveCount(1);
      await expect(page.locator("#result-list li")).toContainText("Codex");
      await expect(target(page, "pi")).toBeDisabled();
      await expect(page.locator("#preview-button")).toBeDisabled();
      await expect(page.locator("#result-title")).toBeFocused();
      await expect(page.locator('[data-step="complete"]')).toHaveAttribute(
        "aria-current",
        "step",
      );
    });

    test("empty selection blocks preview with a localized explanation", async ({
      page,
    }) => {
      await target(page, "codex").uncheck();
      await expect(page.locator("#preview-button")).toBeDisabled();
      await expect(page.locator("#demo-status")).toContainText(locale.empty);
      await expect(page.locator("#preview-panel")).toBeHidden();
    });

    test("mixed targets require explicit approval of local changes", async ({
      page,
    }) => {
      await target(page, "opencode").check();
      await target(page, "pi").check();
      await page.locator("#preview-button").click();
      await expect(page.locator(".diff-card")).toHaveCount(3);
      await expect(page.locator("#apply-button")).toBeDisabled();
      await expect(page.locator("#demo-status")).toContainText("Pi");
      await confirmation(page).check();
      await expect(page.locator("#apply-button")).toBeEnabled();
      await confirmation(page).uncheck();
      await expect(page.locator("#apply-button")).toBeDisabled();
      await confirmation(page).check();
      await page.locator("#apply-button").click();
      await expect(page.locator("#result-list li")).toHaveCount(3);
    });

    test("stale previews block sync, clear approval, and require review again", async ({
      page,
    }) => {
      await target(page, "pi").check();
      await page.locator("#preview-button").click();
      await confirmation(page).check();
      await page.locator("#invalidate-button").click();
      await expect(page.locator("#apply-button")).toBeDisabled();
      await expect(confirmation(page)).not.toBeChecked();
      await expect(confirmation(page)).toBeDisabled();
      await expect(page.locator("#demo-status")).toContainText(locale.stale);
      await expect(page.locator("#preview-button")).toBeFocused();
      await page.locator("#preview-button").click();
      await expect(confirmation(page)).toBeEnabled();
      await expect(confirmation(page)).not.toBeChecked();
      await expect(page.locator("#apply-button")).toBeDisabled();
      await confirmation(page).check();
      await page.locator("#apply-button").click();
      await expect(page.locator("#demo-result")).toBeVisible();
    });

    test("selection changes invalidate previews and reset restores the initial state", async ({
      page,
    }) => {
      await target(page, "pi").check();
      await page.locator("#preview-button").click();
      await confirmation(page).check();
      await target(page, "opencode").check();
      await expect(page.locator("#preview-panel")).toBeHidden();
      await expect(page.locator(".diff-card")).toHaveCount(0);
      await page.locator("#preview-button").click();
      await expect(confirmation(page)).not.toBeChecked();
      await confirmation(page).check();
      await page.locator("#apply-button").click();
      await page.locator("#reset-demo").click();
      await expect(target(page, "codex")).toBeChecked();
      await expect(target(page, "pi")).not.toBeChecked();
      await expect(target(page, "opencode")).not.toBeChecked();
      await expect(target(page, "pi")).toBeEnabled();
      await expect(page.locator("#demo-result")).toBeHidden();
      await expect(page.locator("#preview-panel")).toBeHidden();
      await expect(page.locator("#result-list li")).toHaveCount(0);
      await expect(target(page, "codex")).toBeFocused();
    });

    test("the conflict workflow is operable by keyboard", async ({ page }) => {
      await page.locator("#reset-demo").focus();
      await page.keyboard.press("Tab");
      await expect(target(page, "codex")).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(target(page, "pi")).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await expect(page.locator("#preview-button")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#preview-title")).toBeFocused();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(confirmation(page)).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await expect(page.locator("#apply-button")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#demo-result")).toBeVisible();
    });

    test("reduced motion, FAQ, and focus indicators", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await page
          .locator("html")
          .evaluate((e) => getComputedStyle(e).scrollBehavior),
      ).toBe("auto");
      await page.locator(".faq-list summary").first().click();
      await expect(page.locator(".faq-list details").first()).toHaveAttribute(
        "open",
        "",
      );
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      expect(
        await focused.evaluate((e) =>
          parseFloat(getComputedStyle(e).outlineWidth),
        ),
      ).toBeGreaterThanOrEqual(2);
    });

    for (const width of [360, 768, 1440]) {
      test(`layout at ${width}px remains readable during a conflict`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("landing.png"),
          fullPage: false,
        });
        await target(page, "pi").check();
        await page.locator("#preview-button").click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(confirmation(page)).toBeVisible();
        await page
          .locator("#demo")
          .screenshot({ path: testInfo.outputPath("demo.png") });
        await confirmation(page).check();
        await page.locator("#apply-button").click();
        await expect(page.locator("#demo-result")).toBeVisible();
      });
    }
  });

  test(`${locale.lang}: static content and downloads work without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL(locale.path, baseURL).href);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("noscript")).toBeVisible();
    await expect(page.locator("#demo-app")).toBeHidden();
    await expect(page.locator(`a[href="${release}"]`).first()).toBeVisible();
    await page.locator(".language-link").click();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale.lang === "en" ? "zh-Hant" : "en",
    );
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    await context.close();
  });
}

test("only local static resources load; no console or page errors", async ({
  page,
  baseURL,
}) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => requests.push(request));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });
  for (const locale of locales) {
    await page.goto(locale.path);
    await expect(page.locator("#demo-app")).toBeVisible();
    await target(page, "pi").check();
    await page.locator("#preview-button").click();
    await confirmation(page).check();
    await page.locator("#apply-button").click();
    await expect(page.locator("#demo-result")).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(
    requests.every((r) => new URL(r.url()).origin === new URL(baseURL).origin),
  ).toBe(true);
  expect(
    requests.every(
      (r) => !["fetch", "xhr", "websocket"].includes(r.resourceType()),
    ),
  ).toBe(true);
});

test("preview server serves only site files and rejects invalid requests", async ({
  request,
}) => {
  test.skip(Boolean(process.env.SITE_URL), "Local preview server only");
  for (const path of [
    "/package.json",
    "/Skilnex-releases/../package.json",
    "/Skilnex-releases/%2e%2e%2fpackage.json",
    "/Skilnex-releases/%2e%2e%5cpackage.json",
    "/Skilnex-releases/missing.js",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.get("/Skilnex-releases/%zz")).status()).toBe(400);
  expect((await request.post("./")).status()).toBe(405);
  const head = await request.head("./");
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});
