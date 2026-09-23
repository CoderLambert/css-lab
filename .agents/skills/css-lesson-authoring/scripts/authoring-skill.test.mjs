import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { inspectContext } from "./inspect-context.mjs";
import { inspectSourcePack } from "./inspect-source-pack.mjs";
import { scaffoldExercise, scaffoldLesson, scaffoldModule } from "./scaffold.mjs";
import { reorderSiblings } from "./reorder.mjs";

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createRepoFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "css-lab-authoring-skill-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeJson(join(root, "package.json"), { name: "fixture" });
  const courseRoot = join(root, "content", "courses", "css-foundations");
  const moduleRoot = join(courseRoot, "modules", "flexbox");
  const lessonRoot = join(moduleRoot, "lessons", "alignment");
  await writeJson(join(courseRoot, "course.json"), { schemaVersion: 1, id: "css-foundations", slug: "css-foundations", title: "CSS Foundations", description: "Fixture", order: 1, status: "published" });
  await writeJson(join(moduleRoot, "module.json"), { schemaVersion: 1, id: "css.flexbox", slug: "flexbox", title: "Flexbox", description: "Fixture", order: 1, status: "published" });
  await writeJson(join(lessonRoot, "lesson.json"), { schemaVersion: 1, id: "css.flexbox.alignment", slug: "alignment", title: "Alignment", description: "Fixture", estimatedMinutes: 10, order: 1, status: "published" });
  await writeFile(join(lessonRoot, "lesson.mdx"), "## Alignment\n", "utf8");
  const exerciseRoot = join(lessonRoot, "exercises", "center-box");
  await writeJson(join(exerciseRoot, "exercise.json"), { schemaVersion: 1, id: "css.flexbox.alignment.center-box.001", revision: 1, slug: "center-box", title: "Center box", prompt: "Center it.", order: 1, status: "published", hints: [], checks: [] });
  for (const file of ["fixture.html", "base.css", "starter.css", "solution.css"]) await writeFile(join(exerciseRoot, file), "", "utf8");
  return root;
}

test("inspectContext reports deterministic next orders", async (t) => {
  const repoRoot = await createRepoFixture(t);
  const result = await inspectContext({ repoRoot, courseSlug: "css-foundations", moduleSlug: "flexbox", lessonSlug: "alignment" });
  assert.equal(result.suggestedNextLessonOrder, 2);
  assert.equal(result.suggestedNextExerciseOrder, 2);
  assert.deepEqual(result.lessons.map((lesson) => lesson.slug), ["alignment"]);
  assert.deepEqual(result.exercises.map((exercise) => exercise.slug), ["center-box"]);
});

