interface FormatterModules {
  prettier: typeof import("prettier/standalone");
  postcss: typeof import("prettier/plugins/postcss");
}

export interface FormattedCss {
  formatted: string;
  cursorOffset: number;
}

let formatterModulesPromise: Promise<FormatterModules> | null = null;

async function loadFormatterModules(): Promise<FormatterModules> {
  if (!formatterModulesPromise) {
    formatterModulesPromise = Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/postcss"),
    ])
      .then(([prettier, postcss]) => ({
        prettier,
        postcss,
      }))
      .catch((error: unknown) => {
        formatterModulesPromise = null;
        throw error;
      });
  }

  return formatterModulesPromise;
}

export async function formatCss(
  source: string,
  cursorOffset: number,
): Promise<FormattedCss> {
  const { prettier, postcss } = await loadFormatterModules();

  return prettier.formatWithCursor(source, {
    parser: "css",
    plugins: [postcss],
    cursorOffset,
    tabWidth: 2,
    useTabs: false,
  });
}
