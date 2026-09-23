import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

async function read(path) {
  return readFile(join(repoRoot, path), "utf8");
}

test("rule-style source checks keep priority and source-order support aligned", async () => {
  const [schema, preview, agents, guidelines, exerciseSource] = await Promise.all([
    read("src/lib/content/schemas/exercise.ts"),
    read("src/features/exercise/lib/preview-document.ts"),
    read("AGENTS.md"),
    read(".agents/skills/css-lesson-authoring/references/checker-guidelines.md"),
    read("content/courses/css-foundations/modules/integration-and-debugging/lessons/diagnose-css-systematically/exercises/debug-cascade-winner/exercise.json"),
  ]);

  assert.match(schema, /priority:\s*z\.enum\(\["normal", "important"\]\)\.optional\(\)/);
  assert.match(schema, /afterSelector:\s*NonEmptyStringSchema\.optional\(\)/);

  assert.match(preview, /getPropertyPriority\(check\.property\)/);
  assert.match(preview, /value\.afterSelector !== undefined/);
  assert.match(preview, /selectorPosition > afterSelectorPosition/);
  assert.match(preview, /result\.orderMatches/);

  assert.match(agents, /priority: "normal" \| "important"/);
  assert.match(agents, /afterSelector/);
  assert.match(guidelines, /priority: "normal" \| "important"/);
  assert.match(guidelines, /afterSelector/);

  const exercise = JSON.parse(exerciseSource);
  const readyRule = exercise.checks.find(
    (check) => check.id === "ready-status-rule",
  );

  assert.ok(readyRule);
  assert.equal(readyRule.type, "rule-style");
  assert.equal(readyRule.priority, "normal");
  assert.equal(readyRule.afterSelector, ".card .status");
});
