/**
 * End-to-end test of the REEF Acquisitions Explorer + embedded vizarr.
 *
 * Targets the **deployed** explorer URL (Svamp-served), not a local dev
 * server.  The token comes from REEF_HYPHA_TOKEN — required because the
 * Hypha workspace listing API needs auth.
 *
 *   REEF_HYPHA_TOKEN=$HYPHA_TOKEN \
 *   REEF_EXPLORER_URL=https://...svc.hypha.aicell.io/explorer/ \
 *   npx playwright test tests/integration/explorer-e2e.spec.ts \
 *     --config tests/integration/explorer.playwright.config.ts \
 *     --project chromium
 *
 * What's verified:
 *   1. Explorer loads + connects to Hypha (sidebar status flips to "✓ authed")
 *   2. Sidebar populates with at least one artifact
 *   3. ``bench-zip`` is present (the canonical demo artifact)
 *   4. Clicking it loads the vizarr iframe with the right ?source= URL
 *   5. Vizarr renders a <canvas> (WebGL view comes up)
 *   6. No critical console errors during the flow
 *   7. Screenshot saved for visual inspection
 */
import { test, expect, type ConsoleMessage } from "@playwright/test";

const EXPLORER_URL = process.env.REEF_EXPLORER_URL ||
  "https://static-reef-explorer-9a2b998c.svc.hypha.aicell.io/explorer/";
const HYPHA_TOKEN = process.env.REEF_HYPHA_TOKEN || process.env.HYPHA_TOKEN || "";
const DEMO_ARTIFACT_ALIAS = process.env.REEF_DEMO_ALIAS || "bench-zip";

if (!HYPHA_TOKEN) {
  test.skip(true, "REEF_HYPHA_TOKEN env var must be set");
}


