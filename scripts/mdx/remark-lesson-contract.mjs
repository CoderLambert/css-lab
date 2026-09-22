const ALLOWED_COMPONENTS = new Set([
  "Concept",
  "Predict",
  "Compare",
  "Exercise",
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(node, visit) {
  visit(node);

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, visit);
    }
  }
}

function locationFor(file, node) {
  const filePath = file.path ?? file.history?.[0] ?? "<lesson.mdx>";
  const start = node.position?.start;

  return start ? `${filePath}:${start.line}:${start.column}` : filePath;
}

function reject(file, node, reason) {
  throw new Error(
    `Lesson MDX contract violation at ${locationFor(file, node)}: ${reason}`,
  );
}

function readAttributes(file, node, allowedNames) {
  const attributes = new Map();

  for (const attribute of node.attributes ?? []) {
    if (attribute.type === "mdxJsxExpressionAttribute") {
      reject(
        file,
        attribute,
        "spread or dynamic JSX attributes are not allowed",
      );
    }

    if (attribute.type !== "mdxJsxAttribute") {
      reject(file, attribute, "unsupported JSX attribute syntax");
    }

    if (!allowedNames.has(attribute.name)) {
      reject(file, attribute, `unknown prop "${attribute.name}"`);
    }

    if (attributes.has(attribute.name)) {
      reject(file, attribute, `duplicate prop "${attribute.name}"`);
    }

    attributes.set(attribute.name, attribute);
  }

  return attributes;
}

function literalString(file, node, attributes, name) {
  const attribute = attributes.get(name);

  if (!attribute) {
    reject(file, node, `missing required prop "${name}"`);
  }

  if (typeof attribute.value !== "string") {
    reject(file, attribute, `prop "${name}" must be a literal string`);
  }

  return attribute.value;
}

function isStringLiteral(node) {
  return (
    (node?.type === "Literal" || node?.type === "StringLiteral") &&
    typeof node.value === "string"
  );
}

function staticStringArray(file, node, attribute) {
  if (
    !attribute ||
    attribute.value?.type !== "mdxJsxAttributeValueExpression"
  ) {
    reject(
      file,
      attribute ?? node,
      'prop "options" must be a static string array',
    );
  }

  const program = attribute.value.data?.estree;
  const expression =
    program?.type === "Program" &&
    program.body?.length === 1 &&
    program.body[0]?.type === "ExpressionStatement"
      ? program.body[0].expression
      : null;

  if (expression?.type !== "ArrayExpression") {
    reject(file, attribute, 'prop "options" must be a static string array');
  }

  const values = expression.elements.map((element) => {
    if (!isStringLiteral(element) || element.value.trim().length === 0) {
      reject(
        file,
        attribute,
        'prop "options" must contain only non-empty literal strings',
      );
    }

    return element.value;
  });

  if (values.length < 2) {
    reject(file, attribute, 'prop "options" must contain at least two strings');
  }

  if (new Set(values).size !== values.length) {
    reject(file, attribute, 'prop "options" must contain unique strings');
  }

  return values;
}

function validateComponent(file, node) {
  if (!ALLOWED_COMPONENTS.has(node.name)) {
    reject(
      file,
      node,
      `component "${node.name ?? "<anonymous>"}" is not allowed`,
    );
  }

  if (node.name === "Concept") {
    const attributes = readAttributes(file, node, new Set(["title"]));
    literalString(file, node, attributes, "title");
    return;
  }

  if (node.name === "Predict") {
    const attributes = readAttributes(
      file,
      node,
      new Set(["question", "options", "answer", "explanation"]),
    );
    const options = staticStringArray(file, node, attributes.get("options"));
    const answer = literalString(file, node, attributes, "answer");

    literalString(file, node, attributes, "question");
    literalString(file, node, attributes, "explanation");

    if (!options.includes(answer)) {
      reject(
        file,
        attributes.get("answer"),
        'prop "answer" must be one of options',
      );
    }

    if (node.children?.length > 0) {
      reject(file, node, "Predict does not accept children");
    }
    return;
  }

  if (node.name === "Compare") {
    const attributes = readAttributes(
      file,
      node,
      new Set([
        "leftTitle",
        "leftCode",
        "leftMeaning",
        "rightTitle",
        "rightCode",
        "rightMeaning",
      ]),
    );

    for (const name of [
      "leftTitle",
      "leftCode",
      "leftMeaning",
      "rightTitle",
      "rightCode",
      "rightMeaning",
    ]) {
      literalString(file, node, attributes, name);
    }

    if (node.children?.length > 0) {
      reject(file, node, "Compare does not accept children");
    }
    return;
  }

  const attributes = readAttributes(
    file,
    node,
    new Set(["slug", "label", "goal"]),
  );
  const slug = literalString(file, node, attributes, "slug");

  literalString(file, node, attributes, "label");
  literalString(file, node, attributes, "goal");

  if (!SLUG_PATTERN.test(slug)) {
    reject(
      file,
      attributes.get("slug"),
      `prop "slug" must be a valid lesson-local slug`,
    );
  }

  if (node.children?.length > 0) {
    reject(file, node, "Exercise does not accept children");
  }
}

export function remarkLessonContract() {
  return (tree, file) => {
    walk(tree, (node) => {
      if (node.type === "mdxjsEsm") {
        reject(file, node, "imports/exports are not allowed in lesson content");
      }

      if (
        node.type === "mdxFlowExpression" ||
        node.type === "mdxTextExpression"
      ) {
        reject(
          file,
          node,
          "arbitrary JavaScript expressions are not allowed in lesson content",
        );
      }

      if (node.type === "heading" && node.depth === 1) {
        reject(
          file,
          node,
          "level-one headings are not allowed; use lesson.json.title as the page H1",
        );
      }

      if (
        node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement"
      ) {
        validateComponent(file, node);
      }
    });
  };
}

export default remarkLessonContract;
