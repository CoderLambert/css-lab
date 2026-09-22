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
