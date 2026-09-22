#!/usr/bin/env node

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  assertEntityId,
  assertEntityIdAvailable,
  assertOrderAvailable,
  assertSlug,
  contentPaths,
  findRepoRoot,
  isDirectExecution,
  listExerciseRecords,
  listLessonRecords,
  nextOrder,
  parseArgs,
  pathExists,
  positiveInteger,
  readAndValidateRecord,
  renderAsset,
  requireOption,
} from "./lib.mjs";

async function createDirectoryAtomicallyEnough(targetDirectory, files) {
  if (await pathExists(targetDirectory)) {
    throw new Error(`Refusing to overwrite existing path: ${targetDirectory}`);
  }

  await mkdir(targetDirectory, { recursive: false });

  try {
    for (const file of files) {
      const path = join(targetDirectory, file.path);
      if (file.directory) {
        await mkdir(path, { recursive: true });
      } else {
        await writeFile(path, file.content, "utf8");
      }
    }
  } catch (error) {
    await rm(targetDirectory, { recursive: true, force: true });
    throw error;
  }
}

function optionalPositiveOrder(value, records, kind) {
  if (value === undefined) {
    return nextOrder(records);
  }
  const order = positiveInteger(value, `${kind} order`);
  assertOrderAvailable(records, order, kind);
  return order;
}

export async function scaffoldLesson({
  repoRoot,
  courseSlug,
  moduleSlug,
  slug,
  id,
  title,
  description = "TODO: describe this lesson.",
  estimatedMinutes,
  order: requestedOrder,
}) {
  assertSlug(courseSlug, "course slug");
  assertSlug(moduleSlug, "module slug");
  assertSlug(slug, "lesson slug");
  assertEntityId(id, "lesson id");

  if (!title.trim()) {
    throw new Error("Lesson title must not be empty.");
  }
  if (!description.trim()) {
    throw new Error("Lesson description must not be empty.");
  }

  const minutes = positiveInteger(estimatedMinutes, "estimated minutes");
  const paths = contentPaths(repoRoot, courseSlug, moduleSlug);

  await readAndValidateRecord(
    join(paths.courseRoot, "course.json"),
    courseSlug,
    "Course",
  );
  await readAndValidateRecord(
    join(paths.moduleRoot, "module.json"),
    moduleSlug,
    "Module",
  );

  const lessons = await listLessonRecords(repoRoot, courseSlug, moduleSlug);
  const order = optionalPositiveOrder(requestedOrder, lessons, "Lesson");
  await assertEntityIdAvailable(paths.coursesRoot, id);

  await mkdir(paths.lessonsRoot, { recursive: true });
  const targetDirectory = join(paths.lessonsRoot, slug);
  const lessonJson = await renderAsset("lesson.json.template", {
    ID_JSON: JSON.stringify(id),
    SLUG_JSON: JSON.stringify(slug),
    TITLE_JSON: JSON.stringify(title.trim()),
    DESCRIPTION_JSON: JSON.stringify(description.trim()),
    MINUTES: String(minutes),
    ORDER: String(order),
  });
  const lessonMdx = await renderAsset("lesson.mdx.template", {
    LESSON_TITLE: title.trim(),
  });

  await createDirectoryAtomicallyEnough(targetDirectory, [
    { path: "lesson.json", content: lessonJson },
    { path: "lesson.mdx", content: lessonMdx },
    { path: "exercises", directory: true },
  ]);

  return {
    kind: "lesson",
    path: targetDirectory,
    id,
    slug,
    order,
    status: "draft",
    next: [
      "Author lesson.mdx using only approved MDX activities.",
      "Scaffold exercises with the exercise subcommand.",
      "Run pnpm content:generate after lesson structure is ready.",
      "Run pnpm content:check and pnpm test:content before review.",
    ],
  };
}

