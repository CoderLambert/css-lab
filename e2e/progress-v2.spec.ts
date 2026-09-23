import { expect, test } from "@playwright/test";

import { reconcileDraft } from "../src/features/progress/lib/reconcile-draft";
import type { ExerciseWorkspace } from "../src/lib/workspace/types";

const workspace: ExerciseWorkspace = {
  definition: {
    files: [
      { path: "index.html", language: "html", editable: false },
      { path: "style.css", language: "css", editable: true },
      { path: "nested/theme.css", language: "css", editable: true },
    ],
  },
  starter: {
    files: {
      "index.html": "<main></main>",
      "style.css": "starter",
      "nested/theme.css": "theme starter",
    },
  },
};

test("reconcileDraft restores only current editable workspace paths", () => {
  expect(
    reconcileDraft(workspace, {
      "index.html": "attempted locked overwrite",
      "style.css": "saved",
      "unknown.css": "unknown",
    }),
  ).toEqual({
    files: {
      "style.css": "saved",
      "nested/theme.css": "theme starter",
    },
  });
});

test("real v1 records migrate to v2 while malformed records remain non-fatal", async ({
  page,
}) => {
  await page.goto("/studio");

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("css-lab");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("delete blocked"));
    });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("css-lab", 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore("exercise-progress", {
          keyPath: ["exerciseId", "revision"],
        });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(
          "exercise-progress",
          "readwrite",
        );
        const store = transaction.objectStore("exercise-progress");

        store.put({
          exerciseId: "css.flexbox.alignment.center-box.001",
          revision: 1,
          code: ".container { display: flex; }",
          status: "started",
          updatedAt: 101,
        });
        store.put({
          exerciseId: "css.flexbox.alignment.space-between-items.001",
          revision: 1,
          code: ".container { display: flex; justify-content: space-between; }",
          status: "completed",
          updatedAt: 202,
          completedAt: 150,
        });
        store.put({
          exerciseId: "malformed",
          revision: 1,
          code: 42,
          status: "started",
          updatedAt: 303,
        });

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });

  await page.goto(
    "/learn/css-foundations/flexbox/flexbox-alignment/center-box",
  );
  await expect(
    page.getByRole("button", { name: "检查答案" }),
  ).toBeEnabled();

  const records = await page.evaluate(
    () =>
      new Promise<{
        version: number;
        started: unknown;
        completed: unknown;
        malformed: unknown;
      }>((resolve, reject) => {
        const request = indexedDB.open("css-lab");

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(
            "exercise-progress",
            "readonly",
          );
          const store = transaction.objectStore("exercise-progress");
          const started = store.get([
            "css.flexbox.alignment.center-box.001",
            1,
          ]);
          const completed = store.get([
            "css.flexbox.alignment.space-between-items.001",
            1,
          ]);
          const malformed = store.get(["malformed", 1]);

          transaction.oncomplete = () => {
            resolve({
              version: db.version,
              started: started.result,
              completed: completed.result,
              malformed: malformed.result,
            });
            db.close();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );

  expect(records.version).toBe(2);
  expect(records.started).toMatchObject({
    status: "started",
    files: {
      "style.css": ".container { display: flex; }",
    },
    updatedAt: 101,
  });
  expect(records.completed).toMatchObject({
    status: "completed",
    files: {
      "style.css":
        ".container { display: flex; justify-content: space-between; }",
    },
    completedAt: 150,
    updatedAt: 202,
  });
  expect(records.malformed).toMatchObject({
    exerciseId: "malformed",
    code: 42,
  });
});


const FIRST_EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/center-box";
const SECOND_EXERCISE_URL =
  "/learn/css-foundations/flexbox/flexbox-alignment/space-between-items";
const FIRST_EXERCISE_ID = "css.flexbox.alignment.center-box.001";
const SECOND_EXERCISE_ID =
  "css.flexbox.alignment.space-between-items.001";
const SELECT_ALL =
  process.platform === "darwin" ? "Meta+A" : "Control+A";

async function replaceEditorCss(
  page: import("@playwright/test").Page,
  source: string,
): Promise<void> {
  const editor = page.locator(".cm-content");
  await editor.click();
  await editor.press(SELECT_ALL);
  await page.keyboard.insertText(source);
}

async function readProgressRecord(
  page: import("@playwright/test").Page,
  exerciseId: string,
): Promise<unknown> {
  return page.evaluate(
    ({ exerciseId }) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open("css-lab");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(
            "exercise-progress",
            "readonly",
          );
          const getRequest = transaction
            .objectStore("exercise-progress")
            .get([exerciseId, 1]);

          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => {
            resolve(getRequest.result ?? null);
            db.close();
          };
        };
      }),
    { exerciseId },
  );
}

