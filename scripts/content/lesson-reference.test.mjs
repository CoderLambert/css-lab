import assert from "node:assert/strict";
import test from "node:test";

import { compile } from "@mdx-js/mdx";

import { remarkCollectExerciseReferences } from "../mdx/remark-collect-exercise-references.mjs";
import { remarkLessonContract } from "../mdx/remark-lesson-contract.mjs";

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
