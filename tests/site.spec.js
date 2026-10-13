import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const release = "https://github.com/LiuTouo/Skilnex-releases/releases/latest";
const locales = [
  {
    path: "./",
    lang: "zh-Hant",
    done: "未操作任何真實檔案",
    stale: "預覽後已變更",
    empty: "至少選擇",
    scope: "真實桌面操作錄影",
  },
  {
    path: "en/",
    lang: "en",
    done: "No real files were changed",
    stale: "Files changed after",
    empty: "at least one",
    scope: "real desktop recording",
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
      for (const id of ["features", "native-demo", "demo", "download"]) {
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

    test("native recording plays with bilingual captions and keyboard-accessible fallback", async ({
      page,
    }) => {
      const video = page.locator("#native-demo video");
      await expect(video).toHaveAttribute("controls", "");
      await expect(video).toHaveAttribute("playsinline", "");
      await expect(video).not.toHaveAttribute("autoplay", "");
      await expect(video).not.toHaveAttribute("loop", "");
      await expect(video.locator("track[default]")).toHaveAttribute(
        "srclang",
        locale.lang === "en" ? "en" : "zh-TW",
      );
      await expect(page.locator("#native-scope")).toContainText(
        locale.scope,
      );
      await expect
        .poll(() => video.evaluate((v) => v.readyState))
        .toBeGreaterThanOrEqual(1);
      const duration = await video.evaluate((v) => v.duration);
      expect(duration).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThanOrEqual(75);
      await video.focus();
      await expect(video).toBeFocused();
      await page.keyboard.press("Space");
      await expect
        .poll(() => video.evaluate((v) => v.currentTime))
        .toBeGreaterThan(0);
      await page.keyboard.press("Space");
      await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
      for (let i = 0; i < 2; i++) {
        await video.evaluate((v, index) => {
          for (const track of v.textTracks) track.mode = "disabled";
          v.textTracks[index].mode = "showing";
          v.currentTime = 23;
        }, i);
        await expect
          .poll(() =>
            video.evaluate(
              (v, index) => v.textTracks[index].cues?.length ?? 0,
              i,
            ),
          )
          .toBe(10);
        await expect
          .poll(() =>
            video.evaluate(
              (v, index) => v.textTracks[index].activeCues?.[0]?.text ?? "",
              i,
            ),
          )
          .toMatch(i === 0 ? /過期檢查/ : /Stale apply/);
      }
      const summary = page.locator(".native-transcript summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".native-transcript")).toHaveAttribute(
        "open",
        "",
      );
      await expect(page.locator(".native-transcript ol li")).toHaveCount(5);
      for (const image of await page.locator(".native-stills img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect(image).toBeVisible();
        await expect
          .poll(() => image.evaluate((img) => img.naturalWidth))
          .toBeGreaterThan(0);
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      await expect
        .poll(() => video.evaluate((v) => v.readyState))
        .toBeGreaterThanOrEqual(1);
      expect(await video.evaluate((v) => v.paused && v.currentTime === 0)).toBe(
        true,
      );
    });

    for (const width of [360, 768, 1440]) {
      test(`native media and open transcript fit ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator(".native-transcript summary").click();
        await page.locator("#native-demo").scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const bounds = await page.locator("#native-demo video").boundingBox();
        expect(bounds.width).toBeLessThanOrEqual(width);
        await page
          .locator("#native-demo")
          .screenshot({ path: testInfo.outputPath("native-demo.png") });
      });
    }

    test("scroll reveals settle visible", async ({ page }) => {
      await expect(page.locator("html")).toHaveClass(/js/);
      await page.locator("#features").scrollIntoViewIfNeeded();
      const first = page.locator(".feature").first();
      await expect(first).toHaveClass(/in-view/);
      await expect
        .poll(() => first.evaluate((e) => getComputedStyle(e).opacity))
        .toBe("1");
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
    await expect(page.locator("#native-demo video")).toHaveAttribute(
      "controls",
      "",
    );
    await page.locator(".native-transcript summary").click();
    await expect(page.locator(".native-stills img").first()).toBeVisible();
    await expect(page.locator(".native-transcript ol li")).toHaveCount(5);
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
  for (const [asset, type] of [
    ["assets/skilnex-native/demo.mp4", "video/mp4"],
    ["assets/skilnex-native/demo.zh-TW.vtt", "text/vtt; charset=utf-8"],
    ["assets/skilnex-native/demo.en.vtt", "text/vtt; charset=utf-8"],
    ["assets/skilnex-native/cover-source.png", "image/png"],
    ["evidence/skilnex-native.json", "application/json; charset=utf-8"],
  ]) {
    const response = await request.get(asset);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe(type);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect((await response.body()).length).toBeGreaterThan(0);
  }
  expect(
    (
      await request.get("/Skilnex-releases/%2e%2e%2fpackage-lock.json")
    ).status(),
  ).toBe(404);
  expect(
    (await request.get("/Skilnex-releases/assets/site.exe")).status(),
  ).toBe(404);
  const head = await request.head("./");
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});

test("serve.mjs supports bounded single MP4 ranges without weakening file boundaries", async ({
  request,
}) => {
  test.skip(Boolean(process.env.SITE_URL), "Local preview server only");
  const url = "assets/skilnex-native/demo.mp4";
  const whole = await request.get(url);
  const body = await whole.body();
  const size = body.length;
  expect(whole.status()).toBe(200);
  expect(whole.headers()["accept-ranges"]).toBe("bytes");
  expect(Number(whole.headers()["content-length"])).toBe(size);
  for (const [range, start, end] of [
    ["bytes=0-15", 0, 15],
    ["bytes=16-", 16, size - 1],
    ["bytes=-32", size - 32, size - 1],
    [`bytes=-${size + 10}`, 0, size - 1],
    [`bytes=${size - 8}-${size + 100}`, size - 8, size - 1],
    ["bytes=0-999999999999999999999999", 0, size - 1],
  ]) {
    const response = await request.get(url, { headers: { Range: range } });
    expect(response.status()).toBe(206);
    expect(response.headers()["content-range"]).toBe(
      `bytes ${start}-${end}/${size}`,
    );
    expect(Number(response.headers()["content-length"])).toBe(end - start + 1);
    expect(await response.body()).toEqual(body.subarray(start, end + 1));
  }
  for (const range of [
    `bytes=${size}-`,
    "bytes=-0",
    "bytes=999999999999999999999999-",
  ]) {
    const response = await request.get(url, { headers: { Range: range } });
    expect(response.status()).toBe(416);
    expect(response.headers()["content-range"]).toBe(`bytes */${size}`);
    expect((await response.body()).length).toBe(0);
  }
  for (const headers of [
    { Range: "bytes=10-2" },
    { Range: "bytes=-" },
    { Range: "bytes=nope" },
    { Range: "bytes=0-1,4-5" },
    { Range: "items=0-1" },
    { Range: "bytes=0-15", "If-Range": '"unknown-validator"' },
  ]) {
    const response = await request.get(url, { headers });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-range"]).toBeUndefined();
    expect(await response.body()).toEqual(body);
  }
  const head = await request.head(url, { headers: { Range: "bytes=0-1" } });
  expect(head.status()).toBe(200);
  expect(Number(head.headers()["content-length"])).toBe(size);
  expect((await head.body()).length).toBe(0);
  expect(
    (
      await request.get("/Skilnex-releases/%2e%2e%2fpackage.json", {
        headers: { Range: "bytes=0-5" },
      })
    ).status(),
  ).toBe(404);
  const captions = await request.get("assets/skilnex-native/demo.en.vtt", {
    headers: { Range: "bytes=0-5" },
  });
  expect(captions.status()).toBe(200);
  expect(captions.headers()["accept-ranges"]).toBeUndefined();
});

test("serve.mjs rejects invalid PORT values before binding", () => {
  for (const port of ["", "0", "-1", "65536", "1.5", "not-a-port"]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/serve.mjs", import.meta.url))],
      {
        env: { ...process.env, PORT: port },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PORT must be an integer from 1 to 65535");
  }
});

test("native provenance matches every published media file", async ({
  request,
}) => {
  const response = await request.get("evidence/skilnex-native.json");
  expect(response.ok()).toBe(true);
  const provenance = await response.json();
  expect(JSON.stringify(provenance)).not.toMatch(
    /Administrator|Users[\\/]|Downloads[\\/]|password|api[_-]?key/i,
  );
  expect(provenance.build).toContain("not an unmodified release binary");
  expect(provenance.verification.staleTargetNotOverwritten).toBe(true);
  expect(provenance.verification.sourceHashes).toEqual(
    provenance.verification.finalTargetHashes,
  );
  expect(provenance.verification.staleTargetHashes).toEqual(
    provenance.verification.backupHashes,
  );
  for (const [file, expected] of Object.entries(provenance.media)) {
    const asset = await request.get(`assets/skilnex-native/${file}`);
    expect(asset.ok()).toBe(true);
    const body = await asset.body();
    expect(body.length).toBe(expected.bytes);
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      expected.sha256,
    );
  }
});