test("fresh database opens directly at v2 and persists the v2 draft shape", async ({
  page,
}) => {
  await page.goto("/studio");

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("css-lab");

        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(new Error("delete blocked"));
        request.onsuccess = () => resolve();
      }),
  );

  await page.goto(FIRST_EXERCISE_URL);
  await expect(
    page.getByRole("button", { name: "检查答案" }),
  ).toBeEnabled();

  const edited =
    ".container { display: flex; gap: 29px; }";
  await replaceEditorCss(page, edited);

  await expect
    .poll(() =>
      readProgressRecord(page, FIRST_EXERCISE_ID),
    )
    .toMatchObject({
      status: "started",
      files: {
        "style.css": edited,
      },
    });

  const databaseState = await page.evaluate(
    ({ exerciseId }) =>
      new Promise<{
        version: number;
        stores: string[];
        record: Record<string, unknown> | null;
      }>((resolve, reject) => {
        const request = indexedDB.open("css-lab");

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(
            "exercise-progress",
            "readonly",
          );
          const getRequest = transaction
            .objectStore("exercise-progress")
            .get([exerciseId, 1]);

          getRequest.onerror = () =>
            reject(getRequest.error);
          getRequest.onsuccess = () => {
            resolve({
              version: db.version,
              stores: Array.from(db.objectStoreNames),
              record:
                (getRequest.result as
                  | Record<string, unknown>
                  | undefined) ?? null,
            });
            db.close();
          };
        };
      }),
    { exerciseId: FIRST_EXERCISE_ID },
  );

  expect(databaseState.version).toBe(2);
  expect(databaseState.stores).toContain(
    "exercise-progress",
  );
  expect(databaseState.record).toMatchObject({
    exerciseId: FIRST_EXERCISE_ID,
    revision: 1,
    status: "started",
    files: {
      "style.css": edited,
    },
  });
  expect(databaseState.record).not.toHaveProperty("code");
});

test("existing DB v2 data is read without rerunning the v1 mapping", async ({
  page,
}) => {
  await page.goto("/studio");

  await page.evaluate(
    ({ exerciseId }) =>
      new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("css-lab");

        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () =>
          reject(new Error("delete blocked"));
        deleteRequest.onsuccess = () => {
          const openRequest = indexedDB.open("css-lab", 2);

          openRequest.onupgradeneeded = () => {
            openRequest.result.createObjectStore(
              "exercise-progress",
              {
                keyPath: ["exerciseId", "revision"],
              },
            );
          };
          openRequest.onerror = () =>
            reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction(
              "exercise-progress",
              "readwrite",
            );
            transaction.objectStore("exercise-progress").put({
              exerciseId,
              revision: 1,
              files: {
                "style.css":
                  ".container { display: flex; gap: 13px; }",
              },
              status: "started",
              updatedAt: 500,
            });
            transaction.onerror = () =>
              reject(transaction.error);
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
          };
        };
      }),
    { exerciseId: FIRST_EXERCISE_ID },
  );

  await page.goto(FIRST_EXERCISE_URL);
  await expect(
    page.getByRole("button", { name: "检查答案" }),
  ).toBeEnabled();

  await expect
    .poll(() =>
      page
        .locator(".cm-content")
        .evaluate((element) =>
          (element as HTMLElement).innerText
            .replace(/\u00a0/g, " ")
            .trim(),
        ),
    )
    .toContain("gap: 13px");

  const record = await readProgressRecord(
    page,
    FIRST_EXERCISE_ID,
  );

  expect(record).toMatchObject({
    status: "started",
    files: {
      "style.css":
        ".container { display: flex; gap: 13px; }",
    },
  });
  expect(record).not.toHaveProperty("code");
});