test("scaffoldModule creates a deterministic draft module", async (t) => {
  const repoRoot = await createRepoFixture(t);
  const result = await scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.grid", title: "Grid", description: "Learn Grid." });
  assert.equal(result.order, 2);
  assert.equal(result.status, "draft");
  const moduleRoot = join(repoRoot, "content", "courses", "css-foundations", "modules", "grid");
  const metadata = JSON.parse(await readFile(join(moduleRoot, "module.json"), "utf8"));
  assert.equal(metadata.id, "css.grid");
  assert.equal(metadata.order, 2);
  assert.equal(metadata.status, "draft");
  assert.equal((await readFile(join(moduleRoot, "module.json"), "utf8")).endsWith("\n"), true);
  await assert.rejects(() => scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.grid.second", title: "Grid again", description: "Duplicate path." }), /Refusing to overwrite existing path/);
});

test("scaffoldModule validates parent, slug, id and order", async (t) => {
  const repoRoot = await createRepoFixture(t);
  await assert.rejects(() => scaffoldModule({ repoRoot, courseSlug: "missing", slug: "grid", id: "css.grid", title: "Grid", description: "Grid." }), /Missing required file/);
  await assert.rejects(() => scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "Bad Grid", id: "css.grid", title: "Grid", description: "Grid." }), /kebab-case/);
  await assert.rejects(() => scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.flexbox", title: "Grid", description: "Grid." }), /already exists/);
  await assert.rejects(() => scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.grid", title: "Grid", description: "Grid.", order: 1 }), /already used/);
});

test("scaffoldLesson creates a draft skeleton and refuses overwrite", async (t) => {
  const repoRoot = await createRepoFixture(t);
  const result = await scaffoldLesson({ repoRoot, courseSlug: "css-foundations", moduleSlug: "flexbox", slug: "flex-sizing", id: "css.flexbox.flex-sizing", title: "Flex sizing", description: "Understand flex sizing.", estimatedMinutes: 20 });
  assert.equal(result.order, 2);
  assert.equal(result.status, "draft");
  const lessonRoot = join(repoRoot, "content", "courses", "css-foundations", "modules", "flexbox", "lessons", "flex-sizing");
  const metadata = JSON.parse(await readFile(join(lessonRoot, "lesson.json"), "utf8"));
  const mdx = await readFile(join(lessonRoot, "lesson.mdx"), "utf8");
  assert.equal(metadata.id, "css.flexbox.flex-sizing");
  assert.equal(metadata.status, "draft");
  assert.equal(metadata.order, 2);
  assert.match(mdx, /^## /);
  assert.doesNotMatch(mdx, /^# /m);
  await assert.rejects(() => scaffoldLesson({ repoRoot, courseSlug: "css-foundations", moduleSlug: "flexbox", slug: "flex-sizing", id: "css.flexbox.flex-sizing.second", title: "Duplicate path", estimatedMinutes: 20 }), /Refusing to overwrite existing path/);
});

test("scaffoldLesson rejects a duplicate stable id", async (t) => {
  const repoRoot = await createRepoFixture(t);
  await assert.rejects(() => scaffoldLesson({ repoRoot, courseSlug: "css-foundations", moduleSlug: "flexbox", slug: "another-lesson", id: "css.flexbox.alignment", title: "Another lesson", estimatedMinutes: 15 }), /already exists/);
});

test("scaffoldExercise creates current v1 assets with draft metadata", async (t) => {
  const repoRoot = await createRepoFixture(t);
  const result = await scaffoldExercise({ repoRoot, courseSlug: "css-foundations", moduleSlug: "flexbox", lessonSlug: "alignment", slug: "end-alignment", id: "css.flexbox.alignment.end-alignment.001", title: "End alignment", prompt: "Align items to the end." });
  assert.equal(result.order, 2);
  assert.equal(result.status, "draft");
  const exerciseRoot = join(repoRoot, "content", "courses", "css-foundations", "modules", "flexbox", "lessons", "alignment", "exercises", "end-alignment");
  const metadata = JSON.parse(await readFile(join(exerciseRoot, "exercise.json"), "utf8"));
  assert.equal(metadata.revision, 1);
  assert.deepEqual(metadata.hints, []);
  assert.deepEqual(metadata.checks, []);
  for (const file of ["fixture.html", "base.css", "starter.css", "solution.css"]) assert.equal(typeof (await readFile(join(exerciseRoot, file), "utf8")), "string");
});

test("inspectSourcePack validates and fingerprints grounded sources", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "css-lab-source-pack-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "reference.md"), "# Flex sizing\n", "utf8");
  await writeJson(join(root, "source-pack.json"), { schemaVersion: 1, id: "flex-sizing-sources", scope: { course: "css-foundations", module: "flexbox", lesson: "flex-sizing" }, sources: [{ id: "reference", path: "reference.md", role: "primary" }] });
  const result = await inspectSourcePack({ manifestPath: join(root, "source-pack.json") });
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].role, "primary");
  assert.match(result.sources[0].sha256, /^[a-f0-9]{64}$/);
});

test("inspectSourcePack rejects path traversal", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "css-lab-source-pack-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, "pack");
  await mkdir(root);
  await writeFile(join(parent, "outside.md"), "outside\n", "utf8");
  await writeJson(join(root, "source-pack.json"), { schemaVersion: 1, id: "unsafe-pack", scope: {}, sources: [{ id: "outside", path: "../outside.md", role: "primary" }] });
  await assert.rejects(() => inspectSourcePack({ manifestPath: join(root, "source-pack.json") }), /escapes the source-pack directory/);
});


