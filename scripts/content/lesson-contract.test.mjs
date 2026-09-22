import assert from "node:assert/strict";
import test from "node:test";

import { compile } from "@mdx-js/mdx";

import { remarkLessonContract } from "../mdx/remark-lesson-contract.mjs";

async function compileLesson(source) {
  return compile(
    { path: "test/lesson.mdx", value: source },
    { remarkPlugins: [remarkLessonContract] },
  );
}

async function assertContractViolation(source, reason) {
  await assert.rejects(
    () => compileLesson(source),
    (error) => {
      assert.match(error.message, /Lesson MDX contract violation/);
      assert.match(error.message, new RegExp(reason));
      return true;
    },
  );
}

test("accepts the v1 lesson activity contract", async () => {
  await compileLesson(`
## Layout model

Concept prose.

<Concept title="A concept">
The explanation can contain **Markdown**.
</Concept>

<Predict
  question="Which axis?"
  options={["main", "cross"]}
  answer="cross"
  explanation="The direction determines the axes."
/>

<Compare
  leftTitle="justify-content"
  leftCode="justify-content: center;"
  leftMeaning="Controls the main axis."
  rightTitle="align-items"
  rightCode="align-items: center;"
  rightMeaning="Controls the cross axis."
/>

<Exercise slug="center-box" label="Center the box" goal="Practice both axes." />

### Detail
`);
});

test("rejects imports and exports", async () => {
  await assertContractViolation('import Thing from "thing"', "imports/exports");
  await assertContractViolation("export const value = 1", "imports/exports");
});

test("rejects headings above the lesson title", async () => {
  await assertContractViolation("# Not allowed", "level-one headings");
});

test("reports the source path and position", async () => {
  await assert.rejects(
    () => compileLesson("# Not allowed"),
    (error) => {
      assert.match(
        error.message,
        /Lesson MDX contract violation at test\/lesson\.mdx:1:1:/,
      );
      return true;
    },
  );
});

test("rejects unknown and raw HTML JSX", async () => {
  await assertContractViolation("<Unknown />", "not allowed");
  await assertContractViolation("<div>Raw HTML</div>", "not allowed");
});

test("rejects flow and text expressions", async () => {
  await assertContractViolation(
    "{someFunction()}",
    "arbitrary JavaScript expressions",
  );
  await assertContractViolation(
    "text {globalThis.value}",
    "arbitrary JavaScript expressions",
  );
});

test("rejects non-static Predict options", async () => {
  await assertContractViolation(
    '<Predict question="q" options={getOptions()} answer="a" explanation="e" />',
    "static string array",
  );
  await assertContractViolation(
    '<Predict question="q" options={[choice, "b"]} answer="b" explanation="e" />',
    "only non-empty literal strings",
  );
});

test("rejects invalid Predict answers and options", async () => {
  await assertContractViolation(
    '<Predict question="q" options={["a", "b"]} answer="c" explanation="e" />',
    "answer.*options",
  );
  await assertContractViolation(
    '<Predict question="q" options={["a"]} answer="a" explanation="e" />',
    "at least two",
  );
});

test("rejects missing, unknown, and spread props", async () => {
  await assertContractViolation("<Concept />", "missing required prop");
  await assertContractViolation(
    '<Concept title="x" tone="quiet" />',
    "unknown prop",
  );
  await assertContractViolation(
    '<Concept {...props} title="x" />',
    "spread or dynamic",
  );
});

test("rejects children and invalid Exercise slugs", async () => {
  await assertContractViolation(
    '<Compare leftTitle="a" leftCode="a" leftMeaning="a" rightTitle="b" rightCode="b" rightMeaning="b">child</Compare>',
    "does not accept children",
  );
  await assertContractViolation(
    '<Exercise slug="Center Box" label="x" goal="y" />',
    "lesson-local slug",
  );
});