test("editing a completed exercise preserves achievement and completedAt", async ({
  page,
}) => {
  await page.goto("/studio");
  const completedAt = 1_725_000_000_123;

  await page.evaluate(
    ({ exerciseId, completedAt }) =>
      new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("css-lab");

        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () =>
          reject(new Error("delete blocked"));
        deleteRequest.onsuccess = () => {
          const openRequest = indexedDB.open("css-lab", 2);

          openRequest.onupgradeneeded = () => {
            openRequest.result.createObjectStore(
              "exercise-progress",
              {
                keyPath: ["exerciseId", "revision"],
              },
            );
          };
          openRequest.onerror = () =>
            reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction(
              "exercise-progress",
              "readwrite",
            );
            transaction.objectStore("exercise-progress").put({
              exerciseId,
              revision: 1,
              files: {
                "style.css":
                  ".container { display: flex; gap: 3px; }",
              },
              status: "completed",
              completedAt,
              updatedAt: completedAt,
            });
            transaction.onerror = () =>
              reject(transaction.error);
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
          };
        };
      }),
    {
      exerciseId: SECOND_EXERCISE_ID,
      completedAt,
    },
  );

  await page.goto(SECOND_EXERCISE_URL);
  await expect(
    page.getByRole("button", { name: "检查答案" }),
  ).toBeEnabled();

  const edited =
    ".container { display: flex; gap: 17px; }";
  await replaceEditorCss(page, edited);

  await expect
    .poll(() =>
      readProgressRecord(page, SECOND_EXERCISE_ID),
    )
    .toMatchObject({
      status: "completed",
      completedAt,
      files: {
        "style.css": edited,
      },
    });
});

test("blocked legacy upgrade hydrates in memory and discards the late open", async ({
  context,
  page,
}) => {
  const blocker = page;
  const learner = await context.newPage();

  await blocker.goto("/studio");
  await blocker.evaluate(
    ({ exerciseId }) =>
      new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("css-lab");

        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () =>
          reject(new Error("delete blocked"));
        deleteRequest.onsuccess = () => {
          const openRequest = indexedDB.open("css-lab", 1);

          openRequest.onupgradeneeded = () => {
            openRequest.result.createObjectStore(
              "exercise-progress",
              {
                keyPath: ["exerciseId", "revision"],
              },
            );
          };
          openRequest.onerror = () =>
            reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction(
              "exercise-progress",
              "readwrite",
            );
            transaction.objectStore("exercise-progress").put({
              exerciseId,
              revision: 1,
              code: ".container { gap: 91px; }",
              status: "started",
              updatedAt: 100,
            });

            transaction.onerror = () =>
              reject(transaction.error);
            transaction.oncomplete = () => {
              db.onversionchange = () => {
                // Intentionally keep this legacy connection open.
              };
              (
                window as typeof window & {
                  __m6aLegacyDb?: IDBDatabase;
                }
              ).__m6aLegacyDb = db;
              resolve();
            };
          };
        };
      }),
    { exerciseId: FIRST_EXERCISE_ID },
  );

  await learner.addInitScript(() => {
    let deleteCalls = 0;
    const originalDelete =
      indexedDB.deleteDatabase.bind(indexedDB);

    Object.defineProperty(indexedDB, "deleteDatabase", {
      configurable: true,
      value(name: string) {
        deleteCalls += 1;
        (
          window as typeof window & {
            __m6aDeleteCalls?: () => number;
          }
        ).__m6aDeleteCalls = () => deleteCalls;
        return originalDelete(name);
      },
    });
  });

  await learner.goto(FIRST_EXERCISE_URL);

  await expect(
    learner.getByRole("button", { name: "检查答案" }),
  ).toBeEnabled();
  await expect(
    learner.getByRole("button", { name: "Reset" }),
  ).toBeEnabled();

  const localSource =
    ".container { display: flex; gap: 23px; }";
  await replaceEditorCss(learner, localSource);

  await blocker.evaluate(() => {
    (
      window as typeof window & {
        __m6aLegacyDb?: IDBDatabase;
      }
    ).__m6aLegacyDb?.close();
  });

  await expect
    .poll(() =>
      learner
        .locator(".cm-content")
        .evaluate((element) =>
          (element as HTMLElement).innerText
            .replace(/\u00a0/g, " ")
            .trim(),
        ),
    )
    .toContain("gap: 23px");

  expect(
    await learner.evaluate(
      () =>
        (
          window as typeof window & {
            __m6aDeleteCalls?: () => number;
          }
        ).__m6aDeleteCalls?.() ?? 0,
    ),
  ).toBe(0);

  const rawRecord = await readProgressRecord(
    learner,
    FIRST_EXERCISE_ID,
  );

  expect(rawRecord).toMatchObject({
    files: {
      "style.css": ".container { gap: 91px; }",
    },
  });
  expect(rawRecord).not.toMatchObject({
    files: {
      "style.css": localSource,
    },
  });
});