test("reorderSiblings reorders modules deterministically and preserves identity/status", async (t) => {
  const repoRoot = await createRepoFixture(t);
  await scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.grid", title: "Grid", description: "Grid." });

  const dryRun = await reorderSiblings({
    repoRoot,
    kind: "module",
    courseSlug: "css-foundations",
    orders: { flexbox: 2, grid: 1 },
    dryRun: true,
  });
  assert.equal(dryRun.changed, 2);
  const flexboxPath = join(repoRoot, "content", "courses", "css-foundations", "modules", "flexbox", "module.json");
  assert.equal(JSON.parse(await readFile(flexboxPath, "utf8")).order, 1);

  const result = await reorderSiblings({
    repoRoot,
    kind: "module",
    courseSlug: "css-foundations",
    orders: { flexbox: 2, grid: 1 },
  });
  assert.equal(result.changed, 2);

  const flexbox = JSON.parse(await readFile(flexboxPath, "utf8"));
  const grid = JSON.parse(await readFile(join(repoRoot, "content", "courses", "css-foundations", "modules", "grid", "module.json"), "utf8"));
  assert.deepEqual({ id: flexbox.id, slug: flexbox.slug, status: flexbox.status, order: flexbox.order }, { id: "css.flexbox", slug: "flexbox", status: "published", order: 2 });
  assert.deepEqual({ id: grid.id, slug: grid.slug, status: grid.status, order: grid.order }, { id: "css.grid", slug: "grid", status: "draft", order: 1 });

  const repeat = await reorderSiblings({
    repoRoot,
    kind: "module",
    courseSlug: "css-foundations",
    orders: { flexbox: 2, grid: 1 },
  });
  assert.equal(repeat.changed, 0);
});

test("reorderSiblings reorders lessons deterministically", async (t) => {
  const repoRoot = await createRepoFixture(t);
  await scaffoldLesson({
    repoRoot,
    courseSlug: "css-foundations",
    moduleSlug: "flexbox",
    slug: "flex-sizing",
    id: "css.flexbox.flex-sizing",
    title: "Flex sizing",
    description: "Understand flex sizing.",
    estimatedMinutes: 20,
  });

  const result = await reorderSiblings({
    repoRoot,
    kind: "lesson",
    courseSlug: "css-foundations",
    moduleSlug: "flexbox",
    orders: { alignment: 2, "flex-sizing": 1 },
  });
  assert.equal(result.changed, 2);
  const alignment = JSON.parse(await readFile(join(repoRoot, "content", "courses", "css-foundations", "modules", "flexbox", "lessons", "alignment", "lesson.json"), "utf8"));
  assert.equal(alignment.order, 2);
  assert.equal(alignment.id, "css.flexbox.alignment");
  assert.equal(alignment.status, "published");
});

test("reorderSiblings rejects unknown entities and collisions without partial writes", async (t) => {
  const repoRoot = await createRepoFixture(t);
  await scaffoldModule({ repoRoot, courseSlug: "css-foundations", slug: "grid", id: "css.grid", title: "Grid", description: "Grid." });

  const flexboxPath = join(repoRoot, "content", "courses", "css-foundations", "modules", "flexbox", "module.json");
  const gridPath = join(repoRoot, "content", "courses", "css-foundations", "modules", "grid", "module.json");
  const beforeFlexbox = await readFile(flexboxPath, "utf8");
  const beforeGrid = await readFile(gridPath, "utf8");

  await assert.rejects(
    () => reorderSiblings({
      repoRoot,
      kind: "module",
      courseSlug: "css-foundations",
      orders: { missing: 3 },
    }),
    /Unknown module slug/,
  );
  await assert.rejects(
    () => reorderSiblings({
      repoRoot,
      kind: "module",
      courseSlug: "css-foundations",
      orders: { flexbox: 2 },
    }),
    /target order 2 would collide/,
  );

  assert.equal(await readFile(flexboxPath, "utf8"), beforeFlexbox);
  assert.equal(await readFile(gridPath, "utf8"), beforeGrid);
});


test("checker authoring docs include every schema check type", async () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  const schemaSource = await readFile(
    join(repoRoot, "src", "lib", "content", "schemas", "exercise.ts"),
    "utf8",
  );
  const docs = [
    await readFile(join(repoRoot, "AGENTS.md"), "utf8"),
    await readFile(
      join(
        repoRoot,
        ".agents",
        "skills",
        "css-lesson-authoring",
        "references",
        "checker-guidelines.md",
      ),
      "utf8",
    ),
  ];
  const checkTypes = [
    ...new Set(
      [...schemaSource.matchAll(/type:\\s*z\\.literal\\("([^"]+)"\\)/g)].map(
        (match) => match[1],
      ),
    ),
  ];

  assert.ok(checkTypes.length > 0);

  for (const type of checkTypes) {
    for (const doc of docs) {
      assert.match(doc, new RegExp("\\`" + type.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + "\\`"));
    }
  }
});
