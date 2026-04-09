import puppeteer, { type Browser, type Page } from "puppeteer";
import { type Scenario, type ScenarioStep } from "./scenarios";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const VIEWPORT = { width: 1280, height: 720 };
const FRAME_DIR = path.join(process.cwd(), "tmp", "video-frames");
const OUTPUT_DIR = path.join(process.cwd(), "public", "uploads", "videos");

interface RecordingResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  frameCount?: number;
}

export async function recordScenario(
  scenario: Scenario,
  credentials: { email: string; password: string }
): Promise<RecordingResult> {
  const sessionId = `video-${Date.now()}`;
  const framesPath = path.join(FRAME_DIR, sessionId);
  let browser: Browser | null = null;

  try {
    await fs.mkdir(framesPath, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      ],
    });

    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // Login
    await page.goto("https://poby.ai/login", { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", credentials.email, { delay: 50 });
    await page.type("input[type='password']", credentials.password, { delay: 50 });
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await sleep(2000);

    // Execute scenario steps and take screenshots
    let frameIndex = 0;

    // Hook frame (first 2 seconds = ~60 frames at 30fps)
    const hookFrame = await captureFrameWithOverlay(page, scenario.hookText, "hook", framesPath, frameIndex);
    frameIndex = hookFrame;

    for (const step of scenario.steps) {
      frameIndex = await executeStep(page, step, framesPath, frameIndex);
    }

    // CTA frame (last 3 seconds)
    frameIndex = await captureCtaFrames(page, scenario.ctaText, framesPath, frameIndex);

    // Combine frames into video using ffmpeg
    const outputFile = `demo-${scenario.id}-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    await execAsync(
      `ffmpeg -y -framerate 2 -i "${framesPath}/frame-%04d.png" ` +
      `-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white" ` +
      `-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart ` +
      `"${outputPath}"`
    );

    // Cleanup frames
    await fs.rm(framesPath, { recursive: true, force: true }).catch(() => {});

    const videoUrl = `/uploads/videos/${outputFile}`;
    return { success: true, videoUrl, frameCount: frameIndex };
  } catch (error: any) {
    console.error("Video recording error:", error);
    await fs.rm(framesPath, { recursive: true, force: true }).catch(() => {});
    return { success: false, error: error.message || "Video kaydı başarısız" };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function executeStep(
  page: Page,
  step: ScenarioStep,
  framesPath: string,
  startIndex: number
): Promise<number> {
  let idx = startIndex;

  try {
    switch (step.action) {
      case "navigate":
        await page.goto(step.url!, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
        await sleep(step.duration || 1500);
        idx = await captureWithCaption(page, step.caption, framesPath, idx);
        break;

      case "click":
        if (step.selector) {
          try {
            await page.waitForSelector(step.selector.split(",")[0].trim(), { timeout: 5000 });
            await page.click(step.selector.split(",")[0].trim());
          } catch {
            // Try alternative selectors
            const selectors = step.selector.split(",").map(s => s.trim());
            for (const sel of selectors) {
              try {
                await page.click(sel);
                break;
              } catch { continue; }
            }
          }
          await sleep(1000);
        }
        if (step.caption) idx = await captureWithCaption(page, step.caption, framesPath, idx);
        break;

      case "type":
        if (step.selector && step.value) {
          try {
            await page.waitForSelector(step.selector.split(",")[0].trim(), { timeout: 5000 });
            await page.type(step.selector.split(",")[0].trim(), step.value, { delay: 80 });
          } catch { /* Skip if element not found */ }
          await sleep(500);
        }
        if (step.caption) idx = await captureWithCaption(page, step.caption, framesPath, idx);
        break;

      case "wait":
        await sleep(step.duration || 1000);
        break;

      case "scroll":
        await page.evaluate((px) => window.scrollBy(0, parseInt(px)), step.value || "300");
        await sleep(800);
        if (step.caption) idx = await captureWithCaption(page, step.caption, framesPath, idx);
        break;

      case "screenshot":
        if (step.caption) idx = await captureWithCaption(page, step.caption, framesPath, idx);
        else {
          await page.screenshot({ path: path.join(framesPath, `frame-${String(idx).padStart(4, "0")}.png`), type: "png" });
          idx++;
        }
        break;
    }
  } catch (err) {
    console.error(`Step error (${step.action}):`, err);
    // Continue to next step
  }

  return idx;
}

async function captureWithCaption(
  page: Page,
  caption: string,
  framesPath: string,
  startIndex: number
): Promise<number> {
  if (!caption) {
    await page.screenshot({ path: path.join(framesPath, `frame-${String(startIndex).padStart(4, "0")}.png`), type: "png" });
    return startIndex + 1;
  }

  // Inject caption overlay
  await page.evaluate((text) => {
    let overlay = document.getElementById("poby-video-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "poby-video-overlay";
      overlay.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:16px 24px;background:linear-gradient(transparent,rgba(0,0,0,0.85));color:white;font-family:system-ui;pointer-events:none;";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="font-size:22px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:center;">${text}</div>`;
  }, caption);

  await sleep(300);
  await page.screenshot({ path: path.join(framesPath, `frame-${String(startIndex).padStart(4, "0")}.png`), type: "png" });

  // Keep caption visible for next frame too
  await page.screenshot({ path: path.join(framesPath, `frame-${String(startIndex + 1).padStart(4, "0")}.png`), type: "png" });

  // Remove overlay
  await page.evaluate(() => {
    document.getElementById("poby-video-overlay")?.remove();
  });

  return startIndex + 2;
}

async function captureFrameWithOverlay(
  page: Page,
  text: string,
  type: "hook" | "cta",
  framesPath: string,
  startIndex: number
): Promise<number> {
  const bgColor = type === "hook" ? "#6366F1" : "#1A1A2E";

  await page.evaluate((t, bg) => {
    const overlay = document.createElement("div");
    overlay.id = "poby-full-overlay";
    overlay.style.cssText = `position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};color:white;font-family:system-ui;`;
    overlay.innerHTML = `
      <div style="font-size:42px;font-weight:800;text-align:center;max-width:80%;line-height:1.3;margin-bottom:20px;">${t}</div>
      <div style="font-size:18px;opacity:0.7;">poby.ai</div>
    `;
    document.body.appendChild(overlay);
  }, text, bgColor);

  await sleep(200);

  // Capture 4 frames (2 seconds at 2fps)
  for (let i = 0; i < 4; i++) {
    await page.screenshot({
      path: path.join(framesPath, `frame-${String(startIndex + i).padStart(4, "0")}.png`),
      type: "png",
    });
  }

  await page.evaluate(() => {
    document.getElementById("poby-full-overlay")?.remove();
  });

  return startIndex + 4;
}

async function captureCtaFrames(
  page: Page,
  ctaText: string,
  framesPath: string,
  startIndex: number
): Promise<number> {
  await page.evaluate((text) => {
    const overlay = document.createElement("div");
    overlay.id = "poby-full-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366F1,#818CF8);color:white;font-family:system-ui;";
    overlay.innerHTML = `
      <div style="font-size:36px;font-weight:800;text-align:center;max-width:80%;line-height:1.4;margin-bottom:24px;">${text}</div>
      <div style="background:white;color:#6366F1;padding:14px 40px;border-radius:12px;font-size:20px;font-weight:700;">Hemen Başla</div>
    `;
    document.body.appendChild(overlay);
  }, ctaText);

  await sleep(200);

  // 6 frames = 3 seconds at 2fps
  for (let i = 0; i < 6; i++) {
    await page.screenshot({
      path: path.join(framesPath, `frame-${String(startIndex + i).padStart(4, "0")}.png`),
      type: "png",
    });
  }

  return startIndex + 6;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