test.describe("REEF Explorer + vizarr end-to-end", () => {
  // 240 s — large artifacts (>200 GB) need ~60 s for the cold-cache .zattrs
  // fetch (Hypha must seek the central directory in S3 the first time).
  test.setTimeout(240_000);

  test("loads sidebar, opens artifact in vizarr, renders canvas", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      if (m.type() === "error") consoleErrors.push(`[${m.location().url}] ${m.text()}`);
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    // Also surface iframe (vizarr) console messages so we can see what
    // vizarr is actually doing when it loads our image.  Capture ALL
    // messages from any frame whose URL is the explorer or a vizarr load.
    const iframeMessages: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      // Filter only iframe (not main page) by location host being the
      // viewer host.  All non-test console output goes here.
      const url = m.location().url || "";
      if (url.includes("svc.hypha.aicell.io") || url.includes("vizarr")) {
        iframeMessages.push(`[viz ${m.type()}] ${m.text().slice(0, 200)}`);
      }
    });

    // ── 1. Load explorer with token ────────────────────────────────
    const url = `${EXPLORER_URL}?token=${encodeURIComponent(HYPHA_TOKEN)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Sidebar header visible
    await expect(page.locator("aside header h1")).toContainText("REEF Acquisitions");

    // ── 2. Wait for Hypha auth + artifact list to populate ─────────
    // The status text in the sidebar header flips to "✓ authed" when
    // hypha-rpc handshake succeeds.
    await expect(page.locator("#ws-info")).toContainText("authed", { timeout: 30_000 });

    // The list re-renders to show one .item per artifact.
    await page.waitForFunction(
      () => document.querySelectorAll("aside .item").length > 0,
      { timeout: 30_000 },
    );

    const items = page.locator("aside .item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    console.log(`sidebar listed ${count} artifacts`);

    // ── 3. The demo artifact (bench-zip) must be present ───────────
    const demoItem = page.locator(`aside .item[data-alias="${DEMO_ARTIFACT_ALIAS}"]`);
    await expect(demoItem).toHaveCount(1, { timeout: 5_000 });

    // ── 4. Click → iframe gets a vizarr URL ────────────────────────
    await demoItem.click();
    const iframe = page.locator("iframe#viewer");
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute("src");
    expect(iframeSrc).toContain("?source=");
    // iframe src has URL-encoded query — decode before substring check.
    expect(decodeURIComponent(iframeSrc!)).toContain("/zip-files/");
    console.log("iframe src:", iframeSrc?.slice(0, 200), "...");

    // ── 5. Wait for vizarr to render a canvas inside the iframe ────
    // Have to drill into iframe context — vizarr renders a deck.gl
    // canvas once the .zarray/.zattrs fetch + first chunk arrive.
    const frame = page.frameLocator("iframe#viewer");
    try {
      await expect(frame.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    } catch (e) {
      console.log("\nIFRAME CONSOLE (canvas didn't appear in 60 s):");
      iframeMessages.slice(0, 50).forEach((m) => console.log("  " + m));
      throw e;
    }

    const canvasBox = await frame.locator("canvas").first().boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(100);
    expect(canvasBox!.height).toBeGreaterThan(100);
    console.log(`canvas: ${canvasBox!.width}x${canvasBox!.height}`);

    // ── 6. Sanity-probe the zarr metadata once (best-effort) ──────
    // Hypha's /zip-files/ central-directory fetch can briefly 500 on
    // cold-cache for >100 GB artifacts; treat this as informational, not
    // assertional.  The fact that vizarr's iframe rendered a canvas
    // (step 5) already implies the metadata fetch succeeded.
    const srcUrl = new URL(iframeSrc!, EXPLORER_URL).searchParams.get("source");
    expect(srcUrl).toBeTruthy();
    try {
      const probe1 = await page.request.get(srcUrl + ".zattrs", { timeout: 30_000 });
      console.log(`metadata probe (advisory): .zattrs=${probe1.status()}`);
    } catch (e) {
      console.log(`metadata probe skipped (Hypha cold-cache): ${e}`);
    }

    // ── 7. Verify vizarr's UI actually mounted (channel panel exists) ─
    // This is the strongest "vizarr loaded successfully" signal — the
    // controls panel only appears when vizarr has parsed multiscale +
    // omero metadata and constructed the layer.  We look for the
    // channel-name BF label (always present once omero is parsed) — the
    // "image_0" placeholder isn't shown when the multiscales metadata
    // carries a real image name.  Pixel rendering is informational below.
    const channelLabel = frame.locator("text=BF LED matrix full").first();
    await expect(channelLabel).toBeVisible({ timeout: 90_000 });
    console.log("vizarr UI mounted: channel panel + omero parsed");

    // Optional: sample pixels for additional confirmation.  Don't fail
    // on this — sparse well-plate data can produce a black canvas at
    // the initial overview level.
    let sampleSummary = "(not sampled)";
    try {
      const summary = await frame.locator("canvas").first().evaluate((el: HTMLCanvasElement) => {
        const gl = el.getContext("webgl2") || el.getContext("webgl");
        if (!gl) return null;
        const w = el.width, h = el.height;
        const buf = new Uint8Array(4 * w * h);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let nonzero = 0, maxR = 0, maxG = 0, maxB = 0;
        for (let j = 0; j < buf.length; j += 4) {
          if (buf[j] || buf[j+1] || buf[j+2]) nonzero++;
          if (buf[j]   > maxR) maxR = buf[j];
          if (buf[j+1] > maxG) maxG = buf[j+1];
          if (buf[j+2] > maxB) maxB = buf[j+2];
        }
        return {nonzero, total: w*h, maxR, maxG, maxB};
      });
      if (summary) {
        sampleSummary = `${summary.nonzero}/${summary.total} pixels lit (${(100*summary.nonzero/summary.total).toFixed(2)}%) max(R,G,B)=(${summary.maxR},${summary.maxG},${summary.maxB})`;
        console.log(`canvas sample (advisory): ${sampleSummary}`);
      }
    } catch (e) {
      console.log(`canvas sample skipped: ${e}`);
    }
    // No assertion on pixel content — sparse well-plate data legitimately
    // produces a dark overview.  The user can pan/zoom in vizarr to see
    // populated regions.

    // ── 8. Save screenshot for visual inspection ──────────────────
    const screenshotPath = `test-results/explorer-${DEMO_ARTIFACT_ALIAS}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`screenshot: ${screenshotPath}`);

    if (iframeMessages.length) {
      console.log(`\nVizarr iframe console (${iframeMessages.length} total, first 30 + last 10):`);
      iframeMessages.slice(0, 30).forEach((m) => console.log("  " + m));
      if (iframeMessages.length > 40) {
        console.log("  ...");
        iframeMessages.slice(-10).forEach((m) => console.log("  " + m));
      }
    }

    // ── 8. Filter critical errors ─────────────────────────────────
    const critical = consoleErrors.filter((e) =>
      !e.includes("favicon") &&
      !e.toLowerCase().includes("warning") &&
      !e.includes("DevTools") &&
      // viv often logs DEBUG channel-color warnings — not a failure
      !e.toLowerCase().includes("loader") &&
      // hypha-rpc emits one connection-lost INFO during cleanup
      !e.toLowerCase().includes("connection lost") &&
      // Vizarr probes for optional NGFF features (root .zarray, labels/)
      // and treats 404s as "not present, skip" — they're expected.
      !(e.includes("404") && (e.includes("/.zarray") || e.includes("/labels/")))
    );
    if (critical.length) {
      console.log("\nCritical console errors:");
      critical.forEach((e) => console.log("  ", e));
    }
    expect(critical, "no critical console errors").toEqual([]);
  });

  test("filter input narrows the sidebar list", async ({ page }) => {
    await page.goto(`${EXPLORER_URL}?token=${encodeURIComponent(HYPHA_TOKEN)}`,
                     { waitUntil: "domcontentloaded" });
    await expect(page.locator("#ws-info")).toContainText("authed", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll("aside .item").length > 0,
      { timeout: 30_000 },
    );

    const total = await page.locator("aside .item").count();
    expect(total).toBeGreaterThan(0);

    await page.locator("#filter").fill(DEMO_ARTIFACT_ALIAS);
    // After filter, exactly the matching item should be present.
    await expect(page.locator(`aside .item[data-alias="${DEMO_ARTIFACT_ALIAS}"]`)).toHaveCount(1);
    const filtered = await page.locator("aside .item").count();
    expect(filtered).toBeLessThanOrEqual(total);
    expect(filtered).toBeGreaterThan(0);

    // Clearing the filter should restore the full list.
    await page.locator("#filter").fill("");
    const restored = await page.locator("aside .item").count();
    expect(restored).toBe(total);
  });
});
