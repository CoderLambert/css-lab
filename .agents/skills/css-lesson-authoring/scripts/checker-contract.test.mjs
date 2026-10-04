import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../../../../", import.meta.url);

async function supportedCheckTypes() {
  const source = await readFile(new URL("src/lib/content/schemas/exercise.ts", root), "utf8");
  const file = ts.createSourceFile("exercise.ts", source, ts.ScriptTarget.Latest, true);
  const declarations = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) declarations.set(declaration.name.text, declaration.initializer);
    }
  }
  const union = declarations.get("CheckSchema");
  assert.ok(union && ts.isCallExpression(union), "CheckSchema must declare its discriminated union explicitly");
  const options = union.arguments[1];
  assert.ok(options && ts.isArrayLiteralExpression(options), "CheckSchema options must be inspectable");
  assert.ok(options.elements.length > 0);

  return options.elements.map((option) => {
    assert.ok(ts.isIdentifier(option));
    const schema = declarations.get(option.text);
    assert.ok(schema, `Missing schema declaration: ${option.text}`);
    const types = [];
    const visit = (node) => {
      if (ts.isPropertyAssignment(node) && node.name.getText(file) === "type" &&
          ts.isCallExpression(node.initializer) &&
          node.initializer.expression.getText(file) === "z.literal") {
        const literal = node.initializer.arguments[0];
        assert.ok(literal && ts.isStringLiteral(literal));
        types.push(literal.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(schema);
    assert.equal(types.length, 1, `Expected one check discriminator in ${option.text}`);
    return types[0];
  });
}

for (const [path, heading, nextHeading] of [
  ["AGENTS.md", "# Exercise Check DSL\n", "\n# "],
  [".agents/skills/css-lesson-authoring/references/checker-guidelines.md", "## Current DSL\n", "\n## "],
]) {
  test(`${path} documents exactly the production CheckSchema types`, async () => {
    const expected = await supportedCheckTypes();
    const text = await readFile(new URL(path, root), "utf8");
    const section = text.split(heading)[1]?.split(nextHeading)[0];
    assert.ok(section, `Missing checker contract section in ${path}`);
    const actual = [...section.matchAll(/^- `([^`]+)`\s*$/gm)].map((match) => match[1]);
    assert.equal(new Set(actual).size, actual.length, "Checker types must not be duplicated");
    assert.deepEqual(actual.sort(), expected.sort());
  });
}
