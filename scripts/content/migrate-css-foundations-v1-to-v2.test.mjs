import assert from "node:assert/strict";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";

import {
  migrateCssFoundationsV1ToV2,
  toExerciseV2Record,
} from "./migrate-css-foundations-v1-to-v2.mjs";

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "css-lab-m6b-migrate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = join(root, "source");
  const targetRoot = join(root, "target");
  const relativeExercise = join(
    "modules",
    "flexbox",
    "lessons",
    "alignment",
    "exercises",
    "center-box",
  );
  const exerciseRoot = join(sourceRoot, relativeExercise);
  await mkdir(exerciseRoot, { recursive: true });
  await writeJson(join(exerciseRoot, "exercise.json"), {
    schemaVersion: 1,
    id: "css.flexbox.alignment.center-box.001",
    revision: 1,
    slug: "center-box",
    title: "Center box",
    prompt: "Center the box.",
    order: 1,
    status: "draft",
    hints: ["Read the axes."],
    checks: [
      {
        id: "align-end",
        type: "style",
        selector: ".container",
        property: "align-items",
        equals: "flex-end",
        alsoAccepts: ["end"],
        message: "Align to the end.",
      },
    ],
  });
  await writeFile(join(exerciseRoot, "fixture.html"), '<div class="container"></div>\n');
  await writeFile(join(exerciseRoot, "base.css"), ".container { min-height: 10rem; }\n");
  await writeFile(join(exerciseRoot, "starter.css"), ".container { display: flex; }\n");
  await writeFile(join(exerciseRoot, "solution.css"), ".container { align-items: flex-end; }\n");
  return { root, sourceRoot, targetRoot, exerciseRoot, relativeExercise };
}

test("toExerciseV2Record preserves teaching metadata and adds fixed HTML/CSS workspace", () => {
  const record = toExerciseV2Record({
    id: "exercise-id",
    revision: 2,
    slug: "exercise",
    title: "Exercise",
    prompt: "Do it.",
    order: 3,
    status: "draft",
    hints: ["Hint"],
    checks: [],
  });
  assert.equal(record.schemaVersion, 2);
  assert.equal(record.revision, 2);
  assert.deepEqual(record.workspace.files, [
    { path: "index.html", language: "html", editable: false },
    { path: "base.css", language: "css", editable: false },
    { path: "style.css", language: "css", editable: true },
  ]);
  assert.deepEqual(record.runtime, { type: "browser", entry: "index.html" });
});

test("migrator dry-run emits inventory without writing", async (t) => {
  const fixture = await createFixture(t);
  const summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: fixture.sourceRoot,
    targetRoot: fixture.targetRoot,
    dryRun: true,
  });

  assert.equal(summary.exercisesDiscovered, 1);
  assert.equal(summary.wouldMigrate, 1);
  assert.equal(summary.migrated, 0);
  assert.equal(summary.rejected.length, 0);
  assert.equal(summary.exercises[0].id, "css.flexbox.alignment.center-box.001");
  assert.match(summary.exercises[0].sourceHashes["fixture.html"], /^[a-f0-9]{64}$/);
  await assert.rejects(() => access(join(fixture.targetRoot, fixture.relativeExercise)));
});

test("migrator maps legacy assets to Exercise v2 and preserves alsoAccepts", async (t) => {
  const fixture = await createFixture(t);
  const summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: fixture.sourceRoot,
    targetRoot: fixture.targetRoot,
  });

  assert.equal(summary.migrated, 1);
  assert.equal(summary.rejected.length, 0);
  const targetExercise = join(fixture.targetRoot, fixture.relativeExercise);
  const metadata = JSON.parse(await readFile(join(targetExercise, "exercise.json"), "utf8"));
  assert.equal(metadata.schemaVersion, 2);
  assert.deepEqual(metadata.checks[0].alsoAccepts, ["end"]);
  assert.equal(
    await readFile(join(targetExercise, "starter", "index.html"), "utf8"),
    '<div class="container"></div>\n',
  );
  assert.equal(
    await readFile(join(targetExercise, "starter", "base.css"), "utf8"),
    ".container { min-height: 10rem; }\n",
  );
  assert.equal(
    await readFile(join(targetExercise, "starter", "style.css"), "utf8"),
    ".container { display: flex; }\n",
  );
  assert.equal(
    await readFile(join(targetExercise, "solution", "style.css"), "utf8"),
    ".container { align-items: flex-end; }\n",
  );
  assert.deepEqual((await readdir(targetExercise)).sort(), [
    "exercise.json",
    "solution",
    "starter",
  ]);
});

test("migrator rejects malformed legacy assets and symlinks", async (t) => {
  const missing = await createFixture(t);
  await rm(join(missing.exerciseRoot, "solution.css"));
  let summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: missing.sourceRoot,
    targetRoot: missing.targetRoot,
  });
  assert.equal(summary.rejected.length, 1);
  assert.match(summary.rejected[0].message, /asset set mismatch/);

  const linked = await createFixture(t);
  await rm(join(linked.exerciseRoot, "starter.css"));
  await symlink("base.css", join(linked.exerciseRoot, "starter.css"));
  summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: linked.sourceRoot,
    targetRoot: linked.targetRoot,
  });
  assert.equal(summary.rejected.length, 1);
  assert.match(summary.rejected[0].message, /symlink/);
});

test("migrator rejects partial targets and existing overlaps by default", async (t) => {
  const partial = await createFixture(t);
  const partialTarget = join(partial.targetRoot, partial.relativeExercise);
  await mkdir(partialTarget, { recursive: true });
  await writeFile(join(partialTarget, "unexpected.txt"), "partial\n");
  let summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: partial.sourceRoot,
    targetRoot: partial.targetRoot,
  });
  assert.equal(summary.rejected.length, 1);
  assert.match(summary.rejected[0].message, /Partial\/unsafe target/);

  const overlap = await createFixture(t);
  const overlapTarget = join(overlap.targetRoot, overlap.relativeExercise);
  await mkdir(overlapTarget, { recursive: true });
  await writeJson(join(overlapTarget, "exercise.json"), {
    schemaVersion: 2,
    id: "css.flexbox.alignment.center-box.001",
    revision: 1,
    slug: "center-box",
    title: "Current",
    prompt: "Current",
    order: 1,
    status: "published",
    hints: [],
    checks: [],
    workspace: { files: [] },
    runtime: { type: "browser", entry: "index.html" },
  });
  summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: overlap.sourceRoot,
    targetRoot: overlap.targetRoot,
  });
  assert.equal(summary.rejected.length, 1);
  assert.match(summary.rejected[0].message, /Target overlap exists/);

  const skipped = await migrateCssFoundationsV1ToV2({
    sourceRoot: overlap.sourceRoot,
    targetRoot: overlap.targetRoot,
    overlapPolicy: "skip",
  });
  assert.equal(skipped.rejected.length, 0);
  assert.equal(skipped.skippedOverlap.length, 1);
  assert.equal(skipped.migrated, 0);
});
