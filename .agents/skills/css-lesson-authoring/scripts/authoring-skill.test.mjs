import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { inspectContext } from "./inspect-context.mjs";
import { inspectSourcePack } from "./inspect-source-pack.mjs";
import { scaffoldExercise, scaffoldLesson, scaffoldModule } from "./scaffold.mjs";

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
