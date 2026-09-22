import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { compile } from "@mdx-js/mdx";

import { checkContent } from "./check.mjs";
import { createLessonRegistrySource } from "./lesson-registry-source.mjs";
import { readLessonManifest } from "./lesson-manifest.mjs";
import { remarkCollectExerciseReferences } from "../mdx/remark-collect-exercise-references.mjs";
import { remarkLessonContract } from "../mdx/remark-lesson-contract.mjs";

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function exerciseActivity(slug) {
  return `<Exercise slug="${slug}" label="${slug}" goal="Practice ${slug}." />`;
}

async function createContentFixture(
  t,
  {
    courseStatus = "published",
    moduleStatus = "published",
    lessonStatus = "published",
    exercises = [
      { slug: "center-box", order: 1, status: "published" },
      { slug: "space-between-items", order: 2, status: "published" },
      { slug: "align-items-end", order: 3, status: "published" },
    ],
    references = exercises.map((exercise) => exercise.slug),
    omitLessonJson = false,
    omitLessonMdx = false,
    registry = "generated",
  } = {},
) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "css-lab-content-check-"));
  const coursesRoot = join(fixtureRoot, "content", "courses");
  const lessonRoot = join(
    coursesRoot,
    "css-foundations",
    "modules",
    "flexbox",
    "lessons",
    "flexbox-alignment",
  );
  const registryPath = join(fixtureRoot, "lesson-content-registry.tsx");

  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await mkdir(lessonRoot, { recursive: true });
  await writeJson(join(coursesRoot, "css-foundations", "course.json"), {
    slug: "css-foundations",
    status: courseStatus,
  });
  await writeJson(
    join(coursesRoot, "css-foundations", "modules", "flexbox", "module.json"),
    {
      slug: "flexbox",
      status: moduleStatus,
    },
  );

  if (!omitLessonJson) {
    await writeJson(join(lessonRoot, "lesson.json"), {
      slug: "flexbox-alignment",
      status: lessonStatus,
    });
  }

  if (!omitLessonMdx) {
    await writeFile(
      join(lessonRoot, "lesson.mdx"),
      `## Exercises\n\n${references.map(exerciseActivity).join("\n\n")}\n`,
      "utf8",
    );
  }

  for (const exercise of exercises) {
    await writeJson(
      join(lessonRoot, "exercises", exercise.slug, "exercise.json"),
      {
        slug: exercise.metadataSlug ?? exercise.slug,
        status: exercise.status,
        order: exercise.order,
      },
    );
  }

  if (registry === "generated" && !omitLessonJson && !omitLessonMdx) {
    const manifest = await readLessonManifest({ coursesRoot });
    await writeFile(registryPath, createLessonRegistrySource(manifest), "utf8");
  } else {
    await writeFile(registryPath, "stale registry\n", "utf8");
  }

  return { coursesRoot, generatedRegistryPath: registryPath };
}

async function assertContentCheckFails(fixture, pattern) {
  await assert.rejects(
    () => checkContent(fixture),
    (error) => {
      assert.match(error.message, pattern);
      return true;
    },
  );
}

test("collects real Exercise nodes without scanning fenced code", async () => {
  const compiled = await compile(
    {
      path: "test/lesson.mdx",
      value: `
\`\`\`mdx
<Exercise slug="fake-example" label="Fake" goal="Not a real node" />
\`\`\`

<Exercise slug="center-box" label="Center the box" goal="Practice both axes." />
`,
    },
    {
      remarkPlugins: [remarkLessonContract, remarkCollectExerciseReferences],
    },
  );

  assert.deepEqual(
    compiled.data.lessonExerciseReferences.map((reference) => reference.slug),
    ["center-box"],
  );
});

test("accepts a visible lesson whose references match the published sequence", async (t) => {
  const fixture = await createContentFixture(t);

  const result = await checkContent(fixture);

  assert.equal(result.lessonCount, 1);
});

test("fails when lesson.json is missing", async (t) => {
  const fixture = await createContentFixture(t, { omitLessonJson: true });

  await assertContentCheckFails(fixture, /Missing lesson\.json/);
});

test("fails when lesson.mdx is missing", async (t) => {
  const fixture = await createContentFixture(t, { omitLessonMdx: true });

  await assertContentCheckFails(fixture, /Missing lesson\.mdx/);
});

test("fails when the generated registry is stale", async (t) => {
  const fixture = await createContentFixture(t, { registry: "stale" });

  await assertContentCheckFails(fixture, /Generated lesson registry is stale/);
});

test("fails when an Exercise reference target is missing", async (t) => {
  const fixture = await createContentFixture(t, {
    references: ["center-box", "missing-exercise", "align-items-end"],
  });

  await assertContentCheckFails(fixture, /Unknown Exercise reference/);
});

test("fails when Exercise metadata slug does not match its reference", async (t) => {
  const fixture = await createContentFixture(t, {
    exercises: [
      {
        slug: "center-box",
        metadataSlug: "different-slug",
        order: 1,
        status: "published",
      },
    ],
    references: ["center-box"],
  });

  await assertContentCheckFails(fixture, /Exercise metadata slug mismatch/);
});

test("fails on duplicate Exercise references", async (t) => {
  const fixture = await createContentFixture(t, {
    references: [
      "center-box",
      "center-box",
      "space-between-items",
      "align-items-end",
    ],
  });

  await assertContentCheckFails(fixture, /Duplicate Exercise reference/);
});

test("fails when a visible lesson references a draft Exercise", async (t) => {
  const fixture = await createContentFixture(t, {
    exercises: [
      { slug: "center-box", order: 1, status: "published" },
      { slug: "draft-exercise", order: 2, status: "draft" },
    ],
    references: ["center-box", "draft-exercise"],
  });

  await assertContentCheckFails(
    fixture,
    /Learner-visible lesson references non-published Exercise/,
  );
});

test("fails when a visible lesson omits a published Exercise", async (t) => {
  const fixture = await createContentFixture(t, {
    references: ["center-box", "align-items-end"],
  });

  await assertContentCheckFails(
    fixture,
    /Missing published Exercise reference:[\s\S]*space-between-items/,
  );
});

test("fails when MDX Exercise order differs from exercise.order", async (t) => {
  const fixture = await createContentFixture(t, {
    references: ["center-box", "align-items-end", "space-between-items"],
  });

  await assertContentCheckFails(
    fixture,
    /Exercise reference order does not match learner sequence\.[\s\S]*expected: center-box -> space-between-items -> align-items-end[\s\S]*actual:   center-box -> align-items-end -> space-between-items/,
  );
});

test("accepts a hidden lesson that references a draft Exercise", async (t) => {
  const fixture = await createContentFixture(t, {
    lessonStatus: "draft",
    exercises: [{ slug: "draft-exercise", order: 1, status: "draft" }],
    references: ["draft-exercise"],
  });

  const result = await checkContent(fixture);

  assert.equal(result.lessonCount, 1);
});
