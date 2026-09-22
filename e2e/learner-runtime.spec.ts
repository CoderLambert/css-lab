import { expect, test, type Page } from "@playwright/test";

const FIRST_EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/center-box";
const SECOND_EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/space-between-items";
const THIRD_EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/align-items-end";

const SELECT_ALL = process.platform === "darwin" ? "Meta+A" : "Control+A";
const UNDO = process.platform === "darwin" ? "Meta+Z" : "Control+Z";

async function waitForExerciseHydration(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "检查答案" })).toBeEnabled();
}

async function replaceEditorCss(page: Page, source: string): Promise<void> {
  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press(SELECT_ALL);
  await page.keyboard.insertText(source);
}

async function readEditorCss(page: Page): Promise<string> {
  return page.locator(".cm-content").evaluate((element) =>
    (element as HTMLElement).innerText.replace(/\u00a0/g, " ").trim(),
  );
}

test("learner navigation follows the published exercise sequence", async ({
  page,
}) => {
  await page.goto("/learn");

  await expect(page).toHaveURL(new RegExp(`${FIRST_EXERCISE_URL}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "水平与垂直居中" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "上一题" })).toBeDisabled();

  await page.locator("a").filter({ hasText: "下一题" }).click();
  await expect(page).toHaveURL(new RegExp(`${SECOND_EXERCISE_URL}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "在主轴上拉开间距" }),
  ).toBeVisible();

  await page.locator("a").filter({ hasText: "下一题" }).click();
  await expect(page).toHaveURL(new RegExp(`${THIRD_EXERCISE_URL}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "沿交叉轴底部对齐" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "下一题" })).toBeDisabled();
});

test("editing updates preview, checking persists completion, and reload restores progress", async ({
  page,
}) => {
  await page.goto(FIRST_EXERCISE_URL);
  await waitForExerciseHydration(page);

  const source = `.container {
  display: flex;
  justify-content: center;
  align-items: center;
}`;

  await replaceEditorCss(page, source);

  const preview = page.frameLocator('iframe[title="CSS exercise preview"]');
  await expect
    .poll(() =>
      preview
        .locator(".container")
        .evaluate((element) => getComputedStyle(element).justifyContent),
    )
    .toBe("center");
  await expect
    .poll(() =>
      preview
        .locator(".container")
        .evaluate((element) => getComputedStyle(element).alignItems),
    )
    .toBe("center");

  await page.getByRole("button", { name: "检查答案" }).click();
  await expect(page.getByText("全部检查通过")).toBeVisible();
  await expect(page.getByText("33%")).toBeVisible();

  const storedProgress = await page.evaluate(
    ({ exerciseId, revision }) =>
      new Promise<unknown>((resolve, reject) => {
        const openRequest = indexedDB.open("css-lab");

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const transaction = db.transaction("exercise-progress", "readonly");
          const request = transaction
            .objectStore("exercise-progress")
            .get([exerciseId, revision]);

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result ?? null);
        };
      }),
    {
      exerciseId: "css.flexbox.alignment.center-box.001",
      revision: 1,
    },
  );

  expect(storedProgress).toMatchObject({
    status: "completed",
    code: source,
  });

  await page.reload();
  await waitForExerciseHydration(page);

  await expect.poll(() => readEditorCss(page)).toContain(
    "justify-content: center;",
  );
  await expect(page.getByText("33%")).toBeVisible();
});

test("format is one undoable editor action and color swatches stay editor-local", async ({
  page,
}) => {
  await page.goto(FIRST_EXERCISE_URL);
  await waitForExerciseHydration(page);

  const unformatted =
    ".container{display:flex;justify-content:center;align-items:center;color:#ff0000}";

  await replaceEditorCss(page, unformatted);
  await expect(page.locator(".cm-css-color-swatch")).toHaveCount(1);

  await page.getByRole("button", { name: "格式化 CSS" }).click();

  await expect.poll(() => readEditorCss(page)).toContain(
    "justify-content: center;",
  );
  await expect.poll(() => readEditorCss(page)).toContain("color: #ff0000;");

  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press(UNDO);

  await expect.poll(() => readEditorCss(page)).toBe(unformatted);
});