export async function scaffoldExercise({
  repoRoot,
  courseSlug,
  moduleSlug,
  lessonSlug,
  slug,
  id,
  title,
  prompt = "TODO: define the learner task.",
  revision = 1,
  order: requestedOrder,
}) {
  assertSlug(courseSlug, "course slug");
  assertSlug(moduleSlug, "module slug");
  assertSlug(lessonSlug, "lesson slug");
  assertSlug(slug, "exercise slug");
  assertEntityId(id, "exercise id");

  if (!title.trim()) {
    throw new Error("Exercise title must not be empty.");
  }
  if (!prompt.trim()) {
    throw new Error("Exercise prompt must not be empty.");
  }

  const exerciseRevision = positiveInteger(revision, "exercise revision");
  const paths = contentPaths(repoRoot, courseSlug, moduleSlug, lessonSlug);

  await readAndValidateRecord(
    join(paths.courseRoot, "course.json"),
    courseSlug,
    "Course",
  );
  await readAndValidateRecord(
    join(paths.moduleRoot, "module.json"),
    moduleSlug,
    "Module",
  );
  await readAndValidateRecord(
    join(paths.lessonRoot, "lesson.json"),
    lessonSlug,
    "Lesson",
  );

  const exercises = await listExerciseRecords(
    repoRoot,
    courseSlug,
    moduleSlug,
    lessonSlug,
  );
  const order = optionalPositiveOrder(requestedOrder, exercises, "Exercise");
  await assertEntityIdAvailable(paths.coursesRoot, id);

  const targetDirectory = join(paths.exercisesRoot, slug);
  const exerciseJson = await renderAsset("exercise.json.template", {
    ID_JSON: JSON.stringify(id),
    SLUG_JSON: JSON.stringify(slug),
    TITLE_JSON: JSON.stringify(title.trim()),
    PROMPT_JSON: JSON.stringify(prompt.trim()),
    REVISION: String(exerciseRevision),
    ORDER: String(order),
  });

  const [fixtureHtml, baseCss, starterCss, solutionCss] = await Promise.all([
    renderAsset("starter/index.html.template"),
    renderAsset("starter/base.css.template"),
    renderAsset("starter/style.css.template"),
    renderAsset("solution/style.css.template"),
  ]);

  await mkdir(paths.exercisesRoot, { recursive: true });
  await createDirectoryAtomicallyEnough(targetDirectory, [
    { path: "exercise.json", content: exerciseJson },
    { path: "starter", directory: true },
    { path: "solution", directory: true },
    { path: "starter/index.html", content: fixtureHtml },
    { path: "starter/base.css", content: baseCss },
    { path: "starter/style.css", content: starterCss },
    { path: "solution/style.css", content: solutionCss },
  ]);

  return {
    kind: "exercise",
    path: targetDirectory,
    id,
    slug,
    order,
    revision: exerciseRevision,
    status: "draft",
    next: [
      "Replace TODO prompt and starter/index.html with the real learning task.",
      "Keep answer properties out of starter/base.css.",
      "Add progressive hints and declarative checks to exercise.json.",
      "Write solution/style.css only as an authoring reference.",
      "Add the Exercise activity to lesson.mdx only when its teaching position is decided.",
    ],
  };
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];
  const repoRoot = options.root
    ? resolve(String(options.root))
    : await findRepoRoot();

  if (command === "lesson") {
    const result = await scaffoldLesson({
      repoRoot,
      courseSlug: requireOption(options, "course"),
      moduleSlug: requireOption(options, "module"),
      slug: requireOption(options, "slug"),
      id: requireOption(options, "id"),
      title: requireOption(options, "title"),
      description:
        typeof options.description === "string"
          ? options.description
          : "TODO: describe this lesson.",
      estimatedMinutes: requireOption(options, "minutes"),
      order: typeof options.order === "string" ? options.order : undefined,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "exercise") {
    const result = await scaffoldExercise({
      repoRoot,
      courseSlug: requireOption(options, "course"),
      moduleSlug: requireOption(options, "module"),
      lessonSlug: requireOption(options, "lesson"),
      slug: requireOption(options, "slug"),
      id: requireOption(options, "id"),
      title: requireOption(options, "title"),
      prompt:
        typeof options.prompt === "string"
          ? options.prompt
          : "TODO: define the learner task.",
      revision:
        typeof options.revision === "string" ? options.revision : 1,
      order: typeof options.order === "string" ? options.order : undefined,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error(
    [
      "Usage:",
      "  scaffold.mjs lesson --course <slug> --module <slug> --slug <slug> --id <stable-id> --title <title> --minutes <n> [--description <text>] [--order <n>]",
      "  scaffold.mjs exercise --course <slug> --module <slug> --lesson <slug> --slug <slug> --id <stable-id> --title <title> [--prompt <text>] [--revision <n>] [--order <n>]",
    ].join("\n"),
  );
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
