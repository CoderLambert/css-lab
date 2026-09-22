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
  return page
    .locator(".cm-content")
    .evaluate((element) =>
      (element as HTMLElement).innerText.replace(/\u00a0/g, " ").trim(),
    );
}

test("learner navigation follows the published exercise sequence", async ({
  page,
}) => {
  await page.goto("/learn");

  await expect(page).toHaveURL(new RegExp(`${FIRST_EXERCISE_URL}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "让元素稳定地对齐" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "水平与垂直居中" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "先判断轴，再选择属性" }),
  ).toBeVisible();
  await expect(
    page.locator("code").filter({ hasText: "justify-content" }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "align-items", exact: true }).click();
  await expect(page.getByRole("status").getByText("预测正确")).toBeVisible();

  const previewFrame = page.locator('iframe[title="CSS exercise preview"]');
  await expect(previewFrame).toBeVisible();
  await page.getByRole("button", { name: "390", exact: true }).click();
  await expect(page.getByText("390 × 300", { exact: true })).toBeVisible();
  await expect(previewFrame).toBeVisible();

  await page.getByRole("button", { name: "768", exact: true }).click();
  await expect(page.getByText("768 × 480", { exact: true })).toBeVisible();
  await expect(previewFrame).toBeVisible();

  await page.getByRole("button", { name: "1280", exact: true }).click();
  await expect(page.getByText("1280 × 720", { exact: true })).toBeVisible();
  await expect(previewFrame).toBeVisible();

  await page.getByRole("link", { name: "在主轴上拉开间距" }).click();
  await expect(page).toHaveURL(new RegExp(`${SECOND_EXERCISE_URL}$`));

  await page.goto(FIRST_EXERCISE_URL);
  await expect(page).toHaveURL(new RegExp(`${FIRST_EXERCISE_URL}$`));
  await expect(page.getByRole("button", { name: "上一题" })).toBeDisabled();

  await page.locator("a").filter({ hasText: "下一题" }).click();
  await expect(page).toHaveURL(new RegExp(`${SECOND_EXERCISE_URL}$`));
  await expect(
    page.getByRole("heading", { level: 2, name: "在主轴上拉开间距" }),
  ).toBeVisible();

  await page.locator("a").filter({ hasText: "下一题" }).click();
  await expect(page).toHaveURL(new RegExp(`${THIRD_EXERCISE_URL}$`));
  await expect(
    page.getByRole("heading", { level: 2, name: "沿交叉轴底部对齐" }),
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
    files: {
      "style.css": source,
    },
  });

  await page.reload();
  await waitForExerciseHydration(page);

  await expect
    .poll(() => readEditorCss(page))
    .toContain("justify-content: center;");
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

  await expect
    .poll(() => readEditorCss(page))
    .toContain("justify-content: center;");
  await expect.poll(() => readEditorCss(page)).toContain("color: #ff0000;");

  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press(UNDO);

  await expect.poll(() => readEditorCss(page)).toBe(unformatted);
});

test("failed checks explain actual values, hints reveal progressively, and equivalent end alignment passes", async ({
  page,
}) => {
  await page.goto(THIRD_EXERCISE_URL);
  await waitForExerciseHydration(page);

  await replaceEditorCss(
    page,
    `.container {
  display: flex;
  align-items: stretch;
}`,
  );

  await page.getByRole("button", { name: "检查答案" }).click();

  const checkResults = page.getByRole("region", { name: "检查结果" });

  await expect(
    checkResults.getByText("当前实现还未满足全部条件"),
  ).toBeVisible();
  await expect(checkResults.getByText("当前值")).toBeVisible();
  await expect(
    checkResults.getByText("stretch", { exact: true }),
  ).toBeVisible();
  await expect(
    checkResults.getByText("flex-end / end", { exact: true }),
  ).toBeVisible();
  await expect(
    checkResults.getByText(
      "检测器已正常执行；这里是当前实现与验收条件不一致，不是检测器运行失败。",
    ),
  ).toBeVisible();

  const firstHint =
    "先确认 .container 已经是 flex container；这道题不需要改变三个项目自身的高度。";
  const secondHint =
    "默认 row 方向下，交叉轴是垂直方向，因此“交叉轴末端”就是容器的底部。";
  const thirdHint =
    "用 align-items 控制整组项目的交叉轴对齐。经典 Flexbox 写法是 flex-end；现代 Box Alignment 的 end 在本题中也视为正确。";

  await expect(page.getByText(firstHint)).toHaveCount(0);
  await page.getByRole("button", { name: "提示" }).click();
  await expect(page.getByText(firstHint)).toBeVisible();
  await expect(page.getByText(secondHint)).toHaveCount(0);
  await expect(page.getByText(thirdHint)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "提示 1/3" })).toBeVisible();

  await page.getByRole("button", { name: "提示 1/3" }).click();
  await expect(page.getByText(secondHint)).toBeVisible();
  await expect(page.getByText(thirdHint)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "提示 2/3" })).toBeVisible();

  await replaceEditorCss(
    page,
    `.container {
  display: flex;
  align-items: end;
}`,
  );

  await page.getByRole("button", { name: "检查答案" }).click();
  await expect(page.getByText("全部检查通过")).toBeVisible();
});
