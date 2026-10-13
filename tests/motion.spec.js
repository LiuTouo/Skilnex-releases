import { test, expect } from "@playwright/test";

const scenes = ["find", "organize", "sync"];
const engineering =
  /debug|native backend|SHA-256|runtime certification|runtime 認證|test script|測試腳本|檔案雜湊/i;

for (const path of ["./", "en/"]) {
  test.describe(`showcase ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("story follows forward, reverse, and fast scrolling", async ({
      page,
    }, testInfo) => {
      await expect(page.locator("html")).toHaveClass(/story-enabled/);
      for (const name of [...scenes, "organize", "find"]) {
        await page.locator(`[data-scene="${name}"]`).evaluate((element) => {
          element.scrollIntoView({ block: "center", behavior: "instant" });
        });
        await expect(page.locator(".feature-story")).toHaveAttribute(
          "data-active-scene",
          name,
        );
        const panel = page.locator(`[data-panel="${name}"]`);
        await expect
          .poll(() => panel.evaluate((el) => getComputedStyle(el).opacity))
          .toBe("1");
        await expect(page.locator(".scene-panel.is-active")).toHaveCount(1);
        await panel.screenshot({
          path: testInfo.outputPath(`scene-${name}.png`),
          animations: "disabled",
        });
      }
      await page.evaluate(() => {
        for (const name of ["sync", "find", "organize", "sync"]) {
          document
            .querySelector(`[data-scene="${name}"]`)
            .scrollIntoView({ block: "center", behavior: "instant" });
        }
      });
      await expect(page.locator(".feature-story")).toHaveAttribute(
        "data-active-scene",
        "sync",
      );
    });

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
    ]) {
      test(`wide story advances and reverses at ${viewport.width}×${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await expect(page.locator("html")).toHaveClass(/story-enabled/);
        for (const name of [...scenes, "find"]) {
          await page
            .locator(`[data-scene="${name}"]`)
            .evaluate((el) =>
              el.scrollIntoView({ block: "center", behavior: "instant" }),
            );
          await expect(page.locator(".feature-story")).toHaveAttribute(
            "data-active-scene",
            name,
          );
          await expect
            .poll(() =>
              page
                .locator(`[data-panel="${name}"]`)
                .evaluate((el) => getComputedStyle(el).opacity),
            )
            .toBe("1");
        }
      });
    }

    test("deep links and reloads land on visible, unobscured content", async ({
      page,
    }) => {
      for (const id of ["features", "native-demo", "demo", "download"]) {
        await page.goto(`${path}#${id}`);
        const anchorOffset = () =>
          page
            .locator(`#${id}`)
            .evaluate((el) =>
              Math.abs(
                el.getBoundingClientRect().top -
                  parseFloat(
                    getComputedStyle(document.documentElement).scrollPaddingTop,
                  ),
              ),
            );
        await expect.poll(anchorOffset).toBeLessThan(2);
        await page.reload();
        await expect.poll(anchorOffset).toBeLessThan(2);
        const heading = page.locator(`#${id} h2`).first();
        await expect(heading).toBeInViewport();
        await expect
          .poll(() =>
            heading.evaluate((el) => {
              const region = el.closest(".reveal");
              return region ? getComputedStyle(region).opacity : "1";
            }),
          )
          .toBe("1");
        const bounds = await heading.boundingBox();
        const header = await page.locator(".site-header").boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height);
      }
    });

    test("reduced motion switches live to static scenes and back", async ({
      page,
    }, testInfo) => {
      await expect(page.locator("html")).toHaveClass(/story-enabled/);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator("html")).not.toHaveClass(
        /story-enabled|motion-ready/,
      );
      for (const name of scenes) {
        const panel = page.locator(`[data-panel="${name}"]`);
        await expect(panel).toBeVisible();
        expect(
          await panel.evaluate((el) => getComputedStyle(el).transform),
        ).toBe("none");
      }
      expect(
        await page
          .locator("html")
          .evaluate((el) => getComputedStyle(el).scrollBehavior),
      ).toBe("auto");
      expect(
        await page.evaluate(
          () =>
            document.getAnimations().filter((a) => a.playState === "running")
              .length,
        ),
      ).toBe(0);
      await page.screenshot({
        path: testInfo.outputPath("reduced-motion.png"),
      });
      await page.locator("#preview-button").click();
      await page.locator("#apply-button").click();
      await expect(page.locator("#demo-result")).toBeVisible();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(page.locator("html")).toHaveClass(/story-enabled/);
      await page
        .locator('[data-scene="organize"]')
        .evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      await expect(page.locator(".feature-story")).toHaveAttribute(
        "data-active-scene",
        "organize",
      );
    });

    for (const mode of ["missing", "throws"]) {
      test(`observer ${mode}: readable fallback and a working demo`, async ({
        page,
      }) => {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript((failure) => {
          if (failure === "missing") delete window.IntersectionObserver;
          else
            window.IntersectionObserver = class {
              constructor() {
                throw new Error("Unavailable motion observer");
              }
            };
        }, mode);
        await page.reload();
        await expect(page.locator("html")).not.toHaveClass(
          /story-enabled|motion-ready/,
        );
        for (const panel of await page.locator(".scene-panel").all()) {
          await expect(panel).toBeVisible();
          expect(
            await panel.evaluate((el) => getComputedStyle(el).opacity),
          ).toBe("1");
        }
        await page.locator("#preview-button").click();
        await expect(page.locator("#preview-title")).toBeFocused();
        await page.locator("#apply-button").click();
        await expect(page.locator("#demo-result")).toBeVisible();
        expect(errors).toEqual([]);
      });
    }

    for (const viewport of [
      { width: 360, height: 740 },
      { width: 768, height: 1000 },
      { width: 1440, height: 600 },
    ]) {
      test(`static story fits ${viewport.width}×${viewport.height}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await expect(page.locator("html")).not.toHaveClass(/story-enabled/);
        for (const panel of await page.locator(".scene-panel").all())
          await expect(panel).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("hero.png"),
          animations: "disabled",
        });
        for (const [trigger, destination] of [
          ["#preview-button", "#preview-title"],
          ["#apply-button", "#result-title"],
          ["#reset-demo", 'input[name="target"][value="codex"]'],
        ]) {
          await page.locator(trigger).click();
          await expect(page.locator(destination)).toBeFocused();
          const focused = await page.locator(destination).boundingBox();
          const header = await page.locator(".site-header").boundingBox();
          expect(focused.y).toBeGreaterThanOrEqual(header.y + header.height);
          expect(focused.y + focused.height).toBeLessThanOrEqual(
            viewport.height,
          );
        }
      });
    }

    test("200% CSS zoom keeps controls and content available", async ({
      page,
    }, testInfo) => {
      // CSS zoom doubles rendered layout size without relying on browser-chrome shortcuts.
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.locator("#preview-button").click();
      await page.locator("#apply-button").click();
      await expect(page.locator("#result-title")).toBeFocused();
      await expect(page.locator("#demo-result")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath("zoom.png"),
        animations: "disabled",
      });
    });

    test("copy and captions are user-facing without dropping sync warnings", async ({
      page,
      request,
    }) => {
      expect(await page.locator("main").textContent()).not.toMatch(engineering);
      await expect(page.locator(".faq-list")).toContainText(
        path === "./" ? "目標獨有的檔案" : "files found only in the target",
      );
      await expect(page.locator(".demo-intro")).toContainText(
        path === "./" ? "虛構資料" : "Fictional data",
      );
      for (const language of ["zh-TW", "en"]) {
        const caption = await request.get(
          `assets/skilnex-native/demo.${language}.vtt`,
        );
        const text = await caption.text();
        expect(text).not.toMatch(engineering);
        expect(text.match(/-->/g)).toHaveLength(10);
      }
    });

    test("keyboard focus is visible immediately, including during entrances", async ({
      page,
    }) => {
      for (const selector of [".hero .button.primary", ".feature .text-link"]) {
        const link = page.locator(selector);
        await link.focus();
        await expect(link).toBeFocused();
        const appearance = await link.evaluate((el) => {
          const parent = el.closest(".reveal") || el.closest(".hero-intro");
          return {
            opacity: getComputedStyle(parent).opacity,
            animation: getComputedStyle(parent).animationName,
            outline: parseFloat(getComputedStyle(el).outlineWidth),
          };
        });
        expect(appearance).toEqual({
          opacity: "1",
          animation: "none",
          outline: 3,
        });
        const bounds = await link.boundingBox();
        const header = await page.locator(".site-header").boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height);
      }
    });

    test("brand text and controls meet AA contrast", async ({ page }) => {
      const failures = await page
        .locator(
          ".eyebrow, .hero-description, .hero-note, .button.primary, .pill, .target-state, .fine-print, .requirements, .note-label, .note-footer, .feature-number, .scene-caption",
        )
        .evaluateAll((elements) => {
          const luminance = (color) => {
            const values = color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number)
              .map((n) => {
                const v = n / 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              });
            return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
          };
          return elements.flatMap((element) => {
            let background = element;
            while (
              background.parentElement &&
              getComputedStyle(background).backgroundColor ===
                "rgba(0, 0, 0, 0)"
            )
              background = background.parentElement;
            const fg = luminance(getComputedStyle(element).color);
            const bg = luminance(getComputedStyle(background).backgroundColor);
            const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
            return ratio < 4.5
              ? [{ text: element.textContent.trim(), ratio }]
              : [];
          });
        });
      expect(failures).toEqual([]);
    });
  });
}

test("motion performance sample has stable layout and becomes idle", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveClass(/story-enabled/);
  await page.locator(".hero-visual img").evaluate((image) => image.decode());
  const metrics = await page.evaluate(async () => {
    let cls = 0;
    const longTasks = [];
    const layoutObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) cls += entry.value;
    });
    layoutObserver.observe({ type: "layout-shift", buffered: true });
    const taskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        longTasks.push(Math.round(entry.duration));
    });
    taskObserver.observe({ type: "longtask" });
    const story = document.querySelector(".feature-story");
    const startY = story.getBoundingClientRect().top + scrollY - 150;
    const distance = story.offsetHeight;
    const frames = [];
    await new Promise((resolve) => {
      let start;
      let previous;
      function sample(now) {
        start ??= now;
        if (previous !== undefined) frames.push(now - previous);
        previous = now;
        const elapsed = now - start;
        window.scrollTo({
          top: startY + distance * Math.min(elapsed / 2400, 1),
          behavior: "instant",
        });
        if (elapsed < 2400) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    layoutObserver.disconnect();
    taskObserver.disconnect();
    frames.sort((a, b) => a - b);
    const medianFrameMs = frames[Math.floor(frames.length / 2)];
    return {
      cls,
      longTasks,
      medianFrameMs,
      p95FrameMs: frames[Math.floor(frames.length * 0.95)],
      approximateFps: 1000 / medianFrameMs,
    };
  });
  await testInfo.attach("motion-metrics", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.cls).toBeLessThan(0.1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
    )
    .toBe(0);
});
