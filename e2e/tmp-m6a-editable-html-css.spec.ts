import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/center-box";
const EXERCISE_PATH = join(
  process.cwd(),
  "content",
  "courses",
  "css-foundations",
  "modules",
  "flexbox",
  "lessons",
  "flexbox-alignment",
  "exercises",
  "center-box",
  "exercise.json",
);
const SELECT_ALL =
  process.platform === "darwin" ? "Meta+A" : "Control+A";

interface MutableExerciseRecord {
  workspace: {
    files: Array<{
      path: string;
      language: string;
      editable: boolean;
    }>;
  };
  checks: Array<Record<string, unknown>>;
}

async function installRuntimeReadyProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probeWindow = window as typeof window & {
      __m6aReadyGenerations?: string[];
    };

    probeWindow.__m6aReadyGenerations = [];
    window.addEventListener("message", (event) => {
      const message = event.data as {
        source?: unknown;
        type?: unknown;
        generationId?: unknown;
      };

      if (
        message?.source === "lab-runtime" &&
        message.type === "runtime:ready" &&
        typeof message.generationId === "string"
      ) {
        probeWindow.__m6aReadyGenerations?.push(
          message.generationId,
        );
      }
    });
  });
}

async function readReadyGenerations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __m6aReadyGenerations?: string[];
    };

    return [...(probeWindow.__m6aReadyGenerations ?? [])];
  });
}

async function replaceActiveEditor(
  page: Page,
  source: string,
): Promise<void> {
  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press(SELECT_ALL);
  await page.keyboard.insertText(source);
}

async function readActiveEditor(page: Page): Promise<string> {
  return page
    .locator(".cm-content")
    .evaluate((element) =>
      (element as HTMLElement).innerText
        .replace(/\u00a0/g, " ")
        .trim(),
    );
}

test("temporary M6A editable HTML/CSS integration verification", async ({
  page,
}) => {
  const originalRecord = await readFile(EXERCISE_PATH, "utf8");
  const record = JSON.parse(originalRecord) as MutableExerciseRecord;
  const htmlFile = record.workspace.files.find(
    (file) => file.path === "index.html",
  );

  if (!htmlFile) {
    throw new Error("center-box fixture is missing index.html");
  }

  htmlFile.editable = true;
  record.checks.push({
    id: "temporary-manual-html-probe",
    type: "exists",
    selector: ".manual-probe[data-check='captured']",
    message: "temporary integration probe",
  });

  await writeFile(
    EXERCISE_PATH,
    JSON.stringify(record, null, 2) + "\n",
    "utf8",
  );

  try {
    await installRuntimeReadyProbe(page);
    await page.goto(EXERCISE_URL);
    await expect(
      page.getByRole("button", { name: "检查答案" }),
    ).toBeEnabled();

    const htmlTab = page.getByRole("tab", {
      name: /^index\.html/,
    });
    const cssTab = page.getByRole("tab", {
      name: /^style\.css/,
    });

    await expect(htmlTab).toBeVisible();
    await expect(cssTab).toBeVisible();
    await expect(htmlTab).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await expect
      .poll(async () => (await readReadyGenerations(page)).length)
      .toBeGreaterThan(0);

    const initialGenerations = await readReadyGenerations(page);
    const initialGeneration = initialGenerations.at(-1);
    expect(initialGeneration).toBeTruthy();

    const firstHtml = `<div class="container" data-manual="draft">
  <div class="box">A</div>
  <span class="manual-probe" data-check="draft">draft</span>
</div>`;

    await replaceActiveEditor(page, firstHtml);

    await expect
      .poll(async () => (await readReadyGenerations(page)).at(-1))
      .not.toBe(initialGeneration);

    const htmlGeneration = (
      await readReadyGenerations(page)
    ).at(-1);
    expect(htmlGeneration).toBeTruthy();

    await cssTab.click();

    const firstCss = `.container {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}`;
    await replaceActiveEditor(page, firstCss);

    const preview = page.frameLocator(
      'iframe[title="Browser exercise preview"]',
    );
    await expect
      .poll(() =>
        preview
          .locator(".container")
          .evaluate(
            (element) =>
              getComputedStyle(element).alignItems,
          ),
      )
      .toBe("flex-start");
    expect((await readReadyGenerations(page)).at(-1)).toBe(
      htmlGeneration,
    );

    await htmlTab.click();
    await expect
      .poll(() => readActiveEditor(page))
      .toContain('data-check="draft"');

    await cssTab.click();
    await expect
      .poll(() => readActiveEditor(page))
      .toContain("align-items: flex-start");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect
      .poll(() => readActiveEditor(page))
      .not.toContain("align-items: flex-start");

    await htmlTab.click();
    await expect
      .poll(() => readActiveEditor(page))
      .not.toContain("manual-probe");
    await expect
      .poll(() => readActiveEditor(page))
      .toContain('<div class="container">');

    await expect
      .poll(async () => (await readReadyGenerations(page)).at(-1))
      .not.toBe(htmlGeneration);
    const resetGeneration = (
      await readReadyGenerations(page)
    ).at(-1);

    const capturedHtml = `<div class="container">
  <div class="box">A</div>
  <span class="manual-probe" data-check="captured">captured</span>
</div>`;
    await replaceActiveEditor(page, capturedHtml);
    await cssTab.click();

    const capturedCss = `.container {
  display: flex;
  justify-content: center;
  align-items: center;
}`;
    await replaceActiveEditor(page, capturedCss);

    await page
      .getByRole("button", { name: "检查答案" })
      .click();

    await expect(
      page.getByText("全部检查通过"),
    ).toBeVisible();

    await expect
      .poll(async () => (await readReadyGenerations(page)).at(-1))
      .not.toBe(resetGeneration);

    await expect
      .poll(() =>
        preview
          .locator(".container")
          .evaluate(
            (element) =>
              getComputedStyle(element).alignItems,
          ),
      )
      .toBe("center");

    const finalGenerations = await readReadyGenerations(page);
    expect(finalGenerations.at(-1)).not.toBe(resetGeneration);
  } finally {
    await writeFile(EXERCISE_PATH, originalRecord, "utf8");
  }
});
