export function createLessonRegistrySource(manifest) {
  const imports = manifest
    .map(
      (entry, index) =>
        `import LessonContent${String(index).padStart(4, "0")} from "${entry.mdxImportPath}";`,
    )
    .join("\n");

  const cases = manifest
    .map(
      (entry, index) =>
        `    case "${entry.key}":\n      return <LessonContent${String(index).padStart(4, "0")} />;`,
    )
    .join("\n\n");

  return [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    "// Run: pnpm content:generate",
    "",
    'import type { ReactNode } from "react";',
    imports,
    "",
    "export function renderLessonContent(contentKey: string): ReactNode {",
    "  switch (contentKey) {",
    cases,
    ...(cases ? ["", "    default:"] : ["    default:"]),
    "      return null;",
    "  }",
    "}",
    "",
  ].join("\n");
}
