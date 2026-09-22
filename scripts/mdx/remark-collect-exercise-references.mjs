function walk(node, visit) {
  visit(node);

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, visit);
    }
  }
}

export function remarkCollectExerciseReferences() {
  return (tree, file) => {
    const references = [];

    walk(tree, (node) => {
      if (
        node.type !== "mdxJsxFlowElement" &&
        node.type !== "mdxJsxTextElement"
      ) {
        return;
      }

      if (node.name !== "Exercise") {
        return;
      }

      const slugAttribute = (node.attributes ?? []).find(
        (attribute) =>
          attribute.type === "mdxJsxAttribute" && attribute.name === "slug",
      );

      if (typeof slugAttribute?.value === "string") {
        references.push({
          slug: slugAttribute.value,
          position: node.position,
        });
      }
    });

    file.data.lessonExerciseReferences = references;
  };
}
